const OWNER = 'norainnoflowers2294-maker';
const REPO = 'Chat-app';
const BRANCH = 'main';
const BACKUP_PATH = 'backups/colorpop-user-data.json';

function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

export async function saveGitHubDataBackup(data: unknown, token: string): Promise<{ url: string; commitUrl?: string }> {
  const accessToken = token.trim();
  if (!accessToken) throw new Error('Enter a GitHub token to save a backup.');

  const endpoint = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${BACKUP_PATH}`;
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${accessToken}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
  let sha: string | undefined;
  const existing = await fetch(`${endpoint}?ref=${BRANCH}`, { headers });
  if (existing.ok) {
    const file = await existing.json();
    sha = typeof file.sha === 'string' ? file.sha : undefined;
  } else if (existing.status !== 404) {
    const error = await existing.json().catch(() => null);
    throw new Error(error?.message || `GitHub could not read the backup file (HTTP ${existing.status}).`);
  }

  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Update ColorPop app data backup — ${new Date().toISOString()}`,
      branch: BRANCH,
      content: encodeBase64Utf8(JSON.stringify(data, null, 2)),
      ...(sha ? { sha } : {}),
    }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const message = response.status === 401 || response.status === 403
      ? 'GitHub rejected the token. Use a token with Contents read and write access to this repository.'
      : result?.message || `GitHub could not save the backup (HTTP ${response.status}).`;
    throw new Error(message);
  }
  return {
    url: result?.content?.html_url || `https://github.com/${OWNER}/${REPO}/blob/${BRANCH}/${BACKUP_PATH}`,
    commitUrl: result?.commit?.html_url,
  };
}

import { describe, it, expect } from 'bun:test';
import { saveGitHubDataBackup } from './githubBackup';

describe('saveGitHubDataBackup', () => {
  it('creates or updates a UTF-8 backup file in the configured repository', async () => {
    const originalFetch = globalThis.fetch;
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (init?.method === 'PUT') {
        return new Response(JSON.stringify({
          content: { html_url: 'https://github.com/norainnoflowers2294-maker/Chat-app/blob/main/backups/colorpop-user-data.json' },
          commit: { html_url: 'https://github.com/norainnoflowers2294-maker/Chat-app/commit/example' },
        }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('', { status: 404 });
    }) as typeof fetch;

    try {
      const result = await saveGitHubDataBackup({ profile: 'Emmy 💖' }, 'test-token');
      expect(calls).toHaveLength(2);
      expect(calls[0].url).toContain('contents/backups/colorpop-user-data.json?ref=main');
      expect(calls[0].init?.headers).toMatchObject({ Authorization: 'Bearer test-token' });
      const request = JSON.parse(String(calls[1].init?.body));
      const decoded = new TextDecoder().decode(Uint8Array.from(atob(request.content), (char) => char.charCodeAt(0)));
      expect(JSON.parse(decoded)).toEqual({ profile: 'Emmy 💖' });
      expect(request.branch).toBe('main');
      expect(result.url).toContain('colorpop-user-data.json');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

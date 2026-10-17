import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());
app.use(cookieParser());

// Fallback runtime URLs from environment
const RUNTIME_DEV_URL = 'https://ais-dev-ohlfym6cwp4w2lwha7oenj-597148229967.us-east1.run.app';
const RUNTIME_PREVIEW_URL = 'https://ais-pre-ohlfym6cwp4w2lwha7oenj-597148229967.us-east1.run.app';

function getAppUrl(req: Request): string {
  if (process.env.APP_URL && !process.env.APP_URL.includes('MY_APP_URL')) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  const host = req.get('x-forwarded-host') || req.get('host');
  const proto = req.get('x-forwarded-proto') || 'https';
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    return `${proto}://${host}`;
  }
  return RUNTIME_DEV_URL;
}

function getEnvPat(): string | null {
  if (process.env.GITHUB_TOKEN && (process.env.GITHUB_TOKEN.startsWith('ghp_') || process.env.GITHUB_TOKEN.startsWith('github_pat_'))) {
    return process.env.GITHUB_TOKEN.trim();
  }
  const clientId = (process.env.GITHUB_CLIENT_ID || process.env.CLIENT_ID || '').trim();
  if (clientId.startsWith('ghp_') || clientId.startsWith('github_pat_')) {
    return clientId;
  }
  const clientSecret = (process.env.GITHUB_CLIENT_SECRET || process.env.CLIENT_SECRET || '').trim();
  if (clientSecret.startsWith('ghp_') || clientSecret.startsWith('github_pat_')) {
    return clientSecret;
  }
  return null;
}

function getGitHubCredentials() {
  const rawClientId = (process.env.GITHUB_CLIENT_ID || process.env.CLIENT_ID || '').trim();
  const rawClientSecret = (process.env.GITHUB_CLIENT_SECRET || process.env.CLIENT_SECRET || '').trim();
  const isPat = rawClientId.startsWith('ghp_') || rawClientId.startsWith('github_pat_');
  return {
    clientId: isPat ? '' : rawClientId,
    clientSecret: isPat ? '' : rawClientSecret,
    isPat,
  };
}

function getToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  if (req.cookies && req.cookies.gh_token) {
    return req.cookies.gh_token;
  }
  const queryToken = req.query.token as string;
  if (queryToken) {
    return queryToken.trim();
  }
  // Auto-detect Personal Access Token provided in environment
  const envPat = getEnvPat();
  if (envPat) {
    return envPat;
  }
  return null;
}

// ---------------- OAuth Endpoints ---------------- //

// GET /api/auth/url: Returns OAuth authorization URL
app.get('/api/auth/url', (req: Request, res: Response) => {
  const { clientId } = getGitHubCredentials();
  const effectiveClientId = ((req.query.client_id as string) || clientId).trim();
  const appUrl = getAppUrl(req);
  const redirectUri = `${appUrl}/auth/callback`;

  if (!effectiveClientId) {
    res.json({
      url: null,
      configured: false,
      redirectUri,
      devRedirectUri: `${RUNTIME_DEV_URL}/auth/callback`,
      previewRedirectUri: `${RUNTIME_PREVIEW_URL}/auth/callback`,
      message: 'GitHub Client ID not yet configured. Set GITHUB_CLIENT_ID or provide in setup modal.',
    });
    return;
  }

  const state = Math.random().toString(36).substring(2, 15);
  const params = new URLSearchParams({
    client_id: effectiveClientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email repo read:org',
    state,
  });

  const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

  res.json({
    url: authUrl,
    configured: true,
    redirectUri,
    devRedirectUri: `${RUNTIME_DEV_URL}/auth/callback`,
    previewRedirectUri: `${RUNTIME_PREVIEW_URL}/auth/callback`,
    clientId: `${effectiveClientId.substring(0, 4)}...${effectiveClientId.substring(effectiveClientId.length - 4)}`,
  });
});

// GET /auth/callback and /auth/callback/: OAuth Redirect Callback Handler
const handleOAuthCallback = async (req: Request, res: Response) => {
  const { code, error, error_description } = req.query;
  const { clientId, clientSecret } = getGitHubCredentials();
  const appUrl = getAppUrl(req);
  const redirectUri = `${appUrl}/auth/callback`;

  if (error || !code) {
    const errorMsg = (error_description as string) || (error as string) || 'Authentication was cancelled or failed';
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>GitHub Authentication Failed</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0d1117; color: #f0f6fc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #161b22; border: 1px solid #da3633; border-radius: 12px; padding: 32px; max-width: 440px; text-align: center; box-shadow: 0 12px 36px rgba(0,0,0,0.4); }
            h2 { color: #f85149; margin: 0 0 12px; font-size: 20px; }
            p { color: #8b949e; font-size: 14px; line-height: 1.5; margin: 0 0 20px; }
            button { background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Authentication Failed</h2>
            <p>${errorMsg.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
            <button onclick="window.close()">Close Window</button>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(errorMsg)} }, '*');
            }
          </script>
        </body>
      </html>
    `);
    return;
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code as string,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      const errMsg = tokenData.error_description || tokenData.error || 'Failed to exchange authorization code for access token';
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>GitHub Authentication Error</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #f0f6fc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { background: #161b22; border: 1px solid #da3633; border-radius: 12px; padding: 32px; max-width: 440px; text-align: center; }
              h2 { color: #f85149; margin: 0 0 12px; }
              p { color: #8b949e; font-size: 14px; line-height: 1.5; margin-bottom: 20px; }
              code { background: #0d1117; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: #ff7b72; display: block; margin: 12px 0; word-break: break-all; }
              button { background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>OAuth Error</h2>
              <p>GitHub returned an error during token exchange:</p>
              <code>${errMsg}</code>
              <button onclick="window.close()">Close Window</button>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(errMsg)} }, '*');
              }
            </script>
          </body>
        </html>
      `);
      return;
    }

    const accessToken = tokenData.access_token;

    // Set secure cookie for iframe preview environment
    res.cookie('gh_token', accessToken, {
      secure: true,
      sameSite: 'none',
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>GitHub Connected</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #f0f6fc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #161b22; border: 1px solid #238636; border-radius: 14px; padding: 36px 28px; max-width: 420px; text-align: center; box-shadow: 0 16px 40px rgba(0,0,0,0.5); }
            .icon { width: 48px; height: 48px; fill: #2ea043; margin-bottom: 16px; }
            h2 { color: #f0f6fc; margin: 0 0 8px; font-size: 20px; font-weight: 600; }
            p { color: #8b949e; font-size: 14px; line-height: 1.5; margin: 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <svg class="icon" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"></path></svg>
            <h2>Connected to GitHub!</h2>
            <p>Authentication successful. This window will close automatically...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: ${JSON.stringify(accessToken)} }, '*');
              setTimeout(() => {
                window.close();
              }, 700);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    res.status(500).send(`Authentication failed: ${err.message}`);
  }
};

app.get('/auth/callback', handleOAuthCallback);
app.get('/auth/callback/', handleOAuthCallback);

// ---------------- Authentication State & Session API ---------------- //

// GET /api/auth/status
app.get('/api/auth/status', async (req: Request, res: Response) => {
  const token = getToken(req);
  const { clientId } = getGitHubCredentials();
  const appUrl = getAppUrl(req);

  if (!token) {
    res.json({
      authenticated: false,
      configured: Boolean(clientId),
      redirectUri: `${appUrl}/auth/callback`,
      devRedirectUri: `${RUNTIME_DEV_URL}/auth/callback`,
      previewRedirectUri: `${RUNTIME_PREVIEW_URL}/auth/callback`,
    });
    return;
  }

  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'GitHub-Connect-Hub-App',
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!userRes.ok) {
      res.json({
        authenticated: false,
        configured: Boolean(clientId),
        redirectUri: `${appUrl}/auth/callback`,
        devRedirectUri: `${RUNTIME_DEV_URL}/auth/callback`,
        previewRedirectUri: `${RUNTIME_PREVIEW_URL}/auth/callback`,
        error: 'Invalid or expired GitHub token',
      });
      return;
    }

    const userData = await userRes.json();
    const rateLimitRemaining = userRes.headers.get('x-ratelimit-remaining');
    const rateLimitLimit = userRes.headers.get('x-ratelimit-limit');

    res.json({
      authenticated: true,
      user: userData,
      rateLimit: {
        remaining: rateLimitRemaining,
        limit: rateLimitLimit,
      },
      configured: Boolean(clientId),
      redirectUri: `${appUrl}/auth/callback`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, authenticated: false });
  }
});

// POST /api/auth/token: Direct connect with Personal Access Token (PAT)
app.post('/api/auth/token', async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    res.status(400).json({ error: 'Token is required' });
    return;
  }

  const cleanToken = token.trim();
  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'User-Agent': 'GitHub-Connect-Hub-App',
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!userRes.ok) {
      const errData = await userRes.json().catch(() => ({}));
      res.status(401).json({
        error: errData.message || 'Invalid GitHub token. Please verify token permissions.',
      });
      return;
    }

    const user = await userRes.json();

    // Store in cookie
    res.cookie('gh_token', cleanToken, {
      secure: true,
      sameSite: 'none',
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      user,
      token: cleanToken,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout: Clears session
app.post('/api/auth/logout', (req: Request, res: Response) => {
  res.clearCookie('gh_token', {
    secure: true,
    sameSite: 'none',
    httpOnly: true,
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

// ---------------- GitHub Data Proxy Endpoints ---------------- //

async function githubFetch(endpoint: string, token: string | null, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'User-Agent': 'GitHub-Connect-Hub-App',
    'Accept': 'application/vnd.github.v3+json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers,
  });

  const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
  const rateLimitLimit = response.headers.get('x-ratelimit-limit');
  const rateLimitReset = response.headers.get('x-ratelimit-reset');

  return { response, rateLimit: { remaining: rateLimitRemaining, limit: rateLimitLimit, reset: rateLimitReset } };
}

// GET /api/github/user: Current user profile or public user profile
app.get('/api/github/user', async (req: Request, res: Response) => {
  const token = getToken(req);
  const username = req.query.username as string;

  const endpoint = username ? `/users/${encodeURIComponent(username)}` : '/user';
  if (!username && !token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const { response, rateLimit } = await githubFetch(endpoint, token);
    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ error: data.message || 'GitHub API error' });
      return;
    }
    res.json({ user: data, rateLimit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/github/repos: Repositories
app.get('/api/github/repos', async (req: Request, res: Response) => {
  const token = getToken(req);
  const username = req.query.username as string;
  const sort = (req.query.sort as string) || 'updated';
  const perPage = (req.query.per_page as string) || '100';
  const page = (req.query.page as string) || '1';

  let endpoint = `/user/repos?sort=${sort}&per_page=${perPage}&page=${page}&affiliation=owner,collaborator`;
  if (username) {
    endpoint = `/users/${encodeURIComponent(username)}/repos?sort=${sort}&per_page=${perPage}&page=${page}`;
  } else if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const { response, rateLimit } = await githubFetch(endpoint, token);
    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ error: data.message || 'Failed to fetch repositories' });
      return;
    }
    res.json({ repos: Array.isArray(data) ? data : [], rateLimit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/github/events: Recent activity events
app.get('/api/github/events', async (req: Request, res: Response) => {
  const token = getToken(req);
  const username = req.query.username as string;

  if (!username && !token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  let endpoint = `/users/${encodeURIComponent(username)}/events?per_page=40`;
  if (!username && token) {
    // Fetch authenticated user first to get their login
    const { response: userRes } = await githubFetch('/user', token);
    if (!userRes.ok) {
      res.status(userRes.status).json({ error: 'Unable to fetch user for events' });
      return;
    }
    const user = await userRes.json();
    endpoint = `/users/${encodeURIComponent(user.login)}/events?per_page=40`;
  }

  try {
    const { response, rateLimit } = await githubFetch(endpoint, token);
    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ error: data.message || 'Failed to fetch events' });
      return;
    }
    res.json({ events: Array.isArray(data) ? data : [], rateLimit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/github/issues: User issues
app.get('/api/github/issues', async (req: Request, res: Response) => {
  const token = getToken(req);
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const state = (req.query.state as string) || 'all';
  const filter = (req.query.filter as string) || 'all';

  try {
    const { response, rateLimit } = await githubFetch(`/user/issues?filter=${filter}&state=${state}&per_page=40`, token);
    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ error: data.message || 'Failed to fetch issues' });
      return;
    }
    res.json({ issues: Array.isArray(data) ? data : [], rateLimit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/github/pulls: User pull requests
app.get('/api/github/pulls', async (req: Request, res: Response) => {
  const token = getToken(req);
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    // Search for PRs authored by or involving authenticated user
    const { response, rateLimit } = await githubFetch('/search/issues?q=involves:@me+type:pr&sort=updated&order=desc&per_page=40', token);
    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ error: data.message || 'Failed to fetch pull requests' });
      return;
    }
    res.json({ pulls: data.items || [], rateLimit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/github/repo/:owner/:repo/readme
app.get('/api/github/repo/:owner/:repo/readme', async (req: Request, res: Response) => {
  const token = getToken(req);
  const { owner, repo } = req.params;

  try {
    const { response } = await githubFetch(`/repos/${owner}/${repo}/readme`, token, {
      headers: {
        'Accept': 'application/vnd.github.html+json',
      },
    });

    if (!response.ok) {
      res.status(response.status).json({ error: 'README not found or inaccessible' });
      return;
    }

    const htmlContent = await response.text();
    res.json({ html: htmlContent });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/github/repo/:owner/:repo/issues: Create Issue
app.post('/api/github/repo/:owner/:repo/issues', async (req: Request, res: Response) => {
  const token = getToken(req);
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const { owner, repo } = req.params;
  const { title, body, labels } = req.body;

  if (!title) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }

  try {
    const { response } = await githubFetch(`/repos/${owner}/${repo}/issues`, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, labels: labels || [] }),
    });

    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ error: data.message || 'Failed to create issue' });
      return;
    }
    res.json({ issue: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Star/Unstar endpoints
app.put('/api/github/user/starred/:owner/:repo', async (req: Request, res: Response) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  const { owner, repo } = req.params;
  try {
    const { response } = await githubFetch(`/user/starred/${owner}/${repo}`, token, {
      method: 'PUT',
      headers: { 'Content-Length': '0' },
    });
    res.json({ starred: response.status === 204 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/github/user/starred/:owner/:repo', async (req: Request, res: Response) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  const { owner, repo } = req.params;
  try {
    const { response } = await githubFetch(`/user/starred/${owner}/${repo}`, token, {
      method: 'DELETE',
    });
    res.json({ starred: false, success: response.status === 204 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- OpenRouter Proxy & Diagnostics Endpoints ---------------- //

// POST /api/openrouter/test: Test connection & fetch diagnostics
app.post('/api/openrouter/test', async (req: Request, res: Response) => {
  const apiKey = (req.body.apiKey || process.env.OPENROUTER_API_KEY || '').trim();

  if (!apiKey) {
    res.json({
      status: 'error',
      errorCategory: 'missing_key',
      errorMessage: 'Missing API Key. Please enter your OpenRouter API Key in Settings.',
      suggestedFix: 'Get an API key from https://openrouter.ai/keys and paste it into OpenRouter Settings.',
    });
    return;
  }

  const startTime = Date.now();
  try {
    const keyRes = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': getAppUrl(req),
        'X-Title': 'Pretty Little Fantasies',
      },
    });

    const latencyMs = Date.now() - startTime;

    if (!keyRes.ok) {
      const errJson = await keyRes.json().catch(() => ({}));
      const statusCode = keyRes.status;

      let errorCategory: string = 'network_error';
      let errorMessage = errJson?.error?.message || `OpenRouter returned HTTP ${statusCode}`;
      let suggestedFix = 'Check your OpenRouter account status and API keys.';

      if (statusCode === 401) {
        errorCategory = 'auth_failed';
        errorMessage = 'Invalid OpenRouter API Key (401 Unauthorized).';
        suggestedFix = 'Double check that your key begins with "sk-or-v1-" and has not been revoked at openrouter.ai/keys.';
      } else if (statusCode === 402) {
        errorCategory = 'no_credits';
        errorMessage = 'Insufficient Credits (402 Payment Required).';
        suggestedFix = 'Add credit balance to your account at https://openrouter.ai/credits or choose a free model.';
      } else if (statusCode === 429) {
        errorCategory = 'rate_limited';
        errorMessage = 'Rate limit exceeded on OpenRouter (429 Too Many Requests).';
        suggestedFix = 'Wait a few seconds before testing again, or upgrade your OpenRouter account tier.';
      }

      res.json({
        status: 'error',
        statusCode,
        errorCategory,
        errorMessage,
        suggestedFix,
        latencyMs,
      });
      return;
    }

    const keyData = await keyRes.json();
    const data = keyData?.data || {};

    res.json({
      status: 'connected',
      latencyMs,
      label: data.label || 'Default Key',
      limit: data.limit,
      usage: data.usage,
      isFreeTier: data.is_free_tier,
      rateLimit: data.rate_limit,
    });
  } catch (err: any) {
    res.json({
      status: 'error',
      errorCategory: 'network_error',
      errorMessage: err.message || 'Failed to reach OpenRouter API servers.',
      suggestedFix: 'Check your internet connection and verify openrouter.ai is operational.',
      latencyMs: Date.now() - startTime,
    });
  }
});

// POST /api/openrouter/chat: Proxies completions with prompt assembly
app.post('/api/openrouter/chat', async (req: Request, res: Response) => {
  const apiKey = (req.body.apiKey || process.env.OPENROUTER_API_KEY || '').trim();
  const { model, messages, temperature, maxTokens, topP } = req.body;

  if (!apiKey) {
    res.status(401).json({
      error: 'Missing OpenRouter API Key',
      errorCategory: 'missing_key',
      message: 'Please provide an OpenRouter API key in Settings.',
    });
    return;
  }

  const chosenModel = model || 'gryphe/mythomax-l2-13b';

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': getAppUrl(req),
        'X-Title': 'Pretty Little Fantasies',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: chosenModel,
        messages,
        temperature: temperature ?? 0.85,
        max_tokens: maxTokens ?? 1024,
        top_p: topP ?? 0.95,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const err = data.error || {};
      let errorCategory = 'model_unavailable';
      if (response.status === 401) errorCategory = 'auth_failed';
      if (response.status === 402) errorCategory = 'no_credits';
      if (response.status === 429) errorCategory = 'rate_limited';

      res.status(response.status).json({
        error: err.message || `OpenRouter returned status ${response.status}`,
        statusCode: response.status,
        errorCategory,
        details: err,
      });
      return;
    }

    const reply = data.choices?.[0]?.message?.content || '';
    res.json({
      content: reply,
      model: data.model || chosenModel,
      usage: data.usage,
    });
  } catch (err: any) {
    res.status(500).json({
      error: err.message || 'Failed to communicate with OpenRouter',
      errorCategory: 'network_error',
    });
  }
});

// ---------------- GitHub Auto-Push Endpoint ---------------- //

app.post('/api/git/push', async (req: Request, res: Response) => {
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const execFileAsync = promisify(execFile);

  const token = (process.env.GITHUB_CLIENT_ID || process.env.GITHUB_TOKEN || '').trim();
  const repoUrl = req.body.repoUrl || 'https://github.com/norainnoflowers2294-maker/Chat-app.git';
  const commitMsg = req.body.commitMsg || `Update Pretty Little Fantasies - ${new Date().toISOString()}`;

  if (!token) {
    res.status(400).json({ error: 'GitHub token not found in environment' });
    return;
  }

  try {
    // Configure git identity
    await execFileAsync('git', ['config', 'user.name', 'norainnoflowers2294-maker']);
    await execFileAsync('git', ['config', 'user.email', 'jasminew70@gmail.com']);

    // Add all files
    await execFileAsync('git', ['add', '.']);

    // Commit
    try {
      await execFileAsync('git', ['commit', '-m', commitMsg]);
    } catch {
      // Nothing new to commit is fine
    }

    // Set authenticated remote
    const authedUrl = repoUrl.replace('https://', `https://norainnoflowers2294-maker:${token}@`);
    try {
      await execFileAsync('git', ['remote', 'set-url', 'origin', authedUrl]);
    } catch {
      await execFileAsync('git', ['remote', 'add', 'origin', authedUrl]);
    }

    // Ensure branch is main
    await execFileAsync('git', ['branch', '-M', 'main']);

    // Push with force if needed or standard push
    const { stdout, stderr } = await execFileAsync('git', ['push', '-u', 'origin', 'main']);

    res.json({
      success: true,
      message: 'Successfully pushed all code to GitHub repository!',
      repo: repoUrl,
      output: stdout || stderr,
    });
  } catch (err: any) {
    console.error('Git push error:', err);
    res.status(500).json({
      error: err.message,
      stdout: err.stdout,
      stderr: err.stderr,
    });
  }
});

// ---------------- Vite Middleware or Static Production Serving ---------------- //

async function setupServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (production: ${isProduction})`);
  });
}

setupServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

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

// ---------------- Universal AI Connection Doctor & Chat Proxy Endpoints ---------------- //

function maskKey(key: string): string {
  if (!key) return 'NOT_PROVIDED';
  if (key.length <= 8) return `${key.substring(0, 2)}***${key.substring(key.length - 2)}`;
  return `${key.substring(0, 6)}...${key.substring(key.length - 4)}`;
}

function classifyError(status: number | null, rawMsg: string): { category: string; suggestedFix: string } {
  const lower = (rawMsg || '').toLowerCase();
  if (status === 400 || lower.includes('bad request') || lower.includes('invalid argument')) {
    return {
      category: 'bad_request',
      suggestedFix: 'Check request payload formatting, model parameters, or unsupported temperature/token range.',
    };
  }
  if (status === 401 || lower.includes('unauthorized') || lower.includes('invalid api key') || lower.includes('key invalid')) {
    return {
      category: 'auth_failed',
      suggestedFix: 'Verify your API key format and ensure it is active without revoked permissions.',
    };
  }
  if (status === 402 || lower.includes('payment required') || lower.includes('insufficient_quota') || lower.includes('out of credits')) {
    return {
      category: 'no_credits',
      suggestedFix: 'Your API key account has run out of credits. Add funds or select a free model tier.',
    };
  }
  if (status === 403 || lower.includes('forbidden') || lower.includes('permission denied') || lower.includes('location not supported')) {
    return {
      category: 'forbidden',
      suggestedFix: 'Access forbidden. Check key scopes, geographic/region restrictions, or billing permissions.',
    };
  }
  if (status === 404 || lower.includes('not found') || lower.includes('model not found')) {
    return {
      category: 'not_found',
      suggestedFix: 'The selected model ID or endpoint was not found. Choose a known valid model from the list.',
    };
  }
  if (status === 429 || lower.includes('rate limit') || lower.includes('too many requests')) {
    return {
      category: 'rate_limited',
      suggestedFix: 'Rate limit hit. Wait a few seconds before retrying or upgrade your account rate limits.',
    };
  }
  if (lower.includes('timeout') || lower.includes('aborted') || lower.includes('etimeout')) {
    return {
      category: 'timeout',
      suggestedFix: 'Request timed out after waiting for response. Verify network latency and provider status.',
    };
  }
  if (lower.includes('cors') || lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return {
      category: 'cors_error',
      suggestedFix: 'Network or CORS policy blocked request. Ensure backend proxy is handling AI requests.',
    };
  }
  if (lower.includes('json') || lower.includes('syntaxerror') || lower.includes('unexpected token')) {
    return {
      category: 'parse_error',
      suggestedFix: 'Failed to parse AI provider response. The API may be returning HTML error pages or malformed streams.',
    };
  }
  return {
    category: 'network_error',
    suggestedFix: 'General network failure reaching AI provider. Check internet connectivity.',
  };
}

// POST /api/ai/test - Authenticated 4-stage test suite for OpenRouter & Google Gemini
app.post('/api/ai/test', async (req: Request, res: Response) => {
  const provider = (req.body.provider || 'openrouter') as 'openrouter' | 'gemini';
  const apiKey = (req.body.apiKey || (provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.OPENROUTER_API_KEY) || '').trim();
  const model = (req.body.model || (provider === 'gemini' ? 'gemini-2.5-flash' : 'gryphe/mythomax-l2-13b')).trim();

  if (!apiKey) {
    const errorMsg = `Missing API Key for ${provider === 'gemini' ? 'Google Gemini' : 'OpenRouter'}.`;
    res.json({
      status: 'error',
      provider,
      errorCategory: 'missing_key',
      errorMessage: errorMsg,
      suggestedFix: provider === 'gemini'
        ? 'Get a Gemini API key from https://aistudio.google.com/app/apikey and enter it in Settings.'
        : 'Get an OpenRouter API key from https://openrouter.ai/keys and enter it in Settings.',
      stages: {
        apiKeyCheck: 'failed',
        modelCheck: 'skipped',
        textGenCheck: 'skipped',
        streamCheck: 'skipped',
      },
      diagnosticReport: `=== COLORPOP AI CONNECTION DIAGNOSTIC REPORT ===\nTimestamp: ${new Date().toISOString()}\nProvider: ${provider}\nStatus: FAILED\nReason: ${errorMsg}\nAPI Key: [NOT SET]\n`,
    });
    return;
  }

  const startTime = Date.now();
  const stages = {
    apiKeyCheck: 'pending' as any,
    modelCheck: 'pending' as any,
    textGenCheck: 'pending' as any,
    streamCheck: 'pending' as any,
  };

  const reportLogs: string[] = [
    `=== COLORPOP AI CONNECTION DIAGNOSTIC REPORT ===`,
    `Timestamp: ${new Date().toISOString()}`,
    `Provider: ${provider.toUpperCase()}`,
    `Model: ${model}`,
    `API Key Masked: ${maskKey(apiKey)}`,
    `App Origin: ${getAppUrl(req)}`,
    `--------------------------------------------------`,
  ];

  try {
    if (provider === 'openrouter') {
      // Stage 1: Auth Key Check
      stages.apiKeyCheck = 'running';
      const keyRes = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': getAppUrl(req),
          'X-Title': 'ColorPop Connection Doctor',
        },
      });

      if (!keyRes.ok) {
        stages.apiKeyCheck = 'failed';
        stages.modelCheck = 'skipped';
        stages.textGenCheck = 'skipped';
        stages.streamCheck = 'skipped';
        const errJson = await keyRes.json().catch(() => ({}));
        const rawErr = errJson?.error?.message || `HTTP ${keyRes.status} on auth check`;
        const classified = classifyError(keyRes.status, rawErr);
        reportLogs.push(`[STAGE 1: Auth Check] FAILED (HTTP ${keyRes.status}): ${rawErr}`);

        res.json({
          status: 'error',
          provider,
          statusCode: keyRes.status,
          errorCategory: classified.category,
          errorMessage: `Stage 1 Auth Failed: ${rawErr}`,
          suggestedFix: classified.suggestedFix,
          latencyMs: Date.now() - startTime,
          stages,
          diagnosticReport: reportLogs.join('\n'),
        });
        return;
      }
      stages.apiKeyCheck = 'success';
      reportLogs.push(`[STAGE 1: Auth Check] SUCCESS (HTTP 200 OK)`);

      // Stage 2: Model Existence Check
      stages.modelCheck = 'running';
      const modelsRes = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (modelsRes.ok) {
        const modelsData = await modelsRes.json().catch(() => ({}));
        const found = Array.isArray(modelsData?.data)
          ? modelsData.data.some((m: any) => m.id === model)
          : true;
        if (!found) {
          reportLogs.push(`[STAGE 2: Model Check] WARNING: Model '${model}' not listed in default catalog, attempting test generation anyway.`);
        } else {
          reportLogs.push(`[STAGE 2: Model Check] SUCCESS: Model '${model}' found in OpenRouter registry.`);
        }
      }
      stages.modelCheck = 'success';

      // Stage 3: Text Generation Test
      stages.textGenCheck = 'running';
      const textGenRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': getAppUrl(req),
          'X-Title': 'ColorPop Connection Doctor',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Ping test' }],
          max_tokens: 5,
        }),
      });

      if (!textGenRes.ok) {
        stages.textGenCheck = 'failed';
        stages.streamCheck = 'skipped';
        const textErrJson = await textGenRes.json().catch(() => ({}));
        const rawErr = textErrJson?.error?.message || `HTTP ${textGenRes.status} on text gen`;
        const classified = classifyError(textGenRes.status, rawErr);
        reportLogs.push(`[STAGE 3: Text Generation] FAILED (HTTP ${textGenRes.status}): ${rawErr}`);

        res.json({
          status: 'error',
          provider,
          statusCode: textGenRes.status,
          errorCategory: classified.category,
          errorMessage: `Stage 3 Text Generation Failed: ${rawErr}`,
          suggestedFix: classified.suggestedFix,
          latencyMs: Date.now() - startTime,
          stages,
          diagnosticReport: reportLogs.join('\n'),
        });
        return;
      }
      stages.textGenCheck = 'success';
      reportLogs.push(`[STAGE 3: Text Generation] SUCCESS (HTTP 200 OK)`);

      // Stage 4: Streaming Response Test
      stages.streamCheck = 'running';
      const streamRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': getAppUrl(req),
          'X-Title': 'ColorPop Connection Doctor',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Ping stream' }],
          max_tokens: 5,
          stream: true,
        }),
      });

      if (!streamRes.ok) {
        stages.streamCheck = 'failed';
        const streamErrJson = await streamRes.json().catch(() => ({}));
        const rawErr = streamErrJson?.error?.message || `HTTP ${streamRes.status} on streaming test`;
        const classified = classifyError(streamRes.status, rawErr);
        reportLogs.push(`[STAGE 4: Streaming Test] FAILED (HTTP ${streamRes.status}): ${rawErr}`);

        res.json({
          status: 'error',
          provider,
          statusCode: streamRes.status,
          errorCategory: classified.category,
          errorMessage: `Stage 4 Streaming Test Failed: ${rawErr}`,
          suggestedFix: classified.suggestedFix,
          latencyMs: Date.now() - startTime,
          stages,
          diagnosticReport: reportLogs.join('\n'),
        });
        return;
      }
      stages.streamCheck = 'success';
      reportLogs.push(`[STAGE 4: Streaming Test] SUCCESS (HTTP 200 OK)`);

      const latencyMs = Date.now() - startTime;
      reportLogs.push(`--------------------------------------------------`);
      reportLogs.push(`SUMMARY: ALL 4 DIAGNOSTIC CHECKS PASSED (Total Latency: ${latencyMs}ms)`);

      res.json({
        status: 'connected',
        provider: 'openrouter',
        latencyMs,
        statusCode: 200,
        stages,
        diagnosticReport: reportLogs.join('\n'),
      });
    } else {
      // GOOGLE GEMINI AUTHENTICATED 4-STAGE DIAGNOSTIC
      // Stage 1: Auth API Key Check via Models Listing
      stages.apiKeyCheck = 'running';
      const listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
      const modelsRes = await fetch(listModelsUrl);

      if (!modelsRes.ok) {
        stages.apiKeyCheck = 'failed';
        stages.modelCheck = 'skipped';
        stages.textGenCheck = 'skipped';
        stages.streamCheck = 'skipped';
        const errJson = await modelsRes.json().catch(() => ({}));
        const rawErr = errJson?.error?.message || `HTTP ${modelsRes.status} on Gemini Key Check`;
        const classified = classifyError(modelsRes.status, rawErr);
        reportLogs.push(`[STAGE 1: Auth Check] FAILED (HTTP ${modelsRes.status}): ${rawErr}`);

        res.json({
          status: 'error',
          provider: 'gemini',
          statusCode: modelsRes.status,
          errorCategory: classified.category,
          errorMessage: `Stage 1 Gemini Key Check Failed: ${rawErr}`,
          suggestedFix: classified.suggestedFix,
          latencyMs: Date.now() - startTime,
          stages,
          diagnosticReport: reportLogs.join('\n'),
        });
        return;
      }
      stages.apiKeyCheck = 'success';
      reportLogs.push(`[STAGE 1: Auth Check] SUCCESS (HTTP 200 OK)`);

      // Stage 2: Model Check
      stages.modelCheck = 'running';
      const modelsData = await modelsRes.json().catch(() => ({}));
      const modelList = Array.isArray(modelsData?.models) ? modelsData.models : [];
      const cleanModelName = model.startsWith('models/') ? model : `models/${model}`;
      const found = modelList.some((m: any) => m.name === cleanModelName || m.name?.endsWith(model));
      if (found) {
        reportLogs.push(`[STAGE 2: Model Check] SUCCESS: Model '${model}' verified in Google Gemini API.`);
      } else {
        reportLogs.push(`[STAGE 2: Model Check] WARNING: Model '${model}' not listed in Gemini catalog; proceeding with test request.`);
      }
      stages.modelCheck = 'success';

      // Stage 3: Text Generation Check
      stages.textGenCheck = 'running';
      const reqModel = model.replace(/^models\//, '');
      const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(reqModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const textGenRes = await fetch(genUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Ping test' }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      });

      if (!textGenRes.ok) {
        stages.textGenCheck = 'failed';
        stages.streamCheck = 'skipped';
        const textErrJson = await textGenRes.json().catch(() => ({}));
        const rawErr = textErrJson?.error?.message || `HTTP ${textGenRes.status} on Gemini generateContent`;
        const classified = classifyError(textGenRes.status, rawErr);
        reportLogs.push(`[STAGE 3: Text Generation] FAILED (HTTP ${textGenRes.status}): ${rawErr}`);

        res.json({
          status: 'error',
          provider: 'gemini',
          statusCode: textGenRes.status,
          errorCategory: classified.category,
          errorMessage: `Stage 3 Gemini Text Generation Failed: ${rawErr}`,
          suggestedFix: classified.suggestedFix,
          latencyMs: Date.now() - startTime,
          stages,
          diagnosticReport: reportLogs.join('\n'),
        });
        return;
      }
      stages.textGenCheck = 'success';
      reportLogs.push(`[STAGE 3: Text Generation] SUCCESS (HTTP 200 OK)`);

      // Stage 4: Streaming Check
      stages.streamCheck = 'running';
      const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(reqModel)}:streamGenerateContent?key=${encodeURIComponent(apiKey)}&alt=sse`;
      const streamRes = await fetch(streamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Ping stream' }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      });

      if (!streamRes.ok) {
        stages.streamCheck = 'failed';
        const streamErrJson = await streamRes.json().catch(() => ({}));
        const rawErr = streamErrJson?.error?.message || `HTTP ${streamRes.status} on Gemini streamGenerateContent`;
        const classified = classifyError(streamRes.status, rawErr);
        reportLogs.push(`[STAGE 4: Streaming Test] FAILED (HTTP ${streamRes.status}): ${rawErr}`);

        res.json({
          status: 'error',
          provider: 'gemini',
          statusCode: streamRes.status,
          errorCategory: classified.category,
          errorMessage: `Stage 4 Gemini Streaming Test Failed: ${rawErr}`,
          suggestedFix: classified.suggestedFix,
          latencyMs: Date.now() - startTime,
          stages,
          diagnosticReport: reportLogs.join('\n'),
        });
        return;
      }
      stages.streamCheck = 'success';
      reportLogs.push(`[STAGE 4: Streaming Test] SUCCESS (HTTP 200 OK)`);

      const latencyMs = Date.now() - startTime;
      reportLogs.push(`--------------------------------------------------`);
      reportLogs.push(`SUMMARY: ALL 4 DIAGNOSTIC CHECKS PASSED (Total Latency: ${latencyMs}ms)`);

      res.json({
        status: 'connected',
        provider: 'gemini',
        latencyMs,
        statusCode: 200,
        stages,
        diagnosticReport: reportLogs.join('\n'),
      });
    }
  } catch (err: any) {
    const rawErr = err.message || 'Network exception during test';
    const classified = classifyError(null, rawErr);
    reportLogs.push(`[NETWORK EXCEPTION]: ${rawErr}`);

    res.json({
      status: 'error',
      provider,
      errorCategory: classified.category,
      errorMessage: rawErr,
      suggestedFix: classified.suggestedFix,
      latencyMs: Date.now() - startTime,
      stages,
      diagnosticReport: reportLogs.join('\n'),
    });
  }
});

// Backward compatibility for legacy frontend calls
app.post('/api/openrouter/test', async (req: Request, res: Response) => {
  req.body.provider = 'openrouter';
  return app._router.handle(req, res, () => {});
});

// POST /api/ai/chat - Universal Roleplay Chat Proxy for OpenRouter & Google Gemini
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  const provider = (req.body.provider || 'openrouter') as 'openrouter' | 'gemini';
  const apiKey = (
    req.body.apiKey ||
    (provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.OPENROUTER_API_KEY) ||
    ''
  ).trim();

  const { model, messages, temperature, maxTokens, topP } = req.body;

  if (!apiKey) {
    res.status(401).json({
      error: `Missing ${provider === 'gemini' ? 'Google Gemini' : 'OpenRouter'} API Key`,
      errorCategory: 'missing_key',
      message: 'Please enter a valid API key in Settings.',
    });
    return;
  }

  try {
    if (provider === 'openrouter') {
      const chosenModel = model || 'gryphe/mythomax-l2-13b';
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': getAppUrl(req),
          'X-Title': 'ColorPop Roleplay Hub',
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

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const err = data.error || {};
        const classified = classifyError(response.status, err.message || `HTTP ${response.status}`);
        res.status(response.status).json({
          error: err.message || `OpenRouter returned status ${response.status}`,
          statusCode: response.status,
          errorCategory: classified.category,
          suggestedFix: classified.suggestedFix,
          details: err,
        });
        return;
      }

      const reply = data.choices?.[0]?.message?.content || '';
      res.json({
        content: reply,
        model: data.model || chosenModel,
        provider: 'openrouter',
        usage: data.usage,
      });
    } else {
      // GOOGLE GEMINI CHAT COMPLETION
      const chosenModel = (model || 'gemini-2.5-flash').replace(/^models\//, '');

      // Convert standard system + user/assistant messages to Gemini format
      let systemInstruction: any = undefined;
      const contents: any[] = [];

      if (Array.isArray(messages)) {
        messages.forEach((m: any) => {
          if (m.role === 'system') {
            systemInstruction = { parts: [{ text: m.content }] };
          } else {
            const geminiRole = m.role === 'assistant' ? 'model' : 'user';
            contents.push({
              role: geminiRole,
              parts: [{ text: m.content || '' }],
            });
          }
        });
      }

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(chosenModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const geminiBody: any = {
        contents,
        generationConfig: {
          temperature: temperature ?? 0.85,
          maxOutputTokens: maxTokens ?? 1024,
          topP: topP ?? 0.95,
        },
      };

      if (systemInstruction) {
        geminiBody.systemInstruction = systemInstruction;
      }

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const err = data.error || {};
        const classified = classifyError(response.status, err.message || `HTTP ${response.status}`);
        res.status(response.status).json({
          error: err.message || `Google Gemini returned status ${response.status}`,
          statusCode: response.status,
          errorCategory: classified.category,
          suggestedFix: classified.suggestedFix,
          details: err,
        });
        return;
      }

      const candidateText = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';

      res.json({
        content: candidateText,
        model: chosenModel,
        provider: 'gemini',
        usage: data.usageMetadata,
      });
    }
  } catch (err: any) {
    const rawErr = err.message || 'Failed to communicate with AI provider';
    const classified = classifyError(null, rawErr);
    res.status(500).json({
      error: rawErr,
      errorCategory: classified.category,
      suggestedFix: classified.suggestedFix,
    });
  }
});

// Backward compatibility for legacy /api/openrouter/chat
app.post('/api/openrouter/chat', async (req: Request, res: Response) => {
  req.body.provider = 'openrouter';
  return app._router.handle(req, res, () => {});
});

// POST /api/ai/chat/stream - Streaming SSE Endpoint for OpenRouter and Google Gemini
app.post('/api/ai/chat/stream', async (req: Request, res: Response) => {
  const provider = (req.body.provider || 'openrouter') as 'openrouter' | 'gemini';
  const apiKey = (
    req.body.apiKey ||
    (provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.OPENROUTER_API_KEY) ||
    ''
  ).trim();

  const { model, messages, temperature, maxTokens, topP } = req.body;

  if (!apiKey) {
    res.status(401).json({
      error: `Missing ${provider === 'gemini' ? 'Google Gemini' : 'OpenRouter'} API Key`,
      errorCategory: 'missing_key',
    });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    if (provider === 'openrouter') {
      const chosenModel = model || 'gryphe/mythomax-l2-13b';
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': getAppUrl(req),
          'X-Title': 'ColorPop Roleplay Hub',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: chosenModel,
          messages,
          temperature: temperature ?? 0.85,
          max_tokens: maxTokens ?? 1024,
          top_p: topP ?? 0.95,
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        const errJson = await response.json().catch(() => ({}));
        res.write(`data: ${JSON.stringify({ error: errJson?.error?.message || `HTTP ${response.status}` })}\n\n`);
        res.end();
        return;
      }

      const reader = (response.body as any).getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }
      res.end();
    } else {
      // GEMINI STREAMING
      const chosenModel = (model || 'gemini-2.5-flash').replace(/^models\//, '');
      let systemInstruction: any = undefined;
      const contents: any[] = [];

      if (Array.isArray(messages)) {
        messages.forEach((m: any) => {
          if (m.role === 'system') {
            systemInstruction = { parts: [{ text: m.content }] };
          } else {
            const geminiRole = m.role === 'assistant' ? 'model' : 'user';
            contents.push({
              role: geminiRole,
              parts: [{ text: m.content || '' }],
            });
          }
        });
      }

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(chosenModel)}:streamGenerateContent?key=${encodeURIComponent(apiKey)}&alt=sse`;

      const geminiBody: any = {
        contents,
        generationConfig: {
          temperature: temperature ?? 0.85,
          maxOutputTokens: maxTokens ?? 1024,
          topP: topP ?? 0.95,
        },
      };
      if (systemInstruction) geminiBody.systemInstruction = systemInstruction;

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      });

      if (!response.ok || !response.body) {
        const errJson = await response.json().catch(() => ({}));
        res.write(`data: ${JSON.stringify({ error: errJson?.error?.message || `HTTP ${response.status}` })}\n\n`);
        res.end();
        return;
      }

      const reader = (response.body as any).getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }
      res.end();
    }
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// ---------------- GitHub Auto-Push Endpoint ---------------- //

app.post('/api/git/push', async (req: Request, res: Response) => {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  const token = (process.env.GITHUB_CLIENT_ID || process.env.GITHUB_TOKEN || '').trim();
  const repoUrl = req.body.repoUrl || 'https://github.com/norainnoflowers2294-maker/Chat-app.git';
  const commitMsg = req.body.commitMsg || `Update ColorPop Roleplay Hub - ${new Date().toISOString()}`;

  if (!token) {
    res.status(400).json({ error: 'GitHub token not found in environment' });
    return;
  }

  try {
    // Configure git identity
    await execAsync('git config user.name "norainnoflowers2294-maker"');
    await execAsync('git config user.email "jasminew70@gmail.com"');

    // Add all files
    await execAsync('git add .');

    // Commit
    try {
      await execAsync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
    } catch {
      // Nothing new to commit is fine
    }

    // Set authenticated remote
    const authedUrl = repoUrl.replace('https://', `https://norainnoflowers2294-maker:${token}@`);
    await execAsync(`git remote set-url origin "${authedUrl}" 2>/dev/null || git remote add origin "${authedUrl}"`);

    // Ensure branch is main
    await execAsync('git branch -M main');

    // Push with force if needed or standard push
    const { stdout, stderr } = await execAsync('git push -u origin main');

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

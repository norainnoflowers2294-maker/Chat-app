import type { ConnectionDiagnostic, OpenRouterConfig } from '../types/roleplay';

const API = 'https://openrouter.ai/api/v1';

export class OpenRouterError extends Error {
  status: number;
  suggestedFix: string;
  constructor(message: string, status = 0) {
    super(message);
    this.name = 'OpenRouterError';
    this.status = status;
    this.suggestedFix = status === 401 ? 'Enter a valid OpenRouter key in Settings, then save.'
      : status === 402 ? 'Check your OpenRouter balance and key spending limit, or select an available free model.'
      : status === 429 ? 'Rate limit reached. Wait before trying again.'
      : status === 404 ? 'This model is unavailable. Choose a current model ID from OpenRouter.'
      : status === 403 ? 'Check the provider message and your OpenRouter privacy settings.'
      : 'Check your internet connection and selected model, then try again.';
  }
}

async function request(path: string, apiKey: string, body?: object) {
  const key = apiKey.trim();
  if (!key) throw new OpenRouterError('OpenRouter API key is missing.', 401);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), body ? 120000 : 20000);
  try {
    // User-provided keys go only to OpenRouter, never into the build or a Pages API route.
    const response = await fetch(`${API}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${key}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.error) {
      const message = typeof data?.error === 'string' ? data.error : data?.error?.message;
      throw new OpenRouterError(message || `OpenRouter returned HTTP ${response.status}.`, Number(data?.error?.code) || response.status);
    }
    if (!data || typeof data !== 'object') throw new OpenRouterError('OpenRouter returned an unreadable response.');
    return data;
  } catch (error) {
    if (error instanceof OpenRouterError) throw error;
    throw new OpenRouterError(controller.signal.aborted
      ? 'OpenRouter took too long to respond. Try again.'
      : 'Could not reach OpenRouter. Check your internet connection.');
  } finally {
    clearTimeout(timer);
  }
}

export async function testOpenRouterConnection(apiKey: string): Promise<ConnectionDiagnostic> {
  const start = Date.now();
  try {
    await request('/key', apiKey);
    return { status: 'connected', lastChecked: Date.now(), statusCode: 200, latencyMs: Date.now() - start };
  } catch (error) {
    const err = error as OpenRouterError;
    return {
      status: 'error', lastChecked: Date.now(), latencyMs: Date.now() - start,
      statusCode: err.status, errorMessage: err.message, suggestedFix: err.suggestedFix,
      errorCategory: !apiKey.trim() ? 'missing_key' : err.status === 401 ? 'auth_failed'
        : err.status === 402 ? 'no_credits' : err.status === 429 ? 'rate_limited' : 'network_error',
    };
  }
}

export async function sendOpenRouterChat(config: OpenRouterConfig, messages: { role: string; content: string }[]): Promise<string> {
  if (!config.model.trim()) throw new OpenRouterError('Choose an OpenRouter model in Settings.', 404);
  const data = await request('/chat/completions', config.apiKey, {
    model: config.model.trim(), messages, temperature: config.temperature,
    max_tokens: config.maxTokens, top_p: config.topP, stream: false,
  });
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new OpenRouterError('The model returned no text. Try again or choose another model.');
  }
  return content;
}

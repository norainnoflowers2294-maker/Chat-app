import type { ConnectionDiagnostic, OpenRouterConfig } from '../types/roleplay';

const API = 'https://openrouter.ai/api/v1';

export interface OpenRouterModelInfo {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  supported_parameters?: string[];
}
export interface OpenRouterResponseInfo { model: string; provider?: string; }

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

export async function fetchOpenRouterModels(apiKey: string): Promise<OpenRouterModelInfo[]> {
  const data = await request('/models', apiKey);
  if (!Array.isArray(data.data)) throw new OpenRouterError('OpenRouter returned an invalid model list.');
  return data.data
    .filter((model: any) => typeof model?.id === 'string' && model.id.trim())
    .map((model: any) => ({
      id: model.id,
      name: typeof model.name === 'string' ? model.name : undefined,
      context_length: Number.isFinite(model.context_length) ? model.context_length : undefined,
      pricing: model.pricing && typeof model.pricing === 'object' ? {
        prompt: typeof model.pricing.prompt === 'string' ? model.pricing.prompt : undefined,
        completion: typeof model.pricing.completion === 'string' ? model.pricing.completion : undefined,
      } : undefined,
      supported_parameters: Array.isArray(model.supported_parameters)
        ? model.supported_parameters.filter((parameter: unknown): parameter is string => typeof parameter === 'string')
        : undefined,
    }))
    .sort((a: OpenRouterModelInfo, b: OpenRouterModelInfo) => (a.name || a.id).localeCompare(b.name || b.id));
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
        : err.status === 402 ? 'no_credits' : err.status === 404 ? 'model_unavailable'
        : err.status === 429 ? 'rate_limited' : 'network_error',
    };
  }
}

export async function sendOpenRouterChatDetailed(
  config: OpenRouterConfig,
  messages: { role: string; content: string }[],
): Promise<{ content: string; response: OpenRouterResponseInfo }> {
  if (!config.model.trim()) throw new OpenRouterError('Choose an OpenRouter model in Settings.', 404);
  const supported = config.supportedParameters ? new Set(config.supportedParameters) : null;
  const body: Record<string, unknown> = {
    model: config.model.trim(),
    messages,
    max_tokens: config.maxTokens,
    stream: false,
  };
  if (!supported || supported.has('temperature')) body.temperature = config.temperature;
  if (!supported || supported.has('top_p')) body.top_p = config.topP;
  if (supported?.has('frequency_penalty')) body.frequency_penalty = config.frequencyPenalty ?? 0;
  if (supported?.has('presence_penalty')) body.presence_penalty = config.presencePenalty ?? 0;

  const data = await request('/chat/completions', config.apiKey, body);
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new OpenRouterError('The model returned no text. Try again or choose another model.');
  }
  return {
    content,
    response: {
      model: typeof data.model === 'string' ? data.model : config.model.trim(),
      ...(typeof data.provider === 'string' ? { provider: data.provider } : {}),
    },
  };
}

export async function sendOpenRouterChat(config: OpenRouterConfig, messages: { role: string; content: string }[]): Promise<string> {
  const result = await sendOpenRouterChatDetailed(config, messages);
  return result.content;
}


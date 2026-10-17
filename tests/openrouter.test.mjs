import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fetchOpenRouterModels, sendOpenRouterChat, sendOpenRouterChatDetailed, testOpenRouterConnection } from '../src/lib/openrouter.ts';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const config = { apiKey: ' test-key ', model: ' provider/model ', temperature: 0.8, maxTokens: 512, topP: 0.9, frequencyPenalty: 0.2, presencePenalty: 0.3, supportedParameters: ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty'] };
const messages = [{ role: 'user', content: 'Hello' }];
test('chat reaches OpenRouter directly with normalized API fields and reads choices', async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(init.headers.Authorization, 'Bearer test-key');
    assert.deepEqual(JSON.parse(init.body), { model: 'provider/model', messages, temperature: 0.8, max_tokens: 512, top_p: 0.9, frequency_penalty: 0.2, presence_penalty: 0.3, stream: false });
    return Response.json({ choices: [{ message: { content: 'Hello back' } }] });
  };
  assert.equal(await sendOpenRouterChat(config, messages), 'Hello back');
});
test('unsupported penalty values are omitted from provider requests', async () => {
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    assert.equal(body.temperature, 0.8);
    assert.equal(body.top_p, 0.9);
    assert.ok(!('frequency_penalty' in body));
    assert.ok(!('presence_penalty' in body));
    return Response.json({ choices: [{ message: { content: 'ok' } }] });
  };
  await sendOpenRouterChat({ ...config, supportedParameters: ['temperature', 'top_p'] }, messages);
});
test('detailed response reports the model and provider returned by OpenRouter', async () => {
  globalThis.fetch = async () => Response.json({ model: 'provider/actual-model', provider: 'Actual Provider', choices: [{ message: { content: 'ok' } }] });
  const result = await sendOpenRouterChatDetailed(config, messages);
  assert.deepEqual(result.response, { model: 'provider/actual-model', provider: 'Actual Provider' });
});
test('model catalog uses live OpenRouter metadata', async () => {
  globalThis.fetch = async (url) => {
    assert.equal(url, 'https://openrouter.ai/api/v1/models');
    return Response.json({ data: [{ id: 'x/model', name: 'Model X', context_length: 8192, pricing: { prompt: '0', completion: '0.000001' }, supported_parameters: ['temperature'] }] });
  };
  assert.deepEqual(await fetchOpenRouterModels('test-key'), [{ id: 'x/model', name: 'Model X', context_length: 8192, pricing: { prompt: '0', completion: '0.000001' }, supported_parameters: ['temperature'] }]);
});
test('connection test authenticates key without generating a paid reply', async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://openrouter.ai/api/v1/key');
    assert.equal(init.method, 'GET');
    return Response.json({ data: { label: 'test' } });
  };
  assert.equal((await testOpenRouterConnection('test-key')).status, 'connected');
});
test('missing key does not send a request', async () => {
  globalThis.fetch = () => { throw new Error('must not fetch'); };
  assert.equal((await testOpenRouterConnection('  ')).errorCategory, 'missing_key');
});
for (const status of [401, 402, 403, 404, 429, 503]) {
  test(`HTTP ${status} preserves provider error and offers guidance`, async () => {
    globalThis.fetch = async () => Response.json({ error: { message: 'Provider error' } }, { status });
    await assert.rejects(sendOpenRouterChat(config, messages), err => err.status === status && err.message === 'Provider error' && !!err.suggestedFix);
  });
}
test('HTTP 200 error payload is not a successful chat', async () => {
  globalThis.fetch = async () => Response.json({ error: { code: 429, message: 'Busy' } });
  await assert.rejects(sendOpenRouterChat(config, messages), err => err.status === 429);
});
test('empty replies and HTML errors are reported', async () => {
  globalThis.fetch = async () => Response.json({ choices: [{ message: { content: null } }] });
  await assert.rejects(sendOpenRouterChat(config, messages), /no text/);
  globalThis.fetch = async () => new Response('<html>Error</html>', { status: 502 });
  await assert.rejects(sendOpenRouterChat(config, messages), /HTTP 502/);
});
test('network failure is actionable', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  assert.equal((await testOpenRouterConnection('test-key')).errorCategory, 'network_error');
});
test('settings keep legacy data compatibility without exposing Supabase controls', () => {
  const modal = readFileSync(new URL('../src/components/OpenRouterSettingsModal.tsx', import.meta.url), 'utf8');
  const save = modal.slice(modal.indexOf('const handleSave ='), modal.indexOf('const handleGitPush ='));
  assert.ok(save.includes('apiKey: apiKey.trim()'));
  assert.ok(!modal.includes('Supabase'));
  assert.ok(modal.includes('Pretty Little Fantasies Settings'));
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.ok(app.includes('supabaseConfig'));
});


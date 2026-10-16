import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sendOpenRouterChat, testOpenRouterConnection } from '../src/lib/openrouter.ts';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const config = { apiKey: ' test-key ', model: ' provider/model ', temperature: 0.8, maxTokens: 512, topP: 0.9 };
const messages = [{ role: 'user', content: 'Hello' }];
test('chat reaches OpenRouter directly with normalized API fields and reads choices', async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(init.headers.Authorization, 'Bearer test-key');
    assert.deepEqual(JSON.parse(init.body), { model: 'provider/model', messages, temperature: 0.8, max_tokens: 512, top_p: 0.9, frequency_penalty: 0, presence_penalty: 0, stream: false });
    return Response.json({ choices: [{ message: { content: 'Hello back' } }] });
  };
  assert.equal(await sendOpenRouterChat(config, messages), 'Hello back');
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
test('settings use one combined save so Supabase cannot overwrite the new key', () => {
  const modal = readFileSync(new URL('../src/components/OpenRouterSettingsModal.tsx', import.meta.url), 'utf8');
  const save = modal.slice(modal.indexOf('const handleSave ='), modal.indexOf('const handleGitPush ='));
  assert.ok(save.includes('apiKey: apiKey.trim()'));
  assert.ok(!save.includes('onSaveSupabaseConfig('));
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.ok(app.includes('supabaseConfig: supabaseCfg ?? data.supabaseConfig'));
});


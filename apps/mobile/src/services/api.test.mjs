import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

// Runs api.ts with fake storage and fetch: the backend rotates refresh tokens, so parallel 401s
// must share one /auth/refresh call.
function load(server) {
  const store = new Map([['access_token', 'old'], ['refresh_token', 'r1']]);
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push([url, init.headers?.Authorization ?? null]);
    const { status, body } = await server(url, init, store);
    return { ok: status < 400, status, json: async () => body };
  };
  const source = stripTypeScriptTypes(readFileSync(new URL('./api.ts', import.meta.url), 'utf8'))
    .replace(/^import .*;$/gm, '')
    .replace(/^export /gm, '');
  const ctx = {
    fetch,
    SecureStore: {
      getItemAsync: async (k) => store.get(k) ?? null,
      setItemAsync: async (k, v) => void store.set(k, v),
    },
    Crypto: { randomUUID: () => 'uuid' },
    API_URL: 'https://api.test',
    JSON,
    Promise,
  };
  const mod = runInNewContext(`${source}\n({ api, onSessionExpired })`, ctx);
  return { ...mod, calls, store };
}

test('parallel 401s trigger a single refresh and every call is retried with the new token', async () => {
  let refreshes = 0;
  const { api, calls, store } = load(async (url, init) => {
    if (url.endsWith('/auth/refresh')) {
      refreshes++;
      await new Promise((r) => setTimeout(r, 5));
      return { status: 201, body: { access_token: 'new', refresh_token: 'r2' } };
    }
    return init.headers.Authorization === 'Bearer new' ? { status: 200, body: { url } } : { status: 401, body: {} };
  });
  const results = await Promise.all([api.get('/a'), api.get('/b'), api.post('/c', {})]);
  assert.equal(refreshes, 1);
  assert.deepEqual(results.map((r) => r.url), ['https://api.test/a', 'https://api.test/b', 'https://api.test/c']);
  assert.equal(store.get('refresh_token'), 'r2');
  assert.equal(calls.filter(([u]) => !u.endsWith('/auth/refresh')).length, 6);
});

test('refused refresh ends the session; network failure does not', async () => {
  let expired = 0;
  let refreshStatus = 401;
  const { api, onSessionExpired } = load(async (url) =>
    url.endsWith('/auth/refresh') ? { status: refreshStatus, body: {} } : { status: 401, body: {} },
  );
  onSessionExpired(() => expired++);
  await assert.rejects(api.get('/x'));
  assert.equal(expired, 1);
  refreshStatus = 503;
  await assert.rejects(api.get('/x'));
  assert.equal(expired, 1);
});

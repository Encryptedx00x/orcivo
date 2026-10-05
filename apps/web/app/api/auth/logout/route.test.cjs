const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness(response, withRefresh = true) {
  const jar = new Map([['access_token', 'fixture-access']]);
  if (withRefresh) jar.set('refresh_token', 'fixture-refresh');
  const calls = [];
  const source = fs.readFileSync(require.resolve('./route.ts'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace('export async function POST', 'module.exports = async function POST');
  const context = {
    module: { exports: {} }, AbortSignal,
    cookies: () => ({ get: (key) => jar.has(key) ? { value: jar.get(key) } : undefined, delete: (key) => jar.delete(key) }),
    NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200 }) },
    process: { env: { API_URL: 'https://fixture.invalid' } },
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (response instanceof Error) throw response;
      return response;
    },
  };
  vm.runInNewContext(source, context, { timeout: 1000 });
  return { run: context.module.exports, jar, calls };
}

test('logout revokes refresh on backend and removes both browser cookies', async () => {
  const h = harness({ ok: true, status: 200 });
  assert.equal((await h.run()).status, 200);
  assert.equal(h.jar.size, 0);
  assert.equal(h.calls[0].url, 'https://fixture.invalid/auth/logout/refresh');
  assert.equal(JSON.parse(h.calls[0].options.body).refresh_token, 'fixture-refresh');
});

test('logout still clears cookies when backend fails and does not claim revocation', async () => {
  for (const response of [new Error('fixture offline'), { ok: false, status: 500 }]) {
    const h = harness(response);
    assert.equal((await h.run()).status, 503);
    assert.equal(h.jar.size, 0);
  }
});

test('expired refresh and repeated logout remain safe', async () => {
  const expired = harness({ ok: false, status: 401 });
  assert.equal((await expired.run()).status, 200);
  assert.equal(expired.jar.size, 0);
  const empty = harness(null, false);
  assert.equal((await empty.run()).status, 200);
  assert.equal(empty.jar.size, 0);
  assert.equal(empty.calls.length, 0);
});

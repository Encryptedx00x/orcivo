const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { transformSync } = require('esbuild');

const id = '11111111-1111-4111-8111-111111111111';
function setup({ token = 'session-token', status = 200, networkError = false } = {}) {
  const calls = [];
  const fakeModule = { exports: {} };
  const code = transformSync(fs.readFileSync(path.join(__dirname, 'actions.ts'), 'utf8'), {
    loader: 'ts',
    format: 'cjs',
    target: 'es2022',
  }).code;
  vm.runInNewContext(code, {
    module: fakeModule,
    exports: fakeModule.exports,
    process: { env: { API_URL: 'http://backend.test' } },
    require: (name) => {
      assert.equal(name, 'next/headers');
      return { cookies: () => ({ get: () => (token ? { value: token } : undefined) }) };
    },
    fetch: async (...args) => {
      calls.push(args);
      if (networkError) throw new Error('internal connection detail');
      return { ok: status >= 200 && status < 300, status };
    },
  });
  return { actions: fakeModule.exports, calls };
}

test('server actions forward PATCH and DELETE using only the server session', async () => {
  const s = setup();
  assert.equal((await s.actions.updateAppointment(id, { title: 'Changed', notes: null })).ok, true);
  assert.equal((await s.actions.deleteAppointment(id)).ok, true);
  assert.equal(s.calls[0][0], `http://backend.test/appointments/${id}`);
  assert.equal(s.calls[0][1].method, 'PATCH');
  assert.equal(s.calls[0][1].headers.Authorization, 'Bearer session-token');
  assert.equal(s.calls[0][1].body, JSON.stringify({ title: 'Changed', notes: null }));
  assert.equal(s.calls[1][1].method, 'DELETE');
  assert.equal(s.calls[1][1].body, undefined);
});

test('missing authentication or invalid IDs never reach the backend', async () => {
  const unauthenticated = setup({ token: null });
  assert.equal((await unauthenticated.actions.deleteAppointment(id)).ok, false);
  assert.equal(unauthenticated.calls.length, 0);
  const invalid = setup();
  assert.equal(
    (await invalid.actions.updateAppointment('invalid', { title: 'Changed' })).ok,
    false,
  );
  assert.equal(invalid.calls.length, 0);
});

test('HTTP failures and network errors return safe actionable messages', async () => {
  for (const status of [400, 401, 403, 404, 409, 500]) {
    const s = setup({ status });
    const result = await s.actions.updateAppointment(id, { title: 'Changed' });
    assert.equal(result.ok, false);
    assert.ok(result.message.length > 0);
    assert.ok(!result.message.includes('session-token'));
  }
  const s = setup({ networkError: true });
  const result = await s.actions.deleteAppointment(id);
  assert.equal(result.ok, false);
  assert.ok(!result.message.includes('internal connection detail'));
});

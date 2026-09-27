const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { transformSync } = require('esbuild');

function setup({ token = 'session-token', status = 200, body = null, networkError = false } = {}) {
  const calls = [];
  const module = { exports: {} };
  const code = transformSync(fs.readFileSync(path.join(__dirname, 'actions.ts'), 'utf8'), {
    loader: 'ts',
    format: 'cjs',
    target: 'es2022',
  }).code;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    process: { env: { API_URL: 'http://backend.test' } },
    require: (name) => {
      assert.equal(name, 'next/headers');
      return { cookies: () => ({ get: () => (token ? { value: token } : undefined) }) };
    },
    fetch: async (...args) => {
      calls.push(args);
      if (networkError) throw new Error('internal connection detail');
      return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
      };
    },
  });
  return { actions: module.exports, calls };
}

test('updateCompanyProfile forwards a PATCH to /company/me with the session token', async () => {
  const s = setup();
  const result = await s.actions.updateCompanyProfile({
    trade_name: 'Elétrica Silva',
    document: '12345678000190',
    phone: '11999998888',
    city: 'São Paulo',
    state: 'SP',
  });
  assert.equal(result.ok, true);
  assert.equal(s.calls[0][0], 'http://backend.test/company/me');
  assert.equal(s.calls[0][1].method, 'PATCH');
  assert.equal(s.calls[0][1].headers.Authorization, 'Bearer session-token');
});

test('updateCompanyPix forwards pix_key_type and pix_key', async () => {
  const s = setup();
  const result = await s.actions.updateCompanyPix({ pix_key_type: 'CPF', pix_key: '12345678901' });
  assert.equal(result.ok, true);
  assert.equal(s.calls[0][1].body, JSON.stringify({ pix_key_type: 'CPF', pix_key: '12345678901' }));
});

test('missing authentication never reaches the backend', async () => {
  const s = setup({ token: null });
  const result = await s.actions.updateCompanyProfile({
    trade_name: 'X',
    document: null,
    phone: null,
    city: null,
    state: null,
  });
  assert.equal(result.ok, false);
  assert.equal(s.calls.length, 0);
});

test('a 400 response surfaces the backend validation errors', async () => {
  const s = setup({ status: 400, body: { message: 'Dados inválidos', errors: ['pix_key: Chave Pix inválida para o tipo CPF.'] } });
  const result = await s.actions.updateCompanyPix({ pix_key_type: 'CPF', pix_key: 'abc' });
  assert.equal(result.ok, false);
  assert.match(result.message, /Chave Pix inválida/);
});

test('HTTP failures and network errors return safe actionable messages', async () => {
  for (const status of [401, 403, 404, 500]) {
    const s = setup({ status });
    const result = await s.actions.updateCompanyProfile({
      trade_name: 'X',
      document: null,
      phone: null,
      city: null,
      state: null,
    });
    assert.equal(result.ok, false);
    assert.ok(result.message.length > 0);
  }
  const s = setup({ networkError: true });
  const result = await s.actions.updateCompanyPix({ pix_key_type: 'CPF', pix_key: '12345678901' });
  assert.equal(result.ok, false);
  assert.ok(!result.message.includes('internal connection detail'));
});

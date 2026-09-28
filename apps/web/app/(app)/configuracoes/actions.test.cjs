const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function setup({ token = 'session-token', status = 200, body = null, networkError = false } = {}) {
  const calls = [];
  const fakeModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, 'actions.ts'), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(code, {
    module: fakeModule,
    exports: fakeModule.exports,
    process: { env: { API_URL: 'http://backend.test' } },
    require: (name) => {
      assert.equal(name, 'next/headers');
      return {
        cookies: () => ({
          get: () => (token ? { value: token } : undefined),
          set: () => {},
        }),
      };
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
  return { actions: fakeModule.exports, calls };
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
  const s = setup({
    status: 400,
    body: { message: 'Dados inválidos', errors: ['pix_key: Chave Pix inválida para o tipo CPF.'] },
  });
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

test('account updates are sent to the authenticated auth endpoint', async () => {
  const s = setup({ body: { account: { id: 'user-1', name: 'Nome', email: 'novo@exemplo.com' } } });
  const result = await s.actions.updateAccountSettings({
    email: 'novo@exemplo.com',
    current_password: 'SenhaAtual123',
  });
  assert.equal(result.ok, true);
  assert.equal(result.account.email, 'novo@exemplo.com');
  assert.equal(s.calls[0][0], 'http://backend.test/auth/account');
  assert.equal(s.calls[0][1].method, 'PATCH');
  assert.equal(s.calls[0][1].headers.Authorization, 'Bearer session-token');
  assert.equal(
    s.calls[0][1].body,
    JSON.stringify({ email: 'novo@exemplo.com', current_password: 'SenhaAtual123' }),
  );
});

test('account update errors keep Portuguese accents intact', async () => {
  const s = setup({ status: 401 });
  const result = await s.actions.updateAccountSettings({
    email: 'novo@exemplo.com',
    current_password: 'SenhaAtual123',
  });

  assert.equal(result.ok, false);
  assert.equal(result.message, 'Sua senha atual está incorreta ou sua sessão expirou.');
});

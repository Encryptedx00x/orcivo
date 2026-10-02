// Fluxo completo site -> signup -> checkout no app -> Gerenciar assinatura.
// Run with node --test; NODE_PATH can supply existing clone dependencies.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const webRoot = path.join(__dirname, '..', '..', '..');
const sessionValue = 'sess-abc123';

function load(file, requireImpl, sandbox = {}) {
  const fakeModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    module: fakeModule,
    exports: fakeModule.exports,
    require: requireImpl,
    process: { env: { API_URL: 'http://backend.test' } },
    ...sandbox,
  });
  return fakeModule.exports;
}

const intentLib = load(path.join(webRoot, 'app', '(auth)', 'checkout-intent.ts'), () => {
  throw new Error('no imports expected');
});

/** In-memory backend that mirrors the billing endpoints used by the plano screens. */
function fakeBackend() {
  const calls = [];
  let subscription = { plan_code: 'LIVRE', status: 'ACTIVE' };
  const fetchImpl = async (url, init = {}) => {
    const route = url.replace('http://backend.test', '');
    const method = init.method ?? 'GET';
    calls.push({ route, method, init });
    const authorized = JSON.stringify(init.headers ?? {}).includes(`Bearer ${sessionValue}`);
    const reply = (status, body) => ({ ok: status < 300, status, json: async () => body });
    if (!authorized) return reply(401, { message: 'Unauthorized' });
    if (route === '/billing/checkout' && method === 'POST') {
      const body = JSON.parse(init.body);
      if (!['SOLO', 'MAIS', 'EQUIPE'].includes(body.plan_code)) return reply(400, {});
      if (!['MONTHLY', 'YEARLY'].includes(body.billing_cycle)) return reply(400, {});
      subscription = { plan_code: body.plan_code, status: 'TRIALING' };
      return reply(201, { checkout_url: null, pix: { qrCode: '000201pix' } });
    }
    if (route === '/billing/subscription') return reply(200, subscription);
    if (route === '/billing/cancel' && method === 'POST') {
      subscription = { ...subscription, status: 'CANCELLED' };
      return reply(201, subscription);
    }
    return reply(404, {});
  };
  return { calls, fetchImpl, current: () => subscription };
}

function loadActions(fetchImpl, withSession = true) {
  const apiModule = load(
    path.join(webRoot, 'lib', 'api.ts'),
    (name) => {
      assert.equal(name, 'next/headers');
      return {
        cookies: () => ({ get: () => (withSession ? { value: sessionValue } : undefined) }),
      };
    },
    { fetch: fetchImpl },
  );
  return load(path.join(__dirname, 'actions.ts'), (name) => {
    assert.equal(name, '../../../lib/api');
    return apiModule;
  });
}

test('site CTA params survive signup <-> login and land on the in-app checkout', () => {
  const fromSite = new URLSearchParams('plan=solo&cycle=monthly');
  const intent = intentLib.readCheckoutIntent(fromSite);
  assert.deepEqual({ ...intent }, { plan: 'SOLO', cycle: 'MONTHLY' });

  assert.equal(intentLib.intentQuery(intent), '?plan=SOLO&cycle=MONTHLY');
  assert.equal(intentLib.postAuthPath(intent), '/plano/checkout?plan=SOLO&cycle=MONTHLY');
});

test('legacy suffixed plan codes are normalized to plan + cycle', () => {
  const intent = intentLib.readCheckoutIntent(new URLSearchParams('plan=SOLO_MONTHLY'));
  assert.deepEqual({ ...intent }, { plan: 'SOLO', cycle: 'MONTHLY' });
  const explicit = intentLib.readCheckoutIntent(new URLSearchParams('plan=MAIS_YEARLY&cycle=monthly'));
  assert.deepEqual({ ...explicit }, { plan: 'MAIS', cycle: 'MONTHLY' });
});

test('invalid or missing plan falls back to the default destination', () => {
  for (const q of ['', 'plan=LIVRE', 'plan=LEGACY_MONTHLY', 'plan=INVALID&cycle=YEARLY']) {
    const intent = intentLib.readCheckoutIntent(new URLSearchParams(q));
    assert.equal(intent, null, q);
    assert.equal(intentLib.postAuthPath(intent), '/dashboard');
    assert.equal(intentLib.intentQuery(intent), '');
  }
  assert.equal(
    intentLib.readCheckoutIntent(new URLSearchParams('plan=MAIS&cycle=weird')).cycle,
    'YEARLY',
  );
});

test('signup -> checkout -> subscription active -> cancel, against the correct endpoint contract', async () => {
  const backend = fakeBackend();
  const actions = loadActions(backend.fetchImpl);

  const intent = intentLib.readCheckoutIntent(new URLSearchParams('plan=SOLO&cycle=YEARLY'));
  assert.equal(intentLib.postAuthPath(intent), '/plano/checkout?plan=SOLO&cycle=YEARLY');

  const checkout = await actions.startCheckout({
    plan: intent.plan,
    cycle: intent.cycle,
    method: 'PIX',
  });
  assert.equal(checkout.ok, true);
  assert.equal(checkout.pix.qrCode, '000201pix');

  const sent = backend.calls.find((c) => c.route === '/billing/checkout');
  assert.equal(sent.method, 'POST');
  assert.deepEqual(JSON.parse(sent.init.body), {
    plan_code: 'SOLO',
    billing_cycle: 'YEARLY',
    payment_method: 'PIX',
  });
  assert.match(JSON.stringify(sent.init.headers), /Bearer sess-abc123/);

  assert.equal(backend.current().plan_code, 'SOLO');

  const cancelled = await actions.cancelSubscription();
  assert.equal(cancelled.ok, true);
  assert.equal(backend.current().status, 'CANCELLED');
});

test('checkout without a session reports an expired session instead of calling billing blind', async () => {
  const backend = fakeBackend();
  const actions = loadActions(backend.fetchImpl, false);
  const result = await actions.startCheckout({ plan: 'SOLO', cycle: 'YEARLY', method: 'PIX' });
  assert.equal(result.ok, false);
  assert.match(result.message, /sessão expirou/);
});

test('rejects legacy site payload values before reaching the backend', async () => {
  const backend = fakeBackend();
  const actions = loadActions(backend.fetchImpl);
  const result = await actions.startCheckout({
    plan: 'SOLO_MONTHLY',
    cycle: 'MONTHLY',
    method: 'PIX',
  });
  assert.equal(result.ok, false);
  assert.equal(backend.calls.length, 0);
});

test('plano screens reuse apiFetch instead of assembling auth headers by hand', () => {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
    }
  };
  walk(__dirname);
  assert.ok(files.length > 0);
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(src, /cookies\(\)|Bearer|Authorization/, file);
  }
  const actionsSrc = fs.readFileSync(path.join(__dirname, 'actions.ts'), 'utf8');
  assert.match(actionsSrc, /import \{ apiFetch \} from '\.\.\/\.\.\/\.\.\/lib\/api'/);
});

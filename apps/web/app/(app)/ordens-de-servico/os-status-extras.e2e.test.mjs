// E2E (HTTP-level) das ações de status extra da OS (R5b) no web completo.
//
// Não há navegador/Playwright no repositório, então o teste exercita o caminho real que o
// navegador percorre, sem simular nada do nosso código:
//   Server Actions de /ordens-de-servico e /configuracoes  →  fetch HTTP  →
//   backend falso (contrato idêntico ao NestJS: await-payment, receive-payment,
//   claim-warranty e company/work-order-statuses).
// Apenas 'next/headers' e 'next/cache' são substituídos por stubs mínimos.
//
// Rodar: node --test "apps/web/app/(app)/ordens-de-servico/os-status-extras.e2e.test.mjs"
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { createServer } from 'node:http';
import { registerHooks } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const webRoot = fileURLToPath(new URL('../../../', import.meta.url));

// ---- stubs de next/* ------------------------------------------------------------------------
const stubs = {
  'next/headers': `
    export function cookies() {
      const jar = globalThis.__testCookies ?? {};
      return { get: (name) => (name in jar ? { name, value: jar[name] } : undefined) };
    }`,
  'next/cache': `
    export function revalidatePath() {}`,
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier in stubs) {
      return { url: `data:text/javascript,${encodeURIComponent(stubs[specifier])}`, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

// ---- backend falso (contrato R5b do NestJS) -------------------------------------------------
const calls = [];
const doneOrder = {
  id: 'os-1',
  number: 42,
  title: 'Instalação de tomadas',
  status: 'AWAITING_PAYMENT',
  customer: { id: 'c1', name: 'Maria Souza' },
  photos: [],
  allowed_actions: ['receber_pagamento', 'reabrir', 'corrigir'],
};

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const backend = createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    const body = raw ? JSON.parse(raw) : {};
    calls.push({ method: req.method, url: req.url, auth: req.headers.authorization ?? null, body });

    if (req.method !== 'PATCH') return json(res, 404, { message: 'Not Found' });

    // Rotas de ação de domínio (work-order.controller.ts, R5b).
    const woAction = req.url.match(/^\/work-orders\/([^/]+)\/(await-payment|receive-payment|claim-warranty|start|complete|cancel|reopen|correct|status)$/);
    if (woAction) {
      if (req.headers.authorization !== 'Bearer sessao-valida')
        return json(res, 401, { message: 'Unauthorized' });
      // OS de uma empresa com o extra desligado → mesmo 400/pt-BR do backend real.
      if (woAction[1] === 'os-extra-off' && woAction[2] === 'await-payment')
        return json(res, 400, { message: 'O status extra "Aguardando pagamento" não está ativado nas configurações da empresa.' });
      return json(res, 200, { ...doneOrder, status: body.next_status ?? doneOrder.status });
    }

    // Status extras da empresa (company.controller.ts, R5b — @AdminOnly).
    if (req.url === '/company/work-order-statuses') {
      const statuses = body.statuses;
      if (!Array.isArray(statuses) || statuses.some((s) => s !== 'AWAITING_PAYMENT' && s !== 'WARRANTY'))
        return json(res, 400, { message: 'statuses must be an array of AWAITING_PAYMENT/WARRANTY' });
      if (req.headers.authorization === 'Bearer membro')
        return json(res, 403, { message: 'Forbidden resource' });
      return json(res, 200, { trade_name: 'Elétrica Silva', work_order_statuses: statuses });
    }

    return json(res, 404, { message: 'Not Found' });
  });
});

let osActions;
let cfgActions;

before(async () => {
  await new Promise((resolve) => backend.listen(0, '127.0.0.1', resolve));
  process.env.API_URL = `http://127.0.0.1:${backend.address().port}`;
  const load = (rel) => import(pathToFileURL(webRoot + rel).href);
  osActions = await load('app/(app)/ordens-de-servico/actions.ts');
  cfgActions = await load('app/(app)/configuracoes/actions.ts');
});
after(() => backend.close());

function login(token) {
  globalThis.__testCookies = token ? { access_token: token } : {};
}

describe('R5b — ações de status extra chamam as rotas publicadas pelo backend', () => {
  const cases = [
    ['aguardar_pagamento', 'await-payment'],
    ['receber_pagamento', 'receive-payment'],
    ['acionar_garantia', 'claim-warranty'],
  ];
  for (const [action, route] of cases) {
    test(`${action} → PATCH /work-orders/:id/${route} com token da sessão`, async () => {
      calls.length = 0;
      login('sessao-valida');
      const result = await osActions.workOrderAction('os-1', { action });
      assert.equal(result.error, undefined);
      assert.equal(result.order.status, 'AWAITING_PAYMENT');
      assert.deepEqual(result.order.allowed_actions, ['receber_pagamento', 'reabrir', 'corrigir']);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].method, 'PATCH');
      assert.equal(calls[0].url, `/work-orders/os-1/${route}`);
      assert.equal(calls[0].auth, 'Bearer sessao-valida');
    });
  }

  test('sem sessão, devolve erro em pt-BR sem chamar o backend', async () => {
    calls.length = 0;
    login(null);
    const result = await osActions.workOrderAction('os-1', { action: 'aguardar_pagamento' });
    assert.equal(result.order, undefined);
    assert.equal(result.error, 'Sessão expirada. Faça login novamente.');
    assert.equal(calls.length, 0);
  });

  test('erro do backend (extra desligado) chega em pt-BR para a UI', async () => {
    calls.length = 0;
    login('sessao-valida');
    const result = await osActions.workOrderAction('os-extra-off', { action: 'aguardar_pagamento' });
    assert.equal(result.order, undefined);
    assert.equal(
      result.error,
      'O status extra "Aguardando pagamento" não está ativado nas configurações da empresa.',
    );
    assert.equal(calls[0].url, '/work-orders/os-extra-off/await-payment');
  });

  test('ações com motivo (corrigir) seguem pela rota dedicada', async () => {
    calls.length = 0;
    login('sessao-valida');
    const result = await osActions.workOrderAction('os-1', { action: 'corrigir', reason: 'ajuste' });
    assert.equal(result.error, undefined);
    assert.equal(calls[0].url, '/work-orders/os-1/correct');
    assert.deepEqual(calls[0].body, { reason: 'ajuste' });
  });
});

describe('R5b — Configurações > Ordem de serviço salva os status extras', () => {
  test('envia exatamente a lista de extras ligados', async () => {
    calls.length = 0;
    login('sessao-valida');
    const r = await cfgActions.updateWorkOrderStatuses(['AWAITING_PAYMENT', 'WARRANTY']);
    assert.deepEqual(r, { ok: true });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'PATCH');
    assert.equal(calls[0].url, '/company/work-order-statuses');
    assert.deepEqual(calls[0].body, { statuses: ['AWAITING_PAYMENT', 'WARRANTY'] });
  });

  test('lista vazia desliga os dois extras sem erro', async () => {
    calls.length = 0;
    login('sessao-valida');
    const r = await cfgActions.updateWorkOrderStatuses([]);
    assert.deepEqual(r, { ok: true });
    assert.deepEqual(calls[0].body, { statuses: [] });
  });

  test('membro sem permissão recebe mensagem em pt-BR (403 do @AdminOnly)', async () => {
    calls.length = 0;
    login('membro');
    const r = await cfgActions.updateWorkOrderStatuses(['WARRANTY']);
    assert.equal(r.ok, false);
    assert.equal(r.message, 'Só o dono ou um administrador da empresa pode mudar os status da OS.');
  });
});

// Run with node --test; NODE_PATH can supply existing clone dependencies.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { chromium } = require('playwright-core');

function compile(filename) {
  return ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
}

test('proxy authenticates, forwards only entity pagination, preserves failures and disables caching', async () => {
  const module = { exports: {} };
  let token;
  let upstream;
  let call;
  class NextResponse extends Response {
    static json(data, init) {
      return new NextResponse(JSON.stringify(data), init);
    }
  }
  vm.runInNewContext(compile(path.join(__dirname, '../app/api/audit-logs/route.ts')), {
    module,
    exports: module.exports,
    URLSearchParams,
    process: { env: { API_URL: 'http://backend.test' } },
    require: (name) =>
      name === 'next/server'
        ? { NextResponse }
        : { cookies: () => ({ get: () => (token ? { value: token } : undefined) }) },
    fetch: async (...args) => {
      call = args;
      if (upstream instanceof Error) throw upstream;
      return upstream;
    },
  });
  const req = {
    nextUrl: new URL(
      'http://web.test/api/audit-logs?entity_type=work_order&entity_id=os-1&limit=20&cursor=row-1&company_id=other',
    ),
  };
  assert.equal((await module.exports.GET(req)).status, 401);
  assert.equal(call, undefined);
  token = 'test-session';
  upstream = new Response('{"message":"Forbidden"}', { status: 403 });
  const forbidden = await module.exports.GET(req);
  assert.equal(forbidden.status, 403);
  assert.equal(await forbidden.text(), '{"message":"Forbidden"}');
  assert.equal(
    call[0],
    'http://backend.test/audit-logs?entity_type=work_order&entity_id=os-1&limit=20&cursor=row-1',
  );
  assert.equal(call[1].headers.Authorization, 'Bearer test-session');
  assert.equal(call[1].cache, 'no-store');
  assert.equal(forbidden.headers.get('cache-control'), 'private, no-store');
  upstream = new Error('connection refused');
  assert.equal((await module.exports.GET(req)).status, 502);
});

test('entity history renders reasons, actors and exact time; paginates, retries, refreshes and isolates items', async () => {
  const tempRoot = path.join(__dirname, 'node_modules/.cache/history-browser');
  fs.mkdirSync(tempRoot, { recursive: true });
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    env: { ...process.env, TEMP: tempRoot, TMP: tempRoot, TMPDIR: tempRoot },
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      timezoneId: 'America/Sao_Paulo',
    });
    await page.setContent('<div id="root"></div>');
    await page.addStyleTag({ path: path.join(__dirname, '../app/globals.css') });
    for (const name of ['react', 'react-dom']) {
      await page.addScriptTag({
        path: path.join(
          path.dirname(require.resolve(`${name}/package.json`)),
          `umd/${name}.development.js`,
        ),
      });
    }
    await page.addScriptTag({
      content: `
      window.historyRequests = [];
      window.responses = [];
      window.fetch = async (url, options) => {
        historyRequests.push({url, method: options.method ?? 'GET'});
        const response = responses.shift();
        if (!response) throw new Error('Unexpected request');
        if (response.delay) await new Promise(resolve => setTimeout(resolve, response.delay));
        return {ok: response.status === 200, status: response.status, json: async () => response.body};
      };
      const historyModule = {exports: {}};
      new Function('module', 'exports', 'require', 'React', ${JSON.stringify(compile(path.join(__dirname, 'EntityHistory.tsx')))}) (
        historyModule, historyModule.exports, name => name === 'react' ? React : {History: () => null, X: () => null}, React
      );
      window.root = ReactDOM.createRoot(document.getElementById('root'));
      window.renderHistory = props => root.render(React.createElement(historyModule.exports.EntityHistory, props));
      window.historyComponent = historyModule.exports.EntityHistory;
    `,
    });
    const props = { entityType: 'work_order', entityId: 'os-1', label: 'OS #42', revision: 0 };
    await page.evaluate((data) => window.renderHistory(data), props);
    const trigger = page.getByRole('button', { name: 'Histórico — OS #42' });
    await trigger.waitFor();
    assert.equal(await page.evaluate(() => historyRequests.length), 0);
    const row = {
      id: 'row-1',
      action: 'work_order.reopened',
      created_at: '2026-09-28T12:34:56.000Z',
      actor_type: 'USER',
      actor_user_id: 'ana',
      actor_name: 'Ana',
      metadata: {
        humanText: 'OS #42 reaberta',
        reason: 'Retorno solicitado\nVerificar instalação <b>urgente</b>',
      },
    };
    const enqueue = (status, data = [], next_cursor = null, delay = 0) =>
      page.evaluate((response) => responses.push(response), {
        status,
        body: { data, next_cursor },
        delay,
      });
    await enqueue(200, [row], 'row-1', 100);
    await trigger.click();
    await page.getByRole('status').waitFor();
    const dialog = page.getByRole('dialog', { name: 'Histórico — OS #42' });
    await dialog.getByText('OS #42 reaberta', { exact: true }).waitFor();
    assert.match(await dialog.innerText(), /28\/09\/2026.*09:34:56.*Ana/);
    assert.match(
      await dialog.innerText(),
      /Justificativa: Retorno solicitado\nVerificar instalação <b>urgente<\/b>/,
    );
    assert.equal(await dialog.locator('b').count(), 0);
    assert.equal(await dialog.locator('time').getAttribute('datetime'), row.created_at);
    assert.match(
      await page.evaluate(() => historyRequests[0].url),
      /entity_type=work_order&entity_id=os-1/,
    );
    const box = await dialog.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 390);

    await enqueue(500);
    await dialog.getByRole('button', { name: 'Carregar mais' }).click();
    await dialog.getByRole('alert').waitFor();
    await enqueue(200, [
      {
        ...row,
        id: 'row-2',
        actor_type: 'SYSTEM',
        actor_name: null,
        metadata: null,
        action: 'quote.expired',
      },
    ]);
    await dialog.getByRole('button', { name: 'Tentar novamente' }).click();
    await dialog.getByText('Orçamento expirado', { exact: true }).waitFor();
    assert.equal(await dialog.locator('li').count(), 2);
    assert.match(await dialog.innerText(), /Sistema/);
    assert.equal(await dialog.getByRole('button', { name: 'Carregar mais' }).count(), 0);
    assert.match(await page.evaluate(() => historyRequests[2].url), /cursor=row-1/);

    await enqueue(200, [{ ...row, metadata: { reason: 'Nova justificativa' } }]);
    await page.evaluate((data) => window.renderHistory(data), { ...props, revision: 1 });
    await dialog.getByText('Nova justificativa', { exact: false }).waitFor();
    assert.equal(await dialog.locator('li').count(), 1);
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await trigger.evaluate((button) => document.activeElement === button), true);

    await enqueue(200, []);
    await trigger.click();
    await dialog.getByText('Nenhuma alteração registrada.').waitFor();
    await dialog.getByRole('button', { name: 'Fechar histórico' }).click();
    await enqueue(403);
    await trigger.click();
    await dialog.getByText('Histórico restrito a administradores da empresa.').waitFor();
    await dialog.getByRole('button', { name: 'Fechar histórico' }).click();

    for (const entityType of ['quote', 'payment']) {
      await page.evaluate((data) => window.renderHistory(data), {
        entityType,
        entityId: `${entityType}-1`,
        label: entityType,
      });
      await enqueue(200, [
        {
          ...row,
          actor_type: 'CUSTOMER',
          actor_name: null,
          metadata: null,
          action: 'quote.approved',
        },
      ]);
      await page.getByRole('button', { name: `Histórico — ${entityType}` }).click();
      await page
        .getByRole('dialog')
        .getByText(/Cliente \(link público\)/)
        .waitFor();
      assert.match(
        await page.evaluate(() => historyRequests.at(-1).url),
        new RegExp(`entity_type=${entityType}&entity_id=${entityType}-1`),
      );
      await page.getByRole('button', { name: 'Fechar histórico' }).click();
    }
    assert.ok(
      (await page.evaluate(() => historyRequests)).every((request) => request.method === 'GET'),
    );

    // Exercise each actual screen, retaining the real history button and modal.
    const screenFiles = [
      [
        'work_order',
        '../app/(app)/ordens-de-servico/[id]/WorkOrderDetail.tsx',
        'WorkOrderDetail',
        {
          initial: {
            id: 'os-42',
            number: 42,
            status: 'DONE',
            title: 'Instalação',
            customer: { name: 'Cliente' },
            photos: [],
            allowed_actions: ['reabrir'],
          },
          payments: [],
        },
      ],
      [
        'quote',
        '../app/(app)/orcamentos/[id]/OrcamentoDetail.tsx',
        'default',
        {
          quote: {
            id: 'quote-42',
            number: 42,
            status: 'SENT',
            customer: { name: 'Cliente' },
            items: [],
            total: '10.00',
          },
        },
      ],
      [
        'payment',
        '../app/(app)/financeiro/FinanceiroContent.tsx',
        'FinanceiroContent',
        {
          entries: [
            {
              id: 'payment-42',
              customer: 'Cliente',
              description: 'Serviço',
              amount: 'R$ 10,00',
              status: 'PAID',
            },
          ],
          kpis: [],
          bars: [],
          customers: [],
          monthLabel: 'Setembro',
        },
      ],
    ];
    for (const [type, file, exported, screenProps] of screenFiles) {
      await page.evaluate(
        ({ code, exported, props }) => {
          const module = { exports: {} };
          const dependencies = (name) => {
            if (name === 'react') return React;
            if (name === 'next/navigation')
              return { useRouter: () => ({ refresh() {}, back() {} }) };
            if (name === 'next/link')
              return {
                default: ({ children }) => React.createElement('span', null, children),
                __esModule: true,
              };
            if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
            if (name.endsWith('EntityHistory')) return { EntityHistory: historyComponent };
            if (name.endsWith('contact-links')) return { contactLinks: () => ({}) };
            if (name === '../actions')
              return {
                workOrderAction: async (id, input) => {
                  window.lastAction = { id, input };
                  return {
                    order: { ...props.initial, status: 'IN_PROGRESS', allowed_actions: [] },
                  };
                },
              };
            if (name === '@orcivo/shared-types')
              return {
                formatMoney: (value) => String(value ?? 0),
                sumDecimal: () => '0',
                multiplyDecimal: () => '0',
              };
            return new Proxy({}, { get: () => () => null });
          };
          new Function('module', 'exports', 'require', 'React', 'process', code)(
            module,
            module.exports,
            dependencies,
            React,
            { env: {} },
          );
          root.render(React.createElement(module.exports[exported], props));
        },
        { code: compile(path.join(__dirname, file)), exported, props: screenProps },
      );
      const button = page.getByRole('button', { name: /^Histórico —/ });
      await button.waitFor();
      await enqueue(200, [row]);
      await button.click();
      await page.getByRole('dialog').getByText('OS #42 reaberta', { exact: true }).waitFor();
      assert.match(
        await page.evaluate(() => historyRequests.at(-1).url),
        new RegExp(`entity_type=${type}&entity_id=${type === 'work_order' ? 'os' : type}-42`),
      );
      await page.getByRole('button', { name: 'Fechar histórico' }).click();
      if (type === 'work_order') {
        await page.getByRole('button', { name: 'Reabrir OS', exact: true }).click();
        await page
          .getByPlaceholder('Motivo da reabertura (obrigatório)')
          .fill('Retorno para ajuste');
        await page.getByRole('button', { name: 'Sim, reabrir', exact: true }).click();
        await page
          .getByPlaceholder('Motivo da reabertura (obrigatório)')
          .waitFor({ state: 'hidden' });
        assert.deepEqual(await page.evaluate(() => lastAction), {
          id: 'os-42',
          input: { action: 'reabrir', reason: 'Retorno para ajuste' },
        });
        await enqueue(200, [
          { ...row, metadata: { ...row.metadata, reason: 'Retorno para ajuste' } },
        ]);
        await button.click();
        await page.getByRole('dialog').getByText('Retorno para ajuste', { exact: false }).waitFor();
        await page.getByRole('button', { name: 'Fechar histórico' }).click();
      }
    }
  } finally {
    await browser.close();
  }
});

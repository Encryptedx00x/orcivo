// Run: node --test chart.browser.test.cjs (NODE_PATH may supply clone dependencies).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { chromium } = require('playwright-core');

function compile(filename) {
  return ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
}

function load(code, dependencies, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    React,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected import: ${name}`);
      return dependencies[name];
    },
    ...globals,
  });
  return module.exports;
}

async function financeProps(payments) {
  const money = load(
    compile(path.resolve(__dirname, '../../../../../packages/shared-types/src/helpers/money.ts')),
    { 'decimal.js': require('decimal.js') },
  );
  class FixedDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [2026, 0, 15, 12]));
    }
  }
  const page = load(
    compile(path.join(__dirname, 'page.tsx')),
    {
      '@orcivo/shared-types': money,
      '../../../lib/api': {
        apiFetch: async (url) => ({ data: url === '/payments' ? payments : [] }),
      },
      './FinanceiroContent': { FinanceiroContent: 'finance-content' },
    },
    { Date: FixedDate },
  );
  return JSON.parse(JSON.stringify((await page.default()).props));
}

test('daily chart shows exact Decimal totals and dates on hover and keyboard focus', async () => {
  const payments = [
    ['0.10', '2026-01-15T09:00:00'],
    ['0.20', '2026-01-15T18:00:00'],
    ['1234567890.12', '2026-01-14T12:00:00'],
    ['45.67', '2025-12-17T12:00:00'],
    ['999.99', '2026-01-15T12:00:00', 'CANCELLED'],
  ].map(([amount, paid_at, status = 'PAID'], i) => ({
    id: String(i),
    amount,
    paid_at,
    status,
    customer: { name: 'Cliente' },
  }));
  const props = await financeProps(payments);
  assert.equal(props.bars.length, 30);
  assert.equal(props.bars[0].date, '17/12/2025');
  assert.equal(props.bars[29].date, '15/01/2026');
  assert.equal(props.bars[29].amount, 'R$ 0,30');
  assert.equal(props.bars[28].percent, '100.00');
  assert.equal(props.kpis[0].value, 'R$ 1.234.567.936,09');

  const tempRoot = path.join(__dirname, 'node_modules/.cache/chart-browser');
  fs.mkdirSync(tempRoot, { recursive: true });
  const browser = await chromium.launch({
    channel: process.env.CHART_BROWSER_CHANNEL ?? 'chrome',
    headless: true,
    env: { ...process.env, TEMP: tempRoot, TMP: tempRoot, TMPDIR: tempRoot },
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
    await page.setContent('<div id="root"></div>');
    await page.addStyleTag({ path: path.resolve(__dirname, '../../globals.css') });
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
      const exports = {};
      const require = (name) => {
        if (name === 'react') return React;
        if (name === 'next/navigation') return { useRouter: () => ({ refresh() {} }) };
        if (name === 'lucide-react') return { Check: () => null, Inbox: () => null, Plus: () => null };
        if (name === './PaymentRegistrationModal') return { PaymentRegistrationModal: () => null };
        if (name === '../../../lib/EntityHistory') return { EntityHistory: () => null };
        throw new Error(name);
      };
      ${compile(path.join(__dirname, 'FinanceiroContent.tsx'))}
      const root = ReactDOM.createRoot(document.getElementById('root'));
      window.renderFinance = (props) => root.render(React.createElement(exports.FinanceiroContent, props));
    `,
    });
    await page.evaluate((data) => window.renderFinance(data), props);
    const bars = page.getByRole('img', { name: /^Recebido em/ });
    await bars.last().waitFor();
    assert.equal(await bars.count(), 30);
    const tooltip = page.getByRole('tooltip');
    assert.equal(await tooltip.count(), 0);

    for (const [index, date, amount] of [
      [0, '17/12/2025', 'R$ 45,67'],
      [1, '18/12/2025', 'R$ 0,00'],
      [28, '14/01/2026', 'R$ 1.234.567.890,12'],
      [29, '15/01/2026', 'R$ 0,30'],
    ]) {
      await bars.nth(index).locator('div').hover();
      await tooltip.waitFor();
      assert.deepEqual(await tooltip.locator('div').allTextContents(), [date, amount]);
      const box = await tooltip.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= 1000);
    }
    await page.getByRole('heading', { name: 'Financeiro', exact: true }).hover();
    await tooltip.waitFor({ state: 'hidden' });
    await bars.last().focus();
    await tooltip.waitFor();
    assert.equal(
      await bars.last().getAttribute('aria-describedby'),
      await tooltip.getAttribute('id'),
    );
    await page.keyboard.press('Escape');
    await tooltip.waitFor({ state: 'hidden' });
    await bars.first().focus();
    await page.keyboard.press('Tab');
    assert.deepEqual(await tooltip.locator('div').allTextContents(), ['18/12/2025', 'R$ 0,00']);
    await page.getByRole('combobox').focus();
    await tooltip.waitFor({ state: 'hidden' });

    await page.setViewportSize({ width: 360, height: 700 });
    await bars.last().hover();
    const box = await tooltip.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 360);

    await page.evaluate((data) => window.renderFinance(data), await financeProps([]));
    await page.getByText('Sem recebimentos no período.', { exact: true }).waitFor();
    assert.equal(await tooltip.count(), 0);
    assert.equal(await bars.count(), 0);
  } finally {
    await browser.close();
  }
});

// Run with node --test; NODE_PATH may point to existing workspace dependencies.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { chromium } = require('playwright-core');

test('detail history renders all entity feeds, loading, empty, errors, pagination and refresh', async () => {
  const tempRoot = path.join(__dirname, 'node_modules/.cache/audit-browser');
  fs.mkdirSync(tempRoot, { recursive: true });
  const browser = await chromium.launch({
    channel: 'chrome', headless: true,
    env: { ...process.env, TEMP: tempRoot, TMP: tempRoot, TMPDIR: tempRoot },
  });
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="root"></div>');
    for (const name of ['react', 'react-dom']) {
      await page.addScriptTag({ path: path.join(path.dirname(require.resolve(`${name}/package.json`)), `umd/${name}.development.js`) });
    }
    const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, 'AuditHistoryFeed.tsx'), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
    }).outputText;
    await page.addScriptTag({ content: `
      window.requests = []; window.responses = [];
      window.fetch = async url => {
        requests.push(url);
        const response = responses.shift();
        if (!response) throw new Error('Unexpected request');
        if (response.delay) await new Promise(resolve => setTimeout(resolve, response.delay));
        return { ok: response.status === 200, status: response.status, json: async () => response.body };
      };
      const mod = { exports: {} };
      new Function('module', 'exports', 'require', 'React', ${JSON.stringify(code)})(mod, mod.exports, () => React, React);
      window.root = ReactDOM.createRoot(document.getElementById('root'));
      window.renderFeed = props => root.render(React.createElement(mod.exports.AuditHistoryFeed, props));
    ` });
    for (const entityType of ['customer', 'quote', 'work_order']) {
      await page.evaluate(entityType => {
        responses.push({ status: 200, delay: 150, body: { data: [], next_cursor: null } });
        renderFeed({ entityType, entityId: 'entity-1' });
      }, entityType);
      await page.getByRole('status').waitFor();
      await page.getByText('Nenhuma alteração registrada.').waitFor();
      assert.match(await page.evaluate(() => requests.at(-1)), new RegExp(`entity_type=${entityType}&entity_id=entity-1`));
    }
    const row = { id: 'row-1', created_at: '2026-09-28T12:00:00Z', action: 'customer.updated', actor_type: 'USER', actor_name: 'Ana', actor_user_id: 'actor-1', metadata: null };
    await page.evaluate(row => {
      responses.push({ status: 200, body: { data: [row], next_cursor: 'cursor-1' } });
      renderFeed({ entityType: 'customer', entityId: 'entity-2' });
    }, row);
    await page.getByText('Cliente atualizado', { exact: true }).waitFor();
    assert.match(await page.locator('li').innerText(), /Ana/);
    assert.equal(await page.locator('time').getAttribute('datetime'), row.created_at);
    await page.evaluate(() => responses.push({ status: 500 }));
    await page.getByRole('button', { name: 'Carregar mais' }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.locator('li').count(), 1);
    await page.evaluate(row => responses.push({ status: 200, body: { data: [{ ...row, id: 'row-2', metadata: { humanText: 'Cadastro corrigido', reason: 'Telefone incorreto' } }], next_cursor: null } }), row);
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await page.getByText('Cadastro corrigido').waitFor();
    await page.getByText('Telefone incorreto', { exact: false }).waitFor();
    assert.equal(await page.locator('li').count(), 2);
    assert.match(await page.evaluate(() => requests.at(-1)), /cursor=cursor-1/);
    await page.evaluate(() => {
      responses.push({ status: 403 });
      renderFeed({ entityType: 'customer', entityId: 'entity-2', revision: 1 });
    });
    await page.getByText('Histórico restrito a administradores da empresa.').waitFor();
    assert.equal(await page.locator('li').count(), 0);
    await page.evaluate(() => responses.push({ status: 200, body: { data: [], next_cursor: null } }));
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await page.getByText('Nenhuma alteração registrada.').waitFor();
  } finally {
    await browser.close();
  }
});

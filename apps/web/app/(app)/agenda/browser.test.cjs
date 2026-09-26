// Run with NODE_PATH pointing to installed dependencies when using an isolated clone.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { build } = require('esbuild');
const { chromium } = require('playwright-core');

test('weekly agenda edits, confirms deletion, and handles failures', async () => {
  const bundle = await build({
    stdin: {
      contents:
        "import React from 'react'; import {createRoot} from 'react-dom/client'; import Page from './page'; createRoot(document.getElementById('root')).render(<Page/>);",
      resolveDir: __dirname,
      loader: 'tsx',
    },
    bundle: true,
    write: false,
    jsx: 'automatic',
    nodePaths: (process.env.NODE_PATH ?? '').split(path.delimiter),
    plugins: [
      {
        name: 'actions',
        setup(builder) {
          builder.onResolve({ filter: /^\.\/actions$/ }, () => ({
            path: 'actions',
            namespace: 'test',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
            contents: `
        export async function updateAppointment(id, body) { return window.mutate('PATCH', id, body); }
        export async function deleteAppointment(id) { return window.mutate('DELETE', id); }
      `,
          }));
        },
      },
    ],
  });
  const tempRoot =
    process.env.AGENDA_BROWSER_TEMP ?? path.join(__dirname, 'node_modules/.cache/browser');
  fs.mkdirSync(tempRoot, { recursive: true });
  const browser = await chromium.launch({
    channel: process.env.AGENDA_BROWSER_CHANNEL ?? 'chrome',
    headless: true,
    env: { ...process.env, TEMP: tempRoot, TMP: tempRoot, TMPDIR: tempRoot },
  });
  try {
    const page = await browser.newPage({ timezoneId: 'America/Sao_Paulo' });
    await page.route('http://agenda.test/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }),
    );
    await page.goto('http://agenda.test');
    await page.evaluate(() => {
      const start = new Date();
      start.setHours(9, 30, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      end.setHours(10, 45);
      window.events = [
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Visita',
          type: 'VISITA',
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          notes: 'Original',
          customer_id: null,
          customer: null,
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          title: 'Mesmo horario',
          type: 'OUTRO',
          starts_at: start.toISOString(),
          ends_at: null,
          notes: null,
          customer_id: null,
          customer: null,
        },
      ];
      window.calls = [];
      window.failMutation = false;
      window.fetch = async (url) => ({
        ok: true,
        json: async () => ({ data: url.includes('customers') ? [] : window.events }),
      });
      window.mutate = async (method, id, body) => {
        window.calls.push({ method, id, body });
        if (window.failMutation) return { ok: false, message: 'Falha de teste' };
        if (method === 'PATCH')
          window.events = window.events.map((item) =>
            item.id === id ? { ...item, ...body } : item,
          );
        else window.events = window.events.filter((item) => item.id !== id);
        return { ok: true };
      };
    });
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page
      .getByRole('button', { name: 'Editar compromisso Mesmo horario', exact: true })
      .waitFor();
    await page.getByRole('button', { name: 'Editar compromisso Visita', exact: true }).click();
    assert.equal(await page.getByLabel('Título *', { exact: true }).inputValue(), 'Visita');
    assert.equal(await page.getByLabel('Início', { exact: true }).inputValue(), '09:30');
    assert.equal(await page.getByLabel('Fim (opcional)', { exact: true }).inputValue(), '10:45');
    assert.notEqual(
      await page.getByLabel('Data de início', { exact: true }).inputValue(),
      await page.getByLabel('Data de fim', { exact: true }).inputValue(),
    );
    await page.getByLabel('Título *', { exact: true }).fill('Editado');
    await page.getByLabel('Observações', { exact: true }).fill('');
    await page.getByLabel('Fim (opcional)', { exact: true }).fill('');
    await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    await page.getByRole('button', { name: 'Editar compromisso Editado', exact: true }).waitFor();
    const update = await page.evaluate(() => window.calls[0]);
    assert.equal(update.method, 'PATCH');
    assert.equal(update.body.notes, null);
    assert.equal(update.body.ends_at, null);
    await page.getByRole('button', { name: 'Editar compromisso Editado', exact: true }).click();
    await page.getByRole('button', { name: 'Excluir', exact: true }).click();
    assert.equal(await page.evaluate(() => window.calls.length), 1);
    await page.getByRole('button', { name: 'Voltar', exact: true }).click();
    assert.equal(await page.evaluate(() => window.calls.length), 1);
    await page.evaluate(() => {
      window.failMutation = true;
    });
    await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByRole('dialog').count(), 1);
    await page.getByRole('button', { name: 'Excluir', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar exclusão', exact: true }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByRole('dialog').count(), 1);
    await page.evaluate(() => {
      window.failMutation = false;
    });
    await page.getByRole('button', { name: 'Confirmar exclusão', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(
      await page.getByRole('button', { name: 'Editar compromisso Editado', exact: true }).count(),
      0,
    );
    await page
      .getByRole('button', { name: 'Editar compromisso Mesmo horario', exact: true })
      .click();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
  } finally {
    await browser.close();
  }
});

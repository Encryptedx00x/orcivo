/* eslint-disable no-console */
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const repoRoot = resolve(import.meta.dirname, '../../..');
const env = Object.fromEntries(
  readFileSync(resolve(repoRoot, 'apps/web/.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);
if (!env.UI_AUDIT_EMAIL || !env.UI_AUDIT_PASSWORD) throw new Error('Credenciais locais UI_AUDIT ausentes.');

const outputDir = resolve(repoRoot, 'docs/qa/evidence/b4-36');
mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
});
const viewports = [
  { width: 1440, height: 900, name: '1440x900' },
  { width: 390, height: 844, name: '390x844' },
  { width: 360, height: 800, name: '360x800' },
];
const results = [];

async function audit(page, surface, viewport, file) {
  const result = await page.evaluate(
    ({ currentSurface, currentViewport }) => ({
      surface: currentSurface,
      viewport: currentViewport,
      documentWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    }),
    { currentSurface: surface, currentViewport: viewport },
  );
  results.push(result);
  await page.screenshot({ path: resolve(outputDir, file), fullPage: true });
}

async function waitForIndicator(page, label) {
  await page.getByText(new RegExp(`${label}:`)).first().waitFor();
  await page.waitForFunction(() => !document.body.innerText.includes('Carregando'));
}

async function webLogin(page) {
  await page.goto('http://127.0.0.1:3001/login', { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(env.UI_AUDIT_EMAIL);
  await page.locator('input[type="password"]').fill(env.UI_AUDIT_PASSWORD);
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/api/auth/login')),
    page.getByRole('button', { name: 'Entrar', exact: true }).click(),
  ]);
  await page.waitForURL('**/dashboard');
}

const webContext = await browser.newContext({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
const webPage = await webContext.newPage();
await webLogin(webPage);
for (const viewport of viewports) {
  await webPage.setViewportSize(viewport);
  for (const route of [
    ['clientes', 'Clientes'],
    ['orcamentos', 'Orçamentos'],
    ['ordens-de-servico', 'Ordens de Serviço'],
  ]) {
    await webPage.goto(`http://127.0.0.1:3001/${route[0]}`, { waitUntil: 'networkidle' });
    await webPage.getByRole('heading', { name: route[1], exact: true }).waitFor();
    await waitForIndicator(
      webPage,
      route[0] === 'clientes' ? 'Clientes' : route[0] === 'orcamentos' ? 'Orçamentos' : 'Ordens de serviço',
    );
    await audit(webPage, `web-completo-${route[0]}`, viewport.name, `web-completo-${route[0]}-${viewport.name}.png`);
  }

  await webPage.goto('http://127.0.0.1:3001/facil', { waitUntil: 'networkidle' });
  await webPage.getByRole('button', { name: 'Clientes', exact: true }).last().click();
  await webPage.getByRole('heading', { name: 'Clientes', exact: true }).waitFor();
  await waitForIndicator(webPage, 'Clientes');
  await audit(webPage, 'web-facil-clientes', viewport.name, `web-facil-clientes-${viewport.name}.png`);
  await webPage.getByRole('button', { name: 'Orçamentos', exact: true }).last().click();
  await webPage.getByRole('heading', { name: 'Orçamentos', exact: true }).waitFor();
  await waitForIndicator(webPage, 'Orçamentos');
  await audit(webPage, 'web-facil-orcamentos', viewport.name, `web-facil-orcamentos-${viewport.name}.png`);
  await webPage.getByRole('button', { name: 'Início', exact: true }).last().evaluate((element) => element.click());
  await webPage.getByRole('button', { name: /Serviços/ }).first().click();
  await webPage.getByRole('heading', { name: /Serviços/ }).waitFor();
  await waitForIndicator(webPage, 'Ordens de serviço');
  await audit(webPage, 'web-facil-servicos', viewport.name, `web-facil-servicos-${viewport.name}.png`);
}
await webContext.close();

for (const viewport of viewports) {
  const appContext = await browser.newContext({
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    viewport,
  });
  const appPage = await appContext.newPage();
  await appPage.goto('http://127.0.0.1:8081', { waitUntil: 'networkidle' });
  await appPage.locator('input').nth(0).fill(env.UI_AUDIT_EMAIL);
  await appPage.locator('input').nth(1).fill(env.UI_AUDIT_PASSWORD);
  await appPage.getByRole('button', { name: 'Entrar', exact: true }).click();

  await appPage.getByText('Clientes', { exact: true }).last().click();
  await appPage.getByText('Pessoas e empresas atendidas', { exact: true }).waitFor();
  await waitForIndicator(appPage, 'Clientes');
  await audit(appPage, 'app-completo-clientes', viewport.name, `app-completo-clientes-${viewport.name}.png`);
  await appPage.getByText('Orçamentos', { exact: true }).last().click();
  await appPage.getByText('Orçamentos', { exact: true }).first().waitFor();
  await waitForIndicator(appPage, 'Orçamentos');
  await audit(appPage, 'app-completo-orcamentos', viewport.name, `app-completo-orcamentos-${viewport.name}.png`);
  await appPage.getByText('Mais', { exact: true }).last().click();
  await appPage.getByText('Ordens de Serviço', { exact: true }).click();
  await waitForIndicator(appPage, 'Ordens de serviço');
  await audit(appPage, 'app-completo-servicos', viewport.name, `app-completo-servicos-${viewport.name}.png`);

  await appPage.getByText('Mais', { exact: true }).last().click();
  await appPage.getByText('Modo fácil', { exact: true }).click();
  await appPage.getByText('Clientes', { exact: true }).last().click();
  await waitForIndicator(appPage, 'Clientes');
  await audit(appPage, 'app-facil-clientes', viewport.name, `app-facil-clientes-${viewport.name}.png`);
  await appPage.getByText('Orçamentos', { exact: true }).last().click();
  await waitForIndicator(appPage, 'Orçamentos');
  await audit(appPage, 'app-facil-orcamentos', viewport.name, `app-facil-orcamentos-${viewport.name}.png`);
  await appPage.getByText('Início', { exact: true }).last().click({ force: true });
  await appPage.getByText('Serviços', { exact: false }).first().click();
  await waitForIndicator(appPage, 'Ordens de serviço');
  await audit(appPage, 'app-facil-servicos', viewport.name, `app-facil-servicos-${viewport.name}.png`);
  await appContext.close();
}

const attentionContext = await browser.newContext({
  locale: 'pt-BR',
  timezoneId: 'America/Sao_Paulo',
  viewport: { width: 390, height: 844 },
});
const attentionPage = await attentionContext.newPage();
await attentionPage.route('**/company/me/usage', async (route) => {
  const response = await route.fetch();
  const usage = await response.json();
  usage.resources = usage.resources.map((resource) =>
    resource.code === 'QUOTES_MONTH'
      ? { ...resource, used: 8, limit: 10, remaining: 2, state: 'ATTENTION' }
      : resource,
  );
  await route.fulfill({ response, json: usage });
});
await attentionPage.goto('http://127.0.0.1:8081', { waitUntil: 'networkidle' });
await attentionPage.locator('input').nth(0).fill(env.UI_AUDIT_EMAIL);
await attentionPage.locator('input').nth(1).fill(env.UI_AUDIT_PASSWORD);
await attentionPage.getByRole('button', { name: 'Entrar', exact: true }).click();
await attentionPage.getByText('Orçamentos', { exact: true }).last().click();
await attentionPage.getByText('Comparar planos', { exact: true }).waitFor();
await audit(attentionPage, 'app-completo-orcamentos-atencao', '390x844', 'app-completo-orcamentos-atencao-390x844.png');
await attentionContext.close();

await browser.close();
const failures = results.filter((result) => result.horizontalOverflow);
console.log(JSON.stringify({ results, failures: failures.length }, null, 2));
if (failures.length) process.exitCode = 1;

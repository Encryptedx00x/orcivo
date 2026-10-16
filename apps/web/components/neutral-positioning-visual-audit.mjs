/* eslint-disable no-console */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
if (!env.UI_AUDIT_EMAIL || !env.UI_AUDIT_PASSWORD)
  throw new Error('Credenciais locais UI_AUDIT ausentes.');

const outputDir = resolve(repoRoot, 'docs/qa/evidence/b4-37');
mkdirSync(outputDir, { recursive: true });
const viewports = [
  { width: 1440, height: 900, name: '1440x900' },
  { width: 390, height: 844, name: '390x844' },
  { width: 360, height: 800, name: '360x800' },
];
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
});
const results = [];

async function capture(page, surface, viewport) {
  await page.waitForTimeout(250);
  const metrics = await page.evaluate(
    ({ surface, viewport }) => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return (
          style.visibility !== 'hidden' &&
          style.display !== 'none' &&
          box.width > 0 &&
          box.height > 0
        );
      };
      const insideHorizontalScroller = (element) => {
        let parent = element.parentElement;
        while (parent) {
          const overflowX = getComputedStyle(parent).overflowX;
          if (overflowX === 'auto' || overflowX === 'scroll') return true;
          parent = parent.parentElement;
        }
        return false;
      };
      const clippedControls = [...document.querySelectorAll('input, select, textarea, button')]
        .filter(visible)
        .map((element) => {
          const box = element.getBoundingClientRect();
          return {
            text:
              element.getAttribute('aria-label') ||
              element.textContent?.trim().slice(0, 40) ||
              element.tagName,
            left: box.left,
            right: box.right,
            width: box.width,
            inputType: element instanceof HTMLInputElement ? element.type : null,
            isField: element.matches('input, select, textarea'),
            insideHorizontalScroller: insideHorizontalScroller(element),
          };
        })
        .filter((control) => {
          const intersectsViewport = control.right > 0 && control.left < window.innerWidth;
          const clipped =
            intersectsViewport &&
            !control.insideHorizontalScroller &&
            (control.left < -1 || control.right > window.innerWidth + 1);
          const undersizedField =
            control.isField &&
            !['checkbox', 'radio'].includes(control.inputType ?? '') &&
            control.width < 40;
          return clipped || undersizedField;
        });
      return {
        surface,
        viewport,
        documentWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        clippedControls,
      };
    },
    { surface, viewport },
  );
  results.push(metrics);
  await page.screenshot({ path: resolve(outputDir, `${surface}-${viewport}.png`), fullPage: true });
}

async function login(page, base = 'http://127.0.0.1:3001') {
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(env.UI_AUDIT_EMAIL);
  await page.locator('input[type="password"]').fill(env.UI_AUDIT_PASSWORD);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.waitForURL('**/dashboard');
}

for (const viewport of process.env.B4_37_APP_ONLY ? [] : viewports) {
  const context = await browser.newContext({
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    viewport,
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3002', { waitUntil: 'networkidle' });
  await page
    .getByText('Feito para empresas e profissionais de serviços', { exact: true })
    .waitFor();
  await capture(page, 'site-landing', viewport.name);

  await page.route('**/api/auth/signup/user', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: 'visual-audit-token' }),
    }),
  );
  await page.goto('http://127.0.0.1:3001/signup', { waitUntil: 'networkidle' });
  await capture(page, 'web-onboarding-etapa-1', viewport.name);
  await page.getByPlaceholder('João Ribeiro').fill('Pessoa de Teste');
  await page.locator('input[type="email"]').fill('visual@example.test');
  await page.locator('input[type="password"]').fill('SenhaVisual123');
  await page.locator('input[type="checkbox"]').check();
  await page.getByRole('button', { name: 'Criar minha conta grátis', exact: true }).click();
  await page.getByRole('heading', { name: 'Dados da empresa' }).waitFor();
  await capture(page, 'web-onboarding-etapa-2', viewport.name);

  await login(page);
  await page.goto('http://127.0.0.1:3001/configuracoes', { waitUntil: 'networkidle' });
  await page.getByText('Nicho da empresa (opcional)', { exact: true }).waitFor({ timeout: 3000 });
  await capture(page, 'web-completo-empresa', viewport.name);
  await page.getByRole('tab', { name: 'Minha conta', exact: true }).click();
  await page.getByText('Como deseja ser chamado?', { exact: true }).waitFor();
  await capture(page, 'web-completo-conta', viewport.name);

  await page.goto('http://127.0.0.1:3001/facil', { waitUntil: 'networkidle' });
  if (viewport.width >= 1024) {
    await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  } else {
    await page.getByRole('button', { name: 'Menu', exact: true }).last().click();
    await page.getByText('Configurações', { exact: true }).click();
  }
  await page.getByRole('button', { name: /Minha empresa/ }).click();
  await page.getByText('Nicho da empresa (opcional)', { exact: true }).waitFor();
  await capture(page, 'web-facil-empresa', viewport.name);
  await context.close();
}

for (const viewport of viewports) {
  const context = await browser.newContext({
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    viewport,
  });
  const page = await context.newPage();
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.locator('input').nth(0).click();
  await page.locator('input').nth(0).pressSequentially(env.UI_AUDIT_EMAIL);
  await page.locator('input').nth(1).click();
  await page.locator('input').nth(1).pressSequentially(env.UI_AUDIT_PASSWORD);
  const loginButton = page.getByRole('button', { name: 'Entrar', exact: true });
  const loginResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/auth/login'),
  );
  await loginButton.click();
  const loginResponse = await loginResponsePromise;
  if (!loginResponse.ok())
    throw new Error(`Login local do app falhou com HTTP ${loginResponse.status()}.`);
  await page.getByText('Mais', { exact: true }).last().waitFor();
  await page.getByText('Mais', { exact: true }).last().click();
  await page.getByText('Configurações', { exact: true }).click();
  await page.getByText('Nicho da empresa (opcional)', { exact: true }).waitFor();
  await capture(page, 'app-completo-empresa', viewport.name);

  await page.getByRole('button', { name: 'Go back' }).click();
  await page.getByText('Modo fácil', { exact: true }).first().click();
  await page.getByText('Menu', { exact: true }).last().click();
  await page.getByText('Configurações', { exact: true }).click();
  await page.getByText('Minha empresa', { exact: true }).last().click();
  await page.getByText('Nicho da empresa (opcional)', { exact: true }).waitFor();
  await capture(page, 'app-facil-empresa', viewport.name);
  await context.close();
}

await browser.close();
const failures = results.filter(
  (result) => result.horizontalOverflow || result.clippedControls.length,
);
writeFileSync(
  resolve(outputDir, 'results.json'),
  `${JSON.stringify({ results, failures }, null, 2)}\n`,
);
console.log(JSON.stringify({ scenarios: results.length, failures: failures.length }, null, 2));
if (failures.length) process.exitCode = 1;

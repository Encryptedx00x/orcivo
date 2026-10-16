/* eslint-disable no-console */
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const repoRoot = resolve(import.meta.dirname, '../../../../..');
const env = Object.fromEntries(
  readFileSync(resolve(repoRoot, 'apps/web/.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);
if (!env.UI_AUDIT_EMAIL || !env.UI_AUDIT_PASSWORD) {
  throw new Error('Credenciais locais UI_AUDIT ausentes.');
}

const outputDir = resolve(repoRoot, 'docs/qa/evidence/b4-35');
mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
});
const context = await browser.newContext({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
const page = await context.newPage();

async function login() {
  await page.goto('http://127.0.0.1:3001/login', { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(env.UI_AUDIT_EMAIL);
  await page.locator('input[type="password"]').fill(env.UI_AUDIT_PASSWORD);
  const [loginResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/api/auth/login')),
    page.getByRole('button', { name: 'Entrar', exact: true }).click(),
  ]);
  if (!loginResponse.ok()) throw new Error(`Login local falhou com HTTP ${loginResponse.status()}.`);
  await page.waitForURL('**/dashboard');
}

async function layoutResult(pageUnderTest, surface, viewport) {
  return pageUnderTest.evaluate(
    ({ surfaceName, currentViewport }) => {
      const overflowing = Array.from(document.querySelectorAll('body *'))
        .filter((element) => {
          const style = getComputedStyle(element);
          if (style.position === 'fixed' && element.id === 'next-logo') return false;
          if (
            window.innerWidth < 1024 &&
            (element.closest('.ov-sidebar') || element.closest('.ov-hamburger'))
          )
            return false;
          const rect = element.getBoundingClientRect();
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            (rect.left < -1 || rect.right > window.innerWidth + 1)
          );
        })
        .slice(0, 8)
        .map((element) => ({
          tag: element.tagName.toLowerCase(),
          text: (element.textContent ?? '').trim().slice(0, 60),
          className: typeof element.className === 'string' ? element.className.slice(0, 80) : '',
        }));
      return {
        surface: surfaceName,
        viewport: currentViewport,
        documentWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        overflowing,
      };
    },
    { surfaceName: surface, currentViewport: viewport },
  );
}

const results = [];
await login();
for (const viewport of [
  { width: 1440, height: 900, name: '1440x900' },
  { width: 390, height: 844, name: '390x844' },
  { width: 360, height: 800, name: '360x800' },
]) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto('http://127.0.0.1:3001/uso', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Uso do plano' }).waitFor();
  results.push(await layoutResult(page, 'web-completo', viewport.name));
  await page.screenshot({ path: resolve(outputDir, `web-completo-${viewport.name}.png`), fullPage: true });

  await page.goto('http://127.0.0.1:3001/facil', { waitUntil: 'networkidle' });
  await page
    .getByRole('button', { name: viewport.width >= 1024 ? 'Mais' : 'Menu', exact: true })
    .click();
  await page.getByText('Uso e plano', { exact: true }).waitFor();
  results.push(await layoutResult(page, 'web-facil-menu', viewport.name));
  await page.screenshot({ path: resolve(outputDir, `web-facil-menu-${viewport.name}.png`), fullPage: true });
  await page.getByText('Uso e plano', { exact: true }).click();
  await page.waitForURL('**/uso');
  await page.getByRole('heading', { name: 'Uso do plano' }).waitFor();
  results.push(await layoutResult(page, 'web-facil-uso', viewport.name));
  await page.screenshot({ path: resolve(outputDir, `web-facil-uso-${viewport.name}.png`), fullPage: true });
}

for (const viewport of [
  { width: 1440, height: 900, name: '1440x900' },
  { width: 390, height: 844, name: '390x844' },
  { width: 360, height: 800, name: '360x800' },
]) {
  const appContext = await browser.newContext({
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    viewport: { width: viewport.width, height: viewport.height },
  });
  const appPage = await appContext.newPage();
  await appPage.goto('http://127.0.0.1:8081', { waitUntil: 'networkidle' });
  await appPage.locator('input').nth(0).fill(env.UI_AUDIT_EMAIL);
  await appPage.locator('input').nth(1).fill(env.UI_AUDIT_PASSWORD);
  await appPage.getByRole('button', { name: 'Entrar', exact: true }).click();
  await appPage.getByText('Mais', { exact: true }).last().click();
  await appPage.getByText('Uso', { exact: true }).click();
  await appPage.getByText('Uso do plano', { exact: true }).waitFor();
  results.push(await layoutResult(appPage, 'app-completo', viewport.name));
  await appPage.screenshot({ path: resolve(outputDir, `app-completo-${viewport.name}.png`), fullPage: true });

  await appPage.getByText('Mais', { exact: true }).last().click();
  await appPage.getByText('Modo fácil', { exact: true }).click();
  await appPage.getByText('Menu', { exact: true }).last().click();
  await appPage.getByText('Uso e plano', { exact: true }).click();
  await appPage.getByText('Uso do plano', { exact: true }).waitFor();
  results.push(await layoutResult(appPage, 'app-facil', viewport.name));
  await appPage.screenshot({ path: resolve(outputDir, `app-facil-${viewport.name}.png`), fullPage: true });
  await appContext.close();
}

await browser.close();
const failures = results.filter(
  (result) => result.horizontalOverflow || result.overflowing.length > 0,
);
console.log(JSON.stringify({ results, failures: failures.length }, null, 2));
if (failures.length) process.exitCode = 1;

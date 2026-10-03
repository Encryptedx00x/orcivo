const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const site = path.resolve(__dirname, '../..');
  const font = fs.readFileSync(path.resolve(site, '../backend/src/quote/fonts/Inter-Bold.ttf')).toString('base64');
  const regular = fs.readFileSync(path.resolve(site, '../backend/src/quote/fonts/Inter-Regular.ttf')).toString('base64');
  const mark = fs.readFileSync(path.join(site, 'public/icon.svg'), 'utf8');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>
      @font-face { font-family: Inter; src: url(data:font/ttf;base64,${font}); font-weight: 700; }
      @font-face { font-family: Inter; src: url(data:font/ttf;base64,${regular}); font-weight: 400; }
      * { box-sizing: border-box; } body { margin: 0; width: 1200px; height: 630px; padding: 56px 72px; border-bottom: 20px solid #6D28D9; font-family: Inter; color: #0A0A0F; background: white; }
      header { display: flex; gap: 24px; align-items: center; font-size: 52px; font-weight: 700; }
      header svg { width: 96px; height: 96px; margin: -12px; }
      h1 { font-size: 56px; line-height: 1.3; margin: 92px 0 36px; letter-spacing: -1px; }
      h1 span { color: #6D28D9; } p { font-size: 32px; color: #475569; margin: 0; }
      small { position: absolute; left: 72px; bottom: 58px; font-size: 24px; color: #475569; }
    </style><header>${mark} Orcivo</header><h1>Do orçamento à aprovação,<br><span>tudo pelo celular.</span></h1><p>Orçamentos, OS, PDF e WhatsApp.</p><small>orcivo.com.br</small></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(site, 'public/og-image.png') });
  } finally {
    await browser.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

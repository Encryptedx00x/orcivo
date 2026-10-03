const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const base = process.env.SITE_TEST_URL || 'http://localhost:3002';
  const site = path.resolve(__dirname, '../..');
  const evidence = path.join(site, 'public/evidence/seo-375');
  fs.mkdirSync(evidence, { recursive: true });
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const titles = new Set();
    const descriptions = new Set();
    const results = [];
    for (const route of ['/', '/planos', '/termos', '/privacidade', '/checkout', '/checkout/success']) {
      // Keep the legacy checkout redirect local while examining its rendered shell.
      await page.route('https://app.orcivo.com.br/**', (request) => request.fulfill({ status: 204 }));
      const response = await page.goto(base + route, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200);
      await page.evaluate(() => document.fonts.ready);
      if (route === '/checkout') await page.getByText('Redirecionando para o checkout...').waitFor();
      const data = await page.evaluate(() => {
        const meta = (key) => document.querySelector(`meta[name="${key}"],meta[property="${key}"]`)?.content;
        return {
          title: document.title, description: meta('description'),
          ogTitle: meta('og:title'), ogDescription: meta('og:description'), image: meta('og:image'),
          twitterTitle: meta('twitter:title'), twitterDescription: meta('twitter:description'), twitterImage: meta('twitter:image'), card: meta('twitter:card'),
          canonical: document.querySelector('link[rel="canonical"]')?.href,
          robots: meta('robots'), icon: document.querySelector('link[rel="icon"]')?.getAttribute('href'),
          footer: document.querySelectorAll('footer').length,
          terms: !!document.querySelector('footer a[href="/termos"]'), privacy: !!document.querySelector('footer a[href="/privacidade"]'),
          width: document.documentElement.scrollWidth, viewport: innerWidth,
        };
      });
      assert.ok(data.title && data.description);
      assert.ok(!/[?\uFFFD]/.test(data.title + data.description), 'Metadata encoding');
      assert.ok(!titles.has(data.title) && !descriptions.has(data.description), 'Unique metadata');
      titles.add(data.title); descriptions.add(data.description);
      assert.equal(data.ogTitle, data.title); assert.equal(data.twitterTitle, data.title);
      assert.equal(data.ogDescription, data.description); assert.equal(data.twitterDescription, data.description);
      assert.equal(data.canonical, 'https://orcivo.com.br' + (route === '/' ? '/' : route));
      assert.equal(data.image, 'https://orcivo.com.br/og-image.png');
      assert.equal(data.twitterImage, data.image); assert.equal(data.card, 'summary_large_image');
      assert.equal(data.icon, '/favicon.ico');
      assert.equal(data.footer, 1); assert.ok(data.terms && data.privacy);
      assert.equal(data.width, 375, `Horizontal overflow at ${route}`);
      assert.ok(data.robots.includes(route.startsWith('/checkout') ? 'noindex' : 'index'));
      const filename = (route === '/' ? 'home' : route.slice(1).replaceAll('/', '-')) + '.png';
      await page.screenshot({ path: path.join(evidence, filename), fullPage: true });
      results.push({ route, ...data, screenshot: filename });
    }
    for (const asset of ['/favicon.ico', '/icon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/og-image.png', '/manifest.webmanifest']) {
      const response = await context.request.get(base + asset);
      assert.equal(response.status(), 200, asset);
      assert.ok((await response.body()).length > 0);
    }
    const png = fs.readFileSync(path.join(site, 'public/og-image.png'));
    assert.equal(png.readUInt32BE(16), 1200); assert.equal(png.readUInt32BE(20), 630);
    const ico = fs.readFileSync(path.resolve(site, '../web/public/favicon.ico'));
    assert.equal(ico.readUInt16LE(2), 1); assert.ok(ico.readUInt16LE(4) >= 1);
    const robots = await context.request.get(base + '/robots.txt');
    assert.equal(robots.status(), 200);
    assert.match(await robots.text(), /User-Agent: \*[\s\S]*Allow: \/[\s\S]*Sitemap: https:\/\/orcivo.com.br\/sitemap.xml/i);
    const sitemap = await context.request.get(base + '/sitemap.xml');
    assert.equal(sitemap.status(), 200);
    const xml = await sitemap.text();
    const locations = await page.evaluate((xml) => {
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      if (doc.querySelector('parsererror')) throw new Error('Invalid sitemap XML');
      return [...doc.querySelectorAll('loc')].map((node) => node.textContent);
    }, xml);
    assert.deepEqual(locations, ['https://orcivo.com.br/', 'https://orcivo.com.br/planos', 'https://orcivo.com.br/termos', 'https://orcivo.com.br/privacidade']);
    fs.writeFileSync(path.join(evidence, 'results.json'), JSON.stringify({ viewport: '375x812', results, assets: 'PASS', robots: 'PASS', sitemap: 'PASS' }, null, 2) + '\n');
    console.log('PASS: 6 routes with unique SEO metadata, shared legal footer and no horizontal overflow at 375px; icons, OG image, robots and sitemap verified.');
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

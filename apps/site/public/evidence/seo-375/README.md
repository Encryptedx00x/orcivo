# SEO and mobile verification

Viewport: **375 × 812 CSS pixels**, device scale 1, Chromium, reduced motion enabled.
All six public routes render one legal footer and have a document width of 375px (no horizontal overflow).

- [Home](home.png)
- [Plans](planos.png)
- [Terms](termos.png)
- [Privacy](privacidade.png)
- [Checkout redirect shell](checkout.png)
- [Checkout confirmation](checkout-success.png)
- [Machine-readable assertions](results.json)

Screenshots are full-page captures. The checkout destination is blocked during verification to inspect the local redirect shell without leaving the site.

Reproduce from the repository root, with the site's production server running on port 3002:

```text
pnpm --filter @orcivo/site build
pnpm --filter @orcivo/site start
node apps/site/app/_checks/seo.cjs
```

The check uses an available Playwright installation; set `PLAYWRIGHT_MODULE` to its module path when it is not on the normal Node resolution path. `SITE_TEST_URL` optionally overrides the local origin. No dependency changes are required.

The check asserts unique titles/descriptions and matching OpenGraph/Twitter fields, canonical URLs, icons, image dimensions, robots directives, valid sitemap XML, legal links and viewport width. The 1200 × 630 OG PNG can be reproduced with `node apps/site/app/_checks/generate-og.cjs`, using the existing local Inter fonts and brand mark.

Sharing metadata and image delivery were verified locally. External social-network caches require the eventual deployment; no deployment was performed. These files are ready to attach or link in the dispatcher PR/commit.

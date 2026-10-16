import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { transformSync } = require('esbuild');
const source = readFileSync(new URL('./PlanUsageIndicator.tsx', import.meta.url), 'utf8');
const compiled = transformSync(source, { loader: 'tsx', format: 'cjs', target: 'es2022', jsx: 'automatic' });
const moduleRef = { exports: {} };
function LinkMock({ href, children, ...props }) {
  return React.createElement('a', { href, ...props }, children);
}
runInNewContext(compiled.code, {
  exports: moduleRef.exports,
  module: moduleRef,
  Set,
  require(name) {
    if (name === 'react/jsx-runtime') return require('react/jsx-runtime');
    if (name === 'next/link') return LinkMock;
    if (name === 'lucide-react') return { AlertTriangle: () => React.createElement('i') };
    throw new Error(`Unexpected dependency: ${name}`);
  },
});
const { PlanUsageIndicator } = moduleRef.exports;

const resource = {
  code: 'QUOTES_MONTH',
  label: 'Orçamentos',
  used: 8,
  limit: 10,
  remaining: 2,
  period: 'CALENDAR_MONTH',
  state: 'ATTENTION',
};

test('uses the backend state to show the preventive CTA and authoritative quantities', () => {
  const html = renderToStaticMarkup(React.createElement(PlanUsageIndicator, { resource }));
  assert.match(html, /Orçamentos:.*8 de 10.*2 restantes/);
  assert.match(html, /Comparar planos/);
  assert.match(html, /href="\/plano#planos"/);
});

test('keeps normal and fair-use resources informational without an upgrade warning', () => {
  const normal = renderToStaticMarkup(
    React.createElement(PlanUsageIndicator, { resource: { ...resource, used: 2, remaining: 8, state: 'NORMAL' } }),
  );
  const fairUse = renderToStaticMarkup(
    React.createElement(PlanUsageIndicator, {
      resource: { ...resource, used: 27, limit: null, remaining: null, state: 'FAIR_USE' },
    }),
  );
  assert.match(normal, /Ver uso/);
  assert.doesNotMatch(normal, /Comparar planos/);
  assert.match(fairUse, /27 usados · uso justo/);
  assert.doesNotMatch(fairUse, /Comparar planos/);
});

test('does not invent a value when the backend marks the resource unavailable', () => {
  const html = renderToStaticMarkup(
    React.createElement(PlanUsageIndicator, {
      resource: { ...resource, used: null, remaining: null, state: 'UNAVAILABLE' },
    }),
  );
  assert.equal(html, '');
});

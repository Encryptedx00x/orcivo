import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { transformSync } = require('esbuild');
const source = readFileSync(new URL('./UsageOverview.tsx', import.meta.url), 'utf8');
const compiled = transformSync(source, {
  loader: 'tsx',
  format: 'cjs',
  target: 'es2022',
  jsx: 'automatic',
});
const moduleRef = { exports: {} };
const Icon = ({ size, color }) => React.createElement('i', { 'data-size': size, 'data-color': color });
runInNewContext(compiled.code, {
  exports: moduleRef.exports,
  module: moduleRef,
  Date,
  Intl,
  require(name) {
    if (name === 'react/jsx-runtime') return require('react/jsx-runtime');
    if (name === 'lucide-react') return { Check: Icon, Clock3: Icon, LockKeyhole: Icon };
    throw new Error(`Unexpected dependency: ${name}`);
  },
});
const { UsageOverview } = moduleRef.exports;

const fixture = {
  plan: { code: 'LIVRE', name: 'Orcivo Livre', subscription_status: null, is_blocked: false },
  billing_period: null,
  usage_period: {
    start: '2026-10-01T03:00:00.000Z',
    end: '2026-11-01T03:00:00.000Z',
    reset_at: '2026-11-01T03:00:00.000Z',
  },
  resources: [
    { code: 'CUSTOMERS', label: 'Clientes', used: 4, limit: 5, remaining: 1, period: 'TOTAL', state: 'ATTENTION' },
    { code: 'QUOTES_MONTH', label: 'Orçamentos', used: 8, limit: 10, remaining: 2, period: 'CALENDAR_MONTH', state: 'ATTENTION' },
    { code: 'WORK_ORDERS_MONTH', label: 'Ordens de serviço', used: 3, limit: 15, remaining: 12, period: 'CALENDAR_MONTH', state: 'NORMAL' },
    { code: 'MEMBERS', label: 'Membros da equipe', used: 1, limit: 1, remaining: 0, period: 'TOTAL', state: 'REACHED' },
  ],
  features: [
    { code: 'LOGO', label: 'Logo própria', state: 'LOCKED' },
    { code: 'PDF_WITHOUT_WATERMARK', label: "PDF sem marca d'água", state: 'LOCKED' },
    { code: 'REPORTS', label: 'Relatórios financeiros', state: 'AVAILABLE' },
    { code: 'CONTRACTS', label: 'Contratos digitais', state: 'NOT_IMPLEMENTED' },
  ],
  generated_at: '2026-10-15T12:00:00.000Z',
};

test('renders authoritative quantities, progress semantics, features and contextual CTA', () => {
  const html = renderToStaticMarkup(React.createElement(UsageOverview, { usage: fixture }));
  assert.match(html, /4 de 5 · 1 restantes/);
  assert.match(html, /8 de 10 · 2 restantes/);
  assert.match(html, /role="progressbar"/);
  assert.match(html, /aria-valuenow="80"/);
  assert.match(html, /Outro plano/);
  assert.match(html, /Disponível/);
  assert.match(html, /Em breve/);
  assert.match(html, /Comparar planos/);
  assert.match(html, /próximo ou chegou a um limite/);
});

test('renders fair-use and unavailable counters without a fabricated percentage', () => {
  const usage = {
    ...fixture,
    resources: [
      { ...fixture.resources[0], used: 27, limit: null, remaining: null, state: 'FAIR_USE' },
      { ...fixture.resources[1], used: null, remaining: null, state: 'UNAVAILABLE' },
    ],
  };
  const html = renderToStaticMarkup(React.createElement(UsageOverview, { usage }));
  assert.match(html, /27 usados · uso justo/);
  assert.match(html, /Não foi possível consultar agora/);
  assert.doesNotMatch(html, /role="progressbar"/);
});

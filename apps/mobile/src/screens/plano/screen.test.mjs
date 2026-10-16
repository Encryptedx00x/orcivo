import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { planoError } from './plano-errors.ts';

const require = createRequire(import.meta.url);
const ts = require(process.env.TYPESCRIPT_PATH || 'typescript');

function compile(relativePath, modules) {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    reportDiagnostics: true,
  });
  assert.equal(compiled.diagnostics.length, 0);
  const exports = {};
  runInNewContext(compiled.outputText, { exports, require: (name) => {
    assert.ok(name in modules, `Unexpected dependency: ${name}`);
    return modules[name];
  } });
  return exports;
}

// Exercise the real plan metadata rather than duplicating names/prices in the test.
const sharedPlans = compile('../../../../../packages/shared-types/src/billing/plans.ts', {});
const sharedMoney = compile('../../../../../packages/shared-types/src/helpers/money.ts', {
  'decimal.js': require('decimal.js'),
});
const sharedTypes = { ...sharedPlans, ...sharedMoney };
const plans = compile('./plans.ts', { '@orcivo/shared-types': sharedTypes });

function createElement(type, props, ...children) {
  return typeof type === 'function' ? type({ ...props, children }) : { type, props: props ?? {}, children: children.flat(Infinity) };
}
function nodes(node) {
  return node && typeof node === 'object' ? [node, ...node.children.flatMap(nodes)] : [];
}
function textContent(node) {
  if (node == null || typeof node === 'boolean') return '';
  return typeof node === 'object' ? node.children.map(textContent).join('') : String(node);
}
const native = Object.fromEntries(['ActivityIndicator', 'ScrollView', 'Text', 'TouchableOpacity', 'View'].map((name) => [name, name]));
native.StyleSheet = { create: (styles) => styles };
native.Platform = { OS: 'ios' };

// Same lightweight hook/host adapter used by EquipeScreen/FinanceiroScreen tests.
// It verifies behavior and native props; device layout is not simulated.
function mount({ getJson, planMetadata = plans } = {}) {
  const slots = [];
  let index = 0;
  const effects = [];
  const cleanups = new Map();
  const opened = [];
  const react = {
    createElement,
    useState(initial) {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = initial;
      return [slots[slot], (value) => { slots[slot] = typeof value === 'function' ? value(slots[slot]) : value; }];
    },
    useCallback(callback, deps) {
      const slot = index++;
      if (!slots[slot] || deps.some((value, i) => slots[slot].deps[i] !== value)) slots[slot] = { callback, deps };
      return slots[slot].callback;
    },
  };
  let focus;
  const nativeWithLinking = { ...native, Linking: { openURL: (url) => { opened.push(url); } } };
  const { PlanoScreen } = compile('./PlanoScreen.tsx', {
    react, 'react-native': nativeWithLinking,
    '@react-navigation/native': { useFocusEffect(callback) {
      const slot = index++;
      focus = () => { cleanups.get(slot)?.(); cleanups.set(slot, callback()); };
      if (slots[slot] !== callback) {
        slots[slot] = callback;
        effects.push(focus);
      }
    } },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24, bottom: 20 }) },
    'lucide-react-native': {
      Check: 'Check', Clock3: 'Clock3', CreditCard: 'CreditCard',
      ExternalLink: 'ExternalLink', LockKeyhole: 'LockKeyhole',
    },
    '../../services/api': { api: { get: getJson ?? (async () => { throw new Error('unexpected api.get'); }) } },
    './plano-errors': { planoError },
    './plans': planMetadata,
  });
  let tree;
  const render = () => {
    index = 0;
    tree = PlanoScreen();
    while (effects.length) effects.shift()();
  };
  render();
  return {
    render,
    opened,
    async settle() { await new Promise((resolve) => setImmediate(resolve)); render(); },
    focus() { focus(); render(); },
    blur() { for (const cleanup of cleanups.values()) cleanup?.(); },
    button(label) { return nodes(tree).find((node) => node.type === 'TouchableOpacity' && textContent(node) === label); },
    text(value) { return nodes(tree).some((node) => node.type === 'Text' && textContent(node) === value); },
    textContaining(value) { return nodes(tree).some((node) => node.type === 'Text' && textContent(node).includes(value)); },
  };
}

function usageFor(code = 'LIVRE', overrides = {}) {
  const limits = sharedPlans.PLAN_LIMITS[code];
  const resources = [
    ['CUSTOMERS', 'Clientes', 4, limits.customers_max, 'TOTAL'],
    ['QUOTES_MONTH', 'Orçamentos', 8, limits.quotes_per_month, 'CALENDAR_MONTH'],
    ['WORK_ORDERS_MONTH', 'Ordens de serviço', 3, limits.work_orders_per_month, 'CALENDAR_MONTH'],
    ['MEMBERS', 'Membros da equipe', 1, limits.members_max, 'TOTAL'],
  ].map(([resourceCode, label, used, limit, period]) => ({
    code: resourceCode,
    label,
    used,
    limit,
    remaining: limit == null ? null : Math.max(limit - used, 0),
    period,
    state: limit == null ? 'FAIR_USE' : used >= limit ? 'REACHED' : used * 100 >= limit * 80 ? 'ATTENTION' : 'NORMAL',
  }));
  return {
    plan: { code, name: plans.planName(code), subscription_status: code === 'LIVRE' ? null : 'ACTIVE', is_blocked: false },
    billing_period: code === 'LIVRE' ? null : {
      start: '2026-10-01T03:00:00.000Z', end: '2026-11-01T03:00:00.000Z', renews_at: '2026-11-01T03:00:00.000Z',
    },
    usage_period: {
      start: '2026-10-01T03:00:00.000Z', end: '2026-11-01T03:00:00.000Z', reset_at: '2026-11-01T03:00:00.000Z',
    },
    resources,
    features: [
      { code: 'LOGO', label: 'Logo própria', state: limits.has_logo ? 'AVAILABLE' : 'LOCKED' },
      { code: 'PDF_WITHOUT_WATERMARK', label: "PDF sem marca d'água", state: limits.pdf_watermark ? 'LOCKED' : 'AVAILABLE' },
      { code: 'REPORTS', label: 'Relatórios financeiros', state: limits.has_reports ? 'AVAILABLE' : 'LOCKED' },
      { code: 'CONTRACTS', label: 'Contratos digitais', state: limits.has_contracts ? 'NOT_IMPLEMENTED' : 'LOCKED' },
    ],
    generated_at: '2026-10-15T12:00:00.000Z',
    ...overrides,
  };
}

function jsonRouter(map) {
  return async (path) => {
    if (!(path in map)) throw new Error(`Unexpected path: ${path}`);
    return map[path];
  };
}

test('shows current shared monthly prices for every current plan and alternative', async () => {
  for (const code of Object.keys(sharedPlans.PLAN_PRICING)) {
    const screen = mount({
      getJson: jsonRouter({ '/company/me/usage': usageFor(code) }),
    });
    await screen.settle();
    for (const [planCode, pricing] of Object.entries(sharedPlans.PLAN_PRICING)) {
      const label = planCode === 'LIVRE'
        ? (code === 'LIVRE' ? 'Gratuito · uso justo' : 'Gratuito')
        : `${sharedMoney.formatMoney(pricing.monthly)}/mês`;
      assert.ok(screen.text(label), `${code}: ${planCode} must display ${label}`);
    }
  }
});

test('a shared price change reaches the current plan and alternatives without mobile edits', async () => {
  const changedPlans = compile('./plans.ts', {
    '@orcivo/shared-types': {
      ...sharedTypes,
      PLAN_PRICING: {
        ...sharedPlans.PLAN_PRICING,
        MAIS: { ...sharedPlans.PLAN_PRICING.MAIS, monthly: '1234.56' },
      },
    },
  });
  for (const code of ['MAIS', 'LIVRE']) {
    const screen = mount({
      planMetadata: changedPlans,
      getJson: jsonRouter({ '/company/me/usage': usageFor(code) }),
    });
    await screen.settle();
    assert.ok(screen.text('R$ 1.234,56/mês'));
    assert.equal(screen.text(`${sharedMoney.formatMoney(sharedPlans.PLAN_PRICING.MAIS.monthly)}/mês`), false);
  }
});

test('shows a loading state, then the current plan with its real name (never FREE/POP/PRO/TOP)', async () => {
  const screen = mount({
    getJson: jsonRouter({ '/company/me/usage': usageFor() }),
  });
  assert.ok(screen.text('Carregando plano…'));
  await screen.settle();
  assert.ok(screen.text('Orcivo Livre'));
  assert.ok(screen.text('Ativo'));
  for (const forbidden of ['FREE', 'POP', 'PRO', 'TOP', 'ilimitado', 'Ilimitado']) {
    assert.equal(screen.textContaining(forbidden), false, forbidden);
  }
});

test('renders backend-authoritative usage, remaining quantities, reset and feature states', async () => {
  const paths = [];
  const screen = mount({
    getJson: async (path) => {
      paths.push(path);
      return usageFor();
    },
  });
  await screen.settle();
  assert.deepEqual(paths, ['/company/me/usage']);
  assert.ok(screen.text('4 de 5 · 1 restantes'));
  assert.ok(screen.text('8 de 10 · 2 restantes'));
  assert.ok(screen.text('Outro plano'));
  assert.ok(screen.textContaining('Limites mensais reiniciam em'));
});

test('fair-use and unavailable counters are shown without invented percentages', async () => {
  const usage = usageFor('MAIS');
  usage.resources[1] = { ...usage.resources[1], used: 27, limit: null, remaining: null, state: 'FAIR_USE' };
  usage.resources[0] = { ...usage.resources[0], used: null, remaining: null, state: 'UNAVAILABLE' };
  const screen = mount({
    getJson: jsonRouter({ '/company/me/usage': usage }),
  });
  await screen.settle();
  assert.ok(screen.text('Orcivo Mais'));
  assert.ok(screen.text('27 usados · uso justo'));
  assert.ok(screen.text('Não foi possível consultar agora'));
});

test('"Comparar planos" and "Gerenciar assinatura" are both present and open the plans page (no in-app purchase implemented)', async () => {
  const screen = mount({
    getJson: jsonRouter({ '/company/me/usage': usageFor() }),
  });
  await screen.settle();
  assert.ok(screen.button('Comparar planos'));
  assert.ok(screen.button('Gerenciar assinatura'));
  screen.button('Comparar planos').props.onPress();
  screen.button('Gerenciar assinatura').props.onPress();
  assert.equal(screen.opened.length, 2);
  assert.ok(screen.opened.every((url) => url === 'https://orcivo.com.br/planos'));
  for (const forbidden of ['taxa da Apple', 'pague fora do app', 'evite taxa']) {
    assert.equal(screen.textContaining(forbidden), false, forbidden);
  }
});

test('a blocked subscription surfaces its state and a contextual action', async () => {
  const usage = usageFor('SOLO');
  usage.plan = { ...usage.plan, subscription_status: 'BLOCKED', is_blocked: true };
  const screen = mount({
    getJson: jsonRouter({ '/company/me/usage': usage }),
  });
  await screen.settle();
  assert.ok(screen.text('Bloqueado'));
  assert.ok(screen.text('Sua assinatura está inativa. Compare os planos para regularizar.'));
});

test('failed load exposes retry and reloads', async () => {
  let calls = 0;
  const screen = mount({
    getJson: async (path) => {
      assert.equal(path, '/company/me/usage');
      if (++calls === 1) throw new Error('offline');
      return usageFor();
    },
  });
  await screen.settle();
  assert.ok(screen.text('Não foi possível carregar o plano. Verifique sua conexão e tente novamente.'));
  screen.button('Tentar novamente').props.onPress();
  screen.render();
  await screen.settle();
  assert.ok(screen.text('Orcivo Livre'));
});

test('lists the other plans with their real names, keeping the current plan out of the list', async () => {
  const screen = mount({
    getJson: jsonRouter({ '/company/me/usage': usageFor() }),
  });
  await screen.settle();
  for (const plan of plans.PLANS) {
    if (plan.code === 'LIVRE') continue;
    assert.ok(screen.text(plan.name), plan.name);
  }
});

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
const plans = compile('./plans.ts', {});

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
function mount({ getJson, getWorkOrders } = {}) {
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
    'lucide-react-native': { CreditCard: 'CreditCard', ExternalLink: 'ExternalLink' },
    '../../services/api': { api: { get: getJson ?? (async () => { throw new Error('unexpected api.get'); }) } },
    '../../services/work-order.service': { workOrderService: { fetchAll: getWorkOrders ?? (async () => ({ data: [] })) } },
    './plano-errors': { planoError },
    './plans': plans,
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

const livreStatus = { status: null, plan_code: 'LIVRE', is_blocked: false, is_past_due: false, message: null };
const livreLimits = {
  plan_code: 'LIVRE', customers_max: 5, quotes_per_month: 10, work_orders_per_month: 5, members_max: 1,
  has_logo: false, pdf_watermark: true, has_reports: false, has_contracts: false,
  subscription_status: null, is_blocked: false,
};

function jsonRouter(map) {
  return async (path) => {
    if (!(path in map)) throw new Error(`Unexpected path: ${path}`);
    return map[path];
  };
}

test('shows a loading state, then the current plan with its real name (never FREE/POP/PRO/TOP)', async () => {
  const screen = mount({
    getJson: jsonRouter({ '/company/me/subscription-status': livreStatus, '/company/me/plan-limits': livreLimits }),
  });
  assert.ok(screen.text('Carregando plano…'));
  await screen.settle();
  assert.ok(screen.text('Orcivo Livre'));
  assert.ok(screen.text('Ativo'));
  for (const forbidden of ['FREE', 'POP', 'PRO', 'TOP', 'ilimitado', 'Ilimitado']) {
    assert.equal(screen.textContaining(forbidden), false, forbidden);
  }
});

test('plans with a monthly cap show real usage counted from work orders created this month ("uso justo")', async () => {
  const thisMonth = new Date();
  const lastMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 15);
  const workOrders = [
    { id: 'wo-3', created_at: new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 20).toISOString() },
    { id: 'wo-2', created_at: new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 10).toISOString() },
    { id: 'wo-1', created_at: lastMonth.toISOString() },
  ];
  let calledWith;
  const screen = mount({
    getJson: jsonRouter({ '/company/me/subscription-status': livreStatus, '/company/me/plan-limits': livreLimits }),
    getWorkOrders: async (page) => { calledWith = page; return { data: workOrders }; },
  });
  await screen.settle();
  assert.equal(calledWith, 1);
  assert.ok(screen.text('2/5 OS'));
  assert.ok(screen.textContaining('Uso justo'));
});

test('plans without a monthly cap show "uso ampliado" and skip the work-order usage fetch', async () => {
  const maisStatus = { status: 'ACTIVE', plan_code: 'MAIS', is_blocked: false, is_past_due: false, message: null };
  const maisLimits = {
    plan_code: 'MAIS', customers_max: 200, quotes_per_month: null, work_orders_per_month: null, members_max: 3,
    has_logo: true, pdf_watermark: false, has_reports: true, has_contracts: false,
    subscription_status: 'ACTIVE', is_blocked: false,
  };
  let workOrderCalls = 0;
  const screen = mount({
    getJson: jsonRouter({ '/company/me/subscription-status': maisStatus, '/company/me/plan-limits': maisLimits }),
    getWorkOrders: async () => { workOrderCalls++; return { data: [] }; },
  });
  await screen.settle();
  assert.ok(screen.text('Orcivo Mais'));
  assert.ok(screen.textContaining('Uso ampliado'));
  assert.equal(workOrderCalls, 0);
});

test('"Ver planos" and "Gerenciar assinatura" are both present and open the plans page (no in-app purchase implemented)', async () => {
  const screen = mount({
    getJson: jsonRouter({ '/company/me/subscription-status': livreStatus, '/company/me/plan-limits': livreLimits }),
  });
  await screen.settle();
  assert.ok(screen.button('Ver planos'));
  assert.ok(screen.button('Gerenciar assinatura'));
  screen.button('Ver planos').props.onPress();
  screen.button('Gerenciar assinatura').props.onPress();
  assert.equal(screen.opened.length, 2);
  assert.ok(screen.opened.every((url) => url === 'https://orcivo.com.br/planos'));
  for (const forbidden of ['taxa da Apple', 'pague fora do app', 'evite taxa']) {
    assert.equal(screen.textContaining(forbidden), false, forbidden);
  }
});

test('a blocked/past-due subscription surfaces the backend message', async () => {
  const blockedStatus = {
    status: 'BLOCKED', plan_code: 'SOLO', is_blocked: true, is_past_due: false,
    message: 'Sua assinatura está inativa. Acesse orcivo.com.br para regularizar.',
  };
  const soloLimits = {
    plan_code: 'SOLO', customers_max: 50, quotes_per_month: 50, work_orders_per_month: 30, members_max: 1,
    has_logo: true, pdf_watermark: false, has_reports: false, has_contracts: false,
    subscription_status: 'BLOCKED', is_blocked: true,
  };
  const screen = mount({
    getJson: jsonRouter({ '/company/me/subscription-status': blockedStatus, '/company/me/plan-limits': soloLimits }),
    getWorkOrders: async () => ({ data: [] }),
  });
  await screen.settle();
  assert.ok(screen.text('Bloqueado'));
  assert.ok(screen.text('Sua assinatura está inativa. Acesse orcivo.com.br para regularizar.'));
});

test('failed load exposes retry and reloads', async () => {
  let calls = 0;
  const screen = mount({
    getJson: async (path) => {
      if (path === '/company/me/subscription-status' && ++calls === 1) throw new Error('offline');
      if (path === '/company/me/subscription-status') return livreStatus;
      return livreLimits;
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
    getJson: jsonRouter({ '/company/me/subscription-status': livreStatus, '/company/me/plan-limits': livreLimits }),
  });
  await screen.settle();
  for (const plan of plans.PLANS) {
    if (plan.code === 'LIVRE') continue;
    assert.ok(screen.text(plan.name), plan.name);
  }
});

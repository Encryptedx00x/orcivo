import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { financeiroError } from './financeiro-errors.ts';

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

// Exercise the real money helpers rather than duplicating Decimal.js rules.
const shared = compile('../../../../../packages/shared-types/src/helpers/money.ts', { 'decimal.js': require('decimal.js') });

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
const native = Object.fromEntries(['ActivityIndicator', 'KeyboardAvoidingView', 'Modal', 'ScrollView', 'Text', 'TextInput', 'TouchableOpacity', 'View'].map((name) => [name, name]));
native.StyleSheet = { create: (styles) => styles };
native.Platform = { OS: 'ios' };

// Same lightweight hook/host adapter used by EquipeScreen tests.
// It verifies behavior and native props; device layout is not simulated.
function mount({ getPayments, getWorkOrders, createPayment, settlePayment } = {}) {
  const slots = [];
  let index = 0;
  const effects = [];
  const cleanups = new Map();
  const alerts = [];
  const react = {
    createElement,
    useState(initial) {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = initial;
      return [slots[slot], (value) => { slots[slot] = typeof value === 'function' ? value(slots[slot]) : value; }];
    },
    useRef(initial) {
      const slot = index++;
      return slots[slot] ?? (slots[slot] = { current: initial });
    },
    useCallback(callback, deps) {
      const slot = index++;
      if (!slots[slot] || deps.some((value, i) => slots[slot].deps[i] !== value)) slots[slot] = { callback, deps };
      return slots[slot].callback;
    },
  };
  let key = 0;
  let focus;
  const nativeWithAlert = { ...native, Alert: { alert: (...args) => alerts.push(args) } };
  const { FinanceiroScreen } = compile('./FinanceiroScreen.tsx', {
    react, 'react-native': nativeWithAlert,
    '@react-navigation/native': { useNavigation: () => ({ navigate() {} }), useFocusEffect(callback) {
      const slot = index++;
      focus = () => { cleanups.get(slot)?.(); cleanups.set(slot, callback()); };
      if (slots[slot] !== callback) {
        slots[slot] = callback;
        effects.push(focus);
      }
    } },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24, bottom: 20 }) },
    'lucide-react-native': {
      Check: 'Check', CircleDollarSign: 'CircleDollarSign', MoreHorizontal: 'MoreHorizontal', Pencil: 'Pencil',
      Receipt: 'Receipt', ReceiptText: 'ReceiptText', Trash2: 'Trash2', X: 'X',
    },
    '../../easy/data': { easy: { deletePayment: async () => undefined }, errorText: (_e, f) => f },
    '../../easy/sheet': { useSheet: () => () => {}, reasonSheet: () => {} },
    '@orcivo/shared-types': shared,
    '../../services/api': { newIdempotencyKey: () => `request-${++key}` },
    '../../services/payment.service': { paymentService: {
      fetchAll: getPayments ?? (async () => []),
      create: createPayment ?? (async () => { throw new Error('create not mocked'); }),
      settle: settlePayment ?? (async () => { throw new Error('settle not mocked'); }),
    } },
    '../../services/work-order.service': { workOrderService: {
      fetchAll: getWorkOrders ?? (async () => ({ data: [] })),
    } },
    './financeiro-errors': { financeiroError },
  });
  let tree;
  const render = () => {
    index = 0;
    tree = FinanceiroScreen();
    while (effects.length) effects.shift()();
  };
  render();
  return {
    render,
    alerts,
    async settle() { await new Promise((resolve) => setImmediate(resolve)); render(); },
    focus() { focus(); render(); },
    blur() { for (const cleanup of cleanups.values()) cleanup?.(); },
    field(label) { return nodes(tree).find((node) => node.type === 'TextInput' && node.props.accessibilityLabel === label); },
    button(label) { return nodes(tree).find((node) => node.type === 'TouchableOpacity' && node.props.accessibilityRole === 'button' && textContent(node) === label); },
    radio(label) { return nodes(tree).find((node) => node.props.accessibilityRole === 'radio' && node.props.accessibilityLabel === label); },
    text(value) { return nodes(tree).some((node) => node.type === 'Text' && textContent(node) === value); },
    type(type) { return nodes(tree).find((node) => node.type === type); },
    osOption(prefix) { return nodes(tree).find((node) => node.type === 'TouchableOpacity' && textContent(node).startsWith(prefix)); },
  };
}

const workOrders = [
  { id: 'wo-1', number: 101, title: 'Instalação câmeras', status: 'DONE', customer: { id: 'cust-1', name: 'Ana Cliente' }, photos: [] },
];

const payments = [
  {
    id: 'pay-1', amount: '150.00', method: 'PIX', status: 'PENDING', description: 'OS #100 — Antiga',
    due_date: '2026-10-05T12:00:00.000Z', paid_at: null, created_at: '2026-09-01T00:00:00.000Z',
    customer: { id: 'cust-2', name: 'Bruno Cliente' },
  },
];

test('loads payments and work orders in parallel, shows totals and rows', async () => {
  let paymentCalls = 0;
  let workOrderCalls = 0;
  const screen = mount({
    getPayments: async () => { paymentCalls++; return payments; },
    getWorkOrders: async () => { workOrderCalls++; return { data: workOrders }; },
  });
  assert.ok(screen.text('Carregando recebimentos…'));
  await screen.settle();
  assert.equal(paymentCalls, 1);
  assert.equal(workOrderCalls, 1);
  assert.ok(screen.text('Recebimentos (1)'));
  assert.ok(screen.text('Bruno Cliente'));
  assert.ok(screen.text('R$ 150,00')); // pending total and the row amount
  assert.ok(screen.text('R$ 0,00')); // received total (no PAID entries yet)
});

test('empty state keeps the register action available', async () => {
  const screen = mount({ getPayments: async () => [], getWorkOrders: async () => ({ data: workOrders }) });
  await screen.settle();
  assert.ok(screen.text('Nenhum recebimento ainda.'));
  assert.ok(screen.button('Registrar recebimento'));
});

test('failed load exposes retry and reloads both endpoints', async () => {
  let calls = 0;
  const screen = mount({
    getPayments: async () => { if (++calls === 1) throw new Error('offline'); return payments; },
    getWorkOrders: async () => ({ data: workOrders }),
  });
  await screen.settle();
  assert.ok(screen.text('Não foi possível carregar os recebimentos. Verifique sua conexão e tente novamente.'));
  screen.button('Tentar novamente').props.onPress();
  screen.render();
  await screen.settle();
  assert.ok(screen.text('Bruno Cliente'));
});

test('registering without a selected work order shows a validation error and never submits', async () => {
  let creates = 0;
  const screen = mount({
    getPayments: async () => [], getWorkOrders: async () => ({ data: workOrders }),
    createPayment: async () => { creates++; return {}; },
  });
  await screen.settle();
  screen.button('Registrar recebimento').props.onPress();
  screen.render();
  screen.field('Valor do recebimento').props.onChangeText('150,00');
  screen.render();
  screen.button('Registrar').props.onPress();
  screen.render();
  assert.ok(screen.text('Selecione uma ordem de serviço.'));
  assert.equal(creates, 0);
});

test('invalid amount is rejected before submitting', async () => {
  let creates = 0;
  const screen = mount({
    getPayments: async () => [], getWorkOrders: async () => ({ data: workOrders }),
    createPayment: async () => { creates++; return {}; },
  });
  await screen.settle();
  screen.button('Registrar recebimento').props.onPress();
  screen.render();
  screen.button('Selecionar OS').props.onPress();
  screen.render();
  screen.osOption('OS #101').props.onPress();
  screen.render();
  screen.field('Valor do recebimento').props.onChangeText('abc');
  screen.render();
  screen.button('Registrar').props.onPress();
  screen.render();
  assert.ok(screen.text('Informe um valor positivo com até duas casas decimais.'));
  assert.equal(creates, 0);
});

test('registers a receipt linked to the selected OS with decimal-string amount, prevents duplicate taps, then refreshes the list', async () => {
  const creates = [];
  let finish;
  const screen = mount({
    getPayments: async () => [], getWorkOrders: async () => ({ data: workOrders }),
    createPayment(dto, opts) {
      creates.push([dto, opts]);
      return new Promise((resolve) => { finish = resolve; });
    },
  });
  await screen.settle();
  screen.button('Registrar recebimento').props.onPress();
  screen.render();
  screen.button('Selecionar OS').props.onPress();
  screen.render();
  assert.equal(screen.type('Modal').props.visible, true);
  screen.osOption('OS #101').props.onPress();
  screen.render();
  assert.equal(screen.type('Modal').props.visible, false);
  assert.ok(screen.text('OS #101 — Instalação câmeras'));
  screen.field('Valor do recebimento').props.onChangeText('150,50');
  screen.render();
  const send = screen.button('Registrar').props.onPress;
  send();
  send();
  screen.render();
  assert.equal(creates.length, 1);
  const [dto, opts] = creates[0];
  assert.deepEqual(JSON.parse(JSON.stringify(dto)), {
    customer_id: 'cust-1',
    work_order_id: 'wo-1',
    description: 'OS #101 — Instalação câmeras',
    amount: '150.50',
    method: 'PIX',
    status: 'PAID',
  });
  assert.equal(typeof dto.amount, 'string');
  assert.ok(opts.idempotencyKey);
  assert.equal(screen.button('Salvando…').props.disabled, true);
  finish({
    id: 'pay-new', amount: '150.50', method: 'PIX', status: 'PAID', description: dto.description,
    due_date: null, paid_at: '2026-09-29T12:00:00.000Z', created_at: '2026-09-29T12:00:00.000Z',
    customer: { id: 'cust-1', name: 'Ana Cliente' },
  });
  await screen.settle();
  assert.ok(screen.text('Recebimento de R$ 150,50 registrado.'));
  assert.ok(screen.text('Recebimentos (1)'));
  assert.ok(screen.text('Ana Cliente'));
  assert.equal(screen.field('Valor do recebimento'), undefined);
});

test('switching to "A receber" sends due_date instead of paid_at', async () => {
  const creates = [];
  const screen = mount({
    getPayments: async () => [], getWorkOrders: async () => ({ data: workOrders }),
    createPayment: async (dto, opts) => { creates.push([dto, opts]); return { id: 'pay-2', ...dto, customer: { id: 'cust-1', name: 'Ana Cliente' } }; },
  });
  await screen.settle();
  screen.button('Registrar recebimento').props.onPress();
  screen.render();
  screen.button('Selecionar OS').props.onPress();
  screen.render();
  screen.osOption('OS #101').props.onPress();
  screen.render();
  screen.field('Valor do recebimento').props.onChangeText('80,00');
  screen.render();
  screen.radio('A receber').props.onPress();
  screen.render();
  screen.radio('Cartão').props.onPress();
  screen.render();
  screen.field('Data').props.onChangeText('05102026');
  screen.render();
  screen.button('Registrar').props.onPress();
  await screen.settle();
  const [dto] = creates[0];
  assert.equal(dto.status, 'PENDING');
  assert.equal(dto.method, 'CARTAO');
  assert.equal(dto.due_date, new Date('2026-10-05T12:00:00').toISOString());
  assert.equal('paid_at' in JSON.parse(JSON.stringify(dto)), false);
});

test('failed submit preserves the form and reuses the idempotency key on an unchanged retry', async () => {
  const creates = [];
  const screen = mount({
    getPayments: async () => [], getWorkOrders: async () => ({ data: workOrders }),
    createPayment: async (dto, opts) => { creates.push([dto, opts]); throw { status: 400, data: { message: 'Cliente inválido.' } }; },
  });
  await screen.settle();
  screen.button('Registrar recebimento').props.onPress();
  screen.render();
  screen.button('Selecionar OS').props.onPress();
  screen.render();
  screen.osOption('OS #101').props.onPress();
  screen.render();
  screen.field('Valor do recebimento').props.onChangeText('30,00');
  screen.render();
  screen.button('Registrar').props.onPress();
  await screen.settle();
  assert.ok(screen.text('Cliente inválido.'));
  assert.ok(screen.text('OS #101 — Instalação câmeras'));
  screen.button('Registrar').props.onPress();
  await screen.settle();
  assert.equal(creates.length, 2);
  assert.equal(creates[0][1].idempotencyKey, creates[1][1].idempotencyKey);
});

test('marking a pending payment as received calls settle and updates the row', async () => {
  const settleCalls = [];
  const screen = mount({
    getPayments: async () => payments,
    getWorkOrders: async () => ({ data: workOrders }),
    settlePayment: async (id, opts) => {
      settleCalls.push([id, opts]);
      return { ...payments[0], status: 'PAID', paid_at: '2026-09-29T12:00:00.000Z' };
    },
  });
  await screen.settle();
  assert.ok(screen.button('Marcar como recebido'));
  screen.button('Marcar como recebido').props.onPress();
  screen.render();
  await screen.settle();
  assert.equal(settleCalls.length, 1);
  assert.equal(settleCalls[0][0], 'pay-1');
  assert.ok(settleCalls[0][1].idempotencyKey);
  assert.equal(screen.button('Marcar como recebido'), undefined);
  assert.ok(screen.text('Recebido'));
});

test('failed settle surfaces an alert and keeps the payment pending', async () => {
  const screen = mount({
    getPayments: async () => payments,
    getWorkOrders: async () => ({ data: workOrders }),
    settlePayment: async () => { throw { status: 403 }; },
  });
  await screen.settle();
  screen.button('Marcar como recebido').props.onPress();
  screen.render();
  await screen.settle();
  assert.equal(screen.alerts.length, 1);
  assert.equal(screen.alerts[0][1], 'Somente administradores podem gerenciar o financeiro.');
  assert.ok(screen.button('Marcar como recebido'));
});

test('Mais menu route wires FinanceiroScreen and PlanoScreen (no longer EmBreve)', () => {
  const FinanceiroScreen = () => null;
  const PlanoScreen = () => null;
  const modules = {
    react: { createElement }, 'react-native': native,
    '@react-navigation/native-stack': { createNativeStackNavigator: () => ({ Navigator: 'Navigator', Screen: 'Screen' }) },
    '../screens/financeiro/FinanceiroScreen': { FinanceiroScreen },
    '../screens/documentos/DocumentosScreen': { DocumentosScreen: () => null },
    '../screens/plano/PlanoScreen': { PlanoScreen },
  };
  for (const name of ['CatalogScreen', 'CatalogItemFormScreen', 'WorkOrderListScreen', 'WorkOrderDetailScreen', 'WorkOrderPhotoScreen', 'WorkOrderCreateScreen']) {
    modules[`../screens/${name}`] = { [name]: () => null };
  }
  modules['../screens/placeholders/EmBreveScreen'] = { EmBreveScreen: () => null };
  modules['../screens/configuracoes/ConfiguracoesScreen'] = { ConfiguracoesScreen: () => null };
  modules['../screens/conta/ContaScreen'] = { ContaScreen: () => null };
  modules['../screens/equipe/EquipeScreen'] = { EquipeScreen: () => null };
  modules['../easy/EasyModeContext'] = { useEasyMode: () => ({ setEasy: () => {} }) };
  modules['../easy/screens/Receipts'] = { ReceiptsScreen: () => null, ReceiptScreen: () => null, ReceiptNewScreen: () => null };
  modules['../easy/screens/Notices'] = { NoticesScreen: () => null };
  modules['../easy/screens/Settings'] = { ApprovalsScreen: () => null, EditScreen: () => null };
  modules['../easy/screens/QuoteFlow'] = { QuoteSignScreen: () => null };
  modules['../easy/screens/Clients'] = { ClientNewScreen: () => null };
  const stack = compile('../../navigation/MaisStack.tsx', modules).MaisStack();
  const registered = nodes(stack).filter((node) => node.type === 'Screen');
  assert.equal(registered.find((node) => node.props.name === 'Financeiro').props.component, FinanceiroScreen);
  assert.equal(registered.find((node) => node.props.name === 'Plano').props.component, PlanoScreen);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { documentosError } from './documentos-errors.ts';

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

// Exercise the real money formatter rather than duplicating Decimal.js rules.
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
const native = Object.fromEntries(['ActivityIndicator', 'ScrollView', 'Text', 'TouchableOpacity', 'View'].map((name) => [name, name]));
native.StyleSheet = { create: (styles) => styles };

// Same lightweight hook/host adapter used by FinanceiroScreen tests.
// It verifies behavior and native props; device layout is not simulated.
function mount({ getQuotes, getWorkOrders, downloadAsync, isAvailableAsync, shareAsync, getItemAsync } = {}) {
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
    useCallback(callback, deps) {
      const slot = index++;
      if (!slots[slot] || deps.some((value, i) => slots[slot].deps[i] !== value)) slots[slot] = { callback, deps };
      return slots[slot].callback;
    },
    useRef(initial) {
      const slot = index++;
      return slots[slot] ?? (slots[slot] = { current: initial });
    },
  };
  let focus;
  const nativeWithAlert = { ...native, Alert: { alert: (...args) => alerts.push(args) } };
  const { DocumentosScreen } = compile('./DocumentosScreen.tsx', {
    react, 'react-native': nativeWithAlert,
    '@react-navigation/native': { useFocusEffect(callback) {
      const slot = index++;
      focus = () => { cleanups.get(slot)?.(); cleanups.set(slot, callback()); };
      if (slots[slot] !== callback) {
        slots[slot] = callback;
        effects.push(focus);
      }
    } },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24, bottom: 20 }) },
    'lucide-react-native': { ClipboardList: 'ClipboardList', Download: 'Download', FileText: 'FileText', Inbox: 'Inbox' },
    'expo-file-system/legacy': {
      cacheDirectory: 'file:///cache/',
      downloadAsync: downloadAsync ?? (async (uri, fileUri) => ({ status: 200, uri: fileUri })),
    },
    'expo-sharing': {
      isAvailableAsync: isAvailableAsync ?? (async () => true),
      shareAsync: shareAsync ?? (async () => {}),
    },
    'expo-secure-store': { getItemAsync: getItemAsync ?? (async () => 'token-abc') },
    '@orcivo/shared-types': shared,
    '../../config': { API_URL: 'https://api.test' },
    '../../services/quote.service': { quoteService: { fetchQuotes: getQuotes ?? (async () => ({ data: [] })) } },
    '../../services/work-order.service': { workOrderService: { fetchAll: getWorkOrders ?? (async () => ({ data: [] })) } },
    './documentos-errors': { documentosError },
  });
  let tree;
  const render = () => {
    index = 0;
    tree = DocumentosScreen();
    while (effects.length) effects.shift()();
  };
  render();
  return {
    render,
    alerts,
    async settle() { await new Promise((resolve) => setImmediate(resolve)); render(); },
    focus() { focus(); render(); },
    button(label) { return nodes(tree).find((node) => node.type === 'TouchableOpacity' && textContent(node) === label); },
    text(value) { return nodes(tree).some((node) => node.type === 'Text' && textContent(node) === value); },
  };
}

const quotes = [
  { id: 'q-1', number: 101, status: 'SENT', title: 'Instalação câmeras', total: '1500.00', customer: { id: 'cust-1', name: 'Ana Cliente' } },
  { id: 'q-2', number: 102, status: 'DRAFT', total: '200.00', customer: { id: 'cust-2', name: 'Bruno Cliente' } },
];

const workOrders = [
  { id: 'wo-1', number: 55, title: 'Manutenção alarme', status: 'DONE', customer: { id: 'cust-3', name: 'Caio Cliente' } },
];

test('loads quotes and work orders in parallel, shows tab counts and rows', async () => {
  let quoteCalls = 0;
  let workOrderCalls = 0;
  const screen = mount({
    getQuotes: async () => { quoteCalls++; return { data: quotes }; },
    getWorkOrders: async () => { workOrderCalls++; return { data: workOrders }; },
  });
  assert.ok(screen.text('Carregando documentos…'));
  await screen.settle();
  assert.equal(quoteCalls, 1);
  assert.equal(workOrderCalls, 1);
  assert.ok(screen.text('Orçamentos (2)'));
  assert.ok(screen.text('Ordens de Serviço (1)'));
  assert.ok(screen.text('ORÇ #101'));
  assert.ok(screen.text('Ana Cliente · Instalação câmeras'));
  assert.ok(screen.text('Enviado'));
  assert.ok(screen.text('R$ 1.500,00'));
  assert.ok(screen.button('Baixar / compartilhar PDF'));
});

test('empty state per tab keeps the other tab reachable', async () => {
  const screen = mount({ getQuotes: async () => ({ data: [] }), getWorkOrders: async () => ({ data: workOrders }) });
  await screen.settle();
  assert.ok(screen.text('Nenhum orçamento gerado ainda.'));
  screen.button('Ordens de Serviço (1)').props.onPress();
  screen.render();
  assert.ok(screen.text('Caio Cliente · Manutenção alarme'));
});

test('work orders never show a PDF download button', async () => {
  const screen = mount({ getQuotes: async () => ({ data: [] }), getWorkOrders: async () => ({ data: workOrders }) });
  await screen.settle();
  screen.button('Ordens de Serviço (1)').props.onPress();
  screen.render();
  assert.equal(screen.button('Baixar / compartilhar PDF'), undefined);
  assert.ok(screen.text('PDF ainda não disponível para OS.'));
});

test('failed load exposes retry and reloads both endpoints', async () => {
  let calls = 0;
  const screen = mount({
    getQuotes: async () => { if (++calls === 1) throw new Error('offline'); return { data: quotes }; },
    getWorkOrders: async () => ({ data: workOrders }),
  });
  await screen.settle();
  assert.ok(screen.text('Não foi possível carregar os documentos. Verifique sua conexão e tente novamente.'));
  screen.button('Tentar novamente').props.onPress();
  screen.render();
  await screen.settle();
  assert.ok(screen.text('ORÇ #101'));
});

test('forbidden and expired-session loads show actionable messages', async () => {
  for (const [status, message] of [
    [403, 'Você não tem permissão para acessar este documento.'],
    [401, 'Sua sessão expirou. Entre novamente.'],
  ]) {
    const screen = mount({
      getQuotes: async () => { throw Object.assign(new Error('fail'), { status }); },
      getWorkOrders: async () => ({ data: [] }),
    });
    await screen.settle();
    assert.ok(screen.text(message));
  }
});

test('downloads the quote pdf with the bearer token and shares the resulting file', async () => {
  const downloads = [];
  const shares = [];
  const screen = mount({
    getQuotes: async () => ({ data: quotes }),
    getWorkOrders: async () => ({ data: [] }),
    getItemAsync: async () => 'token-xyz',
    downloadAsync: async (uri, fileUri, options) => { downloads.push([uri, fileUri, options]); return { status: 200, uri: fileUri }; },
    shareAsync: async (uri, options) => { shares.push([uri, options]); },
  });
  await screen.settle();
  await screen.button('Baixar / compartilhar PDF').props.onPress();
  await screen.settle();
  assert.equal(downloads.length, 1);
  const [uri, fileUri, options] = downloads[0];
  assert.equal(uri, 'https://api.test/quotes/q-1/pdf');
  assert.equal(fileUri, 'file:///cache/orcamento-101.pdf');
  assert.deepEqual(JSON.parse(JSON.stringify(options.headers)), { Authorization: 'Bearer token-xyz' });
  assert.equal(shares.length, 1);
  assert.equal(shares[0][0], 'file:///cache/orcamento-101.pdf');
  assert.equal(shares[0][1].mimeType, 'application/pdf');
  assert.equal(screen.alerts.length, 0);
});

test('prevents a second download while one is already in flight', async () => {
  let calls = 0;
  let finish;
  const screen = mount({
    getQuotes: async () => ({ data: quotes }),
    getWorkOrders: async () => ({ data: [] }),
    downloadAsync: async (uri, fileUri) => { calls++; return new Promise((resolve) => { finish = () => resolve({ status: 200, uri: fileUri }); }); },
  });
  await screen.settle();
  const press = screen.button('Baixar / compartilhar PDF').props.onPress;
  press();
  press();
  await screen.settle();
  assert.equal(calls, 1);
  assert.ok(screen.button('Baixando…'));
  finish();
  await screen.settle();
});

test('surfaces an alert and resets the button when the PDF download fails', async () => {
  const screen = mount({
    getQuotes: async () => ({ data: quotes }),
    getWorkOrders: async () => ({ data: [] }),
    downloadAsync: async () => ({ status: 404 }),
  });
  await screen.settle();
  await screen.button('Baixar / compartilhar PDF').props.onPress();
  await screen.settle();
  assert.equal(screen.alerts.length, 1);
  assert.equal(screen.alerts[0][1], 'Não foi possível baixar o PDF. Verifique sua conexão e tente novamente.');
  assert.ok(screen.button('Baixar / compartilhar PDF'));
});

test('surfaces an alert when sharing is unavailable on the device', async () => {
  const screen = mount({
    getQuotes: async () => ({ data: quotes }),
    getWorkOrders: async () => ({ data: [] }),
    isAvailableAsync: async () => false,
  });
  await screen.settle();
  await screen.button('Baixar / compartilhar PDF').props.onPress();
  await screen.settle();
  assert.equal(screen.alerts.length, 1);
  assert.equal(screen.alerts[0][1], 'Não foi possível baixar o PDF. Verifique sua conexão e tente novamente.');
});

test('Mais menu opens the real documentos screen instead of EmBreve', () => {
  const DocumentosScreen = () => null;
  const FinanceiroScreen = () => null;
  const PlanoScreen = () => null;
  const modules = {
    react: { createElement }, 'react-native': native,
    '@react-navigation/native-stack': { createNativeStackNavigator: () => ({ Navigator: 'Navigator', Screen: 'Screen' }) },
    '../screens/financeiro/FinanceiroScreen': { FinanceiroScreen },
    '../screens/documentos/DocumentosScreen': { DocumentosScreen },
    '../screens/plano/PlanoScreen': { PlanoScreen },
  };
  for (const name of ['CatalogScreen', 'CatalogItemFormScreen', 'WorkOrderListScreen', 'WorkOrderDetailScreen', 'WorkOrderPhotoScreen']) {
    modules[`../screens/${name}`] = { [name]: () => null };
  }
  modules['../screens/placeholders/EmBreveScreen'] = { EmBreveScreen: () => null };
  modules['../screens/configuracoes/ConfiguracoesScreen'] = { ConfiguracoesScreen: () => null };
  modules['../screens/conta/ContaScreen'] = { ContaScreen: () => null };
  modules['../screens/equipe/EquipeScreen'] = { EquipeScreen: () => null };
  const stack = compile('../../navigation/MaisStack.tsx', modules).MaisStack();
  const registered = nodes(stack).filter((node) => node.type === 'Screen');
  assert.equal(registered.find((node) => node.props.name === 'Documentos').props.component, DocumentosScreen);
  const navigations = [];
  const menu = registered.find((node) => node.props.name === 'MaisMenu').props.component({ navigation: { navigate: (...args) => navigations.push(args) } });
  const row = (label) => nodes(menu).find((node) => node.type === 'TouchableOpacity' && textContent(node).startsWith(label));
  row('Documentos').props.onPress();
  assert.deepEqual(navigations[0], ['Documentos']);
});

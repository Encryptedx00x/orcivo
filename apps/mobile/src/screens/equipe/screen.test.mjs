import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { equipeError } from './equipe-errors.ts';

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

// Exercise the real shared validation schema rather than duplicating its rules.
const shared = compile('../../../../../packages/shared-types/src/invite/invite.dto.ts', { zod: require('zod') });

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
const native = Object.fromEntries(['ActivityIndicator', 'KeyboardAvoidingView', 'ScrollView', 'Text', 'TextInput', 'TouchableOpacity', 'View'].map((name) => [name, name]));
native.StyleSheet = { create: (styles) => styles };
native.Platform = { OS: 'ios' };

// Same lightweight hook/host adapter used by ConfiguracoesScreen tests.
// It verifies behavior and native props; device layout is not simulated.
function mount(api) {
  const slots = [];
  let index = 0;
  const effects = [];
  const cleanups = new Map();
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
  const { EquipeScreen } = compile('./EquipeScreen.tsx', {
    react, 'react-native': native,
    '@react-navigation/native': { useFocusEffect(callback) {
      const slot = index++;
      focus = () => { cleanups.get(slot)?.(); cleanups.set(slot, callback()); };
      if (slots[slot] !== callback) {
        slots[slot] = callback;
        effects.push(focus);
      }
    } },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24, bottom: 20 }) },
    'lucide-react-native': { Users: 'Users', UserPlus: 'UserPlus' },
    '@orcivo/shared-types': shared,
    '../../services/api': { api, newIdempotencyKey: () => `request-${++key}` },
    './equipe-errors': { equipeError },
  });
  let tree;
  const render = () => {
    index = 0;
    tree = EquipeScreen();
    while (effects.length) effects.shift()();
  };
  render();
  return {
    render,
    async settle() { await new Promise((resolve) => setImmediate(resolve)); render(); },
    focus() { focus(); render(); },
    blur() { for (const cleanup of cleanups.values()) cleanup?.(); },
    field() { return nodes(tree).find((node) => node.type === 'TextInput'); },
    button(label) { return nodes(tree).find((node) => node.type === 'TouchableOpacity' && textContent(node) === label); },
    radio(label) { return nodes(tree).find((node) => node.props.accessibilityRole === 'radio' && node.props.accessibilityLabel === label); },
    text(value) { return nodes(tree).some((node) => node.type === 'Text' && textContent(node) === value); },
    type(type) { return nodes(tree).find((node) => node.type === type); },
    open(email = 'membro@empresa.com') {
      this.button('Convidar membro').props.onPress();
      render();
      this.field().props.onChangeText(email);
      render();
    },
  };
}

const members = [
  { id: '1', role: 'OWNER', user: { name: 'Ana', email: 'ana@empresa.com' } },
  { id: '2', role: 'ADMIN', user: { name: 'Bia', email: 'bia@empresa.com' } },
  { id: '3', role: 'TECNICO', user: { name: 'Caio', email: 'caio@empresa.com' } },
];

test('loads current-company members with names, emails and roles, and refreshes on return', async () => {
  let calls = 0;
  const screen = mount({ async get(path) { assert.equal(path, '/company/members'); calls++; return members; } });
  assert.ok(screen.text('Carregando equipe…'));
  assert.equal(screen.button('Convidar membro'), undefined);
  await screen.settle();
  for (const member of members) {
    assert.ok(screen.text(member.user.name));
    assert.ok(screen.text(member.user.email));
  }
  for (const role of ['Proprietário', 'Admin', 'Técnico']) assert.ok(screen.text(role));
  assert.ok(screen.text('Membros ativos (3)'));
  assert.equal(screen.type('ScrollView').props.keyboardShouldPersistTaps, 'handled');
  assert.equal(screen.type('ScrollView').props.contentContainerStyle[1].paddingBottom, 20);
  assert.equal(screen.type('KeyboardAvoidingView').props.keyboardVerticalOffset, 68);
  screen.focus();
  await screen.settle();
  assert.equal(calls, 2);
  screen.button('Atualizar equipe').props.onPress();
  screen.render();
  await screen.settle();
  assert.equal(calls, 3);
});

test('empty team keeps invitation available', async () => {
  const screen = mount({ async get() { return []; } });
  await screen.settle();
  assert.ok(screen.text('Nenhum membro ainda.'));
  assert.ok(screen.button('Convidar membro'));
});

test('failed load exposes retry without showing an empty team or invite form', async () => {
  let calls = 0;
  const screen = mount({ async get() { if (++calls === 1) throw new Error('offline'); return members; } });
  await screen.settle();
  assert.ok(screen.text('Não foi possível carregar a equipe. Verifique sua conexão e tente novamente.'));
  assert.equal(screen.text('Nenhum membro ainda.'), false);
  assert.equal(screen.button('Convidar membro'), undefined);
  screen.button('Tentar novamente').props.onPress();
  screen.render();
  await screen.settle();
  assert.ok(screen.text('Ana'));
});

test('forbidden and expired-session loads show actionable messages', async () => {
  for (const [status, message] of [
    [403, 'Somente administradores podem gerenciar a equipe.'],
    [401, 'Sua sessão expirou. Entre novamente.'],
  ]) {
    const screen = mount({ async get() { throw new Error(`GET /company/members ${status}`); } });
    await screen.settle();
    assert.ok(screen.text(message));
    assert.equal(screen.button('Convidar membro'), undefined);
  }
});

test('late responses after blur cannot overwrite the next load', async () => {
  let finishOld;
  let calls = 0;
  const screen = mount({ get() { return ++calls === 1 ? new Promise((resolve) => { finishOld = resolve; }) : Promise.resolve(members); } });
  screen.blur();
  screen.focus();
  await screen.settle();
  finishOld([]);
  await screen.settle();
  assert.ok(screen.text('Ana'));
  assert.equal(screen.text('Nenhum membro ainda.'), false);
});

test('invalid email never sends a request; cancel clears the form', async () => {
  let writes = 0;
  const screen = mount({ async get() { return []; }, async post() { writes++; } });
  await screen.settle();
  screen.open('not-an-email');
  screen.button('Enviar convite').props.onPress();
  screen.render();
  assert.ok(screen.text('Informe um e-mail válido.'));
  assert.equal(writes, 0);
  screen.radio('Admin').props.onPress();
  screen.render();
  screen.button('Cancelar').props.onPress();
  screen.render();
  screen.button('Convidar membro').props.onPress();
  screen.render();
  assert.equal(screen.field().props.value, '');
  assert.equal(screen.radio('Técnico').props.accessibilityState.checked, true);
});

test('sends trimmed email and selected role to the web endpoint, prevents duplicate taps, then confirms success', async () => {
  const writes = [];
  let finish;
  const screen = mount({ async get() { return members; }, post(...args) { writes.push(args); return new Promise((resolve) => { finish = resolve; }); } });
  await screen.settle();
  screen.open('  novo@empresa.com  ');
  assert.equal(screen.radio('Técnico').props.accessibilityState.checked, true);
  screen.radio('Admin').props.onPress();
  screen.render();
  const send = screen.button('Enviar convite').props.onPress;
  send();
  send();
  screen.render();
  assert.equal(writes.length, 1);
  assert.equal(writes[0][0], '/invites');
  assert.deepEqual(JSON.parse(JSON.stringify(writes[0][1])), { email: 'novo@empresa.com', role: 'ADMIN' });
  assert.equal(screen.field().props.editable, false);
  assert.equal(screen.radio('Técnico').props.disabled, true);
  assert.equal(screen.button('Enviando…').props.disabled, true);
  assert.equal(screen.button('Cancelar').props.disabled, true);
  finish({ id: 'invite-1' });
  await screen.settle();
  assert.ok(screen.text('Convite enviado para novo@empresa.com. O membro aparecerá na equipe após aceitar.'));
  assert.ok(screen.text('Membros ativos (3)'));
  assert.equal(screen.field(), undefined);
  screen.open('tecnico@empresa.com');
  screen.button('Enviar convite').props.onPress();
  assert.equal(writes[1][1].role, 'TECNICO');
  assert.notEqual(writes[0][2].idempotencyKey, writes[1][2].idempotencyKey);
  finish({ id: 'invite-2' });
  await screen.settle();
});

test('failed invite preserves input and role; unchanged retries reuse a key and edits create a new key', async () => {
  const writes = [];
  const screen = mount({ async get() { return members; }, async post(...args) { writes.push(args); throw new Error('offline'); } });
  await screen.settle();
  screen.open();
  screen.radio('Admin').props.onPress();
  screen.render();
  screen.button('Enviar convite').props.onPress();
  await screen.settle();
  assert.ok(screen.text('Não foi possível enviar o convite. Verifique sua conexão e tente novamente.'));
  assert.equal(screen.field().props.value, 'membro@empresa.com');
  assert.equal(screen.radio('Admin').props.accessibilityState.checked, true);
  screen.button('Enviar convite').props.onPress();
  await screen.settle();
  assert.equal(writes[0][2].idempotencyKey, writes[1][2].idempotencyKey);
  screen.field().props.onChangeText('outro@empresa.com');
  screen.render();
  screen.button('Enviar convite').props.onPress();
  await screen.settle();
  assert.notEqual(writes[1][2].idempotencyKey, writes[2][2].idempotencyKey);
});

test('shows server duplicate errors and distinguishes quota, billing and permissions', async () => {
  for (const [failure, message] of [
    [{ status: 400, data: { message: 'Já existe um convite pendente para este e-mail.' } }, 'Já existe um convite pendente para este e-mail.'],
    [{ status: 400, data: { message: ['E-mail inválido.'] } }, 'E-mail inválido.'],
    [{ status: 403 }, 'Somente administradores podem gerenciar a equipe.'],
    [{ status: 403, data: { message: 'Limite de 1 usuário(s) atingido no plano LIVRE. Acesse orcivo.com.br para upgrade.' } }, 'O limite de membros do plano foi atingido. Consulte o plano da empresa.'],
    [{ status: 403, data: { message: 'Sua assinatura está inativa. Acesse orcivo.com.br para regularizar.' } }, 'A assinatura da empresa precisa ser regularizada para enviar convites.'],
    [{ status: 401 }, 'Sua sessão expirou. Entre novamente.'],
    [{ status: 423 }, 'A assinatura da empresa precisa ser regularizada para enviar convites.'],
  ]) {
    const screen = mount({ async get() { return members; }, async post() { throw failure; } });
    await screen.settle();
    screen.open();
    screen.button('Enviar convite').props.onPress();
    await screen.settle();
    assert.ok(screen.text(message));
    assert.equal(screen.field().props.value, 'membro@empresa.com');
  }
});

test('Mais menu opens the real team screen and retains unrelated routes', () => {
  const EquipeScreen = () => null;
  const modules = {
    react: { createElement }, 'react-native': native,
    '@react-navigation/native-stack': { createNativeStackNavigator: () => ({ Navigator: 'Navigator', Screen: 'Screen' }) },
    '../screens/equipe/EquipeScreen': { EquipeScreen },
  };
  for (const name of ['CatalogScreen', 'CatalogItemFormScreen', 'WorkOrderListScreen', 'WorkOrderDetailScreen', 'WorkOrderPhotoScreen']) {
    modules[`../screens/${name}`] = { [name]: () => null };
  }
  modules['../screens/placeholders/EmBreveScreen'] = { EmBreveScreen: () => null };
  modules['../screens/configuracoes/ConfiguracoesScreen'] = { ConfiguracoesScreen: () => null };
  modules['../screens/conta/ContaScreen'] = { ContaScreen: () => null };
  modules['../easy/EasyModeContext'] = { useEasyMode: () => ({ setEasy: () => {} }) };
  modules['../easy/screens/Receipts'] = { ReceiptsScreen: () => null, ReceiptScreen: () => null, ReceiptNewScreen: () => null };
  modules['../easy/screens/Notices'] = { NoticesScreen: () => null };
  modules['../easy/screens/Settings'] = { ApprovalsScreen: () => null, EditScreen: () => null };
  modules['../easy/screens/QuoteFlow'] = { QuoteSignScreen: () => null };
  modules['../easy/screens/Clients'] = { ClientNewScreen: () => null };
  modules['../screens/financeiro/FinanceiroScreen'] = { FinanceiroScreen: () => null };
  modules['../screens/documentos/DocumentosScreen'] = { DocumentosScreen: () => null };
  modules['../screens/plano/PlanoScreen'] = { PlanoScreen: () => null };
  const stack = compile('../../navigation/MaisStack.tsx', modules).MaisStack();
  const registered = nodes(stack).filter((node) => node.type === 'Screen');
  assert.equal(registered.find((node) => node.props.name === 'Equipe').props.component, EquipeScreen);
  const navigations = [];
  const menu = registered.find((node) => node.props.name === 'MaisMenu').props.component({ navigation: { navigate: (...args) => navigations.push(args) } });
  const row = (label) => nodes(menu).find((node) => node.type === 'TouchableOpacity' && textContent(node).startsWith(label));
  row('Usuários e permissões').props.onPress();
  row('Configurações').props.onPress();
  row('Financeiro').props.onPress();
  assert.deepEqual(navigations.slice(0, 2), [['Equipe'], ['Configuracoes']]);
  assert.deepEqual(navigations[2], ['Financeiro']);
});

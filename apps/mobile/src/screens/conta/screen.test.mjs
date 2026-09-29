import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import * as form from './account-form.ts';

const require = createRequire(import.meta.url);
const ts = require(process.env.TYPESCRIPT_PATH || 'typescript');
const source = readFileSync(new URL('./ContaScreen.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics.length, 0);

// Lightweight hook/host adapter exercises screen handlers and async states.
// Native layout and platform keyboard behavior still require device testing.
function mount(authService, { company = { id: 'company-1', trade_name: 'Empresa' }, setSession } = {}) {
  const slots = [];
  let index = 0;
  const effects = [];
  const react = {
    createElement(type, props, ...children) {
      return typeof type === 'function' ? type({ ...props, children }) : { type, props: props ?? {}, children: children.flat(Infinity) };
    },
    useState(initial) {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = initial;
      return [slots[slot], (value) => { slots[slot] = typeof value === 'function' ? value(slots[slot]) : value; }];
    },
    useRef(initial) {
      const slot = index++;
      return slots[slot] ?? (slots[slot] = { current: initial });
    },
    useEffect(effect, deps) {
      const slot = index++;
      if (!slots[slot] || deps.some((value, i) => slots[slot][i] !== value)) {
        slots[slot] = deps;
        effects.push(effect);
      }
    },
  };
  let key = 0;
  const native = Object.fromEntries(['ActivityIndicator', 'KeyboardAvoidingView', 'ScrollView', 'Text', 'TextInput', 'TouchableOpacity', 'View'].map((name) => [name, name]));
  native.StyleSheet = { create: (styles) => styles };
  native.Platform = { OS: 'ios' };
  const sessionCalls = [];
  const modules = {
    react, 'react-native': native, 'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '../../services/api': { newIdempotencyKey: () => `request-${++key}` },
    '../../services/auth.service': { authService },
    '../../contexts/AuthContext': {
      useAuth: () => ({
        company,
        setSession: setSession ?? (async (...args) => { sessionCalls.push(args); }),
      }),
    },
    './account-form': form,
  };
  const exports = {};
  runInNewContext(compiled.outputText, { exports, require: (name) => {
    assert.ok(name in modules, `Unexpected dependency: ${name}`);
    return modules[name];
  } });
  let tree;
  const render = () => {
    index = 0;
    tree = exports.ContaScreen();
    while (effects.length) effects.shift()();
  };
  const nodes = (node = tree) => node && typeof node === 'object' ? [node, ...node.children.flatMap((child) => nodes(child))] : [];
  render();
  return {
    render,
    sessionCalls,
    async settle() { await new Promise((resolve) => setImmediate(resolve)); render(); },
    field(label) { return nodes().find((node) => node.type === 'TextInput' && node.props.accessibilityLabel === label); },
    button(label) { return nodes().find((node) => node.type === 'TouchableOpacity' && node.children.some((child) => child?.children?.includes(label))); },
    text(value) { return nodes().some((node) => node.type === 'Text' && node.children.includes(value)); },
  };
}

test('loads the current name and e-mail, then saves only the changed name', async () => {
  const writes = [];
  const screen = mount({
    async getAccount() { return { id: 'user-1', name: 'Ana', email: 'ana@empresa.com' }; },
    async updateAccount(...args) { writes.push(args); return { account: { id: 'user-1', name: 'Ana Paula', email: 'ana@empresa.com' } }; },
  });
  assert.equal(screen.field('Nome'), undefined);
  await screen.settle();
  assert.equal(screen.field('Nome').props.value, 'Ana');
  assert.equal(screen.field('E-mail').props.value, 'ana@empresa.com');
  screen.field('Nome').props.onChangeText('Ana Paula');
  screen.render();
  screen.button('Salvar alterações').props.onPress();
  screen.render();
  assert.equal(screen.field('Nome').props.editable, false);
  await screen.settle();
  assert.deepEqual(JSON.parse(JSON.stringify(writes[0][0])), { name: 'Ana Paula' });
  assert.ok(screen.text('Dados da conta atualizados.'));
  assert.equal(screen.field('Senha atual').props.value, '');
});

test('changing e-mail or password requires the current password and validates confirmation', async () => {
  const writes = [];
  const screen = mount({
    async getAccount() { return { id: 'user-1', name: 'Ana', email: 'ana@empresa.com' }; },
    async updateAccount(...args) { writes.push(args); return { account: { id: 'user-1', name: 'Ana', email: 'nova@empresa.com' } }; },
  });
  await screen.settle();
  screen.field('E-mail').props.onChangeText('nova@empresa.com');
  screen.render();
  screen.button('Salvar alterações').props.onPress();
  screen.render();
  assert.ok(screen.text('Informe sua senha atual para alterar e-mail ou senha.'));
  assert.equal(writes.length, 0);

  screen.field('Senha atual').props.onChangeText('SenhaAtual1');
  screen.render();
  screen.field('Nova senha').props.onChangeText('curta');
  screen.render();
  screen.button('Salvar alterações').props.onPress();
  screen.render();
  assert.ok(screen.text('A nova senha deve ter pelo menos 8 caracteres.'));

  screen.field('Nova senha').props.onChangeText('NovaSenha123');
  screen.render();
  screen.field('Confirmar nova senha').props.onChangeText('outra-coisa');
  screen.render();
  screen.button('Salvar alterações').props.onPress();
  screen.render();
  assert.ok(screen.text('A confirmação da nova senha não confere.'));
  assert.equal(writes.length, 0);

  screen.field('Confirmar nova senha').props.onChangeText('NovaSenha123');
  screen.render();
  screen.button('Salvar alterações').props.onPress();
  await screen.settle();
  assert.deepEqual(JSON.parse(JSON.stringify(writes[0][0])), {
    email: 'nova@empresa.com', current_password: 'SenhaAtual1', new_password: 'NovaSenha123',
  });
});

test('an invalid e-mail is rejected before any request is sent', async () => {
  const writes = [];
  const screen = mount({
    async getAccount() { return { id: 'user-1', name: 'Ana', email: 'ana@empresa.com' }; },
    async updateAccount(...args) { writes.push(args); },
  });
  await screen.settle();
  screen.field('E-mail').props.onChangeText('nao-e-email');
  screen.render();
  screen.button('Salvar alterações').props.onPress();
  screen.render();
  assert.ok(screen.text('Informe um e-mail válido.'));
  assert.equal(writes.length, 0);
});

test('saving without changes shows a neutral notice instead of calling the API', async () => {
  const writes = [];
  const screen = mount({
    async getAccount() { return { id: 'user-1', name: 'Ana', email: 'ana@empresa.com' }; },
    async updateAccount(...args) { writes.push(args); },
  });
  await screen.settle();
  screen.button('Salvar alterações').props.onPress();
  screen.render();
  assert.ok(screen.text('Nenhuma alteração para salvar.'));
  assert.equal(writes.length, 0);
});

test('a successful password change persists the new tokens and confirms other sessions were closed', async () => {
  const screen = mount({
    async getAccount() { return { id: 'user-1', name: 'Ana', email: 'ana@empresa.com' }; },
    async updateAccount() {
      return {
        account: { id: 'user-1', name: 'Ana', email: 'ana@empresa.com' },
        access_token: 'new-access', refresh_token: 'new-refresh',
      };
    },
  });
  await screen.settle();
  screen.field('Senha atual').props.onChangeText('SenhaAtual1');
  screen.render();
  screen.field('Nova senha').props.onChangeText('NovaSenha123');
  screen.render();
  screen.field('Confirmar nova senha').props.onChangeText('NovaSenha123');
  screen.render();
  screen.button('Salvar alterações').props.onPress();
  await screen.settle();
  assert.ok(screen.text('Senha atualizada. As outras sessões foram encerradas.'));
  assert.deepEqual(screen.sessionCalls[0], [
    'new-access', 'new-refresh', { id: 'user-1', name: 'Ana', email: 'ana@empresa.com' },
    { id: 'company-1', trade_name: 'Empresa' },
  ]);
});

test('server errors preserve the typed input and never leak technical details', async () => {
  const screen = mount({
    async getAccount() { return { id: 'user-1', name: 'Ana', email: 'ana@empresa.com' }; },
    async updateAccount() { throw { status: 401 }; },
  });
  await screen.settle();
  screen.field('E-mail').props.onChangeText('nova@empresa.com');
  screen.render();
  screen.field('Senha atual').props.onChangeText('SenhaErrada1');
  screen.render();
  screen.button('Salvar alterações').props.onPress();
  await screen.settle();
  assert.ok(screen.text('Sua senha atual está incorreta ou sua sessão expirou.'));
  assert.equal(screen.field('E-mail').props.value, 'nova@empresa.com');
});

test('a failed load exposes retry and then shows the loaded data', async () => {
  let attempts = 0;
  const screen = mount({
    async getAccount() { if (++attempts === 1) throw new Error('offline'); return { id: 'user-1', name: 'Ana', email: 'ana@empresa.com' }; },
  });
  await screen.settle();
  assert.ok(screen.text('Não foi possível carregar seus dados. Verifique sua conexão e tente novamente.'));
  assert.equal(screen.field('Nome'), undefined);
  screen.button('Tentar novamente').props.onPress();
  screen.render();
  await screen.settle();
  assert.equal(screen.field('Nome').props.value, 'Ana');
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import * as form from './company-form.ts';

const require = createRequire(import.meta.url);
const ts = require(process.env.TYPESCRIPT_PATH || 'typescript');
const source = readFileSync(new URL('./ConfiguracoesScreen.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics.length, 0);

// Lightweight hook/host adapter exercises screen handlers and async states.
// Native layout and platform keyboard behavior still require device testing.
function mount(api) {
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
  const modules = {
    react, 'react-native': native, 'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '../../services/api': { api, newIdempotencyKey: () => `request-${++key}` }, './company-form': form,
    '@react-navigation/native': { useNavigation: () => ({ navigate() {} }) },
    '../../easy/screens/Settings': { ApprovalMethodsPicker: () => null, LogoPicker: () => null },
    '../../easy/EasyModeContext': { useEasyMode: () => ({ setEasy() {} }) },
  };
  const exports = {};
  runInNewContext(compiled.outputText, { exports, require: (name) => {
    assert.ok(name in modules, `Unexpected dependency: ${name}`);
    return modules[name];
  } });
  let tree;
  const render = () => {
    index = 0;
    tree = exports.ConfiguracoesScreen();
    while (effects.length) effects.shift()();
  };
  const nodes = (node = tree) => node && typeof node === 'object' ? [node, ...node.children.flatMap((child) => nodes(child))] : [];
  render();
  return {
    render,
    async settle() { await new Promise((resolve) => setImmediate(resolve)); render(); },
    field(label) { return nodes().find((node) => node.type === 'TextInput' && node.props.accessibilityLabel === label); },
    button(label) { return nodes().find((node) => node.type === 'TouchableOpacity' && node.children.some((child) => child?.children?.includes(label))); },
    text(value) { return nodes().some((node) => node.type === 'Text' && node.children.includes(value)); },
  };
}

test('screen loads /company/me, edits profile and sends isolated profile and masked Pix patches', async () => {
  const writes = [];
  const screen = mount({
    async get(path) { assert.equal(path, '/company/me'); return { trade_name: 'Empresa', city: 'Recife', pix_key: '(11) 91234-5678' }; },
    async patch(...args) { writes.push(args); },
  });
  assert.equal(screen.field('Cidade'), undefined);
  await screen.settle();
  assert.equal(screen.field('Cidade').props.value, 'Recife');
  screen.field('Cidade').props.onChangeText('Olinda');
  screen.render();
  screen.button('Salvar alterações').props.onPress();
  screen.render();
  assert.equal(screen.field('Cidade').props.editable, false);
  await screen.settle();
  assert.equal(writes[0][0], '/company/me');
  assert.equal(writes[0][1].city, 'Olinda');
  assert.equal('pix_key' in writes[0][1], false);
  assert.ok(screen.text('Dados da empresa salvos com sucesso.'));
  screen.field('Chave Pix').props.onChangeText('21987654321');
  screen.render();
  screen.button('Salvar chave Pix').props.onPress();
  await screen.settle();
  assert.deepEqual(JSON.parse(JSON.stringify(writes[1][1])), { pix_key_type: 'PHONE', pix_key: '(21) 98765-4321' });
  assert.ok(screen.text('Chave Pix salva com sucesso.'));
});

test('failed load hides forms and exposes retry', async () => {
  let attempts = 0;
  const screen = mount({ async get() { if (++attempts === 1) throw new Error('offline'); return { trade_name: 'Empresa' }; } });
  await screen.settle();
  assert.equal(screen.field('Cidade'), undefined);
  screen.button('Tentar novamente').props.onPress();
  screen.render();
  await screen.settle();
  assert.equal(screen.field('Nome da empresa / nome fantasia').props.value, 'Empresa');
});

test('failed save preserves edits, reports permission errors and reuses idempotency key on retry', async () => {
  const keys = [];
  const screen = mount({
    async get() { return { trade_name: 'Empresa', pix_key: 'a@b.com' }; },
    async patch(_path, _body, options) { keys.push(options.idempotencyKey); if (keys.length === 1) throw { status: 403 }; },
  });
  await screen.settle();
  screen.field('Chave Pix').props.onChangeText('novo@empresa.com');
  screen.render();
  screen.button('Salvar chave Pix').props.onPress();
  await screen.settle();
  assert.ok(screen.text('Você não tem permissão para alterar os dados da empresa.'));
  assert.equal(screen.field('Chave Pix').props.value, 'novo@empresa.com');
  screen.button('Salvar chave Pix').props.onPress();
  await screen.settle();
  assert.equal(keys[0], keys[1]);
  assert.ok(screen.text('Chave Pix salva com sucesso.'));
});

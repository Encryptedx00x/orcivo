import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require(process.env.TYPESCRIPT_PATH || 'typescript');
const source = readFileSync(new URL('./PlanUsageIndicator.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    jsx: ts.JsxEmit.React,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
});

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

async function renderIndicator(state) {
  const slots = [];
  let index = 0;
  const effects = [];
  const opened = [];
  let calls = 0;
  const react = {
    createElement,
    useState(initial) {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = initial;
      return [slots[slot], (value) => { slots[slot] = typeof value === 'function' ? value(slots[slot]) : value; }];
    },
    useCallback(callback) {
      index++;
      return callback;
    },
  };
  const moduleRef = { exports: {} };
  runInNewContext(compiled.outputText, {
    exports: moduleRef.exports,
    module: moduleRef,
    Map,
    Promise,
    Set,
    require(name) {
      if (name === 'react') return { ...react, default: react };
      if (name === 'react-native')
        return {
          Linking: { openURL: (url) => opened.push(url) },
          StyleSheet: { create: (styles) => styles },
          Text: 'Text',
          TouchableOpacity: 'TouchableOpacity',
          View: 'View',
        };
      if (name === '@react-navigation/native') return { useFocusEffect: (effect) => effects.push(effect) };
      if (name === 'lucide-react-native') return { AlertTriangle: 'AlertTriangle' };
      if (name === '../contexts/AuthContext') return { useAuth: () => ({ company: { id: 'company-1' } }) };
      if (name === '../services/api')
        return {
          api: {
            get: async () => {
              calls++;
              return {
                resources: [
                  {
                    code: 'QUOTES_MONTH',
                    label: 'Orçamentos',
                    used: 8,
                    limit: 10,
                    remaining: 2,
                    period: 'CALENDAR_MONTH',
                    state,
                  },
                ],
              };
            },
          },
        };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  const render = () => {
    index = 0;
    return moduleRef.exports.PlanUsageIndicator({ code: 'QUOTES_MONTH' });
  };
  render();
  effects.shift()();
  await new Promise((resolve) => setImmediate(resolve));
  return { tree: render(), opened, calls };
}

test('renders backend quantities and preventive CTA for an attention state', async () => {
  const screen = await renderIndicator('ATTENTION');
  assert.equal(screen.calls, 1);
  assert.match(textContent(screen.tree), /Orçamentos: 8 de 10 · 2 restantes/);
  const action = nodes(screen.tree).find((node) => node.type === 'TouchableOpacity');
  assert.ok(action);
  action.props.onPress();
  assert.deepEqual(screen.opened, ['https://orcivo.com.br/planos']);
});

test('does not show an upgrade CTA for a normal state', async () => {
  const screen = await renderIndicator('NORMAL');
  assert.equal(nodes(screen.tree).some((node) => node.type === 'TouchableOpacity'), false);
});

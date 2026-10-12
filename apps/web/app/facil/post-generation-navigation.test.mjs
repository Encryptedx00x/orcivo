import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const app = readFileSync(new URL('./EasyApp.tsx', import.meta.url), 'utf8');
const flow = readFileSync(new URL('./screens/QuoteFlow.tsx', import.meta.url), 'utf8');

test('modo fácil encerra o fluxo sem manter as etapas na pilha', () => {
  assert.match(app, /reset: \(screen: Screen, params\?: Params\) => void/);
  assert.match(flow, /reset\('done'\)/);
  assert.doesNotMatch(flow, /go\('done'\)/);
});

test('modo fácil bloqueia duplo envio e expõe destinos conscientes', () => {
  assert.match(flow, /const submitInFlight = useRef\(false\)/);
  assert.match(flow, /Novo orçamento/);
  assert.match(flow, /reset\('q1'\)/);
  assert.match(flow, /reset\('quotes'\)/);
});

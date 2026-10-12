import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const fullCreate = readFileSync(
  new URL('./screens/QuoteCreateScreen.tsx', import.meta.url),
  'utf8',
);
const fullDetail = readFileSync(
  new URL('./screens/QuoteDetailScreen.tsx', import.meta.url),
  'utf8',
);
const easyFlow = readFileSync(new URL('./easy/screens/QuoteFlow.tsx', import.meta.url), 'utf8');

test('app completo substitui a criação e bloqueia duplo envio', () => {
  assert.match(fullCreate, /const submitInFlight = useRef\(false\)/);
  assert.match(fullCreate, /navigation\.replace\('QuoteDetail'/);
  assert.match(fullDetail, /Novo orçamento/);
  assert.match(fullDetail, /navigation\.replace\('QuoteCreate'\)/);
});

test('app fácil reseta a pilha e oferece novo orçamento explícito', () => {
  assert.match(easyFlow, /const submitInFlight = useRef\(false\)/);
  assert.match(easyFlow, /name: 'QuoteDone'/);
  assert.match(easyFlow, /Novo orçamento/);
  assert.match(easyFlow, /name: 'QuoteClient'/);
});

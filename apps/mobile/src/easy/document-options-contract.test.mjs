import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const fields = readFileSync(new URL('./DocOptions.tsx', import.meta.url), 'utf8');
const settings = readFileSync(new URL('./screens/Settings.tsx', import.meta.url), 'utf8');

test('app mostra prévia para defaults de orçamento e recibo', () => {
  assert.match(fields, /export function ReceiptDocOptionsFields/);
  assert.match(fields, /Prévia do conteúdo/);
  assert.match(fields, /Vai aparecer:/);
  assert.match(fields, /Oculto:/);
});

test('app serializa defaults de orçamento e recibo no mesmo fluxo dos dois modos', () => {
  assert.match(settings, /quote_default_doc_options: docOptions/);
  assert.match(settings, /receipt_default_doc_options: receiptDocOptions/);
  assert.match(settings, /<ReceiptDocOptionsFields/);
});

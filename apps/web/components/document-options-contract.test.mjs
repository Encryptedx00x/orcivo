import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const form = readFileSync(new URL('./QuoteDocOptionsForm.tsx', import.meta.url), 'utf8');
const fullSettings = readFileSync(
  new URL('../app/(app)/configuracoes/page.tsx', import.meta.url),
  'utf8',
);
const easySettings = readFileSync(
  new URL('../app/facil/screens/Settings.tsx', import.meta.url),
  'utf8',
);

test('configurações web mostram prévia para orçamento e recibo', () => {
  assert.match(form, /export function ReceiptDocOptionsForm/);
  assert.match(form, /Prévia do conteúdo/);
  assert.match(form, /Vai aparecer:/);
  assert.match(form, /Não vai aparecer:/);
});

test('modos completo e fácil serializam defaults de orçamento e recibo', () => {
  for (const source of [fullSettings, easySettings]) {
    assert.match(source, /quote_default_doc_options: docOptions/);
    assert.match(source, /receipt_default_doc_options: receiptDocOptions/);
  }
});

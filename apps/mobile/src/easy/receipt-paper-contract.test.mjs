import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./screens/Receipts.tsx', import.meta.url), 'utf8');

test('preview nativo resolve as opções congeladas e mantém declaração, valor e data', () => {
  assert.match(source, /resolveReceiptDocOptions\(r\.receipt_doc_options\)/);
  assert.match(source, /Declaro que recebi de/);
  assert.match(source, /formatMoney\(r\.amount\)/);
  assert.match(source, /paidDate/);
});

test('preview nativo obedece adicionais, Pix, rodapé e detalhes opcionais', () => {
  for (const option of [
    'company_details',
    'client_details',
    'payment_details',
    'additional_info',
    'pix',
    'footer',
  ]) {
    assert.match(source, new RegExp(`opts\\.${option}`));
  }
  assert.match(source, /r\.receipt_additional_info/);
  assert.match(source, /company\?\.document_footer/);
});

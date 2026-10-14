import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./ReceiptPaper.tsx', import.meta.url), 'utf8');

test('preview web resolve as opções congeladas e mantém os campos essenciais', () => {
  assert.match(source, /resolveReceiptDocOptions\(receipt\.receipt_doc_options\)/);
  assert.match(source, /Declaro que recebi de/);
  assert.match(source, /formatMoney\(receipt\.amount\)/);
  assert.match(source, /receiptDate\(receipt\)/);
});

test('preview web obedece adicionais, Pix, rodapé e detalhes opcionais', () => {
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
  assert.match(source, /receipt\.receipt_additional_info/);
  assert.match(source, /company\.document_footer/);
});

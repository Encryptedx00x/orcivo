import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const receipts = readFileSync(new URL('./ReceiptsTab.tsx', import.meta.url), 'utf8');

test('web completo permite adicionar a assinatura salva quando ela ainda não existe', () => {
  assert.match(receipts, /Adicionar assinatura/);
  assert.match(receipts, /saveTechnicianSignature/);
  assert.match(receipts, /setReceiptSignature\(r\.id, true\)/);
});

test('assinatura avulsa continua separada da assinatura reutilizável', () => {
  assert.match(receipts, /Usar outra só neste recibo/);
  assert.match(receipts, /setReceiptSignatureOnce/);
});

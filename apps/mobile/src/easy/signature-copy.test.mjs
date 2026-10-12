import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const quoteFlow = readFileSync(new URL('./screens/QuoteFlow.tsx', import.meta.url), 'utf8');
const receipts = readFileSync(new URL('./screens/Receipts.tsx', import.meta.url), 'utf8');

test('orçamento oferece adicionar assinatura no estado vazio', () => {
  assert.match(
    quoteFlow,
    /saved \|\| draft\.signature\.mode !== 'none'[\s\S]{0,100}\? 'Trocar assinatura'[\s\S]{0,100}: 'Adicionar assinatura'/,
  );
});

test('recibo compartilhado pelos modos fácil e completo diferencia o estado vazio', () => {
  assert.match(receipts, /const hasSavedSignature = !!signature\.data\?\.signature_url/);
  assert.match(receipts, /hasSavedSignature \? 'Trocar assinatura' : 'Adicionar assinatura'/);
  assert.match(receipts, /hasSavedSignature \?/);
});

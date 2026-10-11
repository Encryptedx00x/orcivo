import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const registration = readFileSync(
  new URL('./PaymentRegistrationModal.tsx', import.meta.url),
  'utf8',
);
const edit = readFileSync(new URL('./PaymentEditModal.tsx', import.meta.url), 'utf8');

test('cadastro completo transforma o conflito do backend em confirmação consciente', () => {
  assert.match(registration, /PAYMENT_OVERPAYMENT_CONFIRMATION_REQUIRED/);
  assert.match(registration, /Esperado:/);
  assert.match(registration, /Recebido:/);
  assert.match(registration, /Diferença:/);
  assert.match(registration, /Motivo do excedente \(opcional\)/);
  assert.match(registration, /overpayment_confirmed: Boolean\(overpayment\)/);
});

test('edição completa compara Decimal e não envia excedente sem confirmação', () => {
  assert.match(edit, /comparePaymentAmounts/);
  assert.match(edit, /Confirmo o recebimento acima do valor esperado/);
  assert.match(edit, /overpayment_confirmed: overpaymentConfirmed/);
  assert.match(edit, /overpayment_reason: overpaymentReason\.trim\(\)/);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const actions = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8');
const screen = readFileSync(new URL('./screens/Money.tsx', import.meta.url), 'utf8');

test('modo fácil web lista o envelope de recebimentos e atualiza após a baixa', () => {
  assert.match(actions, /apiFetch<\{ data: EasyPayment\[\] \} \| EasyPayment\[]>\('\/payments'\)/);
  assert.match(actions, /Array\.isArray\(res\) \? res : res\.data/);
  assert.match(actions, /`\/payments\/\$\{encodeURIComponent\(id\)\}\/settle`/);
  assert.match(actions, /paid_at: new Date\(\)\.toISOString\(\)/);
  assert.match(actions, /received_amount: receivedAmount/);
  assert.match(actions, /overpayment_confirmed: overpaymentConfirmed/);
  assert.match(
    screen,
    /p\.status === 'PENDING' \|\| p\.status === 'OVERDUE' \|\| p\.status === 'PARTIAL'/,
  );
  assert.match(screen, /payments\.reload\(\)/);
  assert.match(screen, /O recibo já está em Recibos/);
  assert.match(screen, /comparePaymentAmounts/);
  assert.match(screen, /Confirmar excedente/);
  assert.match(screen, /Motivo do excedente \(opcional\)/);
});

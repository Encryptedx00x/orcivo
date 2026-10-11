import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const data = readFileSync(new URL('../data.ts', import.meta.url), 'utf8');
const screen = readFileSync(new URL('./Money.tsx', import.meta.url), 'utf8');

test('modo fácil nativo lista, baixa e atualiza recebimentos com string decimal', () => {
  assert.match(data, /payments: async \(\) => list\(await api\.get<\{ data: EasyPayment\[\] \} \| EasyPayment\[]>\('\/payments'\)\)/);
  assert.match(data, /`\/payments\/\$\{enc\(id\)\}\/settle`/);
  assert.match(data, /paid_at: new Date\(\)\.toISOString\(\)/);
  assert.match(screen, /p\.status === 'PENDING' \|\| p\.status === 'OVERDUE' \|\| p\.status === 'PARTIAL'/);
  assert.match(screen, /void payments\.refresh\(\)/);
  assert.match(screen, /formatMoney\(sum\(dues\)\)/);
  assert.match(screen, /O recibo já está em Recibos/);
});

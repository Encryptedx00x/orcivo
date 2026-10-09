import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import * as osStatus from './os-status.ts';
import { WORK_ORDER_STATUS_LABELS, WorkOrderStatusEnum } from '@orcivo/shared-types';

const ALL_STATUSES = WorkOrderStatusEnum.options;

test('os-status cobre todos os status publicados, inclusive os extras (R5b)', () => {
  for (const status of ALL_STATUSES) {
    assert.ok(osStatus.STATUS_COLORS[status], `badge sem cor: ${status}`);
    assert.ok(osStatus.EASY_STATUS[status], `chip do modo fácil sem config: ${status}`);
  }
  // Labels dos extras vêm do shared-types (regra única), não são reescritos.
  assert.equal(osStatus.EASY_STATUS.AWAITING_PAYMENT.label, WORK_ORDER_STATUS_LABELS.AWAITING_PAYMENT);
  assert.equal(osStatus.EASY_STATUS.WARRANTY.label, WORK_ORDER_STATUS_LABELS.WARRANTY);
});

test('ações da tela preferem allowed_actions do backend (AC4), sem duplicar regra', () => {
  const backend = ['receber_pagamento', 'reabrir', 'corrigir'];
  assert.deepEqual(osStatus.woScreenActions('AWAITING_PAYMENT', backend), backend);
  // Sem o campo, cai na regra publicada do shared-types: extras desligados,
  // sem corrigir (o app não expõe correção), base preservada.
  assert.deepEqual(osStatus.woScreenActions('PENDING'), ['iniciar', 'cancelar']);
  assert.deepEqual(osStatus.woScreenActions('IN_PROGRESS'), ['concluir', 'cancelar']);
  assert.deepEqual(osStatus.woScreenActions('DONE'), ['reabrir']);
  assert.deepEqual(osStatus.woScreenActions('CANCELLED'), ['reabrir']);
  assert.deepEqual(osStatus.woScreenActions('AWAITING_PAYMENT'), ['reabrir']);
  assert.deepEqual(osStatus.woScreenActions('WARRANTY'), ['reabrir']);
});

test('ações de status extra têm copy pt-BR completa para o app completo e o fácil', () => {
  assert.deepEqual(Object.keys(osStatus.EXTRA_ACTION_UI).sort(), [
    'acionar_garantia',
    'aguardar_pagamento',
    'receber_pagamento',
  ]);
  for (const [action, ui] of Object.entries(osStatus.EXTRA_ACTION_UI)) {
    for (const [field, value] of Object.entries(ui)) {
      assert.equal(typeof value, 'string', `${action}.${field} deve ser texto`);
      assert.ok(value.length > 3, `${action}.${field} vazio`);
      assert.match(value, /\s/, `${action}.${field} deveria ser uma frase em pt-BR`);
    }
  }
  assert.equal(
    osStatus.EXTRA_ACTION_UI.aguardar_pagamento.label,
    WORK_ORDER_STATUS_LABELS.AWAITING_PAYMENT,
  );
  assert.equal(osStatus.isExtraAction('aguardar_pagamento'), true);
  assert.equal(osStatus.isExtraAction('cancelar'), false);
});

test('estados pós-conclusão (incluindo extras) bloqueiam edição genérica', () => {
  assert.equal(osStatus.woIsClosed('AWAITING_PAYMENT'), true);
  assert.equal(osStatus.woIsClosed('WARRANTY'), true);
  assert.equal(osStatus.woIsClosed('DONE'), true);
  assert.equal(osStatus.woIsClosed('CANCELLED'), true);
  assert.equal(osStatus.woIsClosed('PENDING'), false);
  assert.equal(osStatus.woIsClosed('IN_PROGRESS'), false);
});

// Modo fácil: a camada de dados mapeia cada ação de status extra (R5b) para a
// rota de domínio do backend — mesmo mapa do web, sem regra de transição local.
function easyData(api) {
  const source = stripTypeScriptTypes(
    readFileSync(new URL('../../easy/data.ts', import.meta.url), 'utf8'),
  )
    .replace(/^import .*;$/gm, '')
    .replaceAll('export const ', 'const ')
    .replaceAll('export function ', 'function ');
  return runInNewContext(`${source}\neasy`, { api });
}

test('workOrderAction roteia os extras para await-payment/receive-payment/claim-warranty', async () => {
  const calls = [];
  const easy = easyData({
    async patch(path, body) {
      calls.push([path, body]);
      return { id: 'os-1' };
    },
  });
  await easy.workOrderAction('os 1', 'aguardar_pagamento');
  await easy.workOrderAction('os 1', 'receber_pagamento');
  await easy.workOrderAction('os 1', 'acionar_garantia');
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ['/work-orders/os%201/await-payment', {}],
    ['/work-orders/os%201/receive-payment', {}],
    ['/work-orders/os%201/claim-warranty', {}],
  ]);
});

test('cancelar/reabrir seguem mandando o motivo obrigatório', async () => {
  const calls = [];
  const easy = easyData({
    async patch(path, body) {
      calls.push([path, body]);
      return { id: 'os-1' };
    },
  });
  await easy.workOrderAction('os-1', 'cancel', 'Cliente desistiu');
  await easy.workOrderAction('os-1', 'reopen', 'Faltou terminar');
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ['/work-orders/os-1/cancel', { reason: 'Cliente desistiu' }],
    ['/work-orders/os-1/reopen', { reason: 'Faltou terminar' }],
  ]);
});

test('telas não duplicam a união de status nem os labels do shared-types', () => {
  const detail = readFileSync(new URL('../WorkOrderDetailScreen.tsx', import.meta.url), 'utf8');
  const list = readFileSync(new URL('../WorkOrderListScreen.tsx', import.meta.url), 'utf8');
  const services = readFileSync(new URL('../../easy/screens/Services.tsx', import.meta.url), 'utf8');
  for (const [name, src] of [
    ['detail', detail],
    ['list', list],
    ['easy services', services],
  ]) {
    assert.ok(!src.includes("type WorkOrderStatus ="), `${name} redeclara o tipo de status`);
    assert.ok(
      !src.includes("'PENDING' | 'IN_PROGRESS'"),
      `${name} duplica a união de status em texto`,
    );
    assert.ok(
      src.includes('os/os-status') || src.includes('@orcivo/shared-types'),
      `${name} não consome a regra publicada`,
    );
  }
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('app completo pergunta na criação e permite alterar no detalhe', () => {
  const create = read('./WorkOrderCreateScreen.tsx');
  const detail = read('./WorkOrderDetailScreen.tsx');
  assert.match(create, /Responsável pelo serviço \(opcional\)/);
  assert.match(create, /assigned_to_user_id/);
  assert.match(detail, /updateResponsible\(order\.id, userId\)/);
  assert.match(detail, /Sem responsável/);
});

test('app fácil altera responsável sem sair do modo', () => {
  const data = read('../easy/data.ts');
  const screen = read('../easy/screens/Services.tsx');
  assert.match(data, /updateWorkOrderResponsible/);
  assert.match(screen, /Responsável pelo serviço/);
  assert.match(screen, /Sem responsável/);
  assert.doesNotMatch(screen, /Sem técnico atribuído/);
});

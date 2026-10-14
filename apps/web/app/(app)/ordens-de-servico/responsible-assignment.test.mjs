import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('web completo pergunta na criação e permite remover no detalhe', () => {
  const create = read('./novo/page.tsx');
  const detail = read('./[id]/WorkOrderDetail.tsx');
  assert.match(create, /Responsável pelo serviço \(opcional\)/);
  assert.match(create, /assigned_to_user_id/);
  assert.match(create, /Sem responsável/);
  assert.match(detail, /assigned_to_user_id: userId \|\| null/);
  assert.match(detail, /aria-label="Responsável pelo serviço"/);
});

test('web fácil mantém atribuição no próprio modo', () => {
  const actions = read('../../facil/actions.ts');
  const screen = read('../../facil/screens/Services.tsx');
  assert.match(actions, /updateEasyWorkOrderResponsible/);
  assert.match(screen, /Responsável pelo serviço/);
  assert.match(screen, /Sem responsável/);
  assert.doesNotMatch(screen, /Sem técnico atribuído/);
});

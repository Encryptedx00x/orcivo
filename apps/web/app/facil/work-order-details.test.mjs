import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const actions = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8');
const screen = readFileSync(new URL('./screens/Services.tsx', import.meta.url), 'utf8');

test('modo fácil web usa os campos configurados e a validação compartilhada da OS', () => {
  assert.match(actions, /details\?: WorkOrderDetails/);
  assert.match(actions, /work_order_fields\?: WorkOrderField\[\]/);
  assert.match(actions, /PATCH/);
  assert.match(actions, /JSON\.stringify\(\{ details \}\)/);
  assert.match(screen, /cleanWorkOrderDetails/);
  assert.match(screen, /company\.data\?\.work_order_fields/);
  assert.match(screen, /maxLength=\{300\}/);
});

test('modo fácil web escolhe explicitamente a etapa e refaz a leitura após o upload', () => {
  assert.match(screen, /type PhotoStage = keyof typeof STAGE_LABEL/);
  assert.match(screen, /Etapa da foto/);
  assert.match(screen, /<Options/);
  assert.match(screen, /value=\{photoStage\}/);
  assert.match(screen, /uploadWorkOrderPhoto\(o\.id, file, photoStage\)/);
  assert.match(screen, /order\.reload\(\)/);
  assert.match(screen, /input\.value = ''/);
  assert.match(screen, /'Sem data'/);
  assert.doesNotMatch(screen, /photos\.length === 0 \? 'BEFORE' : 'DURING'/);
});

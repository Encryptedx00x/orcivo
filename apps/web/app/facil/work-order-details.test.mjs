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

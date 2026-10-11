import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const screen = readFileSync(new URL('./Services.tsx', import.meta.url), 'utf8');

test('modo fácil nativo escolhe as três etapas e refaz a leitura após o upload', () => {
  assert.match(screen, /type PhotoStage = keyof typeof STAGE_LABEL/);
  assert.match(screen, /Etapa da foto/);
  assert.match(screen, /<Options/);
  assert.match(screen, /value=\{photoStage\}/);
  assert.match(screen, /easy\.uploadPhoto\(o\.id, r\.assets\[0\]\.uri, photoStage\)/);
  assert.match(screen, /order\.refresh\(\)/);
  assert.match(screen, /'Sem data'/);
  assert.doesNotMatch(screen, /photos\.length === 0 \? 'BEFORE' : 'DURING'/);
});

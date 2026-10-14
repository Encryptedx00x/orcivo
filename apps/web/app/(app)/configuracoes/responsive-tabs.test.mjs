import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const page = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../../globals.css', import.meta.url), 'utf8');

test('a aba escolhida fica alinhada por inteiro na faixa móvel', () => {
  assert.match(page, /scrollTo\(\{ left: Math\.max\(0, button\.offsetLeft\) \}\)/);
  assert.match(styles, /overflow-x: auto/);
  assert.match(styles, /padding: 0 16px 4px/);
});

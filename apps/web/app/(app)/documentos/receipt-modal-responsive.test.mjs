import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./ReceiptsTab.tsx', import.meta.url), 'utf8');

test('o modal de recibo inclui padding dentro da altura útil e mantém rolagem interna', () => {
  assert.match(source, /maxHeight: 'calc\(100dvh - 32px\)'/);
  assert.match(source, /boxSizing: 'border-box'/);
  assert.match(source, /overflowY: 'auto'/);
  assert.match(source, /overscrollBehavior: 'contain'/);
});

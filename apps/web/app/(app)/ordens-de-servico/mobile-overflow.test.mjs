import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./OSContent.tsx', import.meta.url), 'utf8');

test('ações da OS ocupam uma linha própria no cartão mobile', () => {
  assert.match(source, /className="ov-work-order-row"/);
  assert.match(source, /className="ov-work-order-actions"/);
  assert.match(source, /\.ov-work-order-actions \{/);
  assert.match(source, /position: static !important/);
  assert.match(source, /grid-column: 1 \/ -1/);
  assert.match(source, /flex-wrap: wrap/);
  assert.match(source, /aria-label=\{`Abrir OS #\$\{order\.number\}`\}/);
});

test('badge de status pode quebrar sem ultrapassar a célula', () => {
  assert.match(source, /maxWidth: '100%'/);
  assert.match(source, /overflowWrap: 'anywhere'/);
  assert.match(source, /whiteSpace: 'normal'/);
});

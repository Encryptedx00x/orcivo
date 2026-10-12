import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./screens/QuoteFlow.tsx', import.meta.url), 'utf8');

test('app fácil oferece adicionar, descartar e cancelar', () => {
  assert.match(source, /if \(pendingItemState === 'EMPTY'\) return nav\.navigate\('QuoteReview'\)/);
  assert.match(source, /text: 'Cancelar', style: 'cancel'/);
  assert.match(source, /text: 'Descartar e continuar'/);
  assert.match(source, /text: 'Adicionar item e continuar'/);
});

test('cancelar preserva os campos e adicionar só navega depois de concluir', () => {
  assert.match(source, /addNew\(\)\.then\(\(added\) => added && nav\.navigate\('QuoteReview'\)\)/);
  assert.doesNotMatch(source, /text: 'Cancelar'[\s\S]{0,100}clearNewItem/);
});

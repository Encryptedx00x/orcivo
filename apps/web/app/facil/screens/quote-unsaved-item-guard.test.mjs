import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./QuoteFlow.tsx', import.meta.url), 'utf8');

test('modo fácil oferece as três escolhas sem perder a edição', () => {
  assert.match(source, /if \(pendingItemState === 'EMPTY'\) return go\('q3'\)/);
  assert.match(source, /Adicionar item e continuar/);
  assert.match(source, /Descartar e continuar/);
  assert.match(source, /Fechar mantém o conteúdo/);
});

test('só navega após adicionar quando a persistência do item conclui', () => {
  assert.match(source, /addNew\(\)\.then\(\(added\) => added && go\('q3'\)\)/);
});

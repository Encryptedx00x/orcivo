import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const share = readFileSync(new URL('./share.ts', import.meta.url), 'utf8');
const quotes = readFileSync(new URL('./screens/Quotes.tsx', import.meta.url), 'utf8');

test('app baixa o PDF autenticado no cache antes de abrir o compartilhamento nativo', () => {
  assert.match(share, /FileSystem\.downloadAsync/);
  assert.match(share, /Sharing\.shareAsync/);
  assert.match(share, /mimeType = 'application\/pdf'/);
  assert.match(share, /`orcamento-\$\{number\}\.pdf`/);
});

test('app descreve explicitamente o fallback nativo de baixar ou compartilhar', () => {
  assert.match(quotes, /Baixar ou compartilhar PDF/);
  assert.match(share, /Compartilhamento indisponível neste aparelho/);
});

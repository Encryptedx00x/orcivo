import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const route = readFileSync(new URL('./route.ts', import.meta.url), 'utf8');
const detail = readFileSync(
  new URL('../../../../(app)/orcamentos/[id]/OrcamentoDetail.tsx', import.meta.url),
  'utf8',
);
const easyQuotes = readFileSync(
  new URL('../../../../facil/screens/Quotes.tsx', import.meta.url),
  'utf8',
);
const easyFlow = readFileSync(
  new URL('../../../../facil/screens/QuoteFlow.tsx', import.meta.url),
  'utf8',
);

test('proxy preserva preview inline e transforma download=1 em attachment', () => {
  assert.match(route, /request\.nextUrl\.searchParams\.get\('download'\) === '1'/);
  assert.match(route, /download \? 'attachment' : 'inline'/);
  assert.match(route, /'Content-Type': 'application\/pdf'/);
});

test('modo completo oferece ações separadas para ver e baixar', () => {
  assert.match(detail, /Ver PDF/);
  assert.match(detail, /\/pdf\?download=1/);
  assert.match(detail, /download={`orcamento-\$\{quote\.number\}\.pdf`}/);
});

test('modo fácil abre o preview e usa attachment somente na ação de download', () => {
  assert.match(easyQuotes, /window\.open\(`\/api\/quotes\/\$\{q\.id\}\/pdf`, '_blank'/);
  assert.match(easyQuotes, /\/pdf\?download=1/);
  assert.match(easyFlow, /\/pdf\?download=1/);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const form = readFileSync(new URL('./novo/NovoOrcamentoForm.tsx', import.meta.url), 'utf8');
const detail = readFileSync(new URL('./[id]/OrcamentoDetail.tsx', import.meta.url), 'utf8');

test('criação substitui o formulário pelo detalhe e bloqueia duplo envio', () => {
  assert.match(form, /const submitInFlight = useRef\(false\)/);
  assert.match(form, /router\.replace\(`\/orcamentos\/\$\{id\}`\)/);
});

test('detalhe volta para a lista e oferece novo orçamento explicitamente', () => {
  assert.match(detail, /router\.replace\('\/orcamentos'\)/);
  assert.match(detail, /Novo orçamento/);
  assert.match(detail, /router\.replace\('\/orcamentos\/novo'\)/);
});

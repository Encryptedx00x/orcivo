import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const create = readFileSync(new URL('./novo/NovoOrcamentoForm.tsx', import.meta.url), 'utf8');
const detail = readFileSync(new URL('./[id]/OrcamentoDetail.tsx', import.meta.url), 'utf8');
const easy = readFileSync(new URL('../../facil/screens/QuoteFlow.tsx', import.meta.url), 'utf8');

test('web completo revisa opcionais antes de gerar ou enviar', () => {
  assert.match(create, /Revisão de completude/);
  assert.match(create, /Continuar sem preencher/);
  assert.match(detail, /Preencher agora/);
  assert.match(detail, /Enviar sem preencher/);
});

test('web fácil mostra ausências e mantém preenchimento dentro do fluxo', () => {
  assert.match(easy, /reviewQuoteCompleteness/);
  assert.match(easy, /setMoreOpen\(true\)/);
  assert.match(easy, /Continuar sem preencher/);
});

test('web completo limpa o aviso pendente quando o preenchimento fica completo', () => {
  assert.match(create, /if \(!completeness\.complete \|\| !pendingCompletionAction\) return/);
  assert.match(create, /setPendingCompletionAction\(null\)/);
  assert.match(create, /setError\(''\)/);
});

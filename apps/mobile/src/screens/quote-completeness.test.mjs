import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const detail = readFileSync(new URL('./QuoteDetailScreen.tsx', import.meta.url), 'utf8');
const easy = readFileSync(new URL('../easy/screens/QuoteFlow.tsx', import.meta.url), 'utf8');

test('app completo pede revisão consciente antes de enviar incompleto', () => {
  assert.match(detail, /Revise antes de enviar/);
  assert.match(detail, /Editar agora/);
  assert.match(detail, /Enviar assim mesmo/);
});

test('app fácil permite preencher opcionais sem sair da revisão', () => {
  assert.match(easy, /Revisão de completude/);
  assert.match(easy, /PaymentTermsFields/);
  assert.match(easy, /Continuar sem preencher/);
});

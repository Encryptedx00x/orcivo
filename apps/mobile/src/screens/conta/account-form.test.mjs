import assert from 'node:assert/strict';
import { test } from 'node:test';
import { accountError, EMAIL_RE } from './account-form.ts';

test('email regex accepts common addresses and rejects malformed ones', () => {
  for (const email of ['a@b.com', 'nome.sobrenome@empresa.com.br']) assert.ok(EMAIL_RE.test(email));
  for (const email of ['not-an-email', 'a@b', '@b.com', 'a@.com', '']) assert.equal(EMAIL_RE.test(email), false);
});

test('load errors distinguish an expired session from a generic connection failure', () => {
  assert.match(accountError({ status: 401 }, 'load'), /sessão expirou/);
  assert.match(accountError(new Error('offline'), 'load'), /conexão/);
});

test('save errors surface validation messages without leaking technical details', () => {
  assert.equal(accountError({ status: 400, data: { errors: ['email: E-mail inválido.'] } }, 'save'), 'email: E-mail inválido.');
  assert.match(accountError({ status: 400, data: {} }, 'save'), /Confira os campos/);
  assert.match(accountError({ status: 401 }, 'save'), /senha atual está incorreta/);
  assert.match(accountError({ status: 409 }, 'save'), /já está cadastrado/);
  assert.match(accountError(new Error('ECONNRESET internal detail'), 'save'), /conexão/);
});

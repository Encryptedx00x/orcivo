import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { describeLoginError } from './login-feedback.ts';

test('credenciais recusadas recebem mensagem clara em pt-BR', () => {
  assert.deepEqual(describeLoginError({ status: 401 }), {
    title: 'Não foi possível entrar',
    message: 'E-mail ou senha inválidos.',
  });
});

test('falha de rede não expõe endpoint nem detalhe técnico', () => {
  const feedback = describeLoginError(
    new Error('Network request failed for http://localhost:3000/auth/login'),
  );
  const rendered = `${feedback.title} ${feedback.message}`;

  assert.match(rendered, /Verifique sua conexão/);
  assert.doesNotMatch(rendered, /localhost|127\.0\.0\.1|URL:|Network request failed/i);
});

test('tela de login usa somente o feedback sanitizado', () => {
  const source = readFileSync(new URL('./LoginScreen.tsx', import.meta.url), 'utf8');

  assert.match(source, /describeLoginError\(e\)/);
  assert.doesNotMatch(source, /API_URL|Detalhe:|URL:/);
});

// Rodar: node --test apps/mobile/src/screens/auth/auth-recovery.test.mjs   (Node >= 22.18)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { classifyInviteError, extractInviteToken } from './invite-state.ts';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('AC6: os 3 estados do convite (expirado, já aceito, inexistente) são terminais e distintos', () => {
  const expired = classifyInviteError({ status: 400, data: { message: 'Convite expirado.' } });
  const used = classifyInviteError({ status: 400, data: { message: 'Convite já foi usado ou expirou.' } });
  const missing = classifyInviteError({ status: 404, data: { message: 'Convite não encontrado.' } });
  assert.deepEqual([expired.code, used.code, missing.code], ['EXPIRED', 'ALREADY_USED', 'NOT_FOUND']);
  for (const info of [expired, used, missing]) {
    assert.equal(info.terminal, true);
    assert.ok(info.title && info.message);
  }
  assert.equal(new Set([expired.message, used.message, missing.message]).size, 3);
});

test('AC6: erros recuperáveis mantêm o formulário (não são terminais)', () => {
  const needs = classifyInviteError({ status: 400, data: { message: 'Nome e senha são obrigatórios para criar conta.' } });
  assert.equal(needs.code, 'NEEDS_ACCOUNT');
  assert.equal(needs.terminal, false);
  const existing = classifyInviteError({ status: 500, data: {} });
  assert.equal(existing.code, 'ACCOUNT_EXISTS');
  assert.equal(existing.terminal, false);
  const network = classifyInviteError(new Error('Network request failed'));
  assert.equal(network.code, 'ERROR');
  assert.equal(network.terminal, false);
  assert.equal(classifyInviteError(undefined).code, 'ERROR');
});

test('AC6: token pode ser colado puro ou como link completo do e-mail', () => {
  const uuid = '3f2b6c1e-8a4d-4e0b-9a55-1c2d3e4f5a6b';
  assert.equal(extractInviteToken(uuid), uuid);
  assert.equal(extractInviteToken(`  ${uuid}  `), uuid);
  assert.equal(extractInviteToken(`https://app.orcivo.com.br/convite/${uuid}`), uuid);
  assert.equal(extractInviteToken(`https://app.orcivo.com.br/convite/${uuid}?utm=x#y`), uuid);
  assert.equal(extractInviteToken(''), null);
  assert.equal(extractInviteToken(null), null);
  assert.equal(extractInviteToken('curto'), null);
  assert.equal(extractInviteToken('has spaces and / slashes'), null);
});

test('AC5: AuthStack registra ForgotPassword e AcceptInvite; Login linka para ForgotPassword', () => {
  const stack = read('../../navigation/AuthStack.tsx');
  assert.match(stack, /name="ForgotPassword" component=\{ForgotPasswordScreen\}/);
  assert.match(stack, /name="AcceptInvite" component=\{AcceptInviteScreen\}/);
  const login = read('./LoginScreen.tsx');
  assert.match(login, /navigation\.navigate\('ForgotPassword'\)[\s\S]{0,120}Esqueci minha senha/);
  assert.match(login, /navigation\.navigate\('AcceptInvite'\)/);
});

test('AC5: ForgotPasswordScreen chama o mesmo endpoint do backend e orienta a verificar o e-mail', () => {
  const src = read('./ForgotPasswordScreen.tsx');
  assert.match(src, /api\.post\('\/auth\/forgot-password', \{ email: trimmed \}\)/);
  assert.match(src, /Verifique seu e-mail/);
});

test('AC7: o app não reimplementa o formulário de nova senha (reset conclui pelo link do e-mail)', () => {
  const forgot = read('./ForgotPasswordScreen.tsx');
  assert.doesNotMatch(forgot, /secureTextEntry|reset-password|new_password/);
  assert.doesNotMatch(read('../../navigation/AuthStack.tsx'), /ResetPassword/);
});

test('AC6: AcceptInviteScreen usa o mesmo endpoint de aceite do web', () => {
  const src = read('./AcceptInviteScreen.tsx');
  assert.match(src, /api\.post<[^>]*>\('\/invites\/accept'/);
  assert.match(src, /classifyInviteError/);
});

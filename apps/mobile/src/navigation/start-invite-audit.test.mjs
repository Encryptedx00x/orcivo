import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('inventário mantém Homes distintas para os modos fácil e completo', () => {
  const root = read('./RootNavigator.tsx');
  const tabs = read('./AppTabs.tsx');
  const easyHome = read('../easy/screens/Home.tsx');

  assert.match(root, /easy \? <EasyNavigator \/> : <AppTabs \/>/);
  assert.match(tabs, /name="Início"[\s\S]*component=\{InicioScreen\}/);
  assert.match(easyHome, /Novo orçamento/);
  assert.match(easyHome, /Pronto em 3 passos/);
});

test('login apresenta o fluxo de convite existente com nomenclatura atual', () => {
  const login = read('../screens/auth/LoginScreen.tsx');
  const stack = read('./AuthStack.tsx');
  const invite = read('../screens/auth/AcceptInviteScreen.tsx');

  assert.match(login, /Entrar com um convite/);
  assert.doesNotMatch(login, /Tenho um convite/);
  assert.match(stack, /name="AcceptInvite"\s+component=\{AcceptInviteScreen\}/);
  assert.match(invite, /api\.post<[^>]*>\('\/invites\/accept'/);
  assert.match(invite, /Código ou link do convite/);
});

test('backend e contrato compartilhado expõem aceite público validado', () => {
  const controller = read('../../../backend/src/invite/invite.controller.ts');
  const schema = read('../../../../packages/shared-types/src/invite/invite.dto.ts');

  assert.match(controller, /@Public\(\)[\s\S]*@Post\('accept'\)/);
  assert.match(controller, /this\.inviteService\.accept/);
  assert.match(schema, /AcceptInviteSchema/);
  assert.match(schema, /token: z\.string\(\)\.uuid\(\)/);
  assert.match(schema, /password: z\.string\(\)\.min\(8\)\.optional\(\)/);
});

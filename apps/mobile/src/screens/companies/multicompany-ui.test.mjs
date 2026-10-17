import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('contexto móvel suporta seleção, troca com refresh, criação e convite existente', () => {
  const context = read('../../contexts/AuthContext.tsx');
  assert.match(context, /requires_company_selection/);
  assert.match(context, /\/auth\/select-company/);
  assert.match(context, /getItemAsync\('refresh_token'\)/);
  assert.match(context, /\/auth\/switch-company/);
  assert.match(context, /\/companies/);
  assert.match(context, /\/invites\/accept-existing/);
});

test('tela confirma contexto e não troca automaticamente após criar ou aceitar convite', () => {
  const screen = read('./CompaniesScreen.tsx');
  assert.match(screen, /A empresa ativa define/);
  assert.match(screen, /Trocar empresa\?/);
  assert.match(screen, /Você continua na empresa atual até escolher Trocar/);
  assert.match(screen, /Sua empresa atual não mudou/);
});

test('deep link de convite abre aceite público sem sessão e empresas com sessão', () => {
  const root = read('../../navigation/RootNavigator.tsx');
  const appConfig = read('../../../app.config.js');
  assert.match(root, /AcceptInvite: 'convite\/:token'/);
  assert.match(root, /getInviteToken\(path\)/);
  assert.match(root, /name: 'Empresas', params: \{ token \}/);
  assert.match(root, /Empresas: 'empresas'/);
  assert.match(root, /https:\/\/app\.orcivo\.com\.br/);
  assert.match(appConfig, /scheme: 'orcivo'/);
});

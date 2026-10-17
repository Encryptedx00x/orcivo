import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('login exige seleção explícita e grava a sessão somente depois da escolha', () => {
  const login = read('../../(auth)/login/page.tsx');
  const proxy = read('../../api/auth/login/route.ts');
  const select = read('../../api/auth/select-company/route.ts');
  assert.match(login, /Em qual empresa você vai entrar/);
  assert.match(login, /\/api\/auth\/select-company/);
  assert.match(proxy, /requires_company_selection === true/);
  assert.match(select, /setSessionCookies\(data\)/);
});

test('empresa ativa, troca confirmada, criação e convite ficam no mesmo fluxo', () => {
  const page = read('./page.tsx');
  const easySettings = read('../../facil/screens/Settings.tsx');
  assert.match(page, /Empresa ativa/);
  assert.match(page, /window\.confirm/);
  assert.match(page, /\/api\/auth\/switch-company/);
  assert.match(page, /Empresa criada\. Você continua na empresa atual/);
  assert.match(page, /\/api\/invites\/accept-existing/);
  assert.match(page, /Sua empresa atual não mudou/);
  assert.match(easySettings, /label="Empresas"/);
  assert.match(easySettings, /href="\/empresas"/);
});

test('aceite autenticado usa endpoint de conta existente e não troca empresa silenciosamente', () => {
  const route = read('../../convite/[token]/submit/route.ts');
  const page = read('../../convite/[token]/page.tsx');
  assert.match(route, /\/invites\/accept-existing/);
  assert.match(page, /Sua empresa atual não mudou/);
  assert.match(page, /href="\/empresas"/);
  assert.doesNotMatch(page, /router\.push\('\/clientes'\)/);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const route = readFileSync(new URL('./route.ts', import.meta.url), 'utf8');
const detailRoute = readFileSync(new URL('../[id]/route.ts', import.meta.url), 'utf8');

test('proxy autenticado encaminha a listagem de responsáveis ao backend', () => {
  assert.match(route, /cookies\(\)/);
  assert.match(route, /get\('access_token'\)/);
  assert.match(route, /\/work-orders\/assignable-members/);
  assert.match(route, /status:\s*res\.status/);
});

test('proxy autenticado encaminha a edição do responsável da OS ao backend', () => {
  assert.match(detailRoute, /export async function PATCH/);
  assert.match(detailRoute, /method:\s*'PATCH'/);
  assert.match(detailRoute, /`\$\{API_URL\}\/work-orders\/\$\{params\.id\}`/);
  assert.match(detailRoute, /status:\s*res\.status/);
});

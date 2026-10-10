import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const customer = readFileSync(new URL('./ClienteCreateScreen.tsx', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../CatalogItemFormScreen.tsx', import.meta.url), 'utf8');
const settings = readFileSync(new URL('../configuracoes/ConfiguracoesScreen.tsx', import.meta.url), 'utf8');

test('cadastro completo expõe origem, aniversário, segundo telefone e notas internas', () => {
  for (const field of ['phone2', 'origin', 'birthday', 'internal_notes']) assert.match(customer, new RegExp(field));
});

test('política sempre/nunca/perguntar usa Expo Contacts sem enviar contato ao backend', () => {
  assert.match(customer, /expo-contacts/);
  assert.match(customer, /preference === 'ALWAYS'/);
  assert.match(customer, /preference === 'ASK'/);
  assert.match(customer, /Cliente salvo/);
  assert.match(settings, /'ALWAYS', 'Sempre'/);
  assert.match(settings, /'NEVER', 'Nunca'/);
  assert.match(settings, /'ASK', 'Perguntar'/);
});

test('catálogo mobile edita custo, margem, markup, estoque, código e marca', () => {
  for (const field of ['cost_price', 'margin_percent', 'markup_percent', 'quantity', 'internal_code', 'brand']) {
    assert.match(catalog, new RegExp(field));
  }
  assert.match(catalog, /calculateSalePrice/);
});

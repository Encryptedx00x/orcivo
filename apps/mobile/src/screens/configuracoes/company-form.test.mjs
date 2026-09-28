import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { inferPixKeyType, maskPixKey, profileFromCompany, profilePayload, saveError } from './company-form.ts';

test('CPF and CNPJ masks handle typing, paste, deletion and length limits', () => {
  assert.equal(maskPixKey('CPF', '12345678900'), '123.456.789-00');
  assert.equal(maskPixKey('CPF', '123.456.789-0099'), '123.456.789-00');
  assert.equal(maskPixKey('CPF', '1234'), '123.4');
  assert.equal(maskPixKey('CPF', ''), '');
  assert.equal(maskPixKey('CNPJ', '12345678000190'), '12.345.678/0001-90');
  assert.equal(maskPixKey('CNPJ', '12.345.678/0001-9099'), '12.345.678/0001-90');
  assert.equal(maskPixKey('CNPJ', '123'), '12.3');
});

test('masks stay in parity with the actual PB1-P32 web implementation', () => {
  const web = readFileSync(new URL('../../../../web/app/(app)/configuracoes/page.tsx', import.meta.url), 'utf8');
  const source = web.slice(web.indexOf('function maskPixKey('), web.indexOf('\nconst METHOD_LABELS'))
    .replace('type: PixKeyType, raw: string): string', 'type, raw)');
  const webMask = runInNewContext(`${source}; maskPixKey`);
  for (const type of ['CPF', 'CNPJ', 'PHONE', 'EMAIL', 'RANDOM']) {
    for (const raw of ['', '1', '1234', '11912345678', '1234567800019099', '(11) 91234-5678', 'a@b.com', '123e4567-e89b-12d3-a456-426614174000']) {
      assert.equal(maskPixKey(type, raw), webMask(type, raw), `${type}: ${raw}`);
    }
  }
});

test('phone formatting and unformatted email/random values', () => {
  assert.equal(maskPixKey('PHONE', '11912345678'), '(11) 91234-5678');
  assert.equal(maskPixKey('PHONE', '(11) 91234-567899'), '(11) 91234-5678');
  assert.equal(maskPixKey('EMAIL', 'financeiro@empresa.com'), 'financeiro@empresa.com');
  const key = '123e4567-e89b-12d3-a456-426614174000';
  assert.equal(maskPixKey('RANDOM', key), key);
});

test('saved formatted keys recover their type, including 11-digit phones', () => {
  for (const [type, key] of [
    ['CPF', '123.456.789-00'], ['CNPJ', '12.345.678/0001-90'],
    ['PHONE', '(11) 91234-5678'], ['PHONE', '(11) 34567-890'],
    ['EMAIL', 'financeiro@empresa.com'], ['RANDOM', '123e4567-e89b-12d3-a456-426614174000'],
    ['CPF', '12345678900'], ['CNPJ', ''],
  ]) assert.equal(inferPixKeyType(key), type);
});

test('company load and profile updates preserve the web API contract', () => {
  const form = profileFromCompany({ trade_name: 'Empresa', phone: null, pix_key: 'private@example.com' });
  assert.deepEqual(form, { trade_name: 'Empresa', document: '', phone: '', city: '', state: '' });
  assert.deepEqual(profilePayload({ ...form, city: ' São Paulo ', state: 'sp' }), {
    trade_name: 'Empresa', document: null, phone: null, city: 'São Paulo', state: 'SP',
  });
  assert.equal('pix_key' in profilePayload(form), false);
});

test('validation, permission and network errors are actionable without exposing internals', () => {
  assert.equal(saveError({ status: 400, data: { errors: ['Chave Pix inválida.'] } }), 'Chave Pix inválida.');
  assert.match(saveError({ status: 400, data: { errors: [{}] } }), /Confira/);
  assert.match(saveError({ status: 401 }), /sessão expirou/);
  assert.match(saveError({ status: 403 }), /permissão/);
  assert.match(saveError({ status: 404 }), /não encontrada/);
  assert.match(saveError(new Error('internal')), /conexão/);
});

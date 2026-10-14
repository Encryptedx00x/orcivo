import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { assertApiUrl, resolveApiUrl, resolveAppEnvironment } = require('./api-environment.cjs');

test('desenvolvimento permite fallback local explícito', () => {
  assert.equal(resolveAppEnvironment({ NODE_ENV: 'development' }), 'development');
  assert.equal(resolveApiUrl({ NODE_ENV: 'development' }), 'http://localhost:3000');
  assert.equal(
    resolveApiUrl({ EXPO_PUBLIC_APP_ENV: 'development', EXPO_PUBLIC_API_URL: 'http://127.0.0.1:3000' }),
    'http://127.0.0.1:3000',
  );
});

test('preview e produção exigem URL configurada', () => {
  assert.throws(() => resolveApiUrl({ EAS_BUILD_PROFILE: 'preview' }), /obrigatória/);
  assert.throws(() => resolveApiUrl({ EAS_BUILD_PROFILE: 'production' }), /obrigatória/);
});

test('build distribuída bloqueia localhost e loopback', () => {
  for (const value of [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://127.10.20.30:3000',
    'http://[::1]:3000',
    'http://0.0.0.0:3000',
  ]) {
    assert.throws(() => assertApiUrl(value, 'production'), /não pode usar localhost|loopback/);
    assert.throws(() => assertApiUrl(value, 'preview'), /não pode usar localhost|loopback/);
  }
});

test('produção aceita endpoint público e remove barra final', () => {
  assert.equal(
    resolveApiUrl({
      EXPO_PUBLIC_APP_ENV: 'production',
      EXPO_PUBLIC_API_URL: 'https://api.orcivo.com.br/',
    }),
    'https://api.orcivo.com.br',
  );
});

test('protocolos não HTTP são rejeitados em qualquer perfil', () => {
  assert.throws(() => assertApiUrl('file:///tmp/api', 'development'), /HTTP ou HTTPS/);
  assert.throws(() => assertApiUrl('api.orcivo.com.br', 'production'), /URL HTTP\(S\) válida/);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

function service(file, name, api) {
  const source = stripTypeScriptTypes(readFileSync(new URL(file, import.meta.url), 'utf8'))
    .replace(/^import .*;$/gm, '').replace('export const', 'const');
  return runInNewContext(`${source}\n${name}`, { api });
}

test('Home reads the authenticated dashboard contract without recomputing totals', async () => {
  const response = { kpis: { agenda_today: 0, quotes_pending: 4, os_pending: 2, receivables_pending_count: 1 }, upcoming: [] };
  const home = service('./home.service.ts', 'homeService', { get(path) {
    assert.equal(path, '/dashboard/summary');
    return Promise.resolve(response);
  } });
  assert.equal(await home.summary(), response);
});

test('customer detail reads only the selected ID and encodes path input', async () => {
  const customer = { id: 'selected', name: 'Cliente' };
  const detail = service('./customer.service.ts', 'customerService', { get(path) {
    assert.equal(path, '/customers/selected%2Fother%3Fx');
    return Promise.resolve(customer);
  } });
  assert.equal(await detail.detail('selected/other?x'), customer);
});

test('customer errors propagate to the screen retry state', async () => {
  const detail = service('./customer.service.ts', 'customerService', { get() { return Promise.reject(new Error('404')); } });
  await assert.rejects(detail.detail('missing'), /404/);
});

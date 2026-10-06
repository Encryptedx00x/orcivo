import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

function mount(fetchPage, pageSize) {
  const states = [];
  let cursor = 0;
  const source = stripTypeScriptTypes(readFileSync(new URL('./usePagedList.ts', import.meta.url), 'utf8'))
    .replace(/^import .*;$/gm, '').replace('export function', 'function');
  const hook = runInNewContext(`${source}\nusePagedList`, {
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      return states[index] ?? (states[index] = { current: initial });
    },
    useCallback: callback => callback,
  });
  return () => { cursor = 0; return hook(fetchPage, pageSize); };
}

const rows = (from, n) => Array.from({ length: n }, (_, i) => ({ id: String(from + i) }));
const deferred = () => {
  let resolve;
  const promise = new Promise(yes => { resolve = yes; });
  return { promise, resolve };
};

test('appends pages, drops duplicates and stops after a short page', async () => {
  const pages = { 1: rows(0, 2), 2: [...rows(1, 1), ...rows(2, 1)], 3: rows(3, 1) };
  const calls = [];
  const render = mount(async page => { calls.push(page); return pages[page]; }, 2);
  await render().refresh();
  assert.deepEqual(Array.from(render().items, r => r.id), ['0', '1']);
  await render().loadMore();
  assert.deepEqual(Array.from(render().items, r => r.id), ['0', '1', '2']);
  await render().loadMore(); // page 2 was full (2 rows incl. a duplicate): page 3 is fetched
  assert.deepEqual(Array.from(render().items, r => r.id), ['0', '1', '2', '3']);
  await render().loadMore(); // page 3 was short: no more requests
  assert.deepEqual(calls, [1, 2, 3]);
});

test('a refresh discards a page that was still loading', async () => {
  const slow = deferred();
  let first = true;
  const render = mount(async page => {
    if (page === 2) return slow.promise;
    const out = first ? rows(0, 2) : rows(10, 2);
    first = false;
    return out;
  }, 2);
  await render().refresh();
  const pending = render().loadMore();
  await render().refresh();
  slow.resolve(rows(2, 2));
  await pending;
  assert.deepEqual(Array.from(render().items, r => r.id), ['10', '11']);
});

test('a failed first page reports failure', async () => {
  const render = mount(async () => { throw new Error('GET /x 500'); }, 2);
  await render().refresh();
  assert.equal(render().failed, true);
  assert.equal(render().loading, false);
});

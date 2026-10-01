import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

function mount(loader) {
  const states = [];
  let cursor = 0;
  let focus;
  let foreground;
  let removed = false;
  const source = stripTypeScriptTypes(readFileSync(new URL('./useFocusedResource.ts', import.meta.url), 'utf8'))
    .replace(/^import .*;$/gm, '').replace('export function', 'function');
  const hook = runInNewContext(`${source}\nuseFocusedResource`, {
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], value => { states[index] = value; }];
    },
    useRef(initial) {
      const index = cursor++;
      return states[index] ?? (states[index] = { current: initial });
    },
    useCallback: callback => callback,
    useFocusEffect: callback => { focus = callback; },
    AppState: { addEventListener(event, callback) {
      assert.equal(event, 'change');
      foreground = callback;
      return { remove() { removed = true; } };
    } },
  });
  const render = () => { cursor = 0; return hook(loader); };
  render();
  const cleanup = focus();
  return { render, cleanup, foreground: state => foreground(state), removed: () => removed };
}

const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

test('loads on focus and refreshes on foreground, with listener cleanup', async () => {
  let calls = 0;
  const screen = mount(async () => ++calls);
  assert.equal(screen.render().loading, true);
  await tick();
  assert.equal(screen.render().data, 1);
  screen.foreground('background');
  assert.equal(calls, 1);
  screen.foreground('active');
  await tick();
  assert.equal(screen.render().data, 2);
  screen.cleanup();
  assert.equal(screen.removed(), true);
});

test('failure does not masquerade as empty data and retry recovers', async () => {
  let fail = true;
  const screen = mount(async () => {
    if (fail) throw new Error('offline');
    return { upcoming: [] };
  });
  await tick();
  assert.equal(screen.render().failed, true);
  assert.equal(screen.render().data, null);
  assert.equal(screen.render().loading, false);
  fail = false;
  await screen.render().refresh();
  assert.equal(screen.render().failed, false);
  assert.deepEqual(screen.render().data, { upcoming: [] });
  screen.cleanup();
});

test('out-of-order responses cannot replace the newest refresh', async () => {
  const old = deferred();
  const fresh = deferred();
  let calls = 0;
  const screen = mount(() => ++calls === 1 ? old.promise : fresh.promise);
  const refresh = screen.render().refresh();
  fresh.resolve('new customer');
  await refresh;
  old.resolve('old customer');
  await tick();
  assert.equal(screen.render().data, 'new customer');
  screen.cleanup();
});

test('blur/unmount invalidates pending requests', async () => {
  const pending = deferred();
  const screen = mount(() => pending.promise);
  screen.cleanup();
  pending.resolve('private data');
  await tick();
  assert.equal(screen.render().data, null);
});

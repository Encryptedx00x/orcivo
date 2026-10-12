import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mock, test } from 'node:test';

import {
  ACTION_TOAST_DURATION_MS,
  COMMON_TOAST_DURATION_MS,
  scheduleToastDismiss,
} from './toast-timing.ts';

const ui = readFileSync(new URL('./ui.tsx', import.meta.url), 'utf8');

test('toast comum fecha em três segundos com timer controlado', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  let dismissed = false;
  scheduleToastDismiss(() => {
    dismissed = true;
  });

  mock.timers.tick(COMMON_TOAST_DURATION_MS - 1);
  assert.equal(dismissed, false);
  mock.timers.tick(1);
  assert.equal(dismissed, true);
  mock.timers.reset();
});

test('toast com ação preserva seis segundos para permitir desfazer', () => {
  assert.equal(COMMON_TOAST_DURATION_MS, 3_000);
  assert.equal(ACTION_TOAST_DURATION_MS, 6_000);
});

test('toast é anunciado e pode ser dispensado imediatamente por OK', () => {
  assert.match(ui, /role="status"/);
  assert.match(ui, /aria-live="polite"/);
  assert.match(ui, /aria-atomic="true"/);
  assert.match(ui, />\s*OK\s*<\/button>/);
  assert.match(ui, /aria-label="Dispensar notificação"/);
});

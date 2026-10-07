import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { test } from 'node:test';

// Pulls the two pure helpers out of the screen (date mask + dd/mm/aaaa → ISO).
const src = stripTypeScriptTypes(
  readFileSync(new URL('../WorkOrderCreateScreen.tsx', import.meta.url), 'utf8')
    .replace(/^import[\s\S]*?;$/gm, '')
    .split('/** New stand-alone work order')[0]
    .replace(/^type Props.*$/m, ''),
);
const { mask, toIso } = new Function(`${src}; return { mask, toIso };`)();

test('masks date and time while typing', () => {
  assert.equal(mask('07102026', 'date'), '07/10/2026');
  assert.equal(mask('0710', 'date'), '07/10');
  assert.equal(mask('1430', 'time'), '14:30');
});

test('converts local date + time and rejects impossible dates', () => {
  const iso = toIso('07/10/2026', '14:30');
  const d = new Date(iso);
  assert.deepEqual([d.getDate(), d.getMonth(), d.getHours(), d.getMinutes()], [7, 9, 14, 30]);
  assert.equal(new Date(toIso('07/10/2026', '')).getHours(), 8);
  assert.equal(toIso('31/02/2026', '10:00'), null);
  assert.equal(toIso('07/10/20', '10:00'), null);
  assert.equal(toIso('07/10/2026', '25:00'), null);
});

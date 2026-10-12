import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const registration = readFileSync(
  new URL('./PaymentRegistrationModal.tsx', import.meta.url),
  'utf8',
);
const edit = readFileSync(new URL('./PaymentEditModal.tsx', import.meta.url), 'utf8');

for (const [surface, source] of [
  ['cadastro', registration],
  ['edição', edit],
]) {
  test(`${surface} mantém o modal rolável quando o teclado reduz a viewport`, () => {
    assert.match(source, /maxHeight: 'calc\(100dvh - 32px\)'/);
    assert.match(source, /overflowY: 'auto'/);
    assert.match(source, /overflowX: 'hidden'/);
  });

  test(`${surface} impede que o input de data force overflow horizontal`, () => {
    assert.match(source, /gridTemplateColumns: 'repeat\(2, minmax\(0, 1fr\)\)'/);
    assert.match(source, /minWidth: 0/);
    assert.match(source, /maxWidth: '100%'/);
  });
}

test('datas continuam sendo enviadas como ISO no meio-dia local', () => {
  assert.match(registration, /new Date\(`\$\{date\}T12:00:00`\)\.toISOString\(\)/);
  assert.match(edit, /new Date\(`\$\{value\}T12:00:00`\)\.toISOString\(\)/);
});

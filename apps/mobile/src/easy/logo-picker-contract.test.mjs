import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const picker = readFileSync(new URL('./screens/Settings.tsx', import.meta.url), 'utf8');
const data = readFileSync(new URL('./data.ts', import.meta.url), 'utf8');

test('crop nativo permite reposicionar e ampliar antes do upload', () => {
  assert.match(picker, /allowsEditing: true/);
  assert.match(picker, /aspect: \[2, 1\]/);
  assert.match(picker, /quality: 1/);
  assert.match(picker, /if \(r\.canceled \|\| !r\.assets\[0\]\) return/);
});

test('upload preserva o MIME devolvido pelo editor nativo', () => {
  assert.match(picker, /asset\.mimeType/);
  assert.match(data, /uploadLogo: \(uri: string, mimeType\?: string\)/);
  assert.match(data, /type: normalizedType/);
});

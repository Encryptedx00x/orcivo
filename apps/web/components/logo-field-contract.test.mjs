import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./LogoField.tsx', import.meta.url), 'utf8');

test('normaliza orientação e só envia depois da confirmação do recorte', () => {
  assert.match(source, /imageOrientation: 'from-image'/);
  assert.match(source, /const choose = async/);
  assert.match(source, /setPending\(await decodeLogo\(file\)\)/);
  assert.match(source, /const upload = async/);
  assert.match(source, /fetch\('\/api\/company\/logo', \{ method: 'PUT'/);
});

test('cancelar preserva o logo salvo e a saída respeita MIME e limite', () => {
  const cancel = source.slice(source.indexOf('const cancelCrop'), source.indexOf('const upload'));
  assert.match(cancel, /setPending\(null\)/);
  assert.doesNotMatch(cancel, /setUrl/);
  assert.match(source, /blob\.size > 2 \* 1024 \* 1024/);
  assert.match(source, /image\/webp/);
});

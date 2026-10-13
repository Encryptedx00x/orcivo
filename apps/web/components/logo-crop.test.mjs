import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateLogoCrop, LOGO_OUTPUT_HEIGHT, LOGO_OUTPUT_WIDTH } from './logo-crop.ts';

test('usa saída horizontal estável para logos de qualquer formato', () => {
  assert.equal(LOGO_OUTPUT_WIDTH, 1024);
  assert.equal(LOGO_OUTPUT_HEIGHT, 512);
  assert.deepEqual(calculateLogoCrop(1200, 600, 1, 0, 0), {
    sx: 0,
    sy: 0,
    sw: 1200,
    sh: 600,
  });
  assert.deepEqual(calculateLogoCrop(1000, 1000, 1, 0, 0), {
    sx: 0,
    sy: 250,
    sw: 1000,
    sh: 500,
  });
  assert.deepEqual(calculateLogoCrop(600, 1200, 1, 0, 0), {
    sx: 0,
    sy: 450,
    sw: 600,
    sh: 300,
  });
});

test('zoom e reposicionamento permanecem dentro da imagem', () => {
  assert.deepEqual(calculateLogoCrop(1000, 1000, 2, 1, -1), {
    sx: 500,
    sy: 0,
    sw: 500,
    sh: 250,
  });
  assert.deepEqual(calculateLogoCrop(1000, 1000, 99, 9, -9), {
    sx: 666.666667,
    sy: 0,
    sw: 333.333333,
    sh: 166.666667,
  });
});

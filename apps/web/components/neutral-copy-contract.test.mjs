import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const files = [
  '../../site/app/page.tsx',
  '../../site/app/manifest.ts',
  '../app/layout.tsx',
  '../app/(auth)/layout.tsx',
  '../app/(app)/equipe/page.tsx',
  '../app/approve/[token]/page.tsx',
];

test('copy pública e de equipe não volta ao posicionamento nichado', () => {
  const source = files
    .map((file) => readFileSync(new URL(file, import.meta.url), 'utf8'))
    .join('\n');
  for (const forbidden of [
    'Gestão para técnicos instaladores',
    'Feito para técnicos instaladores',
    'plataforma feita para técnicos instaladores',
    'Convide técnicos e admins',
    "TECNICO: 'Técnico'",
    'técnico responsável entrará em contato',
  ]) {
    assert.equal(source.includes(forbidden), false, `copy nichada encontrada: ${forbidden}`);
  }
});

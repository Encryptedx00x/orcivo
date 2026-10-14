import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { analyzeExport } from './mobile-size-budget.mjs';

function fixture(bytecodeBytes = 8, assetBytes = 4) {
  const root = mkdtempSync(join(tmpdir(), 'orcivo-size-test-'));
  const jsDir = join(root, '_expo', 'static', 'js', 'android');
  const assetsDir = join(root, 'assets');
  mkdirSync(jsDir, { recursive: true });
  mkdirSync(assetsDir, { recursive: true });
  writeFileSync(join(jsDir, 'index.hbc'), Buffer.alloc(bytecodeBytes, 1));
  writeFileSync(
    join(jsDir, 'index.hbc.map'),
    JSON.stringify({
      sources: ['../../node_modules/react-native/index.js', '../../src/App.tsx'],
      sourcesContent: ['native', 'app'],
    }),
  );
  writeFileSync(join(assetsDir, 'asset'), Buffer.alloc(assetBytes, 2));
  return root;
}

const budget = {
  schemaVersion: 1,
  platform: 'android',
  baseline: { hermesBytecodeBytes: 8, packagedAssetBytes: 4 },
  limits: { hermesBytecodeBytes: 10, packagedAssetBytes: 5 },
};

test('mede bytecode, assets e grupos de dependencias', () => {
  const root = fixture();
  try {
    const result = analyzeExport(root, budget);
    assert.equal(result.passed, true);
    assert.equal(result.metrics.hermesBytecodeBytes, 8);
    assert.equal(result.metrics.packagedAssetBytes, 4);
    assert.equal(result.metrics.sourceModuleCount, 2);
    assert.deepEqual(result.metrics.largestSourceGroups.map(({ group }) => group), ['react-native', 'app']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('falha quando qualquer limite e excedido', () => {
  const root = fixture(11, 6);
  try {
    const result = analyzeExport(root, budget);
    assert.equal(result.passed, false);
    assert.equal(result.checks.hermesBytecode.passed, false);
    assert.equal(result.checks.packagedAssets.passed, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

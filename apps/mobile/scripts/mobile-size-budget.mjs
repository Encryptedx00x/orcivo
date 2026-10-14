import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = resolve(SCRIPT_DIR, '..');
const BUDGET_PATH = join(PROJECT_DIR, 'bundle-size-budget.json');

function listFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

function packageGroup(source) {
  const normalized = source.replaceAll('\\', '/');
  const marker = 'node_modules/';
  const position = normalized.lastIndexOf(marker);
  if (position < 0) {
    return normalized.includes('packages/shared-types') ? '@orcivo/shared-types' : 'app';
  }

  const parts = normalized.slice(position + marker.length).split('/');
  return parts[0]?.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0] || 'unknown';
}

export function analyzeExport(exportDir, budget) {
  const files = listFiles(exportDir);
  const bytecodePath = files.find((path) => path.endsWith('.hbc'));
  const sourceMapPath = files.find((path) => path.endsWith('.hbc.map'));
  if (!bytecodePath || !sourceMapPath) {
    throw new Error('Export invalido: bytecode Hermes ou source map ausente.');
  }

  const bytecode = readFileSync(bytecodePath);
  const assets = files.filter((path) => relative(exportDir, path).split(sep)[0] === 'assets');
  const sourceMap = JSON.parse(readFileSync(sourceMapPath, 'utf8'));
  const groups = new Map();

  sourceMap.sources.forEach((source, index) => {
    const content = sourceMap.sourcesContent?.[index] || '';
    const group = packageGroup(source || '');
    groups.set(group, (groups.get(group) || 0) + Buffer.byteLength(content));
  });

  const metrics = {
    platform: budget.platform,
    hermesBytecodeBytes: bytecode.length,
    gzipHermesBytecodeBytes: gzipSync(bytecode, { level: 9 }).length,
    packagedAssetBytes: assets.reduce((sum, path) => sum + statSync(path).size, 0),
    packagedAssetCount: assets.length,
    sourceModuleCount: sourceMap.sources.length,
    largestSourceGroups: [...groups.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 15)
      .map(([group, sourceBytes]) => ({ group, sourceBytes })),
  };

  const checks = {
    hermesBytecode: {
      actual: metrics.hermesBytecodeBytes,
      limit: budget.limits.hermesBytecodeBytes,
      passed: metrics.hermesBytecodeBytes <= budget.limits.hermesBytecodeBytes,
    },
    packagedAssets: {
      actual: metrics.packagedAssetBytes,
      limit: budget.limits.packagedAssetBytes,
      passed: metrics.packagedAssetBytes <= budget.limits.packagedAssetBytes,
    },
  };

  return {
    schemaVersion: budget.schemaVersion,
    baseline: budget.baseline,
    metrics,
    checks,
    passed: Object.values(checks).every((check) => check.passed),
  };
}

function parseExportDir(args) {
  const index = args.indexOf('--export-dir');
  if (index < 0) return null;
  if (!args[index + 1]) throw new Error('Informe um caminho depois de --export-dir.');
  return resolve(args[index + 1]);
}

function createExport() {
  const exportDir = mkdtempSync(join(tmpdir(), 'orcivo-mobile-size-'));
  const expoCli = requireResolve('expo/bin/cli');
  const result = spawnSync(
    process.execPath,
    [expoCli, 'export', '--platform', 'android', '--output-dir', exportDir, '--dump-assetmap', '--source-maps', '--max-workers', '2'],
    {
      cwd: PROJECT_DIR,
      env: {
        ...process.env,
        EXPO_PUBLIC_APP_ENV: 'production',
        EXPO_PUBLIC_API_URL: 'https://api.orcivo.com.br',
        EXPO_PUBLIC_WEB_URL: 'https://app.orcivo.com.br',
      },
      encoding: 'utf8',
      stdio: ['ignore', 'inherit', 'inherit'],
    },
  );
  if (result.status !== 0) {
    throw new Error(`Expo export falhou com codigo ${result.status ?? 'desconhecido'}.`);
  }
  return exportDir;
}

function requireResolve(specifier) {
  return fileURLToPath(import.meta.resolve(specifier));
}

function isOwnedTempDirectory(path) {
  return dirname(path) === resolve(tmpdir()) && basename(path).startsWith('orcivo-mobile-size-');
}

function main() {
  const suppliedExportDir = parseExportDir(process.argv.slice(2));
  const exportDir = suppliedExportDir || createExport();
  if (!existsSync(exportDir)) throw new Error(`Diretorio de export inexistente: ${exportDir}`);

  try {
    const budget = JSON.parse(readFileSync(BUDGET_PATH, 'utf8'));
    const report = analyzeExport(exportDir, budget);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.passed) process.exitCode = 1;
  } finally {
    if (!suppliedExportDir && isOwnedTempDirectory(exportDir)) {
      rmSync(exportDir, { recursive: true, force: true });
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}

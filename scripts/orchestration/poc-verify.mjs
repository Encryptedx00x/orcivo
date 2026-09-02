// poc-verify.mjs — deterministic check for the disposable POC artifact.
// Runs with cwd = the run's worktree. Exit 0 = PASS.
import { readFileSync, existsSync } from 'node:fs';

const file = 'poc/poc-artifact.md';
if (!existsSync(file)) {
  console.error(`FAIL: ${file} missing`);
  process.exit(1);
}
const body = readFileSync(file, 'utf8');
const required = ['## Intro', '## Body', '## Conclusion'];
const missing = required.filter((h) => !body.includes(h));
if (missing.length) {
  console.error(`FAIL: missing sections: ${missing.join(', ')}`);
  process.exit(1);
}
if (body.trim().length < 60) {
  console.error('FAIL: artifact too short');
  process.exit(1);
}
console.log('PASS: poc-artifact.md has Intro + Body + Conclusion');
process.exit(0);

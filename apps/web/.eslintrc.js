const path = require('path');

/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['next/core-web-vitals'],
  parserOptions: {
    project: path.join(__dirname, 'tsconfig.json'),
    tsconfigRootDir: __dirname,
  },
  // Standalone node:test scripts, not Next.js app code - their sandboxed
  // `const module = { exports: {} }` isn't the webpack module Next.js's
  // no-assign-module-variable rule protects.
  ignorePatterns: ['**/*.browser.test.cjs'],
};

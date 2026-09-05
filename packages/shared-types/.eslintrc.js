const path = require('path');

/** @type {import('eslint').Linter.Config} */
module.exports = {
  ignorePatterns: ['.eslintrc.js', 'dist/', 'node_modules/'],
  extends: ['../../.eslintrc.js', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    // Absolute so it resolves whether eslint runs from here or the repo root (lint-staged).
    project: path.join(__dirname, 'tsconfig.json'),
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'warn',
  },
};

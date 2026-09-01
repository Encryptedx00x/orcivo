const path = require('path');

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  ignorePatterns: ['.eslintrc.js', 'dist/', 'node_modules/', 'coverage/'],
  extends: ['../../.eslintrc.js', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    // Absolute so it resolves whether eslint runs from here or the repo root (lint-staged).
    project: path.join(__dirname, 'tsconfig.eslint.json'),
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'warn',
  },
  overrides: [
    {
      files: ['**/*.spec.ts', 'test/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};

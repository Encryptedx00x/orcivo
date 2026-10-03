const path = require('path');

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  ignorePatterns: [
    '.eslintrc.js',
    'dist/',
    'node_modules/',
    'babel.config.js',
    'metro.config.js',
    'app.config.js',
  ],
  extends: ['../../.eslintrc.js', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    // Absolute so lint-staged resolves it from the repo root too.
    project: path.join(__dirname, 'tsconfig.json'),
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'warn',
  },
};

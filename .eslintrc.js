/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  ignorePatterns: ['dist/', '.next/', 'build/', 'node_modules/'],
  rules: {
    'no-console': 'warn',
  },
};

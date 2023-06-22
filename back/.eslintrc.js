module.exports = {
  root: true,
  ignorePatterns: ['dist', 'node_modules', '.eslintrc.js', 'yarn.lock'],
  rules: {
    'no-var': 1,
    'no-unused-vars': 1,
    camelcase: 1,
    'arrow-body-style': 1,
    semi: [2, 'always'],
    'prettier/prettier': ['error', { endOfLine: 'auto' }],
    'no-console': ['warn'],
    'no-var': 'error',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
      },
    ],
    'import/order': [
      'error',
      {
        'newlines-between': 'always-and-inside-groups',
        groups: [['builtin', 'external']],
      },
    ],
  },
  env: {
    commonjs: true,
    browser: true,
    es6: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  plugins: ['prettier', 'babel'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 11,
    sourceType: 'module',
    project: __dirname + '/tsconfig.json',
  },
};

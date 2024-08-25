import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin';
import tsEslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tsEslint.configs.recommended,
  {
    files: ['**/*.ts'],
    ignores: ['dist', 'node_modules'],
    plugins: { typescriptEslint: typescriptEslintPlugin, prettier: prettierPlugin },
    rules: {
      ...prettierPlugin.configs.rules,
      ...typescriptEslintPlugin.configs.rules,
      'no-console': 1,
      'typescriptEslint/no-unused-vars': 1,
      camelcase: 1,
      'arrow-body-style': 1,
      semi: [2, 'always'],
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
    languageOptions: {
      globals: {
        commonjs: true,
        browser: true,
        es6: true,
        jest: true,
      },
      parserOptions: {
        requireConfigFile: false,
        ecmaVersion: 12,
        sourceType: 'module',
      },
    },
  },
];

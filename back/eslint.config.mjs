import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    ignores: ['dist', 'db', '**/*.js'],
    plugins: { typescriptEslint: typescriptEslintPlugin, prettier: prettierPlugin },
    rules: {
      ...prettierPlugin.configs.rules,
      ...typescriptEslintPlugin.configs.rules,
      'no-console': 1,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
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
      },
      parserOptions: {
        requireConfigFile: false,
        ecmaVersion: 12,
        sourceType: 'module',
      },
    },
  },
];

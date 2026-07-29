import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import queryPlugin from '@tanstack/eslint-plugin-query'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import sortDestructureKeys from 'eslint-plugin-sort-destructure-keys'
import tailwind from 'eslint-plugin-tailwindcss'
import globals from 'globals'

export default [
  {
    ignores: ['dist'],
  },
  js.configs.recommended,
  react.configs.flat.recommended,
  {
    ...react.configs.flat['jsx-runtime'],
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.recommended,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': 'error',
    },
  },
  {
    plugins: {
      'sort-destructure-keys': sortDestructureKeys,
    },
    rules: {
      'sort-destructure-keys/sort-destructure-keys': 'error',
    },
  },
  ...tailwind.configs['flat/recommended'],
  ...queryPlugin.configs['flat/recommended'],
  eslintConfigPrettier, // Disable any rules that conflict with prettier
  eslintPluginPrettierRecommended,
  {
    files: ['*.{js,ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['*.config.{mjs,ts}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      eqeqeq: 'error',
      indent: ['error', 2],
      'space-infix-ops': ['error', { int32Hint: false }],
    },
  },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      sourceType: 'module',
    },
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/brace-style': 'error',
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/keyword-spacing': 'error',
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1 }],
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/space-in-parens': 'error',
      '@stylistic/space-infix-ops': ['error', { int32Hint: false }],
      '@stylistic/type-annotation-spacing': [
        'error',
        {
          after: true,
          before: true,
          overrides: {
            colon: {
              before: false,
            },
          },
        },
      ],
      eqeqeq: 'warn',
      'max-depth': ['error', { max: 5 }],
      'max-len': ['warn', { code: 120 }],
      'max-lines': [
        'error',
        { max: 2000, skipBlankLines: true, skipComments: true },
      ],
      'max-lines-per-function': ['warn', { max: 500 }],
      'no-constant-condition': 'warn',
      'no-loss-of-precision': 'error',
      'no-undef': 'warn',
      'no-unused-vars': 'off', // @typescript-eslint/no-unused-vars
      'space-infix-ops': 'off', // @stylistic/space-infix-ops
    },
  },
  {
    files: ['*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: 'tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/no-duplicate-enum-values': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/no-mixed-enums': 'error',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-type-alias': [
        'error',
        {
          allowAliases: 'always',
          allowCallbacks: 'always',
          allowConditionalTypes: 'never',
          allowConstructors: 'never',
          allowGenerics: 'always',
          allowLiterals: 'always',
          allowMappedTypes: 'never',
          allowTupleTypes: 'always',
        },
      ],
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/prefer-for-of': 'warn',
      '@typescript-eslint/prefer-function-type': 'error',
      '@typescript-eslint/prefer-includes': 'error',
      '@typescript-eslint/prefer-literal-enum-member': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
    },
  },
  {
    // Reduce existing errors to warnings
    plugins: {
      '@tanstack/query': queryPlugin,
    },
    rules: {
      '@tanstack/query/exhaustive-deps': 'warn',
      'no-case-declarations': 'warn',
      'no-empty': 'warn',
      'no-redeclare': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-refresh/only-export-components': 'warn',
      'react/jsx-no-undef': 'warn',
      'react/no-unescaped-entities': 'warn',
      'react/prop-types': 'warn',
    },
  },
]

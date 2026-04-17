// @ts-check
import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      parserOptions: {
        project: ['packages/ui/tsconfig.*?.json'],
      },
    },
  },
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: ['{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}'],
          ignoredDependencies: [
            '@analogjs/vite-plugin-angular',
            '@analogjs/vitest-angular',
            '@angular/compiler',
            '@nx/vite',
            '@testing-library/angular',
            '@testing-library/jest-dom',
            'vite',
            'vitest',
          ],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  {
    files: ['**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      // Override: Angular v22+ defaults to OnPush
      '@angular-eslint/prefer-on-push-component-change-detection': 'off',
    },
  },
  {
    files: ['**/*.html'],
    rules: {
      '@angular-eslint/template/cyclomatic-complexity': ['error', {maxComplexity: 10}],
    },
  },
  {
    files: ['**/*.ts'],
    ignores: ['**/*.spec.ts', '**/atoms/**'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'terse',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'terse',
          style: 'kebab-case',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          'selector':
            "ClassDeclaration > Decorator[expression.callee.name='Directive'] > CallExpression > ObjectExpression:not(:has(Property[key.name='exportAs']))",
          'message':
            "Terse directives must include an 'exportAs' property for template accessibility.",
        },
      ],
    },
  },
];

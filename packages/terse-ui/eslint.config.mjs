// @ts-check
import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      parserOptions: {
        project: ['packages/terse-ui/tsconfig.*?.json'],
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
    rules: {
      // TypeScript strict overrides for library code
      '@typescript-eslint/explicit-member-accessibility': ['error', {accessibility: 'no-public'}],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',

      // Relax rules that conflict with Angular patterns
      '@typescript-eslint/no-extraneous-class': 'off', // Angular services/components are classes
      '@typescript-eslint/unbound-method': 'off', // Angular template bindings

      // Misc
      'no-console': 'error',
      '@typescript-eslint/prefer-readonly': 'error',

      '@angular-eslint/component-selector': 'off',
      // Library authors rename inputs/outputs for public API
      '@angular-eslint/no-input-rename': 'off',
      '@angular-eslint/no-output-rename': 'off',

      // Enforce modern Angular patterns
      '@angular-eslint/prefer-standalone': 'error',
      '@angular-eslint/prefer-on-push-component-change-detection': 'off', // v22 uses OnPush by default
      '@angular-eslint/no-host-metadata-property': 'off', // we use host bindings intentionally
      '@angular-eslint/prefer-output-readonly': 'error',
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/no-uncalled-signals': 'error',
    },
  },
  {
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@angular-eslint/component-selector': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['**/*.html'],
    rules: {
      '@angular-eslint/template/attributes-order': [
        'warn',
        {
          alphabetical: true,
          order: [
            'STRUCTURAL_DIRECTIVE',
            'TEMPLATE_REFERENCE',
            'ATTRIBUTE_BINDING',
            'INPUT_BINDING',
            'TWO_WAY_BINDING',
            'OUTPUT_BINDING',
          ],
        },
      ],

      '@angular-eslint/template/button-has-type': 'off',
      '@angular-eslint/template/cyclomatic-complexity': ['error', {maxComplexity: 10}],
      '@angular-eslint/template/eqeqeq': 'error',
      '@angular-eslint/template/no-duplicate-attributes': 'error',
      '@angular-eslint/template/no-negated-async': 'error',
      '@angular-eslint/template/no-interpolation-in-attributes': 'error',
      '@angular-eslint/template/prefer-control-flow': 'error',
      '@angular-eslint/template/prefer-ngsrc': 'error',
      '@angular-eslint/template/prefer-self-closing-tags': 'error',
      '@angular-eslint/template/use-track-by-function': 'error',
      '@angular-eslint/template/label-has-associated-control': 'off',
    },
  },
  {
    files: ['**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
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
  {
    files: ['**/terse-*.ts'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-declaration-merging': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
    },
  },
  {
    ignores: ['**/*.spec.ts'],
    rules: {
      '@angular-eslint/directive-selector': ['off'],
      '@angular-eslint/component-selector': ['off'],
    },
  },
];

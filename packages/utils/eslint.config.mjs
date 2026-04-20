// @ts-check
import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      parserOptions: {
        project: ['packages/utils/tsconfig.*?.json'],
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
            'axe-core',
          ],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
];

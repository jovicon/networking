import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
    '**/.turbo/**',
    '**/coverage/**',
    'labs/**',
    'apps/**', // apps/web ships its own eslint.config.mjs (Next.js rules)
  ]),
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    files: ['packages/**/*.ts'],
    rules: {
      // permite parámetros con prefijo _ para firmas de método pensadas para
      // ser sobreescritas (ej. Device.receive(packet, _inPortId) — la base
      // no lo usa, Switch sí lo necesita en su override)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // packages/core es dominio puro: nunca debe importar de apps/* ni frameworks de UI
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/apps/*', '**/apps/**'],
              message: 'packages/* no puede importar de apps/*.',
            },
            {
              group: ['next', 'next/*', 'react', 'react-dom'],
              message: 'packages/core es dominio puro, sin dependencias de UI/framework.',
            },
          ],
        },
      ],
    },
  },
]);

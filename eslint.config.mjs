import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import next from '@next/eslint-plugin-next';
import hooks from 'eslint-plugin-react-hooks';
import a11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  { plugins: { '@next/next': next }, rules: { '@next/next/no-sync-scripts': 'error' } },
  { ignores: ['.next/**', 'node_modules/**', 'public/**', 'drizzle/**', 'next-env.d.ts', 'test-results/**'] },
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.ts'],
    plugins: { 'react-hooks': hooks, 'jsx-a11y': a11y },
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    rules: {
      // TypeScript checks identifiers and types; unused legacy declarations are cleaned separately.
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'jsx-a11y/alt-text': 'warn',
    },
  },
);

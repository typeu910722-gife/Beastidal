import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/vendor/**', 'node_modules/**', 'dist/lake-data.js', 'shots/**'] },
  js.configs.recommended,
  {
    files: ['dist/**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.browser, google: 'readonly' } },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
      'no-cond-assign': ['error', 'except-parens']
    }
  },
  {
    files: ['dist/sw.js'],
    languageOptions: { globals: { ...globals.serviceworker } }
  },
  {
    files: ['tests/**/*.mjs', 'server.mjs', 'eslint.config.js', 'scripts/**/*.mjs'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-unused-vars': ['warn', { args: 'none' }] }
  }
];

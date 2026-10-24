import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import { reactRefresh } from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite()],
  },
  {
    // shadcn/ui 產生的元件會同時匯出元件與 variants
    files: ['src/components/ui/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // 分層規則（PRD §8.3）：domain 只放純 TypeScript
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(react|react-dom)(/.*)?$',
              message: 'domain 模組不可 import React。',
            },
            {
              regex: '^dexie(-.*)?(/.*)?$',
              message: 'domain 模組不可 import Dexie。',
            },
            {
              regex: '(^@/features|/features)(/|$)',
              message: 'domain 模組不可 import feature 模組。',
            },
          ],
        },
      ],
    },
  },
  prettier,
)

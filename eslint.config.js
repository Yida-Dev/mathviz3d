import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

// ESLint v9+ 采用 Flat Config（eslint.config.js）
// 目标：让 `npm run lint` 在本项目可用，规则保持“够用且不过度折腾”的默认推荐集
export default tseslint.config(
  {
    ignores: [
      '.claude/**',
      '.cursor/**',
      '.trellis/**',
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'prompts/**',
      'docs/**',
      'requirement/**',
      'src/**/*.d.ts',
      '**/*.d.ts',
      '**/*.tsbuildinfo',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // 项目当前阶段允许使用 any（尤其是 tests/ 与脚手架代码），避免 lint 变成阻塞项
      '@typescript-eslint/no-explicit-any': 'off',
      // 与 TS 的 noUnused* 配合：允许用 `_xxx` 显式标记“故意未使用”
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  }
)

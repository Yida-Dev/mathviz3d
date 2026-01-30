import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      // 说明：
      // - 纯类型模块（types/validation）在 v8 覆盖率下会被当作“未覆盖文件”计入分母，
      //   但它们没有可执行逻辑，纳入覆盖率并无意义，因此排除。
      // - 渲染层（Three.js/WebGL）主要依赖 E2E/视觉回归来保障正确性，单元测试环境无法稳定提供 WebGL，
      //   因此暂时排除 renderer 与其 React 包装组件。
      exclude: [
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/core/types.ts',
        'src/core/validation.ts',
        'src/core/timeline.ts',
        'src/core/element-registry.ts',
        'src/core/scene-state.ts',
        'src/core/renderer.ts',
        'src/components/**',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

// 需要在 mock 工厂里共享一个稳定对象：用 vi.hoisted 避免 hoist 后变量未定义
const MOCK_SEMANTIC = vi.hoisted(() => ({
  problemId: 'mock-001',
  problemText: 'mock',
  baseGeometry: { type: 'cube', size: 1 },
  points: [],
  question: 'mock',
}))

vi.mock('@/services/ai-pipeline', () => {
  return {
    runAiPipeline: async (_file: File, onProgress?: (p: any) => void) => {
      onProgress?.({ stage: 'understand', progress: 0, message: '...' })
      onProgress?.({ stage: 'understood', progress: 33, message: 'ok', semantic: MOCK_SEMANTIC })
      onProgress?.({ stage: 'plan', progress: 33, message: 'planning' })
      throw new Error('Planner JSON 解析失败')
    },
  }
})

import { usePipelineStore } from '@/stores/pipeline-store'

describe('pipeline-store（渐进式渲染/错误保留 semantic）', () => {
  beforeEach(() => {
    usePipelineStore.getState().reset()
  })

  it('Planner 失败时也应保留 Understander 的 semantic（交互模式可用）', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'mock.png', { type: 'image/png' })
    await usePipelineStore.getState().run(file)

    const st = usePipelineStore.getState().state
    expect(st.status).toBe('error')
    if (st.status !== 'error') return

    expect(st.semantic?.problemId).toBe('mock-001')

    // 关闭错误不应丢失 semantic
    usePipelineStore.getState().dismissError()
    const next = usePipelineStore.getState().state
    expect(next.status).toBe('understood')
    if (next.status !== 'understood') return
    expect(next.semantic.problemId).toBe('mock-001')
  })
})


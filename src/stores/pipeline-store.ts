import { create } from 'zustand'

import type { SemanticDefinition } from '@/core/types'
import type { AiPipelineResult } from '@/services/ai-types'
import { runAiPipeline } from '@/services/ai-pipeline'

export type PipelineState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'understanding'; progress: number; message: string }
  | { status: 'understood'; semantic: SemanticDefinition; message: string }
  | { status: 'planning'; semantic: SemanticDefinition; progress: number; message: string }
  | { status: 'coding'; semantic: SemanticDefinition; progress: number; message: string; retry?: number }
  | { status: 'validating'; semantic: SemanticDefinition; message: string }
  | { status: 'success'; result: AiPipelineResult }
  | { status: 'error'; message: string; retryable: boolean; semantic?: SemanticDefinition }

interface PipelineStoreState {
  state: PipelineState
  lastFile: File | null
  activeRunId: number

  run: (file: File) => Promise<void>
  retry: () => Promise<void>
  reset: () => void
  dismissError: () => void
}

export const usePipelineStore = create<PipelineStoreState>((set, get) => ({
  state: { status: 'idle' },
  lastFile: null,
  activeRunId: 0,

  reset: () => set({ state: { status: 'idle' }, lastFile: null, activeRunId: get().activeRunId + 1 }),

  dismissError: () => {
    const st = get().state
    if (st.status !== 'error') return
    if (st.semantic) {
      // 保留 Understander 结果，让交互模式继续可用
      set({ state: { status: 'understood', semantic: st.semantic, message: '题目分析完成（讲解生成失败，可重试）' } })
      return
    }
    // 没有 semantic 的错误只能回到 idle
    set({ state: { status: 'idle' } })
  },

  retry: async () => {
    const file = get().lastFile
    if (!file) {
      set({ state: { status: 'error', message: '没有可重试的文件，请重新上传。', retryable: false } })
      return
    }
    await get().run(file)
  },

  run: async (file: File) => {
    // 多次上传/重试可能并发触发：用 runId 防止旧请求回写覆盖新结果
    const runId = get().activeRunId + 1
    set({ activeRunId: runId, lastFile: file, state: { status: 'uploading' } })
    let semantic: SemanticDefinition | null = null
    try {
      const result = await runAiPipeline(file, (p) => {
        if (get().activeRunId !== runId) return
        switch (p.stage) {
          case 'understand':
            set({ state: { status: 'understanding', progress: p.progress, message: p.message } })
            return
          case 'understood':
            semantic = p.semantic
            set({ state: { status: 'understood', semantic: p.semantic, message: p.message } })
            return
          case 'plan': {
            const s = semantic ?? extractSemantic(get().state)
            if (!s) return
            set({ state: { status: 'planning', semantic: s, progress: p.progress, message: p.message } })
            return
          }
          case 'code': {
            const s = semantic ?? extractSemantic(get().state)
            if (!s) return
            set({ state: { status: 'coding', semantic: s, progress: p.progress, message: p.message, retry: p.retry } })
            return
          }
          case 'validate': {
            const s = semantic ?? extractSemantic(get().state)
            if (!s) return
            set({ state: { status: 'validating', semantic: s, message: p.message } })
            return
          }
          default:
            return
        }
      })
      if (get().activeRunId !== runId) return
      set({ state: { status: 'success', result } })
    } catch (err) {
      if (get().activeRunId !== runId) return
      const message = err instanceof Error ? err.message : String(err)
      // MVP：除“未配置”外默认可重试
      const retryable = !message.includes('请先在设置中配置')
      const s = semantic ?? extractSemantic(get().state)
      set({ state: { status: 'error', message, retryable, semantic: s ?? undefined } })
    }
  },
}))

function extractSemantic(state: PipelineState): SemanticDefinition | null {
  switch (state.status) {
    case 'understood':
    case 'planning':
    case 'coding':
    case 'validating':
      return state.semantic
    case 'success':
      return state.result.semantic
    case 'error':
      return state.semantic ?? null
    default:
      return null
  }
}

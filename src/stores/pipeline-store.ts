import { create } from 'zustand'

import type { AiPipelineResult } from '@/services/ai-types'
import { runAiPipeline } from '@/services/ai-pipeline'

export type PipelineState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'understanding'; progress: number; message: string }
  | { status: 'planning'; progress: number; message: string }
  | { status: 'coding'; progress: number; message: string; retry?: number }
  | { status: 'validating'; message: string }
  | { status: 'success'; result: AiPipelineResult }
  | { status: 'error'; message: string; retryable: boolean }

interface PipelineStoreState {
  state: PipelineState
  lastFile: File | null

  run: (file: File) => Promise<void>
  retry: () => Promise<void>
  reset: () => void
}

export const usePipelineStore = create<PipelineStoreState>((set, get) => ({
  state: { status: 'idle' },
  lastFile: null,

  reset: () => set({ state: { status: 'idle' }, lastFile: null }),

  retry: async () => {
    const file = get().lastFile
    if (!file) {
      set({ state: { status: 'error', message: '没有可重试的文件，请重新上传。', retryable: false } })
      return
    }
    await get().run(file)
  },

  run: async (file: File) => {
    set({ lastFile: file, state: { status: 'uploading' } })
    try {
      const result = await runAiPipeline(file, (p) => {
        switch (p.stage) {
          case 'understand':
            set({ state: { status: 'understanding', progress: p.progress, message: p.message } })
            return
          case 'plan':
            set({ state: { status: 'planning', progress: p.progress, message: p.message } })
            return
          case 'code':
            set({ state: { status: 'coding', progress: p.progress, message: p.message, retry: p.retry } })
            return
          case 'validate':
            set({ state: { status: 'validating', message: p.message } })
            return
          default:
            return
        }
      })
      set({ state: { status: 'success', result } })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      // MVP：除“未配置”外默认可重试
      const retryable = !message.includes('请先在设置中配置')
      set({ state: { status: 'error', message, retryable } })
    }
  },
}))


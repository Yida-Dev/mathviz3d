import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface AiConfig {
  apiKey: string
  baseUrl: string
  model: string
}

interface AiConfigStoreState extends AiConfig {
  dialogOpen: boolean

  setConfig: (config: Partial<AiConfig>) => void
  reset: () => void

  openDialog: () => void
  closeDialog: () => void
}

const STORAGE_KEY = 'ai-config'

export function isAiConfigured(state: AiConfig): boolean {
  return Boolean(state.apiKey.trim() && state.baseUrl.trim() && state.model.trim())
}

export const useAiConfigStore = create<AiConfigStoreState>()(
  persist(
    (set) => ({
      apiKey: '',
      baseUrl: '',
      model: '',
      dialogOpen: false,

      setConfig: (config) => set((prev) => ({ ...prev, ...config })),
      reset: () => set({ apiKey: '', baseUrl: '', model: '' }),

      openDialog: () => set({ dialogOpen: true }),
      closeDialog: () => set({ dialogOpen: false }),
    }),
    {
      name: STORAGE_KEY,
      // 仅持久化配置字段；dialogOpen 属于 UI 状态，不应跨刷新保留
      partialize: (state) => ({ apiKey: state.apiKey, baseUrl: state.baseUrl, model: state.model }),
      storage: createJSONStorage(() => createSafeStorage()),
    },
  ),
)

const NOOP_STORAGE: Storage = {
  get length() {
    return 0
  },
  clear() {
    // noop
  },
  getItem() {
    return null
  },
  key() {
    return null
  },
  removeItem() {
    // noop
  },
  setItem() {
    // noop
  },
}

function createSafeStorage(): Storage {
  if (typeof window === 'undefined') return NOOP_STORAGE
  let base: Storage
  try {
    base = window.localStorage
  } catch {
    return NOOP_STORAGE
  }

  // localStorage 在某些隐私/沙箱环境下可能对 setItem/removeItem 抛异常；这里统一兜底避免白屏
  return {
    get length() {
      try {
        return base.length
      } catch {
        return 0
      }
    },
    clear() {
      try {
        base.clear()
      } catch {
        // ignore
      }
    },
    getItem(key: string) {
      try {
        return base.getItem(key)
      } catch {
        return null
      }
    },
    key(index: number) {
      try {
        return base.key(index)
      } catch {
        return null
      }
    },
    removeItem(key: string) {
      try {
        base.removeItem(key)
      } catch {
        // ignore
      }
    },
    setItem(key: string, value: string) {
      try {
        base.setItem(key, value)
      } catch {
        // ignore
      }
    },
  }
}

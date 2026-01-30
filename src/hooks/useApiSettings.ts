import { useMemo, useState } from 'react'

export interface ApiSettingsDraft {
  baseUrl: string
  apiKey: string
}

const STORAGE_BASE_URL = 'mathviz:apiBaseUrl'
const STORAGE_API_KEY = 'mathviz:apiKey'
const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

export function useApiSettings() {
  const [draft, setDraft] = useState<ApiSettingsDraft>(() => loadDraft())

  const hasApiKey = useMemo(() => Boolean(draft.apiKey && draft.apiKey.trim().length > 0), [draft.apiKey])

  const save = () => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_BASE_URL, draft.baseUrl)
    window.localStorage.setItem(STORAGE_API_KEY, draft.apiKey)
  }

  const resetToDefault = () => {
    const next: ApiSettingsDraft = { baseUrl: DEFAULT_BASE_URL, apiKey: '' }
    setDraft(next)
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(STORAGE_BASE_URL)
    window.localStorage.removeItem(STORAGE_API_KEY)
  }

  return { draft, setDraft, hasApiKey, save, resetToDefault, defaults: { baseUrl: DEFAULT_BASE_URL } }
}

function loadDraft(): ApiSettingsDraft {
  if (typeof window === 'undefined') {
    return { baseUrl: DEFAULT_BASE_URL, apiKey: '' }
  }
  const baseUrl = window.localStorage.getItem(STORAGE_BASE_URL) ?? DEFAULT_BASE_URL
  const apiKey = window.localStorage.getItem(STORAGE_API_KEY) ?? ''
  return { baseUrl, apiKey }
}


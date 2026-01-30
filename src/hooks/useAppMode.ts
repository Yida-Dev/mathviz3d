import { useEffect, useState } from 'react'

export type AppMode = 'interactive' | 'video'

const STORAGE_KEY = 'mathviz:mode'

export function useAppMode(initial?: AppMode) {
  const [mode, setMode] = useState<AppMode>(() => {
    if (initial) return initial
    if (typeof window === 'undefined') return 'interactive'
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved === 'video' ? 'video' : 'interactive'
  })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  return {
    mode,
    setMode,
    setInteractive: () => setMode('interactive'),
    setVideo: () => setMode('video'),
  }
}


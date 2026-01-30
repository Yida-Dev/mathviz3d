import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { SceneState } from '@/core/scene-state'
import type { Timeline } from '@/core/timeline'
import type { Player } from '@/core/player'

export function usePlayer(timeline: Timeline | null, player: Player | null, playbackRate: number = 1) {
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)

  const duration = timeline?.duration ?? 0

  useEffect(() => {
    // 当 timeline 变化时，重置播放头（避免沿用旧时间导致越界）
    setCurrentTime(0)
    setIsPlaying(false)
  }, [timeline])

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTsRef.current = null
      return
    }

    if (!timeline || !player) return

    const tick = (ts: number) => {
      const last = lastTsRef.current
      lastTsRef.current = ts

      if (last != null) {
        const rate = Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1
        const deltaSec = ((ts - last) / 1000) * rate
        setCurrentTime((prev) => {
          const next = clamp(prev + deltaSec, 0, timeline.duration)
          if (next >= timeline.duration) {
            // 到末尾自动暂停
            setIsPlaying(false)
          }
          return next
        })
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTsRef.current = null
    }
  }, [isPlaying, timeline, player, playbackRate])

  const seek = useCallback((time: number) => {
    const next = clamp(time, 0, duration)
    setCurrentTime(next)
  }, [duration])

  const play = useCallback(() => {
    if (duration <= 0) return
    setIsPlaying(true)
  }, [duration])
  const pause = useCallback(() => setIsPlaying(false), [])

  const state: SceneState | null = useMemo(() => {
    if (!timeline || !player) return null
    return player.getState(timeline, currentTime)
  }, [timeline, player, currentTime])

  return {
    state,
    currentTime,
    duration,
    isPlaying,
    play,
    pause,
    seek,
    setCurrentTime, // 预留给更复杂的 UI（比如拖拽时不走 clamp）
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

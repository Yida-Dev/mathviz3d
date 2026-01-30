import { Slider } from '@/components/ui/Slider'
import { cn } from '@/utils/cn'

export interface PlayControlsProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  onPlay: () => void
  onPause: () => void
  onSeek: (time: number) => void
  onPrev?: () => void
  onNext?: () => void
  markers?: number[] // 关键帧（秒）
  playbackRate?: number
  onChangePlaybackRate?: (rate: number) => void
}

export function PlayControls(props: PlayControlsProps) {
  const { isPlaying, currentTime, duration, onPlay, onPause, onSeek, onPrev, onNext, markers, playbackRate = 1, onChangePlaybackRate } =
    props

  const canPlay = duration > 0

  return (
    <div className="w-full flex items-center gap-4">
      <div className="flex items-center gap-2">
        <IconButton icon="ph-skip-back" onClick={onPrev} disabled={!onPrev} ariaLabel="上一步" />

        <button
          type="button"
          className={cn(
            'h-12 w-12 rounded-full bg-primary-600 text-white inline-flex items-center justify-center',
            'shadow-lg shadow-blue-200/50 hover:bg-primary-700 transition',
            !canPlay && 'opacity-50 cursor-not-allowed hover:bg-primary-600',
          )}
          onClick={() => (isPlaying ? onPause() : onPlay())}
          disabled={!canPlay}
          aria-label={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? (
            <i className="ph-fill ph-pause text-xl" aria-hidden />
          ) : (
            <i className="ph-fill ph-play text-xl ml-0.5" aria-hidden />
          )}
        </button>

        <IconButton icon="ph-skip-forward" onClick={onNext} disabled={!onNext} ariaLabel="下一步" />
      </div>

      <div className="flex-1 flex items-center gap-3">
        <div className="text-xs font-mono font-bold text-primary-600 w-12 text-right">{formatTime(currentTime)}</div>
        <div className="flex-1">
          <div className="relative h-10 flex items-center">
            {/* 关键帧标记：场景分割点 */}
            {canPlay &&
              (markers ?? [])
                .filter((t) => Number.isFinite(t) && t > 0 && t < duration)
                .map((t, idx) => {
                  const left = (t / duration) * 100
                  return (
                    <span
                      key={`${t}-${idx}`}
                      data-testid="timeline-marker"
                      className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-primary-600"
                      style={{ left: `${left}%` }}
                      aria-hidden
                    />
                  )
                })}

            <div className="w-full">
              <Slider
                min={0}
                max={Math.max(0, duration)}
                step={0.01}
                value={clamp(currentTime, 0, duration)}
                onChange={(v) => onSeek(v)}
                color="primary"
                aria-label="播放进度"
              />
            </div>
          </div>
        </div>
        <div className="text-xs font-mono text-slate-500 w-12">{formatTime(duration)}</div>
        {onChangePlaybackRate && (
          <select
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs font-mono text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-600/10 focus:border-primary-600"
            value={String(playbackRate)}
            onChange={(e) => onChangePlaybackRate(Number(e.target.value))}
            aria-label="播放速度"
          >
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
        )}
      </div>
    </div>
  )
}

function IconButton(props: { icon: string; onClick?: () => void; disabled?: boolean; ariaLabel: string }) {
  const { icon, onClick, disabled, ariaLabel } = props
  return (
    <button
      type="button"
      className={cn(
        'h-8 w-8 rounded-full inline-flex items-center justify-center text-slate-500 hover:text-slate-900 transition',
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100',
      )}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      <i className={cn('ph-bold', icon)} aria-hidden />
    </button>
  )
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00'
  const s = Math.floor(sec)
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

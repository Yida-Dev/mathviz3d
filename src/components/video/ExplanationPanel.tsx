import { cn } from '@/utils/cn'

export interface ExplanationStep {
  id: string
  title: string
  timeLabel?: string
}

export function ExplanationPanel(props: { steps: ExplanationStep[]; currentId: string | null }) {
  const { steps, currentId } = props

  if (steps.length === 0) {
    return <div className="text-sm text-slate-500">暂无讲解大纲。</div>
  }

  return (
    <div className="space-y-3">
      {steps.map((s, idx) => {
        const active = currentId === s.id
        return (
          <div
            key={s.id}
            className={cn(
              'relative bg-white border border-slate-200 rounded-lg p-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition',
              active ? 'border-primary-600/30' : 'opacity-80 hover:opacity-100 hover:border-primary-600/30',
            )}
          >
            {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-600 rounded-l-lg" />}
            <div className="flex items-start justify-between gap-3 pl-2">
              <div className="min-w-0">
                <div className={cn('text-xs font-bold', active ? 'text-primary-600' : 'text-slate-900')}>
                  Step {idx + 1}: {s.title}
                </div>
                {s.timeLabel && <div className="mt-1 text-[10px] text-slate-500 font-mono">{s.timeLabel}</div>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}


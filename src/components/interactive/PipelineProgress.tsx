import { usePipelineStore } from '@/stores/pipeline-store'

export function PipelineProgress() {
  const state = usePipelineStore((s) => s.state)

  if (state.status === 'idle' || state.status === 'success' || state.status === 'error') return null

  const { title, percent, detail } = mapProgress(state)

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3" data-testid="pipeline-progress">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-slate-900">{title}</div>
        {typeof percent === 'number' && <div className="text-xs text-slate-500">{Math.round(percent)}%</div>}
      </div>

      {detail && <div className="mt-1 text-xs text-slate-600">{detail}</div>}

      <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full bg-primary-600 transition-all"
          style={{ width: `${clampPercent(percent ?? (state.status === 'uploading' ? 5 : 15))}%` }}
        />
      </div>
    </div>
  )
}

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 100) return 100
  return n
}

function mapProgress(
  state: ReturnType<typeof usePipelineStore.getState>['state'],
): { title: string; percent?: number; detail?: string } {
  switch (state.status) {
    case 'uploading':
      return { title: '已接收图片', percent: 5, detail: '准备开始分析...' }
    case 'understanding':
      return { title: '读题中', percent: state.progress, detail: state.message }
    case 'understood':
      return { title: '已完成读题', percent: 33, detail: state.message }
    case 'planning':
      return { title: '规划讲解', percent: state.progress, detail: state.message }
    case 'coding':
      return {
        title: state.retry != null ? `生成动画（重试 ${state.retry + 1}）` : '生成动画',
        percent: state.progress,
        detail: state.message,
      }
    case 'validating':
      return { title: '校验脚本', percent: 90, detail: state.message }
    default:
      return { title: '处理中' }
  }
}

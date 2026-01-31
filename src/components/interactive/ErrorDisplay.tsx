import { Button } from '@/components/ui/Button'
import { usePipelineStore } from '@/stores/pipeline-store'

export function ErrorDisplay() {
  const state = usePipelineStore((s) => s.state)
  const retry = usePipelineStore((s) => s.retry)
  const reset = usePipelineStore((s) => s.reset)

  if (state.status !== 'error') return null

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" data-testid="pipeline-error">
      <div className="flex items-start gap-2">
        <i className="ph-fill ph-warning-circle text-red-600 mt-0.5" aria-hidden />
        <div className="min-w-0">
          <div className="font-bold">解析失败</div>
          <div className="mt-1 break-words">{state.message}</div>
          <div className="mt-3 flex items-center gap-2">
            {state.retryable && (
              <Button variant="primary" size="sm" onClick={() => retry()}>
                重试
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => reset()}>
              关闭
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


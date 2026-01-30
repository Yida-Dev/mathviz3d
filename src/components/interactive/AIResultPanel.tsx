import type { SemanticDefinition } from '@/core/types'

export function AIResultPanel(props: { semantic: SemanticDefinition }) {
  const { semantic } = props
  const geom = semantic.baseGeometry.type
  const points = semantic.points.map((p) => p.id)
  const params = (semantic.params ?? []).map((p) => p.id)
  const measurements = (semantic.measurements ?? []).map((m) => m.id)

  return (
    <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-4" data-testid="ai-result-panel">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <i className="ph-duotone ph-magic-wand text-primary-600 text-lg" aria-hidden />
          <div className="text-sm font-bold text-slate-900">AI 识别结果</div>
        </div>
      </div>

      <ul className="text-xs text-slate-700 space-y-1">
        <li>
          <span className="font-semibold">几何体：</span>
          {geom}
        </li>
        <li>
          <span className="font-semibold">点：</span>
          {points.join('、') || '（无）'}
        </li>
        <li>
          <span className="font-semibold">参数：</span>
          {params.join('、') || '（无）'}
        </li>
        <li>
          <span className="font-semibold">测量：</span>
          {measurements.join('、') || '（无）'}
        </li>
      </ul>
    </div>
  )
}

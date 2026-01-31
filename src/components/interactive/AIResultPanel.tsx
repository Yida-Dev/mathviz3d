import type { SemanticDefinition } from '@/core/types'

export function AIResultPanel(props: { semantic: SemanticDefinition }) {
  const { semantic } = props
  const geom = semantic.baseGeometry.type
  const points = semantic.points.map((p) => p.id)
  const params = (semantic.params ?? []).map((p) => p.id)
  const measurements = (semantic.measurements ?? []).map((m) => m.id)
  const choices = semantic.choices ?? []
  const hasChoices = choices.length > 0

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
          {hasChoices && measurements.length === 0 ? '（选择题，见下方选项）' : measurements.join('、') || '（无）'}
        </li>
      </ul>

      {hasChoices && (
        <div className="mt-3 pt-3 border-t border-blue-100">
          <div className="text-xs font-semibold text-slate-900 mb-2">选项</div>
          <ul className="text-xs text-slate-700 space-y-1.5">
            {choices.map((choice) => (
              <li key={choice.label} className="flex items-start gap-2">
                <span className="font-semibold shrink-0">{choice.label}.</span>
                <span className="flex-1">{choice.text}</span>
                <span
                  className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] ${
                    choice.verifiable ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {choice.verifiable ? '可验证' : '暂不支持'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-blue-100">
        <div className="text-xs font-semibold text-slate-900 mb-1">原题干</div>
        <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{semantic.problemText?.trim() || '（无）'}</div>
      </div>
    </div>
  )
}

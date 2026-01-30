import type { SemanticDefinition } from '@/core/types'
import { ParamSlider } from '@/components/interactive/ParamSlider'

export function ParamControls(props: {
  semantic: SemanticDefinition
  values: Map<string, number>
  onChange: (paramId: string, value: number) => void
}) {
  const { semantic, values, onChange } = props

  const metas = buildParamMetas(semantic)
  if (metas.length === 0) {
    return <div className="text-sm text-slate-500">当前用例没有参数。</div>
  }

  return (
    <div className={metas.length > 3 ? 'max-h-[200px] overflow-y-auto pr-1' : ''}>
      <div className="space-y-2">
        {metas.map((m) => (
          <ParamSlider
            key={m.id}
            testId={`param-${m.id}`}
            label={m.label}
            min={m.min}
            max={m.max}
            step={m.step}
            value={values.get(m.id) ?? m.defaultValue}
            unit={m.unit}
            color={m.color}
            onChange={(v) => onChange(m.id, v)}
          />
        ))}
      </div>
    </div>
  )
}

function buildParamMetas(semantic: SemanticDefinition): Array<{
  id: string
  label: string
  min: number
  max: number
  defaultValue: number
  step: number
  unit?: string
  color: 'primary' | 'orange' | 'teal' | 'purple'
}> {
  const params = semantic.params ?? []
  if (params.length === 0) return []

  // 动点参数按点出现顺序分配颜色：P(orange)/Q(teal)/其它(primary)
  const dynamicParamIds = semantic.points.filter((p) => p.type === 'onSegment' && p.param).map((p) => p.param!) // 保持顺序
  const dynamicColorByParam = new Map<string, 'orange' | 'teal' | 'primary'>()
  for (let i = 0; i < dynamicParamIds.length; i++) {
    dynamicColorByParam.set(dynamicParamIds[i], i === 0 ? 'orange' : i === 1 ? 'teal' : 'primary')
  }

  const foldParamIds = new Set<string>((semantic.folds ?? []).map((f) => f.angleParam).filter(Boolean) as string[])

  return params.map((p) => {
    const isFoldAngle = foldParamIds.has(p.id)
    const point = semantic.points.find((pt) => pt.type === 'onSegment' && pt.param === p.id)

    const label = isFoldAngle ? '折叠角度' : point ? `动点 ${point.id} 位置` : p.id
    const unit = isFoldAngle ? '°' : undefined
    const step = isFoldAngle ? 1 : 0.01
    const color = isFoldAngle ? 'purple' : dynamicColorByParam.get(p.id) ?? 'primary'

    return {
      id: p.id,
      label,
      min: p.min,
      max: p.max,
      defaultValue: p.default,
      step,
      unit,
      color,
    }
  })
}

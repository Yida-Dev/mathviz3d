import { Slider } from '@/components/ui/Slider'

export interface ParamSliderProps {
  testId?: string
  label: string
  value: number
  min: number
  max: number
  step?: number
  color: 'primary' | 'orange' | 'teal' | 'purple'
  unit?: string
  onChange: (value: number) => void
}

export function ParamSlider(props: ParamSliderProps) {
  const { testId, label, value, min, max, step = 0.01, color, unit, onChange } = props

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm" data-testid={testId}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={dotClass(color)} aria-hidden />
          <div className="text-xs font-medium text-slate-900 truncate">{label}</div>
        </div>
        <div className="text-xs font-mono font-bold text-primary-600">
          {formatValue(value)}
          {unit ?? ''}
        </div>
      </div>
      <div className="mt-2">
        <Slider min={min} max={max} step={step} value={value} onChange={onChange} color={color} data-testid={testId ? `${testId}-slider` : undefined} />
      </div>
    </div>
  )
}

function dotClass(color: ParamSliderProps['color']): string {
  switch (color) {
    case 'orange':
      return 'h-2 w-2 rounded-full bg-orange-600 shrink-0'
    case 'teal':
      return 'h-2 w-2 rounded-full bg-teal-600 shrink-0'
    case 'purple':
      return 'h-2 w-2 rounded-full bg-violet-500 shrink-0'
    default:
      return 'h-2 w-2 rounded-full bg-primary-600 shrink-0'
  }
}

function formatValue(v: number): string {
  // 折叠角度通常是整数；动点参数一般保留 2 位
  if (Number.isInteger(v)) return String(v)
  return v.toFixed(2)
}

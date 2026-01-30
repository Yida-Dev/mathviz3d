export interface MeasureItem {
  id: string
  label: string
  value: string
  unit?: string
  isConstant?: boolean
}

export function MeasureCard(props: { items: MeasureItem[] }) {
  const { items } = props

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        当前用例没有测量值。
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((m) => (
          <div key={m.id} className="bg-slate-50 rounded-lg p-3 text-center" data-testid={`measurement-${m.id}`}>
            <div className="flex items-center justify-center gap-2">
              <div className="text-[10px] text-slate-500">{m.label}</div>
              {m.isConstant && (
                <span className="text-[10px] bg-green-50 text-green-600 rounded-sm px-1.5 py-0.5">定值</span>
              )}
            </div>
            <div className="mt-1 text-lg font-mono font-bold text-primary-600">
              {m.value}
              {m.unit ? <span className="ml-1 text-xs text-slate-500 font-normal">{m.unit}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'

export function LeftPanel(props: { children: ReactNode }) {
  return <div className="h-full flex flex-col">{props.children}</div>
}

export function LeftPanelSectionHeader(props: { icon?: string; title: string }) {
  const { icon, title } = props
  return (
    <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
      {icon && <i className={`ph-fill ${icon} text-slate-500`} aria-hidden />}
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</div>
    </div>
  )
}

export function LeftPanelBody(props: { children: ReactNode }) {
  return <div className="flex-1 overflow-y-auto p-5 space-y-4">{props.children}</div>
}


import type { ReactNode } from 'react'

export function TimelinePanel(props: { children: ReactNode }) {
  return (
    <div className="h-20 bg-white border-t border-slate-200 px-6 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] flex items-center">
      {props.children}
    </div>
  )
}


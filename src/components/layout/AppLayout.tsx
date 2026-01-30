import type { ReactNode } from 'react'

import type { Breakpoint } from '@/hooks/useBreakpoint'
import { cn } from '@/utils/cn'

export interface AppLayoutProps {
  breakpoint: Breakpoint
  header: ReactNode
  leftPanel: ReactNode
  main: ReactNode
  timeline?: ReactNode
  floatingPanel?: ReactNode
  isLeftPanelOpen: boolean
  onRequestCloseLeftPanel: () => void
}

export function AppLayout(props: AppLayoutProps) {
  const { breakpoint, header, leftPanel, main, timeline, floatingPanel, isLeftPanelOpen, onRequestCloseLeftPanel } = props

  if (breakpoint === 'mobile') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center bg-white rounded-xl border border-slate-200 p-8 shadow-[0_4px_20px_-2px_rgba(148,163,184,0.1)]">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary-600/10 flex items-center justify-center">
            <i className="ph-duotone ph-desktop text-3xl text-primary-600" aria-hidden />
          </div>
          <h1 className="mt-4 text-base font-bold text-slate-900">请使用平板或电脑访问</h1>
          <p className="mt-2 text-sm text-slate-600">
            MathViz 需要更大的屏幕来展示 3D 几何模型和讲解视频。
          </p>
        </div>
      </div>
    )
  }

  const isDesktop = breakpoint === 'desktop'
  const isTablet = breakpoint === 'tablet'

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {header}

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop：左侧面板固定显示 */}
        {isDesktop && (
          <aside className="w-[320px] shrink-0 bg-white border-r border-slate-200 shadow-[0_4px_20px_-2px_rgba(148,163,184,0.1)]">
            {leftPanel}
          </aside>
        )}

        {/* Main canvas area */}
        <div className="flex-1 relative bg-slate-50">
          {/* Tablet：左侧面板覆盖在 Canvas 上方 */}
          {isTablet && isLeftPanelOpen && (
            <aside
              className={cn(
                'absolute left-0 top-0 bottom-0 w-[320px] z-40 bg-white border-r border-slate-200 shadow-2xl',
                'transition-transform duration-300 ease-out',
              )}
            >
              {leftPanel}
            </aside>
          )}

          {/* Tablet：点击 Canvas 区域关闭侧栏（无遮罩） */}
          {isTablet && isLeftPanelOpen && (
            <button
              type="button"
              aria-label="关闭侧栏"
              className="absolute inset-0 z-30 bg-transparent"
              onClick={onRequestCloseLeftPanel}
            />
          )}

          <div className={cn('absolute inset-0', isTablet && isLeftPanelOpen && 'z-20', isTablet && !isLeftPanelOpen && 'z-10')}>
            {main}
          </div>

          {/* Tablet 折叠态：交互模式浮动面板 */}
          {isTablet && !isLeftPanelOpen && floatingPanel && <div className="absolute top-6 right-6 z-30">{floatingPanel}</div>}
        </div>
      </div>

      {timeline}
    </div>
  )
}


import type { ChangeEvent } from 'react'

import type { Breakpoint } from '@/hooks/useBreakpoint'
import type { AppMode } from '@/hooks/useAppMode'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

export interface HeaderProps {
  breakpoint: Breakpoint
  mode: AppMode
  onModeChange: (mode: AppMode) => void

  // Tablet 左侧面板折叠
  isLeftPanelOpen: boolean
  onToggleLeftPanel: () => void

  // Demo：选择内置用例（便于本地开发/测试）
  selectedCaseId: string
  onCaseChange: (caseId: string) => void

  onOpenSettings?: () => void
  onExport?: () => void
}

export function Header(props: HeaderProps) {
  const {
    breakpoint,
    mode,
    onModeChange,
    isLeftPanelOpen,
    onToggleLeftPanel,
    selectedCaseId,
    onCaseChange,
    onOpenSettings,
    onExport,
  } = props

  const isTablet = breakpoint === 'tablet'

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-3 w-64">
        {isTablet && (
          <button
            type="button"
            className="h-10 w-10 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 inline-flex items-center justify-center"
            onClick={onToggleLeftPanel}
            aria-label={isLeftPanelOpen ? '关闭侧栏' : '打开侧栏'}
          >
            <i className={cn('ph-bold text-xl', isLeftPanelOpen ? 'ph-x' : 'ph-list')} aria-hidden />
          </button>
        )}

        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
            <i className="ph-bold ph-cube text-white text-xl" aria-hidden />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-4">MathViz</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider leading-4">Student Edition</p>
          </div>
        </div>
      </div>

      {/* mode switch */}
      <div className="flex items-center justify-center">
        <div className="p-1 bg-slate-100 border border-slate-200 rounded-xl flex gap-1">
          <ModeButton active={mode === 'interactive'} onClick={() => onModeChange('interactive')} icon="ph-cube-focus">
            交互模式
          </ModeButton>
          <ModeButton active={mode === 'video'} onClick={() => onModeChange('video')} icon="ph-chalkboard-teacher">
            视频讲解
          </ModeButton>
        </div>
      </div>

      {/* actions */}
      <div className="flex items-center justify-end gap-2 w-80">
        <label className="text-xs text-slate-500 hidden xl:block" htmlFor="case-select">
          用例
        </label>
        <select
          id="case-select"
          className="h-9 shrink-0 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-600/10 focus:border-primary-600"
          value={selectedCaseId}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onCaseChange(e.target.value)}
          aria-label="用例"
        >
          <option value="case1">case1（cube）</option>
          <option value="case2">case2（tetrahedron）</option>
          <option value="case3">case3（fold）</option>
        </select>

        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenSettings}
          className="shrink-0 whitespace-nowrap"
          leftIcon={<i className="ph-bold ph-gear text-base" aria-hidden />}
        >
          设置
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={onExport}
          disabled={mode !== 'video'}
          className="shrink-0 whitespace-nowrap"
          leftIcon={<i className="ph-bold ph-export text-base" aria-hidden />}
        >
          导出视频
        </Button>
      </div>
    </header>
  )
}

function ModeButton(props: { active: boolean; onClick: () => void; children: string; icon: string }) {
  const { active, onClick, children, icon } = props
  return (
    <button
      type="button"
      className={cn(
        'h-9 px-4 rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition',
        active ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700',
      )}
      onClick={onClick}
    >
      <i className={cn('ph-bold', icon)} aria-hidden />
      {children}
    </button>
  )
}

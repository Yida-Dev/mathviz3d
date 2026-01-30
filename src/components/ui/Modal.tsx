import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/utils/cn'

export interface ModalProps {
  open: boolean
  title?: string
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
  className?: string
}

export function Modal(props: ModalProps) {
  const { open, title, children, footer, onClose, className } = props

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* overlay */}
      <button
        type="button"
        aria-label="关闭弹窗"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full max-w-lg rounded-xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-200',
          className,
        )}
      >
        {(title || footer) && (
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="text-sm font-bold text-slate-900">{title}</div>
            <button
              type="button"
              className="h-9 w-9 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              onClick={onClose}
            >
              <i className="ph-bold ph-x text-lg" aria-hidden />
            </button>
          </div>
        )}

        <div className="p-5 text-sm text-slate-700">{children}</div>

        {footer && <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}


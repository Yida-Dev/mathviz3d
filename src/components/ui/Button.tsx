import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/utils/cn'

type ButtonVariant = 'primary' | 'ghost' | 'outline'
type ButtonSize = 'sm' | 'md'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export function Button(props: ButtonProps) {
  const {
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    leftIcon,
    rightIcon,
    children,
    ...rest
  } = props

  const isDisabled = disabled || loading

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition',
        'focus:outline-none focus:ring-2 focus:ring-primary-600/10 focus:border-primary-600',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
        variant === 'primary' && 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm',
        variant === 'ghost' && 'bg-transparent text-slate-600 hover:bg-slate-100',
        variant === 'outline' && 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
        isDisabled && 'opacity-50 cursor-not-allowed hover:bg-inherit',
        className,
      )}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : leftIcon}
      {children}
      {rightIcon}
    </button>
  )
}

function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
}


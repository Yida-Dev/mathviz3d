import type { InputHTMLAttributes } from 'react'

import { cn } from '@/utils/cn'

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input(props: InputProps) {
  const { className, ...rest } = props
  return (
    <input
      className={cn(
        'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900',
        'placeholder:text-slate-500',
        'focus:outline-none focus:ring-2 focus:ring-primary-600/10 focus:border-primary-600',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    />
  )
}

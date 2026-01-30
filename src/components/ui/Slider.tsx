import type { InputHTMLAttributes } from 'react'

import { cn } from '@/utils/cn'

type SliderColor = 'primary' | 'orange' | 'teal' | 'purple'

export interface SliderProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'defaultValue' | 'onChange'> {
  value: number
  onChange: (value: number) => void
  color?: SliderColor
}

const COLOR_MAP: Record<SliderColor, string> = {
  primary: '#2563eb', // blue-600
  orange: '#ea580c', // orange-600
  teal: '#0d9488', // teal-600
  purple: '#8b5cf6', // violet-500
}

export function Slider(props: SliderProps) {
  const { className, min = 0, max = 1, step = 0.01, value, onChange, color = 'primary', disabled, ...rest } = props

  const pct = max === min ? 0 : ((value - Number(min)) / (Number(max) - Number(min))) * 100
  const fill = COLOR_MAP[color]
  const track = '#e2e8f0' // slate-200

  return (
    <input
      type="range"
      className={cn(
        'w-full h-4 bg-transparent',
        'appearance-none cursor-pointer',
        // thumb
        '[&::-webkit-slider-thumb]:appearance-none',
        '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full',
        '[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:shadow-sm',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
      style={{
        background: `linear-gradient(to right, ${fill} 0%, ${fill} ${pct}%, ${track} ${pct}%, ${track} 100%)`,
        borderRadius: 9999,
        height: 4,
      }}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      {...rest}
    />
  )
}


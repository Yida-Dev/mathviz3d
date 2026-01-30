import type { EasingFunction } from '@/core/timeline'

export function applyEasing(easing: EasingFunction, t: number): number {
  const x = clamp01(t)
  switch (easing) {
    case 'linear':
      return x
    case 'ease':
    case 'ease-in-out':
      return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
    case 'ease-in':
      return x * x
    case 'ease-out':
      return 1 - (1 - x) * (1 - x)
    default:
      return x
  }
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function clamp01(x: number): number {
  if (x < 0) return 0
  if (x > 1) return 1
  return x
}


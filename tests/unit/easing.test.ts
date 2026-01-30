import { describe, it, expect } from 'vitest'
import { applyEasing, clamp01, lerp } from '@/core/easing'

describe('easing', () => {
  it('clamp01 应裁剪到 [0,1]', () => {
    expect(clamp01(-1)).toBe(0)
    expect(clamp01(0)).toBe(0)
    expect(clamp01(0.3)).toBe(0.3)
    expect(clamp01(1)).toBe(1)
    expect(clamp01(2)).toBe(1)
  })

  it('applyEasing 应覆盖所有分支', () => {
    // 主要覆盖 switch 分支，不追求具体曲线形式
    expect(applyEasing('linear', 0.5)).toBeCloseTo(0.5, 12)
    expect(applyEasing('ease', 0.5)).toBeCloseTo(0.5, 12)
    expect(applyEasing('ease-in-out', 0.5)).toBeCloseTo(0.5, 12)
    expect(applyEasing('ease-in', 0.5)).toBeCloseTo(0.25, 12)
    expect(applyEasing('ease-out', 0.5)).toBeCloseTo(0.75, 12)
  })

  it('lerp 应正确线性插值', () => {
    expect(lerp(0, 10, 0)).toBe(0)
    expect(lerp(0, 10, 0.5)).toBe(5)
    expect(lerp(0, 10, 1)).toBe(10)
  })
})


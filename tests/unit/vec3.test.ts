import { describe, it, expect } from 'vitest'
import { normalize, safeAcos, vec3 } from '@/core/math/vec3'

describe('Vec3 数学工具', () => {
  it('normalize(0,0,0) 应抛错', () => {
    expect(() => normalize(vec3(0, 0, 0))).toThrow()
  })

  it('safeAcos 应对输入做 [-1,1] 钳制', () => {
    expect(safeAcos(2)).toBe(0)
    expect(safeAcos(-2)).toBeCloseTo(Math.PI, 12)
  })
})


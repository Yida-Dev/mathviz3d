import { describe, it, expect } from 'vitest'
import { CoordCalculator } from './coord-calculator'
import type { SemanticDefinition } from './types'

// 测试辅助：创建最小化的 SemanticDefinition
function createSemantic(partial: Partial<SemanticDefinition> & Pick<SemanticDefinition, 'baseGeometry' | 'points'>): SemanticDefinition {
  return {
    problemId: 'test',
    problemText: 'test problem',
    question: 'test question',
    ...partial,
  }
}

describe('CoordCalculator - 尺寸归一化', () => {
  describe('cube 归一化', () => {
    it('cube size=4 应归一化到 [-0.5, 0.5]', () => {
      const semantic = createSemantic({
        baseGeometry: { type: 'cube', size: 4 },
        points: [],
      })
      const calc = new CoordCalculator(semantic)

      expect(calc.getScaleFactor()).toBeCloseTo(0.25)

      const A = calc.getVertexCoord('A')
      expect(A.x).toBeCloseTo(-0.5)
      expect(A.y).toBeCloseTo(-0.5)
      expect(A.z).toBeCloseTo(-0.5)

      const B1 = calc.getVertexCoord('B1')
      expect(B1.x).toBeCloseTo(0.5)
      expect(B1.y).toBeCloseTo(-0.5)
      expect(B1.z).toBeCloseTo(0.5)
    })

    it('cube size=1 scaleFactor 应为 1', () => {
      const semantic = createSemantic({
        baseGeometry: { type: 'cube', size: 1 },
        points: [],
      })
      const calc = new CoordCalculator(semantic)
      expect(calc.getScaleFactor()).toBeCloseTo(1)
    })

    it('cube size=2 应归一化到 [-0.5, 0.5]', () => {
      const semantic = createSemantic({
        baseGeometry: { type: 'cube', size: 2 },
        points: [],
      })
      const calc = new CoordCalculator(semantic)

      expect(calc.getScaleFactor()).toBeCloseTo(0.5)

      const C1 = calc.getVertexCoord('C1')
      expect(C1.x).toBeCloseTo(0.5)
      expect(C1.y).toBeCloseTo(0.5)
      expect(C1.z).toBeCloseTo(0.5)
    })
  })

  describe('cuboid 归一化', () => {
    it('cuboid [2,4,1] 应按最大边 4 归一化', () => {
      const semantic = createSemantic({
        baseGeometry: { type: 'cuboid', dimensions: [2, 4, 1] },
        points: [],
      })
      const calc = new CoordCalculator(semantic)

      // 最大边 4 -> scaleFactor = 0.25
      expect(calc.getScaleFactor()).toBeCloseTo(0.25)

      // a=2 -> 归一化后 0.5, b=4 -> 1, c=1 -> 0.25
      const A = calc.getVertexCoord('A')
      expect(A.x).toBeCloseTo(-0.25) // -2/2 * 0.25
      expect(A.y).toBeCloseTo(-0.5) // -4/2 * 0.25
      expect(A.z).toBeCloseTo(-0.125) // -1/2 * 0.25

      const C1 = calc.getVertexCoord('C1')
      expect(C1.x).toBeCloseTo(0.25)
      expect(C1.y).toBeCloseTo(0.5)
      expect(C1.z).toBeCloseTo(0.125)
    })
  })

  describe('tetrahedron 归一化', () => {
    it('tetrahedron size=2 应归一化', () => {
      const semantic = createSemantic({
        baseGeometry: { type: 'tetrahedron', size: 2 },
        points: [],
      })
      const calc = new CoordCalculator(semantic)

      expect(calc.getScaleFactor()).toBeCloseTo(0.5)
    })
  })

  describe('square 归一化', () => {
    it('square size=4 应归一化到 [-0.5, 0.5]', () => {
      const semantic = createSemantic({
        baseGeometry: { type: 'square', size: 4 },
        points: [],
      })
      const calc = new CoordCalculator(semantic)

      expect(calc.getScaleFactor()).toBeCloseTo(0.25)

      const B = calc.getVertexCoord('B')
      expect(B.x).toBeCloseTo(0.5)
      expect(B.y).toBeCloseTo(-0.5)
      expect(B.z).toBeCloseTo(0)
    })
  })
})

describe('CoordCalculator - 测量值还原', () => {
  describe('距离测量还原', () => {
    it('cube size=4 边长测量应返回原始值 4', () => {
      const semantic = createSemantic({
        baseGeometry: { type: 'cube', size: 4 },
        points: [],
        measurements: [{ id: 'edge_AB', type: 'distance', points: ['A', 'B'] }],
      })
      const calc = new CoordCalculator(semantic)

      // 归一化后 A-B 距离是 1，但测量值应显示原始边长 4
      expect(calc.getMeasurement('edge_AB')).toBeCloseTo(4)
    })

    it('cube size=2 边长测量应返回原始值 2', () => {
      const semantic = createSemantic({
        baseGeometry: { type: 'cube', size: 2 },
        points: [],
        measurements: [{ id: 'edge_AB', type: 'distance', points: ['A', 'B'] }],
      })
      const calc = new CoordCalculator(semantic)

      expect(calc.getMeasurement('edge_AB')).toBeCloseTo(2)
    })
  })

  describe('面积测量还原', () => {
    it('cube size=4 面积测量应还原', () => {
      const semantic = createSemantic({
        baseGeometry: { type: 'cube', size: 4 },
        points: [],
        measurements: [{ id: 'face_ABC', type: 'area', points: ['A', 'B', 'C'] }],
      })
      const calc = new CoordCalculator(semantic)

      // ABC 是直角三角形，边长 4 和 4，面积 = 4*4/2 = 8
      expect(calc.getMeasurement('face_ABC')).toBeCloseTo(8)
    })
  })

  describe('体积测量还原', () => {
    it('cube size=2 中点构成的四面体体积应正确', () => {
      const semantic = createSemantic({
        baseGeometry: { type: 'cube', size: 2 },
        points: [
          { id: 'E', type: 'midpoint', of: ['A', 'B'] },
          { id: 'F', type: 'midpoint', of: ['A', 'D'] },
          { id: 'G', type: 'midpoint', of: ['A', 'A1'] },
        ],
        measurements: [{ id: 'vol_AEFG', type: 'volume', points: ['A', 'E', 'F', 'G'] }],
      })
      const calc = new CoordCalculator(semantic)

      // 原始 cube 边长 2，中点距离 1
      // 四面体 AEFG：三边长都是 1，体积 = 1/6
      expect(calc.getMeasurement('vol_AEFG')).toBeCloseTo(1 / 6)
    })
  })

  describe('角度测量（无需还原）', () => {
    it('角度测量应保持不变', () => {
      const semantic = createSemantic({
        baseGeometry: { type: 'cube', size: 4 },
        points: [],
        measurements: [{ id: 'angle_ABC', type: 'angle', points: ['A', 'B', 'C'] }],
      })
      const calc = new CoordCalculator(semantic)

      // ABC 是直角
      expect(calc.getMeasurement('angle_ABC')).toBeCloseTo(90)
    })
  })
})

describe('CoordCalculator - 边界情况', () => {
  it('size 为 0 时使用默认值 1', () => {
    const semantic = createSemantic({
      baseGeometry: { type: 'cube', size: 0 },
      points: [],
    })
    const calc = new CoordCalculator(semantic)

    // size=0 应该被保护，scaleFactor 返回 1
    expect(calc.getScaleFactor()).toBe(1)
  })

  it('size 未指定时使用默认值 1', () => {
    const semantic = createSemantic({
      baseGeometry: { type: 'cube' },
      points: [],
    })
    const calc = new CoordCalculator(semantic)

    expect(calc.getScaleFactor()).toBeCloseTo(1)
  })
})

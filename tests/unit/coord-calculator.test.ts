import { describe, it, expect } from 'vitest'
import { CoordCalculator } from '@/core/coord-calculator'
import type { EvalContext, Vec3 } from '@/core/types'

import case1Semantic from '../fixtures/case1/semantic.json'
import case1Expected from '../fixtures/case1/expected.json'
import case2Semantic from '../fixtures/case2/semantic.json'
import case2Expected from '../fixtures/case2/expected.json'
import case3Semantic from '../fixtures/case3/semantic.json'
import case3Expected from '../fixtures/case3/expected.json'

function ctx(params: Record<string, number> = {}, foldAngles: Record<string, number> = {}): EvalContext {
  return {
    params: new Map(Object.entries(params)),
    foldAngles: new Map(Object.entries(foldAngles)),
  }
}

function expectVec3Close(actual: Vec3, expected: [number, number, number], tolerance: number): void {
  expect(Math.abs(actual.x - expected[0])).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(actual.y - expected[1])).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(actual.z - expected[2])).toBeLessThanOrEqual(tolerance)
}

describe('CoordCalculator', () => {
  describe('案例1：cube + 动点 + volume', () => {
    const calc = new CoordCalculator(case1Semantic as any)
    const tol = (case1Expected as any).tolerance as number

    it('顶点坐标应与预期一致', () => {
      const vertices = (case1Expected as any).vertices as Record<string, [number, number, number]>
      for (const [id, expected] of Object.entries(vertices)) {
        expectVec3Close(calc.getVertexCoord(id), expected, tol)
      }
    })

    it('特殊点坐标应与预期一致（含动点 p=0.5, q=0.5）', () => {
      const pts = (case1Expected as any).specialPoints as Record<string, [number, number, number]>

      expectVec3Close(calc.getPointCoord('M'), pts.M, tol)
      expectVec3Close(calc.getPointCoord('N'), pts.N, tol)
      expectVec3Close(calc.getPointCoord('E'), pts.E, tol)

      const P = calc.getPointCoord('P', ctx({ p: 0.5 }))
      expectVec3Close(P, pts.P_0_5 ?? pts['P_0.5'], tol)

      const Q = calc.getPointCoord('Q', ctx({ q: 0.5 }))
      expectVec3Close(Q, pts.Q_0_5 ?? pts['Q_0.5'], tol)
    })

    it('onSegment 边界：p=0 应为 B，p=1 应为 E', () => {
      const B = calc.getPointCoord('B')
      const E = calc.getPointCoord('E')

      expectVec3Close(calc.getPointCoord('P', ctx({ p: 0 })), [B.x, B.y, B.z], tol)
      expectVec3Close(calc.getPointCoord('P', ctx({ p: 1 })), [E.x, E.y, E.z], tol)
    })

    it('volume_MPQN 应为定值 1/24（对多组 p,q 不变）', () => {
      const expected = 1 / 24
      const testCases = [
        { p: 0, q: 0 },
        { p: 0.5, q: 0.5 },
        { p: 1, q: 1 },
        { p: 0.3, q: 0.7 },
      ]

      for (const { p, q } of testCases) {
        const v = calc.getMeasurement('volume_MPQN', ctx({ p, q }))
        expect(Math.abs(v - expected)).toBeLessThanOrEqual(tol)
      }
    })
  })

  describe('案例2：tetrahedron + ratio + 线面夹角', () => {
    const calc = new CoordCalculator(case2Semantic as any)
    const tol = (case2Expected as any).tolerance as number

    it('顶点坐标应与预期一致', () => {
      const vertices = (case2Expected as any).vertices as Record<string, [number, number, number]>
      for (const [id, expected] of Object.entries(vertices)) {
        expectVec3Close(calc.getVertexCoord(id), expected, tol)
      }
    })

    it('E/F 特殊点坐标应与预期一致', () => {
      const pts = (case2Expected as any).specialPoints as Record<string, [number, number, number]>
      expectVec3Close(calc.getPointCoord('E'), pts.E, tol)
      expectVec3Close(calc.getPointCoord('F'), pts.F, tol)
    })

    it('dist_EF 与 angle_EF_ABC 应与预期一致', () => {
      const expected = (case2Expected as any).measurements as Record<string, number>
      const dist = calc.getMeasurement('dist_EF')
      const angle = calc.getMeasurement('angle_EF_ABC')

      expect(Math.abs(dist - expected.dist_EF)).toBeLessThanOrEqual(tol)
      expect(Math.abs(angle - expected.angle_EF_ABC)).toBeLessThanOrEqual(tol)
    })
  })

  describe('案例3：square + fold + area', () => {
    const calc = new CoordCalculator(case3Semantic as any)
    const tol = (case3Expected as any).tolerance as number

    it('顶点坐标应与预期一致', () => {
      const vertices = (case3Expected as any).vertices as Record<string, [number, number, number]>
      for (const [id, expected] of Object.entries(vertices)) {
        expectVec3Close(calc.getVertexCoord(id), expected, tol)
      }
    })

    it("翻折点 A' 在 0°/90°/180° 时应正确", () => {
      const A = calc.getPointCoord('A')
      const C = calc.getPointCoord('C')

      expectVec3Close(calc.getPointCoord("A'", ctx({}, { fold_BD: 0 })), [A.x, A.y, A.z], tol)

      const Ap90 = calc.getPointCoord("A'", ctx({}, { fold_BD: 90 }))
      const expectedAp90 = (case3Expected as any).foldedPoints["A'_90"] as [number, number, number]
      expectVec3Close(Ap90, expectedAp90, tol)

      expectVec3Close(calc.getPointCoord("A'", ctx({}, { fold_BD: 180 })), [C.x, C.y, C.z], tol)
    })

    it('dist_ApC 与 area_folded 在 90° 时应与预期一致', () => {
      const expected = (case3Expected as any).measurements as Record<string, number>

      const dist = calc.getMeasurement('dist_ApC', ctx({}, { fold_BD: 90 }))
      expect(Math.abs(dist - expected.dist_ApC)).toBeLessThanOrEqual(tol)

      const area = calc.getMeasurement('area_folded', ctx({}, { fold_BD: 90 }))
      expect(Math.abs(area - expected.area_folded)).toBeLessThanOrEqual(tol)
    })
  })

  describe('补充覆盖：默认参数/基础能力/错误分支', () => {
    it('未显式传入 context 时，onSegment 应使用语义默认参数', () => {
      const calc = new CoordCalculator(case1Semantic as any)
      const expectedPts = (case1Expected as any).specialPoints as Record<string, [number, number, number]>
      const tol = (case1Expected as any).tolerance as number

      // case1 semantic 中 p/q 默认值均为 0.5
      expectVec3Close(calc.getPointCoord('P'), expectedPts['P_0.5'], tol)
      expectVec3Close(calc.getPointCoord('Q'), expectedPts['Q_0.5'], tol)
    })

    it('未显式传入 context 时，fold 点应使用 angleParam 的默认值', () => {
      const calc = new CoordCalculator(case3Semantic as any)
      const tol = (case3Expected as any).tolerance as number
      const expectedAp90 = (case3Expected as any).foldedPoints["A'_90"] as [number, number, number]

      expectVec3Close(calc.getPointCoord("A'"), expectedAp90, tol)
    })

    it('应支持 3 点夹角与 3 点三角形面积', () => {
      const semantic: any = {
        problemId: 'extra',
        problemText: '',
        baseGeometry: { type: 'square', size: 1 },
        points: [],
        measurements: [
          { id: 'angle_ABC', type: 'angle', points: ['A', 'B', 'C'] }, // ∠ABC = 90°
          { id: 'area_ABC', type: 'area', points: ['A', 'B', 'C'] }, // △ABC 面积 = 1/2
        ],
        question: '',
      }
      const calc = new CoordCalculator(semantic)
      expect(Math.abs(calc.getMeasurement('angle_ABC') - 90)).toBeLessThan(1e-6)
      expect(Math.abs(calc.getMeasurement('area_ABC') - 0.5)).toBeLessThan(1e-6)
    })

    it('应支持 center 点类型与 getSegment', () => {
      const semantic: any = {
        problemId: 'extra',
        problemText: '',
        baseGeometry: { type: 'square', size: 1 },
        points: [{ id: 'O', type: 'center', points: ['A', 'B', 'C', 'D'] }],
        question: '',
      }
      const calc = new CoordCalculator(semantic)
      const O = calc.getPointCoord('O')
      expectVec3Close(O, [0, 0, 0], 1e-12)

      const [A, C] = calc.getSegment('A', 'C')
      expectVec3Close(A, [-0.5, -0.5, 0], 1e-12)
      expectVec3Close(C, [0.5, 0.5, 0], 1e-12)
    })

    it('应支持 cuboid 顶点坐标', () => {
      const semantic: any = {
        problemId: 'extra',
        problemText: '',
        baseGeometry: { type: 'cuboid', dimensions: [2, 4, 6] },
        points: [],
        question: '',
      }
      const calc = new CoordCalculator(semantic)
      expectVec3Close(calc.getVertexCoord('A'), [-1, -2, -3], 1e-12)
      expectVec3Close(calc.getVertexCoord('C1'), [1, 2, 3], 1e-12)
      expect(calc.getBaseEdges().length).toBeGreaterThan(0)
      expect(calc.getBaseFaces().length).toBeGreaterThan(0)
    })

    it('缺少测量定义/缺少参数/不支持几何体类型时应抛错', () => {
      const calc = new CoordCalculator(case1Semantic as any)
      expect(() => calc.getMeasurement('unknown')).toThrow()

      const noParamSemantic: any = {
        problemId: 'extra',
        problemText: '',
        baseGeometry: { type: 'cube', size: 1 },
        points: [{ id: 'P', type: 'onSegment', from: 'A', to: 'B', param: 't' }],
        question: '',
      }
      const calc2 = new CoordCalculator(noParamSemantic)
      expect(() => calc2.getPointCoord('P')).toThrow()

      const unsupported: any = {
        problemId: 'extra',
        problemText: '',
        baseGeometry: { type: 'prism', size: 1 },
        points: [],
        question: '',
      }
      expect(() => new CoordCalculator(unsupported)).toThrow()
    })
  })
})

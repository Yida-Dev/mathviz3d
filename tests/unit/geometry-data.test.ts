import { describe, it, expect } from 'vitest'
import { buildGeometryData } from '@/core/geometry-data'

describe('buildGeometryData', () => {
  it('应把 onSegment 点映射为函数，其它点映射为静态值', () => {
    const semantic: any = {
      problemId: 'x',
      problemText: '',
      baseGeometry: { type: 'cube', size: 1 },
      points: [
        { id: 'M', type: 'midpoint', of: ['A', 'B'] },
        { id: 'P', type: 'onSegment', from: 'A', to: 'B', param: 'p' },
      ],
      params: [{ id: 'p', min: 0, max: 1, default: 0.5 }],
      question: '',
    }
    const data = buildGeometryData(semantic)
    expect(typeof data.points.get('M')).toBe('object')
    expect(typeof data.points.get('P')).toBe('function')
  })

  it('foldedPoints 应被映射为函数', () => {
    const semantic: any = {
      problemId: 'x',
      problemText: '',
      baseGeometry: { type: 'square', size: 1 },
      points: [{ id: 'A', type: 'vertex' }],
      folds: [
        {
          id: 'fold1',
          hinge: ['B', 'D'],
          movingPoints: ['A'],
          foldedPoints: ["A'"],
          defaultAngle: 90,
        },
      ],
      question: '',
    }
    const data = buildGeometryData(semantic)
    expect(typeof data.points.get("A'")).toBe('function')
  })

  it('measurements 应被映射为函数', () => {
    const semantic: any = {
      problemId: 'x',
      problemText: '',
      baseGeometry: { type: 'cube', size: 1 },
      points: [],
      measurements: [{ id: 'dist_AB', type: 'distance', points: ['A', 'B'] }],
      question: '',
    }
    const data = buildGeometryData(semantic)
    expect(typeof data.measurements.get('dist_AB')).toBe('function')
  })

  it('不支持的 baseGeometry.type 应抛错（同时覆盖 baseVertexIds default 分支）', () => {
    const semantic: any = {
      problemId: 'x',
      problemText: '',
      baseGeometry: { type: 'prism', size: 1 },
      points: [],
      question: '',
    }
    expect(() => buildGeometryData(semantic)).toThrow()
  })
})


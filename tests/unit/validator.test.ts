import { describe, it, expect } from 'vitest'
import { Validator } from '@/core/validator'

import case1Semantic from '../fixtures/case1/semantic.json'
import case1Script from '../fixtures/case1/animation.json'
import case2Semantic from '../fixtures/case2/semantic.json'
import case2Script from '../fixtures/case2/animation.json'
import case3Semantic from '../fixtures/case3/semantic.json'
import case3Script from '../fixtures/case3/animation.json'

describe('Validator', () => {
  const validator = new Validator()

  it('案例脚本应通过校验（case1/2/3）', () => {
    for (const [script, semantic] of [
      [case1Script, case1Semantic],
      [case2Script, case2Semantic],
      [case3Script, case3Semantic],
    ] as any[]) {
      const res = validator.validate(script, semantic)
      expect(res.valid).toBe(true)
      expect(res.errors).toHaveLength(0)
    }
  })

  it('引用不存在的点应报 missing_reference', () => {
    const bad = {
      title: 'bad',
      scenes: [
        {
          id: 's1',
          narration: 'x',
          camera: 'isometric',
          actions: [{ do: 'highlight', target: 'X', color: '#fff' }],
        },
      ],
    }
    const res = validator.validate(bad as any, case1Semantic as any)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.type === 'missing_reference')).toBe(true)
  })

  it('引用不存在的元素应报 missing_reference', () => {
    const bad = {
      title: 'bad',
      scenes: [
        {
          id: 's1',
          narration: 'x',
          camera: 'isometric',
          actions: [{ do: 'pulse', target: 'line_XY', color: '#fff', times: 1 }],
        },
      ],
    }
    const res = validator.validate(bad as any, case1Semantic as any)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.type === 'missing_reference')).toBe(true)
  })

  it('无效 foldId 应报 invalid_fold_id', () => {
    const bad = {
      title: 'bad',
      scenes: [
        {
          id: 's1',
          narration: 'x',
          camera: 'isometric',
          actions: [{ do: 'fold', foldId: 'invalid', fromAngle: 0, toAngle: 90, duration: 1 }],
        },
      ],
    }
    const res = validator.validate(bad as any, case3Semantic as any)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.type === 'invalid_fold_id')).toBe(true)
  })

  it('创建型动作缺少 id 应报 missing_id', () => {
    const bad = {
      title: 'bad',
      scenes: [
        {
          id: 's1',
          narration: 'x',
          camera: 'isometric',
          actions: [{ do: 'drawLine', from: 'A', to: 'B' }],
        },
      ],
    }
    const res = validator.validate(bad as any, case1Semantic as any)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.type === 'missing_id')).toBe(true)
  })

  it('创建型动作重复 id 应报 duplicate_id', () => {
    const bad = {
      title: 'bad',
      scenes: [
        {
          id: 's1',
          narration: 'x',
          camera: 'isometric',
          actions: [
            { do: 'drawLine', id: 'line_AB', from: 'A', to: 'B' },
            { do: 'drawLine', id: 'line_AB', from: 'B', to: 'C' },
          ],
        },
      ],
    }
    const res = validator.validate(bad as any, case1Semantic as any)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.type === 'duplicate_id')).toBe(true)
  })

  it('未知动作应报 unknown_action', () => {
    const bad = {
      title: 'bad',
      scenes: [
        {
          id: 's1',
          narration: 'x',
          camera: 'isometric',
          actions: [{ do: 'fly', target: 'A' }],
        },
      ],
    }
    const res = validator.validate(bad as any, case1Semantic as any)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.type === 'unknown_action')).toBe(true)
  })

  it('未知相机预设应报 invalid_preset', () => {
    const bad = {
      title: 'bad',
      scenes: [
        {
          id: 's1',
          narration: 'x',
          camera: 'invalid',
          actions: [],
        },
      ],
    }
    const res = validator.validate(bad as any, case1Semantic as any)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.type === 'invalid_preset')).toBe(true)
  })

  it('phi 超范围应报 invalid_phi', () => {
    const bad = {
      title: 'bad',
      scenes: [
        {
          id: 's1',
          narration: 'x',
          camera: {
            spherical: { radius: 2, theta: 45, phi: 100 },
            lookAt: 'center',
            transition: 'ease',
          },
          actions: [],
        },
      ],
    }
    const res = validator.validate(bad as any, case1Semantic as any)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.type === 'invalid_phi')).toBe(true)
  })

  it('animatePoint 范围不在 [0,1] 应报 invalid_range', () => {
    const bad = {
      title: 'bad',
      scenes: [
        {
          id: 's1',
          narration: 'x',
          camera: 'isometric',
          actions: [{ do: 'animatePoint', target: 'P', from: -1, to: 2, duration: 1 }],
        },
      ],
    }
    const res = validator.validate(bad as any, case1Semantic as any)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.type === 'invalid_range')).toBe(true)
  })

  it('phi 接近边界应产生 warning: phi_edge_value', () => {
    const okButWarn = {
      title: 'warn',
      scenes: [
        {
          id: 's1',
          narration: 'x',
          camera: {
            spherical: { radius: 2, theta: 45, phi: 89 },
            lookAt: 'center',
            transition: 'ease',
          },
          actions: [],
        },
      ],
    }
    const res = validator.validate(okButWarn as any, case1Semantic as any)
    expect(res.valid).toBe(true)
    expect(res.warnings.some((w) => w.type === 'phi_edge_value')).toBe(true)
  })

  it('场景过长应产生 warning: long_scene', () => {
    const okButWarn = {
      title: 'warn',
      scenes: [
        {
          id: 's1',
          narration: 'x',
          camera: 'isometric',
          actions: [{ do: 'wait', duration: 16 }],
        },
      ],
    }
    const res = validator.validate(okButWarn as any, case1Semantic as any)
    expect(res.valid).toBe(true)
    expect(res.warnings.some((w) => w.type === 'long_scene')).toBe(true)
  })

  it('showMeasurements 引用不存在的 measurementId 应报 missing_reference', () => {
    const bad = {
      title: 'bad',
      scenes: [
        {
          id: 's1',
          narration: 'x',
          camera: 'isometric',
          showMeasurements: ['unknown_measurement'],
          actions: [],
        },
      ],
    }
    const res = validator.validate(bad as any, case1Semantic as any)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.type === 'missing_reference')).toBe(true)
  })

  it('showPlane points 不足 3 个应报错', () => {
    const bad = {
      title: 'bad',
      scenes: [
        {
          id: 's1',
          narration: 'x',
          camera: 'isometric',
          actions: [{ do: 'showPlane', id: 'plane_AB', points: ['A', 'B'] }],
        },
      ],
    }
    const res = validator.validate(bad as any, case1Semantic as any)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.path.includes('points'))).toBe(true)
  })

  it('showTetrahedron vertices 非 4 个应报错', () => {
    const bad = {
      title: 'bad',
      scenes: [
        {
          id: 's1',
          narration: 'x',
          camera: 'isometric',
          actions: [{ do: 'showTetrahedron', id: 't1', vertices: ['A', 'B', 'C'] }],
        },
      ],
    }
    const res = validator.validate(bad as any, case1Semantic as any)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.path.includes('vertices'))).toBe(true)
  })

  it('together 时长应取子动作最大值（用于 long_scene 判断）', () => {
    const okButWarn = {
      title: 'warn',
      scenes: [
        {
          id: 's1',
          narration: 'x',
          camera: 'isometric',
          actions: [
            {
              do: 'together',
              actions: [
                { do: 'wait', duration: 10 },
                { do: 'wait', duration: 20 },
              ],
            },
          ],
        },
      ],
    }
    const res = validator.validate(okButWarn as any, case1Semantic as any)
    expect(res.valid).toBe(true)
    expect(res.warnings.some((w) => w.type === 'long_scene')).toBe(true)
  })

  it('lookAt 引用不存在的点应报 missing_reference', () => {
    const bad = {
      title: 'bad',
      scenes: [
        {
          id: 's1',
          narration: 'x',
          camera: {
            spherical: { radius: 2, theta: 45, phi: 30 },
            lookAt: 'X',
            transition: 'ease',
          },
          actions: [],
        },
      ],
    }
    const res = validator.validate(bad as any, case1Semantic as any)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.type === 'missing_reference')).toBe(true)
  })

  it('未支持的 baseGeometry.type（如 prism）不应导致 Validator 崩溃', () => {
    const semantic: any = {
      problemId: 'p',
      problemText: '',
      baseGeometry: { type: 'prism', size: 1 },
      points: [],
      question: '',
    }
    const script: any = { title: 'ok', scenes: [{ id: 's1', narration: 'x', camera: 'isometric', actions: [] }] }
    const res = validator.validate(script, semantic)
    expect(res.valid).toBe(true)
  })

  it('together.actions 非数组应报错（覆盖分支）', () => {
    const bad = {
      title: 'bad',
      scenes: [
        {
          id: 's1',
          narration: 'x',
          camera: 'isometric',
          actions: [{ do: 'together', actions: null }],
        },
      ],
    }
    const res = validator.validate(bad as any, case1Semantic as any)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.path.includes('.actions'))).toBe(true)
  })
})

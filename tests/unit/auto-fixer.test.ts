import { describe, it, expect } from 'vitest'
import { AutoFixer } from '@/core/auto-fixer'
import { Validator } from '@/core/validator'

import case1Semantic from '../fixtures/case1/semantic.json'
import case3Semantic from '../fixtures/case3/semantic.json'

describe('AutoFixer', () => {
  const validator = new Validator()
  const fixer = new AutoFixer()

  it('应自动补全缺失的创建型动作 id（missing_id）', () => {
    const script: any = {
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

    const res1 = validator.validate(script, case1Semantic as any)
    expect(res1.valid).toBe(false)
    expect(res1.errors.some((e) => e.type === 'missing_id')).toBe(true)

    const fixed = fixer.fix(script, res1.errors, case1Semantic as any)
    expect(fixed.script).toBeDefined()
    const fixedScript: any = fixed.script
    expect(fixedScript.scenes[0].actions[0].id).toBe('line_A_B')

    const res2 = validator.validate(fixedScript, case1Semantic as any)
    expect(res2.errors.some((e) => e.type === 'missing_id')).toBe(false)
  })

  it('应自动 clamp 相机 phi（invalid_phi）', () => {
    const script: any = {
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

    const res1 = validator.validate(script, case1Semantic as any)
    expect(res1.errors.some((e) => e.type === 'invalid_phi')).toBe(true)

    const fixed = fixer.fix(script, res1.errors, case1Semantic as any)
    const fixedScript: any = fixed.script
    expect(fixedScript.scenes[0].camera.spherical.phi).toBe(90)
  })

  it('应自动替换未知相机预设为 isometric（invalid_preset）', () => {
    const script: any = {
      title: 'bad',
      scenes: [{ id: 's1', narration: 'x', camera: 'xxx', actions: [] }],
    }

    const res1 = validator.validate(script, case1Semantic as any)
    expect(res1.errors.some((e) => e.type === 'invalid_preset')).toBe(true)

    const fixed = fixer.fix(script, res1.errors, case1Semantic as any)
    const fixedScript: any = fixed.script
    expect(fixedScript.scenes[0].camera).toBe('isometric')
  })

  it('应自动为重复 id 添加后缀（duplicate_id）', () => {
    const script: any = {
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

    const res1 = validator.validate(script, case1Semantic as any)
    expect(res1.errors.some((e) => e.type === 'duplicate_id')).toBe(true)

    const fixed = fixer.fix(script, res1.errors, case1Semantic as any)
    const fixedScript: any = fixed.script
    expect(fixedScript.scenes[0].actions[0].id).toBe('line_AB')
    expect(fixedScript.scenes[0].actions[1].id).toBe('line_AB_2')
  })

  it('应支持 showPlane 的 missing_id 自动生成（并覆盖 deepClone 的 JSON 回退分支）', () => {
    const script: any = {
      title: 'bad',
      scenes: [
        {
          id: 's1',
          narration: 'x',
          camera: 'isometric',
          actions: [{ do: 'showPlane', points: ['A', 'B', 'C'] }],
        },
      ],
    }

    const res1 = validator.validate(script, case1Semantic as any)
    expect(res1.errors.some((e) => e.type === 'missing_id')).toBe(true)

    const original = (globalThis as any).structuredClone
    try {
      ;(globalThis as any).structuredClone = undefined
      const fixed = fixer.fix(script, res1.errors, case1Semantic as any)
      const fixedScript: any = fixed.script
      expect(fixedScript.scenes[0].actions[0].id).toBe('plane_A_B_C')
    } finally {
      ;(globalThis as any).structuredClone = original
    }
  })

  it('不可修复错误应保留在 remainingErrors（missing_reference）', () => {
    const script: any = {
      title: 'bad',
      scenes: [
        { id: 's1', narration: 'x', camera: 'isometric', actions: [{ do: 'highlight', target: 'X', color: '#fff' }] },
      ],
    }

    const res1 = validator.validate(script, case3Semantic as any)
    expect(res1.errors.some((e) => e.type === 'missing_reference')).toBe(true)

    const fixed = fixer.fix(script, res1.errors, case3Semantic as any)
    expect(fixed.fixed).toBe(false)
    expect(fixed.remainingErrors.some((e) => e.type === 'missing_reference')).toBe(true)
  })

  it('可修复 + 不可修复混合时：fixed=false，但应应用可修复项', () => {
    const script: any = {
      title: 'bad',
      scenes: [
        {
          id: 's1',
          narration: 'x',
          camera: 'isometric',
          actions: [
            { do: 'drawLine', from: 'A', to: 'B' }, // missing_id（可修复）
            { do: 'fly', target: 'A' }, // unknown_action（不可修复）
          ],
        },
      ],
    }

    const res1 = validator.validate(script, case1Semantic as any)
    expect(res1.errors.some((e) => e.type === 'missing_id')).toBe(true)
    expect(res1.errors.some((e) => e.type === 'unknown_action')).toBe(true)

    const fixed = fixer.fix(script, res1.errors, case1Semantic as any)
    expect(fixed.fixed).toBe(false)
    const fixedScript: any = fixed.script
    expect(fixedScript.scenes[0].actions[0].id).toBe('line_A_B')
    expect(fixed.remainingErrors.some((e) => e.type === 'unknown_action')).toBe(true)
  })

  it('together 内部的创建型动作也应被修复（覆盖递归分支）', () => {
    const script: any = {
      title: 'bad',
      scenes: [
        {
          id: 's1',
          narration: 'x',
          camera: 'isometric',
          actions: [
            {
              do: 'together',
              actions: [
                { do: 'drawLine', from: 'A', to: 'B' }, // missing_id
                { do: 'showPath', from: 'A', to: 'B' }, // missing_id
              ],
            },
          ],
        },
      ],
    }

    const res1 = validator.validate(script, case1Semantic as any)
    expect(res1.errors.some((e) => e.type === 'missing_id')).toBe(true)

    const fixed = fixer.fix(script, res1.errors, case1Semantic as any)
    const fixedScript: any = fixed.script
    const nested = fixedScript.scenes[0].actions[0].actions
    expect(nested[0].id).toBe('line_A_B')
    expect(nested[1].id).toBe('path_A_B')
  })
})

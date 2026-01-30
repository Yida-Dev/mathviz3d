import { describe, it, expect } from 'vitest'
import { CoordCalculator } from '@/core/coord-calculator'
import { Validator } from '@/core/validator'
import { AutoFixer } from '@/core/auto-fixer'
import { Compiler } from '@/core/compiler'
import { Player } from '@/core/player'

import case1Semantic from '../fixtures/case1/semantic.json'
import case1Expected from '../fixtures/case1/expected.json'
import case1Script from '../fixtures/case1/animation.json'
import case3Semantic from '../fixtures/case3/semantic.json'
import case3Script from '../fixtures/case3/animation.json'

describe('Complete data flow', () => {
  it('Case 1: semantic → coords → measurements', () => {
    const calc = new CoordCalculator(case1Semantic as any)
    const tol = (case1Expected as any).tolerance as number

    // 动点默认参数为 0.5
    const P = calc.getPointCoord('P')
    const expectedP = (case1Expected as any).specialPoints['P_0.5'] as [number, number, number]
    expect(Math.abs(P.x - expectedP[0])).toBeLessThanOrEqual(tol)
    expect(Math.abs(P.y - expectedP[1])).toBeLessThanOrEqual(tol)
    expect(Math.abs(P.z - expectedP[2])).toBeLessThanOrEqual(tol)

    const volume = calc.getMeasurement('volume_MPQN')
    expect(Math.abs(volume - 1 / 24)).toBeLessThanOrEqual(tol)
  })

  it('Case 1: validate → fix → compile → play', () => {
    const validator = new Validator()
    const fixer = new AutoFixer()
    const compiler = new Compiler()
    const player = new Player()

    const validationResult = validator.validate(case1Script as any, case1Semantic as any)
    expect(validationResult.valid).toBe(true)

    const fixed = fixer.fix(case1Script as any, validationResult.errors, case1Semantic as any)
    const script = (fixed.script ?? case1Script) as any

    const { timeline, elementRegistry } = compiler.compile(script, case1Semantic as any)
    expect(timeline.duration).toBeGreaterThan(0)
    expect(elementRegistry.elements.size).toBeGreaterThan(0)

    const midTime = timeline.duration / 2
    const state = player.getState(timeline, midTime)
    expect(state.currentSceneId).toBeDefined()
    expect(typeof state.subtitle).toBe('string')
  })

  it('Case 3: fold 动画开始/结束状态应正确', () => {
    const compiler = new Compiler()
    const player = new Player()

    const { timeline } = compiler.compile(case3Script as any, case3Semantic as any)
    const foldScene = timeline.scenes.find((s) => s.id === 'folding')
    expect(foldScene).toBeDefined()

    const startState = player.getState(timeline, foldScene!.startTime)
    expect(startState.foldAngles.get('fold_BD')).toBeCloseTo(0, 6)

    const endState = player.getState(timeline, foldScene!.endTime - 0.1)
    expect(endState.foldAngles.get('fold_BD')).toBeCloseTo(90, 0)
  })
})


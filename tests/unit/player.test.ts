import { describe, it, expect } from 'vitest'
import { Compiler } from '@/core/compiler'
import { Player } from '@/core/player'

import case1Semantic from '../fixtures/case1/semantic.json'
import case1Script from '../fixtures/case1/animation.json'
import case3Semantic from '../fixtures/case3/semantic.json'
import case3Script from '../fixtures/case3/animation.json'

describe('Player', () => {
  const compiler = new Compiler()
  const player = new Player()

  it('getState 应是纯函数：相同输入相同输出', () => {
    const { timeline } = compiler.compile(case1Script as any, case1Semantic as any)
    const t = timeline.duration / 2

    const s1 = player.getState(timeline, t)
    const s2 = player.getState(timeline, t)
    expect(s1).toEqual(s2)
  })

  it('getState 不应修改 timeline（无副作用）', () => {
    const { timeline } = compiler.compile(case1Script as any, case1Semantic as any)
    const original = JSON.stringify(timeline)

    player.getState(timeline, 0)
    player.getState(timeline, timeline.duration / 2)
    player.getState(timeline, timeline.duration)

    expect(JSON.stringify(timeline)).toBe(original)
  })

  it('时间定位：t=0 为第一个场景，t=末尾为最后一个场景', () => {
    const { timeline } = compiler.compile(case1Script as any, case1Semantic as any)
    expect(player.getCurrentSceneId(timeline, 0)).toBe(case1Script.scenes[0].id)
    expect(player.getCurrentSceneId(timeline, timeline.duration)).toBe(case1Script.scenes[case1Script.scenes.length - 1].id)
  })

  it('动点参数插值：animatePoint(from=0,to=1,duration=2) 在 t=1 时应约为 0.5', () => {
    const semantic: any = {
      problemId: 'x',
      problemText: '',
      baseGeometry: { type: 'cube', size: 1 },
      points: [{ id: 'P', type: 'onSegment', from: 'A', to: 'B', param: 'p' }],
      params: [{ id: 'p', min: 0, max: 1, default: 0 }],
      question: '',
    }
    const script: any = {
      title: 't',
      scenes: [
        {
          id: 's1',
          narration: '',
          camera: 'isometric',
          actions: [{ do: 'animatePoint', target: 'P', from: 0, to: 1, duration: 2 }],
        },
      ],
    }

    const { timeline } = compiler.compile(script, semantic)
    const state = player.getState(timeline, 1) // 场景内 1s
    expect(state.paramValues.get('p')).toBeCloseTo(0.5, 6)
  })

  it('翻折角度插值：fold(from=0,to=90,duration=4) 在 t=2 时应约为 45', () => {
    const semantic: any = {
      problemId: 'x',
      problemText: '',
      baseGeometry: { type: 'square', size: 1 },
      points: [],
      folds: [
        {
          id: 'fold1',
          hinge: ['B', 'D'],
          movingPoints: ['A'],
          foldedPoints: ["A'"],
          defaultAngle: 0,
        },
      ],
      question: '',
    }
    const script: any = {
      title: 't',
      scenes: [
        {
          id: 's1',
          narration: '',
          camera: 'isometric',
          actions: [{ do: 'fold', foldId: 'fold1', fromAngle: 0, toAngle: 90, duration: 4 }],
        },
      ],
    }

    const { timeline } = compiler.compile(script, semantic)
    const state = player.getState(timeline, 2)
    expect(state.foldAngles.get('fold1')).toBeCloseTo(45, 6)
  })

  it('透明度插值：fadeIn 在中点应约为 0.5', () => {
    const semantic: any = {
      problemId: 'x',
      problemText: '',
      baseGeometry: { type: 'cube', size: 1 },
      points: [],
      question: '',
    }
    const script: any = {
      title: 't',
      scenes: [{ id: 's1', narration: '', camera: 'isometric', actions: [{ do: 'fadeIn', target: 'geometry' }] }],
    }

    const { timeline } = compiler.compile(script, semantic)
    const state = player.getState(timeline, 0.4) // 0.8 的中点
    expect(state.opacities.get('geometry')).toBeCloseTo(0.5, 6)
  })

  it('pulse(times=3) 应在 duration 内多次闪烁，且不应在场景结束前被 Compiler 自动再点亮', () => {
    const semantic: any = {
      problemId: 'x',
      problemText: '',
      baseGeometry: { type: 'cube', size: 1 },
      points: [],
      question: '',
    }
    const script: any = {
      title: 't',
      scenes: [
        {
          id: 's1',
          narration: '',
          camera: 'isometric',
          actions: [{ do: 'pulse', target: 'A', color: '#ff0000', times: 3 }],
        },
      ],
    }

    const { timeline } = compiler.compile(script, semantic)

    // 1.5s / (2*3) = 0.25s 每段：on/off 交替
    expect(player.getState(timeline, 0.1).highlights.get('A')).toBe('#ff0000')
    expect(player.getState(timeline, 0.3).highlights.has('A')).toBe(false)
    expect(player.getState(timeline, 0.6).highlights.get('A')).toBe('#ff0000')

    // pulse 在 1.5s 时应结束；sceneDuration 还会有 +0.5s buffer，末尾不应再被点亮
    const endState = player.getState(timeline, timeline.duration - 0.1)
    expect(endState.highlights.has('A')).toBe(false)
  })

  it('场景状态：subtitle/activeMeasurements/visibleElements 应正确', () => {
    const semantic: any = {
      problemId: 'x',
      problemText: '',
      baseGeometry: { type: 'cube', size: 1 },
      points: [],
      measurements: [{ id: 'm1', type: 'distance', points: ['A', 'B'] }],
      question: '',
    }
    const script: any = {
      title: 't',
      scenes: [
        {
          id: 's1',
          narration: 'hello',
          camera: 'isometric',
          showMeasurements: ['m1'],
          actions: [{ do: 'fadeIn', target: 'geometry' }],
        },
      ],
    }

    const { timeline } = compiler.compile(script, semantic)
    const state = player.getState(timeline, 0)
    expect(state.subtitle).toBe('hello')
    expect(state.activeMeasurements).toEqual(['m1'])
    expect(state.visibleElements.has('geometry')).toBe(true)
  })

  it('任意 seek：折叠场景开始/结束 foldAngles 应正确', () => {
    const { timeline } = compiler.compile(case3Script as any, case3Semantic as any)
    const foldScene = timeline.scenes.find((s) => s.id === 'folding')
    expect(foldScene).toBeDefined()

    const startState = player.getState(timeline, foldScene!.startTime)
    expect(startState.foldAngles.get('fold_BD')).toBeCloseTo(0, 6)

    const endState = player.getState(timeline, foldScene!.endTime - 0.1)
    expect(endState.foldAngles.get('fold_BD')).toBeCloseTo(90, 0)
  })

  it('边界分支：Timeline.scenes 为空应抛错', () => {
    expect(() => player.getState({ duration: 0, scenes: [] } as any, 0)).toThrow()
  })

  it('边界分支：空 keyframes/无 prev/span<=0/空 cameraTrack 不应崩溃', () => {
    const timeline: any = {
      duration: 1,
      scenes: [
        {
          id: 's1',
          startTime: 0,
          endTime: 1,
          narration: '',
          activeMeasurements: [],
          cameraTrack: [],
          actionTracks: [
            { targetId: 'geometry', property: 'visibility', keyframes: [] }, // keyframes.length===0
            { targetId: 'geometry', property: 'opacity', keyframes: [{ time: 1, value: 0.2 }] }, // t=0 无 prev
            { targetId: 'p', property: 'param', keyframes: [{ time: 0, value: 0 }, { time: 0, value: 1 }] }, // span<=0
            { targetId: 'A', property: 'highlight', keyframes: [{ time: 0, value: '#f00' }, { time: 1, value: null }] }, // 非数字分支
          ],
        },
      ],
    }

    const state = player.getState(timeline, 0)
    expect(state.visibleElements.has('geometry')).toBe(false)
    expect(state.opacities.has('geometry')).toBe(false)
    expect(state.paramValues.get('p')).toBe(1)
    expect(state.camera.position).toEqual({ x: 0, y: 0, z: 0 })
  })
})

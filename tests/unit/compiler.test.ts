import { describe, it, expect } from 'vitest'
import { Compiler } from '@/core/compiler'

import case1Semantic from '../fixtures/case1/semantic.json'
import case1Script from '../fixtures/case1/animation.json'
import case2Semantic from '../fixtures/case2/semantic.json'
import case2Script from '../fixtures/case2/animation.json'

describe('Compiler', () => {
  const compiler = new Compiler()

  it('单场景时长 = max(字幕时长, 动作时长) + 0.5s', () => {
    const semantic: any = {
      problemId: 'x',
      problemText: '',
      baseGeometry: { type: 'cube', size: 1 },
      points: [],
      question: '',
    }
    const script: any = {
      title: 't',
      scenes: [{ id: 's1', narration: '1234567890', camera: 'isometric', actions: [] }], // 10字 -> 2s
    }

    const { timeline } = compiler.compile(script, semantic)
    const scene = timeline.scenes[0]
    expect(scene.endTime - scene.startTime).toBeCloseTo(2.5, 6)
  })

  it('多场景总时长 = sum(场景时长)', () => {
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
        { id: 's1', narration: '', camera: 'isometric', actions: [{ do: 'wait', duration: 1 }] }, // 1 + 0.5
        { id: 's2', narration: '', camera: 'isometric', actions: [{ do: 'wait', duration: 2 }] }, // 2 + 0.5
      ],
    }

    const { timeline } = compiler.compile(script, semantic)
    expect(timeline.duration).toBeCloseTo(4.0, 6)
  })

  it('fadeIn 默认时长 0.8s', () => {
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
    expect(timeline.duration).toBeCloseTo(1.3, 6) // 0.8 + 0.5
  })

  it('drawLine 默认时长 1.0s', () => {
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
          actions: [{ do: 'drawLine', id: 'line_AB', from: 'A', to: 'B' }],
        },
      ],
    }
    const { timeline } = compiler.compile(script, semantic)
    expect(timeline.duration).toBeCloseTo(1.5, 6) // 1.0 + 0.5
  })

  it('animatePoint 指定时长优先使用', () => {
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
      scenes: [{ id: 's1', narration: '', camera: 'isometric', actions: [{ do: 'animatePoint', target: 'P', from: 0, to: 1, duration: 4 }] }],
    }
    const { timeline } = compiler.compile(script, semantic)
    expect(timeline.duration).toBeCloseTo(4.5, 6)
  })

  it('together 时长 = max(子动作时长)', () => {
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
          actions: [
            {
              do: 'together',
              actions: [
                { do: 'wait', duration: 1 },
                { do: 'wait', duration: 3 },
              ],
            },
          ],
        },
      ],
    }
    const { timeline } = compiler.compile(script, semantic)
    expect(timeline.duration).toBeCloseTo(3.5, 6)
  })

  it('可见性继承：上一场景显示的元素，下一场景默认可见', () => {
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
        { id: 's1', narration: '', camera: 'isometric', actions: [{ do: 'fadeIn', target: 'geometry' }] },
        { id: 's2', narration: '', camera: 'isometric', actions: [] },
      ],
    }
    const { timeline } = compiler.compile(script, semantic)
    const scene2 = timeline.scenes[1]
    const visTrack = scene2.actionTracks.find((t) => t.property === 'visibility' && t.targetId === 'geometry')
    expect(visTrack).toBeDefined()
    expect(visTrack?.keyframes[0]?.time).toBe(0)
    expect(visTrack?.keyframes[0]?.value).toBe(true)
  })

  it('高亮不继承：下一场景不应自动包含 highlight track', () => {
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
        { id: 's1', narration: '', camera: 'isometric', actions: [{ do: 'highlight', target: 'A', color: '#ff0000' }] },
        { id: 's2', narration: '', camera: 'isometric', actions: [] },
      ],
    }
    const { timeline } = compiler.compile(script, semantic)
    const scene2 = timeline.scenes[1]
    expect(scene2.actionTracks.some((t) => t.property === 'highlight')).toBe(false)
  })

  it('参数继承：paramValues 保持最后值（scene2 time=0 应有继承 keyframe）', () => {
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
        { id: 's1', narration: '', camera: 'isometric', actions: [{ do: 'animatePoint', target: 'P', from: 0, to: 1, duration: 1 }] },
        { id: 's2', narration: '', camera: 'isometric', actions: [] },
      ],
    }
    const { timeline } = compiler.compile(script, semantic)
    const scene2 = timeline.scenes[1]
    const track = scene2.actionTracks.find((t) => t.property === 'param' && t.targetId === 'p')
    expect(track).toBeDefined()
    expect(track?.keyframes[0]?.time).toBe(0)
    expect(track?.keyframes[0]?.value).toBe(1)
  })

  it('ElementRegistry 应包含 drawLine/showPlane/showTetrahedron 的定义', () => {
    const r1 = compiler.compile(case1Script as any, case1Semantic as any)
    expect(r1.elementRegistry.elements.get('line_AD1')?.type).toBe('line')
    expect(r1.elementRegistry.elements.get('tetrahedron_MPQN')?.type).toBe('tetrahedron')

    const r2 = compiler.compile(case2Script as any, case2Semantic as any)
    expect(r2.elementRegistry.elements.get('plane_ABC')?.type).toBe('plane')
  })

  it('应覆盖 show/hide/fadeOut/pulse/showPath/showTetrahedron/fold 默认时长等分支', () => {
    const semantic: any = {
      problemId: 'x',
      problemText: '',
      baseGeometry: { type: 'square', size: 1 },
      points: [{ id: 'P', type: 'onSegment', from: 'A', to: 'B', param: 'p' }],
      params: [{ id: 'p', min: 0, max: 1, default: 0 }],
      folds: [{ id: 'fold1', hinge: ['B', 'D'], movingPoints: ['A'], foldedPoints: ["A'"], defaultAngle: 0 }],
      question: '',
    }

    const script: any = {
      title: 't',
      scenes: [
        {
          id: 's1',
          narration: '',
          camera: {
            spherical: { radius: 2, theta: 10, phi: 20 },
            lookAt: 'A', // 覆盖 lookAt !== center 分支
            transition: 'instant', // 覆盖 transition=instant 分支
          },
          actions: [
            { do: 'show', target: 'geometry' },
            { do: 'hide', target: 'geometry' },
            { do: 'fadeOut', target: 'geometry' }, // 覆盖 fromOpacity=1 分支
            { do: 'fadeIn', target: 'geometry' },
            { do: 'fadeOut', target: 'geometry' }, // 覆盖 fromOpacity=ctx.opacities 分支
            { do: 'pulse', target: 'A', color: '#ff0000' },
            { do: 'showPath', id: 'path_AB', from: 'A', to: 'B' },
            { do: 'showTetrahedron', id: 't1', vertices: ['A', 'B', 'C', 'D'] },
            { do: 'fold', foldId: 'fold1', fromAngle: 0, toAngle: 90 }, // 默认 2.0s
            { do: 'wait' }, // duration 非 number -> 0
            { do: 'together', actions: null }, // actions 非数组 -> []
            { do: 'fly', target: 'A' }, // 未知动作 -> 0
          ],
        },
      ],
    }

    const { timeline, elementRegistry } = compiler.compile(script, semantic)
    expect(timeline.duration).toBeGreaterThan(0)
    expect(elementRegistry.elements.get('path_AB')?.type).toBe('path')
    expect(elementRegistry.elements.get('t1')?.type).toBe('tetrahedron')
  })

  it('animatePoint 目标不是 onSegment 时应抛错（覆盖 resolveParamIdForPoint throw 分支）', () => {
    const semantic: any = {
      problemId: 'x',
      problemText: '',
      baseGeometry: { type: 'cube', size: 1 },
      points: [{ id: 'M', type: 'midpoint', of: ['A', 'B'] }],
      question: '',
    }
    const script: any = {
      title: 't',
      scenes: [{ id: 's1', narration: '', camera: 'isometric', actions: [{ do: 'animatePoint', target: 'M', from: 0, to: 1 }] }],
    }
    expect(() => compiler.compile(script, semantic)).toThrow()
  })

  it('缺少 id 的创建型动作应抛错', () => {
    const semantic: any = {
      problemId: 'x',
      problemText: '',
      baseGeometry: { type: 'cube', size: 1 },
      points: [],
      question: '',
    }
    const script: any = {
      title: 't',
      scenes: [{ id: 's1', narration: '', camera: 'isometric', actions: [{ do: 'showPath', from: 'A', to: 'B' }] }],
    }
    expect(() => compiler.compile(script, semantic)).toThrow()
  })

  it('应覆盖更多边界分支（narration 缺失、dashed、非数组 points/vertices、color 为空、未知 transition、null action）', () => {
    const semantic: any = {
      problemId: 'x',
      problemText: '',
      baseGeometry: { type: 'cube', size: 1 },
      points: [{ id: 'P', type: 'onSegment', from: 'A', to: 'B', param: 'p' }],
      params: [{ id: 'p', min: 0, max: 1, default: 0 }],
      folds: [],
      question: '',
    }

    const script: any = {
      title: 't',
      scenes: [
        {
          id: 's1',
          // narration 故意缺失，覆盖 `scene.narration ?? ''`
          camera: {
            spherical: { radius: 2, theta: 10, phi: 20 },
            lookAt: 'center',
            transition: 'weird', // 覆盖 mapTransitionToEasing default 分支
          },
          actions: [
            null, // 覆盖 compileAction 的 early return 分支
            { do: 'drawLine', id: 'line_AB', from: 'A', to: 'B', style: 'dashed' }, // 覆盖 dashed
            { do: 'showPlane', id: 'plane1', points: null }, // Array.isArray false
            { do: 'showTetrahedron', id: 't1', vertices: null }, // Array.isArray false
            { do: 'highlight', target: 'A', color: '' }, // color 为 falsy，覆盖 if(color) false
          ],
        },
      ],
    }

    const { timeline } = compiler.compile(script, semantic)
    expect(timeline.scenes[0].cameraTrack[0].easing).toBe('ease')
  })
})

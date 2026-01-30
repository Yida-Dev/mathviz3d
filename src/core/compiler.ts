import type { Action, AnimationScript, SemanticDefinition } from '@/core/types'
import type { ElementDefinition, ElementRegistry } from '@/core/element-registry'
import type { ActionProperty, ActionTrack, CameraKeyframe, CompiledScene, PropertyKeyframe, Timeline } from '@/core/timeline'
import { CoordCalculator } from '@/core/coord-calculator'
import { resolveCameraConfig } from '@/core/camera'

export interface CompileResult {
  timeline: Timeline
  elementRegistry: ElementRegistry
}

export class Compiler {
  compile(script: AnimationScript, semantic: SemanticDefinition): CompileResult {
    const registry: Map<string, ElementDefinition> = new Map()
    const scenes: CompiledScene[] = []

    const calc = new CoordCalculator(semantic)

    // ===== 继承状态（跨场景） =====
    // 约定：视频讲解模式下，基础点（顶点 + 语义点 + 翻折点）默认可见，
    // 否则脚本只做 fadeIn geometry/vertexLabels 时会出现「只有标签，没有点球体」的体验问题。
    const visible = new Set<string>(defaultVisiblePointIds(semantic))
    const opacities = new Map<string, number>()

    const paramValues = new Map<string, number>((semantic.params ?? []).map((p) => [p.id, p.default]))
    const foldAngles = new Map<string, number>()
    for (const fold of semantic.folds ?? []) {
      const byParam = fold.angleParam ? paramValues.get(fold.angleParam) : undefined
      foldAngles.set(fold.id, byParam ?? fold.defaultAngle ?? 180)
    }

    let globalCursor = 0

    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i]

      const trackMap = new Map<string, PropertyKeyframe[]>()

      // 1) 继承：把上一场景的终态作为本场景 time=0 的初始 keyframe
      for (const id of visible) {
        pushKeyframe(trackMap, 'visibility', id, { time: 0, value: true })
      }
      for (const [id, opacity] of opacities.entries()) {
        pushKeyframe(trackMap, 'opacity', id, { time: 0, value: opacity })
      }
      for (const [paramId, v] of paramValues.entries()) {
        pushKeyframe(trackMap, 'param', paramId, { time: 0, value: v })
      }
      for (const [foldId, v] of foldAngles.entries()) {
        pushKeyframe(trackMap, 'fold', foldId, { time: 0, value: v })
      }

      // 2) 相机轨道（MVP：每场景一个关键帧）
      const cam = resolveCameraConfig(scene.camera)
      const lookAtVec =
        cam.lookAt === 'center'
          ? { x: 0, y: 0, z: 0 }
          : calc.getPointCoord(cam.lookAt, {
              params: new Map(paramValues),
              foldAngles: new Map(foldAngles),
            })

      const cameraTrack: CameraKeyframe[] = [
        {
          time: 0,
          spherical: {
            radius: cam.spherical.radius,
            theta: cam.spherical.theta,
            phi: cam.spherical.phi,
          },
          lookAt: lookAtVec,
          easing: mapTransitionToEasing(cam.transition),
        },
      ]

      // 3) 动作编译：生成 actionTracks，并更新继承状态的终态
      let localCursor = 0
      // 仅对「需要持续到场景结束」的高亮做自动清除；pulse 自带 on/off 关键帧，不应被场景末尾再次点亮
      const highlighted = new Set<string>()
      const highlightColor = new Map<string, string>()

      for (const action of scene.actions) {
        const duration = compileAction(action, {
          semantic,
          registry,
          trackMap,
          startTime: localCursor,
          visible,
          opacities,
          paramValues,
          foldAngles,
          highlighted,
          highlightColor,
        })
        localCursor += duration
      }

      const actionTotal = localCursor
      const narration = scene.narration ?? ''
      const readingTime = narration.length / 5
      const sceneDuration = Math.max(readingTime, actionTotal) + 0.5

      // 4) 高亮不继承：场景结束清除
      for (const target of highlighted) {
        const color = highlightColor.get(target)
        if (color) {
          pushKeyframe(trackMap, 'highlight', target, {
            time: Math.max(0, sceneDuration - 0.3),
            value: color,
          })
        }
        pushKeyframe(trackMap, 'highlight', target, { time: sceneDuration, value: null })
      }

      // 5) 输出 ActionTrack[]
      const actionTracks: ActionTrack[] = []
      for (const [key, keyframes] of trackMap.entries()) {
        const { property, targetId } = parseTrackKey(key)
        const sorted = [...keyframes].sort((a, b) => a.time - b.time)
        actionTracks.push({ targetId, property, keyframes: sorted })
      }

      const startTime = globalCursor
      const endTime = startTime + sceneDuration
      globalCursor = endTime

      scenes.push({
        id: scene.id,
        startTime,
        endTime,
        narration,
        activeMeasurements: scene.showMeasurements ?? [],
        cameraTrack,
        actionTracks,
      })

      // 6) 高亮不继承：跨场景不携带
      // visible/opacities/paramValues/foldAngles 已在 compileAction 中就地更新为终态
    }

    return {
      timeline: { duration: globalCursor, scenes },
      elementRegistry: { elements: registry },
    }
  }
}

function defaultVisiblePointIds(semantic: SemanticDefinition): string[] {
  const ids = new Set<string>()
  // 基础顶点
  for (const id of baseVertexIds(semantic.baseGeometry.type)) ids.add(id)
  // 语义点（E/F/P/Q...）
  for (const p of semantic.points ?? []) ids.add(p.id)
  // 翻折点（A'...）
  for (const fold of semantic.folds ?? []) {
    for (const id of fold.foldedPoints) ids.add(id)
  }
  return [...ids]
}

function baseVertexIds(type: SemanticDefinition['baseGeometry']['type']): string[] {
  switch (type) {
    case 'cube':
    case 'cuboid':
      return ['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1']
    case 'tetrahedron':
      return ['A', 'B', 'C', 'D']
    case 'square':
      return ['A', 'B', 'C', 'D']
    default:
      return []
  }
}

function compileAction(
  action: Action,
  ctx: {
    semantic: SemanticDefinition
    registry: Map<string, ElementDefinition>
    trackMap: Map<string, PropertyKeyframe[]>
    startTime: number
    visible: Set<string>
    opacities: Map<string, number>
    paramValues: Map<string, number>
    foldAngles: Map<string, number>
    highlighted: Set<string>
    highlightColor: Map<string, string>
  }
): number {
  const a: any = action
  if (!a || typeof a.do !== 'string') return 0

  switch (a.do as string) {
    case 'show': {
      const duration = 0.5
      const target = String(a.target ?? '')
      pushKeyframe(ctx.trackMap, 'visibility', target, { time: ctx.startTime + duration, value: true })
      ctx.visible.add(target)
      return duration
    }
    case 'hide': {
      const duration = 0.5
      const target = String(a.target ?? '')
      pushKeyframe(ctx.trackMap, 'visibility', target, { time: ctx.startTime + duration, value: false })
      ctx.visible.delete(target)
      return duration
    }
    case 'fadeIn': {
      const duration = typeof a.duration === 'number' ? a.duration : 0.8
      const target = String(a.target ?? '')
      pushKeyframe(ctx.trackMap, 'visibility', target, { time: ctx.startTime, value: true })
      pushKeyframe(ctx.trackMap, 'opacity', target, { time: ctx.startTime, value: 0 })
      pushKeyframe(ctx.trackMap, 'opacity', target, { time: ctx.startTime + duration, value: 1, easing: 'ease-in-out' })
      ctx.visible.add(target)
      ctx.opacities.set(target, 1)
      return duration
    }
    case 'fadeOut': {
      const duration = typeof a.duration === 'number' ? a.duration : 0.8
      const target = String(a.target ?? '')
      const fromOpacity = ctx.opacities.get(target) ?? 1
      pushKeyframe(ctx.trackMap, 'opacity', target, { time: ctx.startTime, value: fromOpacity })
      pushKeyframe(ctx.trackMap, 'opacity', target, { time: ctx.startTime + duration, value: 0, easing: 'ease-in-out' })
      pushKeyframe(ctx.trackMap, 'visibility', target, { time: ctx.startTime + duration, value: false })
      ctx.visible.delete(target)
      ctx.opacities.set(target, 0)
      return duration
    }
    case 'highlight': {
      const duration = 1.0
      const target = String(a.target ?? '')
      const color = String(a.color ?? '#ff0000')
      // highlight 语义：从动作开始即进入高亮状态，并预留 duration 给观众“看清楚”
      pushKeyframe(ctx.trackMap, 'highlight', target, { time: ctx.startTime, value: color })
      ctx.highlighted.add(target)
      ctx.highlightColor.set(target, color)
      return duration
    }
    case 'pulse': {
      const duration = 1.5
      const target = String(a.target ?? '')
      const color = String(a.color ?? '#ff0000')
      const timesRaw = typeof a.times === 'number' ? a.times : 1
      const times = Math.max(1, Math.floor(timesRaw))

      // pulse 语义：在 duration 内闪烁 times 次。用 2*times 段交替 on/off（Renderer 只认高亮色或 null）
      const segment = duration / (2 * times)
      for (let i = 0; i < 2 * times; i++) {
        const t = ctx.startTime + i * segment
        const value = i % 2 === 0 ? color : null
        pushKeyframe(ctx.trackMap, 'highlight', target, { time: t, value })
      }
      // 兜底：确保 pulse 结束时为关闭状态
      pushKeyframe(ctx.trackMap, 'highlight', target, { time: ctx.startTime + duration, value: null })
      return duration
    }
    case 'drawLine': {
      const duration = 1.0
      const id = String(a.id ?? '')
      if (!id) throw new Error('drawLine 缺少 id')
      const from = String(a.from ?? '')
      const to = String(a.to ?? '')
      const style = (a.style === 'dashed' ? 'dashed' : 'solid') as 'solid' | 'dashed'
      const color = typeof a.color === 'string' ? a.color : '#888888'
      ctx.registry.set(id, { type: 'line', id, from, to, style, color })
      pushKeyframe(ctx.trackMap, 'visibility', id, { time: ctx.startTime + duration, value: true })
      ctx.visible.add(id)
      return duration
    }
    case 'showPath': {
      const duration = 0.8
      const id = String(a.id ?? '')
      if (!id) throw new Error('showPath 缺少 id')
      const from = String(a.from ?? '')
      const to = String(a.to ?? '')
      const color = typeof a.color === 'string' ? a.color : '#ffaa00'
      ctx.registry.set(id, { type: 'path', id, from, to, color })
      pushKeyframe(ctx.trackMap, 'visibility', id, { time: ctx.startTime + duration, value: true })
      ctx.visible.add(id)
      return duration
    }
    case 'showPlane': {
      const duration = 1.0
      const id = String(a.id ?? '')
      if (!id) throw new Error('showPlane 缺少 id')
      const points = Array.isArray(a.points) ? (a.points as unknown[]).map((x) => String(x)) : []
      const color = typeof a.color === 'string' ? a.color : '#3b82f6'
      const opacity = typeof a.opacity === 'number' ? a.opacity : 0.2
      ctx.registry.set(id, { type: 'plane', id, points, color, opacity })
      pushKeyframe(ctx.trackMap, 'visibility', id, { time: ctx.startTime + duration, value: true })
      pushKeyframe(ctx.trackMap, 'opacity', id, { time: ctx.startTime + duration, value: opacity })
      ctx.visible.add(id)
      ctx.opacities.set(id, opacity)
      return duration
    }
    case 'showTetrahedron': {
      const duration = 1.0
      const id = String(a.id ?? '')
      if (!id) throw new Error('showTetrahedron 缺少 id')
      const vertices = Array.isArray(a.vertices) ? (a.vertices as unknown[]).map((x) => String(x)) : []
      const color = typeof a.color === 'string' ? a.color : '#ff6666'
      const opacity = typeof a.opacity === 'number' ? a.opacity : 0.3
      ctx.registry.set(id, { type: 'tetrahedron', id, vertices, color, opacity })
      pushKeyframe(ctx.trackMap, 'visibility', id, { time: ctx.startTime + duration, value: true })
      pushKeyframe(ctx.trackMap, 'opacity', id, { time: ctx.startTime + duration, value: opacity })
      ctx.visible.add(id)
      ctx.opacities.set(id, opacity)
      return duration
    }
    case 'animatePoint': {
      const duration = typeof a.duration === 'number' ? a.duration : 3.0
      const targetPointId = String(a.target ?? '')
      const from = typeof a.from === 'number' ? a.from : 0
      const to = typeof a.to === 'number' ? a.to : 1

      const paramId = resolveParamIdForPoint(targetPointId, ctx.semantic)
      pushKeyframe(ctx.trackMap, 'param', paramId, { time: ctx.startTime, value: from })
      pushKeyframe(ctx.trackMap, 'param', paramId, { time: ctx.startTime + duration, value: to, easing: 'linear' })
      ctx.paramValues.set(paramId, to)
      return duration
    }
    case 'fold': {
      const duration = typeof a.duration === 'number' ? a.duration : 2.0
      const foldId = String(a.foldId ?? '')
      const fromAngle = typeof a.fromAngle === 'number' ? a.fromAngle : 0
      const toAngle = typeof a.toAngle === 'number' ? a.toAngle : 180
      pushKeyframe(ctx.trackMap, 'fold', foldId, { time: ctx.startTime, value: fromAngle })
      pushKeyframe(ctx.trackMap, 'fold', foldId, { time: ctx.startTime + duration, value: toAngle, easing: 'linear' })
      ctx.foldAngles.set(foldId, toAngle)
      return duration
    }
    case 'together': {
      const actions = Array.isArray(a.actions) ? (a.actions as Action[]) : []
      let max = 0
      for (const child of actions) {
        const d = compileAction(child, { ...ctx, startTime: ctx.startTime })
        if (d > max) max = d
      }
      return max
    }
    case 'wait': {
      const duration = typeof a.duration === 'number' ? a.duration : 0
      return duration
    }
    default:
      // 未知动作（理论上 Validator 已拦截），作为 no-op 处理
      return 0
  }
}

function resolveParamIdForPoint(pointId: string, semantic: SemanticDefinition): string {
  const def = semantic.points.find((p) => p.id === pointId)
  if (!def || def.type !== 'onSegment' || !def.param) {
    throw new Error(`无法从语义中解析动点参数: ${pointId}`)
  }
  return def.param
}

function pushKeyframe(
  trackMap: Map<string, PropertyKeyframe[]>,
  property: ActionProperty,
  targetId: string,
  keyframe: PropertyKeyframe
): void {
  const key = makeTrackKey(property, targetId)
  const list = trackMap.get(key) ?? []
  list.push(keyframe)
  trackMap.set(key, list)
}

function makeTrackKey(property: ActionProperty, targetId: string): string {
  return `${property}::${targetId}`
}

function parseTrackKey(key: string): { property: ActionProperty; targetId: string } {
  const idx = key.indexOf('::')
  if (idx === -1) throw new Error(`非法 track key: ${key}`)
  const property = key.slice(0, idx) as ActionProperty
  const targetId = key.slice(idx + 2)
  return { property, targetId }
}

function mapTransitionToEasing(transition: string): CameraKeyframe['easing'] {
  switch (transition) {
    case 'instant':
      return 'linear'
    case 'ease':
    case 'ease-in-out':
      return 'ease-in-out'
    default:
      return 'ease'
  }
}

import { useEffect, useMemo, useRef } from 'react'

import type { GeometryData } from '@/core/geometry-data'
import { buildGeometryData } from '@/core/geometry-data'
import { Renderer } from '@/core/renderer'
import type { ElementRegistry } from '@/core/element-registry'
import type { SceneState } from '@/core/scene-state'
import type { SemanticDefinition } from '@/core/types'

export function MainCanvas(props: {
  semantic: SemanticDefinition
  geometryData?: GeometryData
  state?: SceneState
  registry?: ElementRegistry
}) {
  const { semantic, geometryData: geometryDataProp, state, registry } = props
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<Renderer | null>(null)
  const stateRef = useRef<SceneState | null>(null)

  const geometryData = useMemo(() => geometryDataProp ?? buildGeometryData(semantic), [geometryDataProp, semantic])

  // 外部传入 state 时，用 ref 持有，避免每帧 React 触发渲染
  useEffect(() => {
    if (state) stateRef.current = state
  }, [state])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    if (!isWebGLAvailable()) {
      // 单测环境通常没有 WebGL，直接跳过初始化，避免噪声日志与不稳定行为
      return
    }

    let renderer: Renderer
    try {
      renderer = new Renderer(container, geometryData)
    } catch (err) {
      // 单元测试环境（happy-dom）可能没有 WebGL，上层仍应能正常渲染页面其它部分
      console.warn('Renderer 初始化失败（可能缺少 WebGL 环境）:', err)
      return
    }
    rendererRef.current = renderer

    // 没有外部 state 时，默认进入交互模式初始状态（保持向后兼容）
    if (!stateRef.current) {
      const paramValues = new Map<string, number>((semantic.params ?? []).map((p) => [p.id, p.default]))
      const foldAngles = new Map<string, number>()
      for (const fold of semantic.folds ?? []) {
        const byParam = fold.angleParam ? paramValues.get(fold.angleParam) : undefined
        foldAngles.set(fold.id, byParam ?? fold.defaultAngle ?? 180)
      }

      const visible = new Set<string>(['geometry', 'vertexLabels'])
      for (const id of geometryData.vertices.keys()) visible.add(id)
      for (const id of geometryData.points.keys()) visible.add(id)

      stateRef.current = {
        currentSceneId: 'interactive',
        globalTime: 0,
        sceneLocalTime: 0,
        visibleElements: visible,
        opacities: new Map(),
        highlights: new Map(),
        paramValues,
        foldAngles,
        camera: { position: { x: 4, y: 3, z: 5 }, lookAt: { x: 0, y: 0, z: 0 } },
        subtitle: '',
        activeMeasurements: [],
      }
    }

    let raf = 0
    const loop = () => {
      if (stateRef.current) renderer.render(stateRef.current)
      raf = window.requestAnimationFrame(loop)
    }
    loop()

    return () => {
      window.cancelAnimationFrame(raf)
      renderer.dispose()
      rendererRef.current = null
      stateRef.current = null
    }
  }, [geometryData, semantic.folds, semantic.params])

  // 视频模式：初始化辅助元素（createLine/showPlane/等）
  useEffect(() => {
    const r = rendererRef.current
    if (!r) return
    if (!registry) return
    r.initAnimationElements(registry)
  }, [registry])

  return <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
}

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
  } catch {
    return false
  }
}

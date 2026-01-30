import type { Vec3 } from '@/core/types'

export interface CameraState {
  position: Vec3
  lookAt: Vec3
  spherical?: {
    radius: number
    theta: number
    phi: number
  }
}

// Player.getState 的输出（Renderer 的输入）
export interface SceneState {
  currentSceneId: string

  globalTime: number
  sceneLocalTime: number

  visibleElements: Set<string>
  opacities: Map<string, number>
  highlights: Map<string, string>

  // 与 EvalContext.params 对应
  paramValues: Map<string, number>

  // 与 EvalContext.foldAngles 对应
  foldAngles: Map<string, number>

  camera: CameraState

  subtitle: string
  activeMeasurements: string[]
}


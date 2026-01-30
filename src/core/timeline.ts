import type { Vec3 } from '@/core/types'

export type EasingFunction = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out'

export interface Timeline {
  duration: number
  scenes: CompiledScene[]
}

export interface CompiledScene {
  id: string
  startTime: number
  endTime: number
  narration: string
  activeMeasurements: string[]
  cameraTrack: CameraKeyframe[]
  actionTracks: ActionTrack[]
}

export interface CameraKeyframe {
  time: number // 相对于场景开始的时间
  spherical: { radius: number; theta: number; phi: number }
  lookAt: Vec3
  easing: EasingFunction
}

export type ActionProperty = 'visibility' | 'opacity' | 'highlight' | 'param' | 'fold'

export interface ActionTrack {
  targetId: string
  property: ActionProperty
  keyframes: PropertyKeyframe[]
}

export interface PropertyKeyframe {
  time: number
  value: unknown
  easing?: EasingFunction
}


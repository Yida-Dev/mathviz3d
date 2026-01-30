import type { SceneState } from '@/core/scene-state'
import type { CameraKeyframe, Timeline } from '@/core/timeline'
import { applyEasing, lerp } from '@/core/easing'
import { sphericalToCartesian } from '@/core/camera'

export class Player {
  getState(timeline: Timeline, t: number): SceneState {
    if (timeline.scenes.length === 0) {
      throw new Error('Timeline.scenes 不能为空')
    }

    const globalTime = clamp(t, 0, timeline.duration)
    const scene = pickScene(timeline, globalTime)

    const localTime = clamp(globalTime - scene.startTime, 0, scene.endTime - scene.startTime)

    const visibleMap = new Map<string, boolean>()
    const opacities = new Map<string, number>()
    const highlights = new Map<string, string>()
    const paramValues = new Map<string, number>()
    const foldAngles = new Map<string, number>()

    for (const track of scene.actionTracks) {
      const value = sampleKeyframes(track.keyframes, localTime)
      switch (track.property) {
        case 'visibility': {
          if (typeof value === 'boolean') visibleMap.set(track.targetId, value)
          break
        }
        case 'opacity': {
          if (typeof value === 'number') opacities.set(track.targetId, value)
          break
        }
        case 'highlight': {
          if (typeof value === 'string') highlights.set(track.targetId, value)
          else if (value === null) highlights.delete(track.targetId)
          break
        }
        case 'param': {
          if (typeof value === 'number') paramValues.set(track.targetId, value)
          break
        }
        case 'fold': {
          if (typeof value === 'number') foldAngles.set(track.targetId, value)
          break
        }
        default:
          break
      }
    }

    const visibleElements = new Set<string>()
    for (const [id, v] of visibleMap.entries()) {
      if (v) visibleElements.add(id)
    }

    const camera = sampleCamera(scene.cameraTrack, localTime)

    return {
      currentSceneId: scene.id,
      globalTime,
      sceneLocalTime: localTime,
      visibleElements,
      opacities,
      highlights,
      paramValues,
      foldAngles,
      camera,
      subtitle: scene.narration,
      activeMeasurements: [...scene.activeMeasurements],
    }
  }

  getDuration(timeline: Timeline): number {
    return timeline.duration
  }

  getCurrentSceneId(timeline: Timeline, t: number): string {
    const globalTime = clamp(t, 0, timeline.duration)
    return pickScene(timeline, globalTime).id
  }
}

function pickScene(timeline: Timeline, t: number) {
  if (timeline.scenes.length === 0) throw new Error('Timeline.scenes 不能为空')

  if (t >= timeline.duration) return timeline.scenes[timeline.scenes.length - 1]

  for (const scene of timeline.scenes) {
    if (t >= scene.startTime && t < scene.endTime) return scene
  }

  // 理论不会到这里；兜底返回最后一个
  return timeline.scenes[timeline.scenes.length - 1]
}

function sampleKeyframes(keyframes: Array<{ time: number; value: unknown; easing?: any }>, t: number): unknown {
  if (keyframes.length === 0) return undefined

  // 找到 prev / next
  let prev: (typeof keyframes)[number] | undefined
  let next: (typeof keyframes)[number] | undefined

  for (let i = 0; i < keyframes.length; i++) {
    const kf = keyframes[i]
    if (kf.time <= t) prev = kf
    if (kf.time > t) {
      next = kf
      break
    }
  }

  if (!prev) return undefined
  if (!next) return prev.value

  if (typeof prev.value === 'number' && typeof next.value === 'number') {
    const span = next.time - prev.time
    if (span <= 0) return next.value
    const raw = (t - prev.time) / span
    const easing = (next.easing ?? prev.easing ?? 'linear') as any
    const eased = applyEasing(easing, raw)
    return lerp(prev.value, next.value, eased)
  }

  return prev.value
}

function sampleCamera(track: CameraKeyframe[], t: number) {
  if (track.length === 0) {
    return { position: { x: 0, y: 0, z: 0 }, lookAt: { x: 0, y: 0, z: 0 } }
  }

  // 找到 prev / next
  let prev: CameraKeyframe | undefined
  let next: CameraKeyframe | undefined

  for (let i = 0; i < track.length; i++) {
    const kf = track[i]
    if (kf.time <= t) prev = kf
    if (kf.time > t) {
      next = kf
      break
    }
  }

  if (!prev) prev = track[0]
  if (!next) {
    const spherical = prev.spherical
    return {
      position: sphericalToCartesian(spherical.radius, spherical.theta, spherical.phi),
      lookAt: prev.lookAt,
      spherical: { ...spherical },
    }
  }

  const span = next.time - prev.time
  const raw = span <= 0 ? 1 : (t - prev.time) / span
  const eased = applyEasing(next.easing, raw)

  const spherical = {
    radius: lerp(prev.spherical.radius, next.spherical.radius, eased),
    theta: lerp(prev.spherical.theta, next.spherical.theta, eased),
    phi: lerp(prev.spherical.phi, next.spherical.phi, eased),
  }

  const lookAt = {
    x: lerp(prev.lookAt.x, next.lookAt.x, eased),
    y: lerp(prev.lookAt.y, next.lookAt.y, eased),
    z: lerp(prev.lookAt.z, next.lookAt.z, eased),
  }

  return {
    position: sphericalToCartesian(spherical.radius, spherical.theta, spherical.phi),
    lookAt,
    spherical,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}


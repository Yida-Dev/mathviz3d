import type { CameraConfig, CameraFull, CameraPreset, Vec3 } from '@/core/types'

export const CAMERA_PRESETS: Record<CameraPreset, { theta: number; phi: number; radius: number }> = {
  front: { theta: 0, phi: 15, radius: 2.5 },
  top: { theta: 0, phi: 85, radius: 2.5 },
  side: { theta: 90, phi: 15, radius: 2.5 },
  isometric: { theta: 45, phi: 35, radius: 2.5 },
  'isometric-back': { theta: 225, phi: 35, radius: 2.5 },
}

export function resolveCameraConfig(config: CameraConfig): CameraFull {
  if (typeof config === 'string') {
    const preset = CAMERA_PRESETS[config]
    return {
      spherical: preset,
      lookAt: 'center',
      transition: 'ease',
    }
  }
  return config
}

export function sphericalToCartesian(radius: number, thetaDeg: number, phiDeg: number): Vec3 {
  const thetaRad = (thetaDeg * Math.PI) / 180
  const phiRad = (phiDeg * Math.PI) / 180
  return {
    x: radius * Math.cos(phiRad) * Math.cos(thetaRad),
    y: radius * Math.sin(phiRad),
    z: radius * Math.cos(phiRad) * Math.sin(thetaRad),
  }
}


import type { Vec3 } from '@/core/types'

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z }
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

export function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s }
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

export function length(v: Vec3): number {
  return Math.sqrt(dot(v, v))
}

export function normalize(v: Vec3): Vec3 {
  const len = length(v)
  if (len === 0) {
    throw new Error('Vec3 不能归一化零向量')
  }
  return scale(v, 1 / len)
}

export function distance(a: Vec3, b: Vec3): number {
  return length(sub(a, b))
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function safeAcos(x: number): number {
  // 浮点误差防护：把输入钳制到 [-1, 1]
  return Math.acos(clamp(x, -1, 1))
}

export function safeAsin(x: number): number {
  return Math.asin(clamp(x, -1, 1))
}

/**
 * 绕轴 AB 旋转点 P（罗德里格斯公式）
 * theta 为弧度。
 */
export function rotatePointAroundAxis(P: Vec3, A: Vec3, B: Vec3, theta: number): Vec3 {
  const axis = normalize(sub(B, A))
  const p = sub(P, A)

  const cosT = Math.cos(theta)
  const sinT = Math.sin(theta)

  const term1 = scale(p, cosT)
  const term2 = scale(cross(axis, p), sinT)
  const term3 = scale(axis, dot(axis, p) * (1 - cosT))

  return add(add(add(term1, term2), term3), A)
}


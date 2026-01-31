import type { GeometryType, SemanticDefinition } from '@/core/types'

export interface SemanticValidationResult {
  valid: boolean
  errors: string[]
}

const ALLOWED_GEOMETRY_TYPES: GeometryType[] = ['cube', 'cuboid', 'tetrahedron', 'square', 'prism', 'pyramid']

export function validateSemantic(obj: unknown): SemanticValidationResult {
  const errors: string[] = []

  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['返回值不是对象'] }
  }

  const o = obj as Record<string, unknown>

  // baseGeometry
  if (!o.baseGeometry || typeof o.baseGeometry !== 'object') {
    errors.push('缺少 baseGeometry')
  } else {
    const bg = o.baseGeometry as Record<string, unknown>
    const t = bg.type
    if (typeof t !== 'string' || !ALLOWED_GEOMETRY_TYPES.includes(t as GeometryType)) {
      errors.push(`baseGeometry.type 无效: ${String(t)}`)
    }
  }

  // points
  if (!Array.isArray(o.points)) {
    errors.push('缺少 points 数组')
  }

  // question
  if (typeof o.question !== 'string' || !o.question.trim()) {
    errors.push('缺少 question')
  }

  // problemId / problemText（UI 侧会展示）
  if (typeof o.problemId !== 'string') errors.push('缺少 problemId')
  if (typeof o.problemText !== 'string') errors.push('缺少 problemText')

  return { valid: errors.length === 0, errors }
}

/**
 * 用于在边界处辅助类型收窄。
 * 校验通过后才建议将 unknown 断言为 SemanticDefinition。
 */
export function assertSemantic(obj: unknown): asserts obj is SemanticDefinition {
  const res = validateSemantic(obj)
  if (!res.valid) {
    throw new Error(`AI 返回的 SemanticDefinition 不完整: ${res.errors.join(', ')}`)
  }
}


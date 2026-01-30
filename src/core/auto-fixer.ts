import type { Action, AnimationScript, CameraConfig, CameraFull, SemanticDefinition } from '@/core/types'
import type { AutoFixResult, FixApplied, ValidationError } from '@/core/validation'
import { clamp } from '@/core/math/vec3'

const CAMERA_PRESETS = new Set(['front', 'top', 'side', 'isometric', 'isometric-back'])

const FIXABLE_ERROR_TYPES = new Set<ValidationError['type']>([
  'missing_id',
  'invalid_phi',
  'invalid_preset',
  'duplicate_id',
])

export class AutoFixer {
  fix(script: AnimationScript, errors: ValidationError[], _semantic: SemanticDefinition): AutoFixResult {
    const remainingErrors = errors.filter((e) => !FIXABLE_ERROR_TYPES.has(e.type))
    const fixableErrors = errors.filter((e) => FIXABLE_ERROR_TYPES.has(e.type))

    if (fixableErrors.length === 0) {
      return { fixed: false, remainingErrors, fixes: [] }
    }

    const fixedScript = deepClone(script)
    const fixes: FixApplied[] = []

    // 1) 修复相机：preset/phi
    for (let i = 0; i < fixedScript.scenes.length; i++) {
      const scene = fixedScript.scenes[i]
      const cameraPath = `scenes[${i}].camera`

      if (typeof scene.camera === 'string') {
        if (!CAMERA_PRESETS.has(scene.camera)) {
          fixes.push({
            errorType: 'invalid_preset',
            path: cameraPath,
            original: scene.camera,
            fixed: 'isometric',
          })
          scene.camera = 'isometric'
        }
      } else if (isCameraFull(scene.camera)) {
        const phi = scene.camera.spherical.phi
        if (phi < 0 || phi > 90) {
          const clamped = clamp(phi, 0, 90)
          fixes.push({
            errorType: 'invalid_phi',
            path: `${cameraPath}.spherical.phi`,
            original: phi,
            fixed: clamped,
          })
          scene.camera.spherical.phi = clamped
        }
      }
    }

    // 2) 修复创建型动作：missing_id + duplicate_id
    const seenElementIds = new Set<string>()
    for (let i = 0; i < fixedScript.scenes.length; i++) {
      const scene = fixedScript.scenes[i]
      this.fixActionList(scene.actions, `scenes[${i}].actions`, seenElementIds, fixes)
    }

    // fixed 表示“所有错误都可被修复”，并不保证修复后一定通过 Validator（仍需重新校验）
    return {
      fixed: remainingErrors.length === 0,
      script: fixedScript,
      remainingErrors,
      fixes,
    }
  }

  private fixActionList(
    actions: Action[],
    basePath: string,
    seenElementIds: Set<string>,
    fixes: FixApplied[]
  ): void {
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i] as any
      const path = `${basePath}[${i}]`

      if (!action || typeof action.do !== 'string') continue

      // 递归处理 together
      if (action.do === 'together' && Array.isArray(action.actions)) {
        this.fixActionList(action.actions as Action[], `${path}.actions`, seenElementIds, fixes)
        continue
      }

      // 创建型动作：需要 id
      if (isCreateAction(action)) {
        const originalId = action.id as string | undefined
        if (!originalId || originalId.trim().length === 0) {
          const generated = generateIdForCreateAction(action)
          action.id = makeUniqueId(generated, seenElementIds)
          fixes.push({
            errorType: 'missing_id',
            path: `${path}.id`,
            original: originalId,
            fixed: action.id,
          })
          seenElementIds.add(action.id)
          continue
        }

        if (seenElementIds.has(originalId)) {
          const unique = makeUniqueId(originalId, seenElementIds)
          action.id = unique
          fixes.push({
            errorType: 'duplicate_id',
            path: `${path}.id`,
            original: originalId,
            fixed: unique,
          })
          seenElementIds.add(unique)
          continue
        }

        seenElementIds.add(originalId)
      }
    }
  }
}

function isCameraFull(camera: CameraConfig): camera is CameraFull {
  return (
    typeof camera === 'object' &&
    camera !== null &&
    'spherical' in camera &&
    typeof (camera as any).spherical?.phi === 'number'
  )
}

function isCreateAction(action: any): boolean {
  return action.do === 'drawLine' || action.do === 'showPath' || action.do === 'showPlane' || action.do === 'showTetrahedron'
}

function generateIdForCreateAction(action: any): string {
  switch (action.do) {
    case 'drawLine':
      return `line_${String(action.from ?? '').trim()}_${String(action.to ?? '').trim()}`
    case 'showPath':
      return `path_${String(action.from ?? '').trim()}_${String(action.to ?? '').trim()}`
    case 'showPlane':
      return `plane_${Array.isArray(action.points) ? action.points.join('_') : 'unknown'}`
    case 'showTetrahedron':
      return `tetrahedron_${Array.isArray(action.vertices) ? action.vertices.join('_') : 'unknown'}`
    default:
      return `element_${Date.now()}`
  }
}

function makeUniqueId(base: string, seen: Set<string>): string {
  if (!seen.has(base)) return base
  let i = 2
  while (seen.has(`${base}_${i}`)) i++
  return `${base}_${i}`
}

function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value)) as T
}


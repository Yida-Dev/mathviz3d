import type { Action, AnimationScript, CameraConfig, CameraFull, SemanticDefinition } from '@/core/types'
import type { ValidationError, ValidationResult, ValidationWarning } from '@/core/validation'

const CAMERA_PRESETS = new Set(['front', 'top', 'side', 'isometric', 'isometric-back'])

const BUILTIN_TARGETS = new Set([
  // 这些是渲染层内置的系统元素，并非 SemanticDefinition.points 或创建型元素
  'geometry',
  'vertexLabels',
])

const KNOWN_ACTIONS = new Set([
  'show',
  'hide',
  'fadeIn',
  'fadeOut',
  'highlight',
  'pulse',
  'drawLine',
  'showPath',
  'showPlane',
  'showTetrahedron',
  'animatePoint',
  'fold',
  'together',
  'wait',
])

export class Validator {
  validate(script: AnimationScript, semantic: SemanticDefinition): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    const pointIds = collectPointIds(semantic)
    const foldIds = new Set((semantic.folds ?? []).map((f) => f.id))
    const measurementIds = new Set((semantic.measurements ?? []).map((m) => m.id))

    const sceneIdSet = new Set<string>()
    const elementIdSet = new Set<string>()

    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i]
      const scenePath = `scenes[${i}]`

      // 场景 id 唯一
      if (sceneIdSet.has(scene.id)) {
        errors.push({
          type: 'duplicate_id',
          path: `${scenePath}.id`,
          message: `场景 id 重复: ${scene.id}`,
        })
      } else {
        sceneIdSet.add(scene.id)
      }

      // narration 缺失提示（不阻断）
      if (!scene.narration || scene.narration.trim().length === 0) {
        warnings.push({
          type: 'missing_narration',
          path: `${scenePath}.narration`,
          message: '场景缺少 narration（字幕）',
        })
      }

      // 相机校验
      this.validateCamera(scene.camera, pointIds, elementIdSet, errors, warnings, `${scenePath}.camera`)

      // showMeasurements 校验
      if (scene.showMeasurements) {
        for (let j = 0; j < scene.showMeasurements.length; j++) {
          const id = scene.showMeasurements[j]
          if (!measurementIds.has(id)) {
            errors.push({
              type: 'missing_reference',
              path: `${scenePath}.showMeasurements[${j}]`,
              message: `未定义的 measurementId: ${id}`,
            })
          }
        }
      }

      // 动作校验（按顺序执行，元素引用需先创建）
      this.validateActions(scene.actions, {
        basePath: `${scenePath}.actions`,
        pointIds,
        foldIds,
        elementIdSet,
        errors,
      })

      // 场景时长过长警告（粗略估算：按动作 duration 叠加）
      const estimated = estimateActionListDuration(scene.actions)
      if (estimated > 15) {
        warnings.push({
          type: 'long_scene',
          path: scenePath,
          message: `场景预估时长过长（约 ${estimated.toFixed(1)}s）`,
        })
      }
    }

    return { valid: errors.length === 0, errors, warnings }
  }

  private validateCamera(
    camera: CameraConfig,
    pointIds: Set<string>,
    elementIds: Set<string>,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    path: string
  ): void {
    if (typeof camera === 'string') {
      if (!CAMERA_PRESETS.has(camera)) {
        errors.push({
          type: 'invalid_preset',
          path,
          message: `未知相机预设: ${camera}`,
        })
      }
      return
    }

    if (!isCameraFull(camera)) {
      errors.push({ type: 'invalid_camera', path, message: '相机参数格式无效' })
      return
    }

    const phi = camera.spherical.phi
    if (typeof phi !== 'number' || Number.isNaN(phi)) {
      errors.push({ type: 'invalid_camera', path: `${path}.spherical.phi`, message: 'phi 必须是数字' })
    } else {
      if (phi < 0 || phi > 90) {
        errors.push({
          type: 'invalid_phi',
          path: `${path}.spherical.phi`,
          message: `phi 超出范围 [0, 90]: ${phi}`,
        })
      } else if (phi <= 5 || phi >= 85) {
        warnings.push({
          type: 'phi_edge_value',
          path: `${path}.spherical.phi`,
          message: `phi 接近边界值（建议 5~85），当前: ${phi}`,
        })
      }
    }

    // lookAt 允许 center 或点名（MVP 暂不支持 lookAt 元素）
    const lookAt = camera.lookAt
    if (lookAt !== 'center' && !pointIds.has(lookAt)) {
      // 某些情况下 lookAt 可能是已创建元素 id；为了不误伤，可允许 elementIds
      if (!elementIds.has(lookAt)) {
        errors.push({
          type: 'missing_reference',
          path: `${path}.lookAt`,
          message: `lookAt 引用不存在的点/元素: ${lookAt}`,
        })
      }
    }
  }

  private validateActions(
    actions: Action[],
    ctx: {
      basePath: string
      pointIds: Set<string>
      foldIds: Set<string>
      elementIdSet: Set<string>
      errors: ValidationError[]
    }
  ): void {
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i] as any
      const actionPath = `${ctx.basePath}[${i}]`

      const doType = action?.do
      if (typeof doType !== 'string') {
        ctx.errors.push({ type: 'unknown_action', path: actionPath, message: 'action.do 必须是字符串' })
        continue
      }

      if (!KNOWN_ACTIONS.has(doType)) {
        ctx.errors.push({
          type: 'unknown_action',
          path: `${actionPath}.do`,
          message: `未知动作类型: ${doType}`,
        })
        continue
      }

      switch (doType) {
        case 'show':
        case 'hide':
        case 'fadeIn':
        case 'fadeOut':
        case 'highlight':
        case 'pulse': {
          const target = action.target as string | undefined
          if (!target) {
            ctx.errors.push({ type: 'missing_reference', path: `${actionPath}.target`, message: '缺少 target' })
            break
          }
          if (!isKnownTarget(target, ctx.pointIds, ctx.elementIdSet)) {
            ctx.errors.push({
              type: 'missing_reference',
              path: `${actionPath}.target`,
              message: `引用不存在的 target: ${target}`,
            })
          }
          break
        }

        case 'drawLine':
        case 'showPath': {
          const id = action.id as string | undefined
          if (!id) {
            ctx.errors.push({
              type: 'missing_id',
              path: `${actionPath}.id`,
              message: `${doType} 缺少 id（创建型动作必须指定 id）`,
            })
          } else if (ctx.elementIdSet.has(id)) {
            ctx.errors.push({
              type: 'duplicate_id',
              path: `${actionPath}.id`,
              message: `元素 id 重复: ${id}`,
            })
          } else {
            ctx.elementIdSet.add(id)
          }

          // from/to 必须是点
          for (const key of ['from', 'to'] as const) {
            const pid = action[key] as string | undefined
            if (!pid) {
              ctx.errors.push({ type: 'missing_reference', path: `${actionPath}.${key}`, message: `缺少 ${key}` })
              continue
            }
            if (!ctx.pointIds.has(pid) && pid !== 'center') {
              ctx.errors.push({
                type: 'missing_reference',
                path: `${actionPath}.${key}`,
                message: `引用不存在的点: ${pid}`,
              })
            }
          }
          break
        }

        case 'showPlane': {
          const id = action.id as string | undefined
          if (!id) {
            ctx.errors.push({
              type: 'missing_id',
              path: `${actionPath}.id`,
              message: 'showPlane 缺少 id（创建型动作必须指定 id）',
            })
          } else if (ctx.elementIdSet.has(id)) {
            ctx.errors.push({
              type: 'duplicate_id',
              path: `${actionPath}.id`,
              message: `元素 id 重复: ${id}`,
            })
          } else {
            ctx.elementIdSet.add(id)
          }

          const points = action.points as string[] | undefined
          if (!Array.isArray(points) || points.length < 3) {
            ctx.errors.push({
              type: 'missing_reference',
              path: `${actionPath}.points`,
              message: 'showPlane.points 至少需要 3 个点',
            })
            break
          }
          for (let j = 0; j < points.length; j++) {
            const pid = points[j]
            if (!ctx.pointIds.has(pid) && pid !== 'center') {
              ctx.errors.push({
                type: 'missing_reference',
                path: `${actionPath}.points[${j}]`,
                message: `引用不存在的点: ${pid}`,
              })
            }
          }
          break
        }

        case 'showTetrahedron': {
          const id = action.id as string | undefined
          if (!id) {
            ctx.errors.push({
              type: 'missing_id',
              path: `${actionPath}.id`,
              message: 'showTetrahedron 缺少 id（创建型动作必须指定 id）',
            })
          } else if (ctx.elementIdSet.has(id)) {
            ctx.errors.push({
              type: 'duplicate_id',
              path: `${actionPath}.id`,
              message: `元素 id 重复: ${id}`,
            })
          } else {
            ctx.elementIdSet.add(id)
          }

          const vertices = action.vertices as string[] | undefined
          if (!Array.isArray(vertices) || vertices.length !== 4) {
            ctx.errors.push({
              type: 'missing_reference',
              path: `${actionPath}.vertices`,
              message: 'showTetrahedron.vertices 必须是 4 个点',
            })
            break
          }
          for (let j = 0; j < vertices.length; j++) {
            const pid = vertices[j]
            if (!ctx.pointIds.has(pid) && pid !== 'center') {
              ctx.errors.push({
                type: 'missing_reference',
                path: `${actionPath}.vertices[${j}]`,
                message: `引用不存在的点: ${pid}`,
              })
            }
          }
          break
        }

        case 'animatePoint': {
          const target = action.target as string | undefined
          if (!target) {
            ctx.errors.push({ type: 'missing_reference', path: `${actionPath}.target`, message: '缺少 target' })
            break
          }
          if (!ctx.pointIds.has(target)) {
            ctx.errors.push({
              type: 'missing_reference',
              path: `${actionPath}.target`,
              message: `animatePoint 引用不存在的点: ${target}`,
            })
          }

          const from = action.from as number
          const to = action.to as number
          if (typeof from !== 'number' || typeof to !== 'number') {
            ctx.errors.push({
              type: 'invalid_range',
              path: `${actionPath}.from`,
              message: 'animatePoint.from/to 必须是数字',
            })
            break
          }
          if (from < 0 || from > 1 || to < 0 || to > 1) {
            ctx.errors.push({
              type: 'invalid_range',
              path: `${actionPath}.from`,
              message: `animatePoint 范围应在 [0,1]，实际 from=${from}, to=${to}`,
            })
          }
          break
        }

        case 'fold': {
          const foldId = action.foldId as string | undefined
          if (!foldId || !ctx.foldIds.has(foldId)) {
            ctx.errors.push({
              type: 'invalid_fold_id',
              path: `${actionPath}.foldId`,
              message: `foldId 不存在: ${String(foldId)}`,
            })
          }
          break
        }

        case 'together': {
          const nested = action.actions as Action[] | undefined
          if (!Array.isArray(nested)) {
            ctx.errors.push({
              type: 'invalid_camera',
              path: `${actionPath}.actions`,
              message: 'together.actions 必须是 Action[]',
            })
            break
          }
          this.validateActions(nested, {
            ...ctx,
            basePath: `${actionPath}.actions`,
          })
          break
        }

        case 'wait':
          // wait.duration 在类型层已要求，Validator 不强制范围
          break

        default:
          // doType 已在 KNOWN_ACTIONS 中
          break
      }
    }
  }
}

function isCameraFull(camera: CameraConfig): camera is CameraFull {
  return (
    typeof camera === 'object' &&
    camera !== null &&
    'spherical' in camera &&
    typeof (camera as any).spherical?.phi === 'number' &&
    typeof (camera as any).lookAt === 'string' &&
    typeof (camera as any).transition === 'string'
  )
}

function isKnownTarget(target: string, pointIds: Set<string>, elementIds: Set<string>): boolean {
  if (BUILTIN_TARGETS.has(target)) return true
  if (target === 'center') return true
  if (pointIds.has(target)) return true
  if (elementIds.has(target)) return true
  return false
}

function collectPointIds(semantic: SemanticDefinition): Set<string> {
  const ids = new Set<string>()

  // baseGeometry 顶点（无需在 semantic.points 显式声明）
  for (const v of baseVertexIds(semantic.baseGeometry.type)) ids.add(v)

  for (const p of semantic.points) ids.add(p.id)

  // folds 会引入 foldedPoints（如 A'）
  for (const f of semantic.folds ?? []) {
    for (const id of f.foldedPoints) ids.add(id)
    for (const id of f.movingPoints) ids.add(id)
    ids.add(f.hinge[0])
    ids.add(f.hinge[1])
  }

  // 特殊中心点
  ids.add('center')
  return ids
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

function estimateActionListDuration(actions: Action[]): number {
  let t = 0
  for (const a of actions as any[]) {
    if (!a || typeof a.do !== 'string') continue
    t += estimateActionDuration(a as any)
  }
  return t
}

function estimateActionDuration(action: any): number {
  switch (action.do) {
    case 'fadeIn':
    case 'fadeOut':
      return typeof action.duration === 'number' ? action.duration : 0.8
    case 'animatePoint':
    case 'fold':
      return typeof action.duration === 'number' ? action.duration : 2.0
    case 'wait':
      return typeof action.duration === 'number' ? action.duration : 0
    case 'together': {
      const nested: any[] = Array.isArray(action.actions) ? action.actions : []
      return Math.max(0, ...nested.map((x) => estimateActionDuration(x)))
    }
    case 'drawLine':
    case 'showPath':
    case 'showPlane':
    case 'showTetrahedron':
      return 1.0
    default:
      // highlight/pulse/show/hide 等视为瞬时（0）
      return 0
  }
}


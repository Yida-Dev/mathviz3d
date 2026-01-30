import type {
  EvalContext,
  FoldDefinition,
  GeometryType,
  MeasurementDefinition,
  SemanticDefinition,
  Vec3,
} from '@/core/types'
import {
  add,
  cross,
  degToRad,
  distance,
  dot,
  length,
  radToDeg,
  rotatePointAroundAxis,
  safeAcos,
  safeAsin,
  scale,
  sub,
  vec3,
} from '@/core/math/vec3'

type VertexDict = Map<string, Vec3>

const DEFAULT_CUBE_EDGES: Array<[string, string]> = [
  ['A', 'B'],
  ['B', 'C'],
  ['C', 'D'],
  ['D', 'A'],
  ['A1', 'B1'],
  ['B1', 'C1'],
  ['C1', 'D1'],
  ['D1', 'A1'],
  ['A', 'A1'],
  ['B', 'B1'],
  ['C', 'C1'],
  ['D', 'D1'],
]

const DEFAULT_CUBE_FACES: string[][] = [
  // 约定：从几何体外部看，顶点绕序为逆时针（CCW），以保证法线指向外部
  // cube 的 A/B/C/D 在 z = -s 平面；原顺序会让该面法线指向内部（+z）
  ['A', 'D', 'C', 'B'],
  ['A1', 'B1', 'C1', 'D1'],
  ['A', 'B', 'B1', 'A1'],
  ['B', 'C', 'C1', 'B1'],
  ['C', 'D', 'D1', 'C1'],
  ['D', 'A', 'A1', 'D1'],
]

const DEFAULT_TETRA_EDGES: Array<[string, string]> = [
  ['A', 'B'],
  ['B', 'C'],
  ['C', 'A'],
  ['A', 'D'],
  ['B', 'D'],
  ['C', 'D'],
]

const DEFAULT_TETRA_FACES: string[][] = [
  ['A', 'B', 'C'],
  // 其余三个面需要调整绕序，保证法线指向外部
  ['A', 'D', 'B'],
  ['B', 'D', 'C'],
  ['C', 'D', 'A'],
]

const DEFAULT_SQUARE_EDGES: Array<[string, string]> = [
  ['A', 'B'],
  ['B', 'C'],
  ['C', 'D'],
  ['D', 'A'],
]

// square 的填充面使用对角线 BD 进行三角化（ABD + BCD）：
// - 平面状态下与 ABC+ACD 等价
// - 翻折（沿 BD）场景下更直观：ABD 作为“可动面”，可被替换为 A'BD
const DEFAULT_SQUARE_FACES: string[][] = [
  ['A', 'B', 'D'],
  ['B', 'C', 'D'],
]

export class CoordCalculator {
  private readonly vertices: VertexDict
  private readonly edges: Array<[string, string]>
  private readonly faces: string[][]

  private readonly pointDefs: Map<string, SemanticDefinition['points'][number]>
  private readonly foldDefs: FoldDefinition[]
  private readonly measurementDefs: Map<string, MeasurementDefinition>
  private readonly defaultParams: Map<string, number>

  constructor(semantic: SemanticDefinition) {
    this.vertices = buildBaseVertices(semantic.baseGeometry)
    const { edges, faces } = buildBaseTopology(semantic.baseGeometry.type)
    this.edges = edges
    this.faces = faces

    this.pointDefs = new Map(semantic.points.map((p) => [p.id, p]))
    this.foldDefs = semantic.folds ?? []
    this.measurementDefs = new Map((semantic.measurements ?? []).map((m) => [m.id, m]))
    this.defaultParams = new Map((semantic.params ?? []).map((p) => [p.id, p.default]))
  }

  getVertexCoord(vertexId: string): Vec3 {
    const v = this.vertices.get(vertexId)
    if (!v) {
      throw new Error(`未找到顶点坐标: ${vertexId}`)
    }
    return v
  }

  getPointCoord(pointId: string, context?: EvalContext): Vec3 {
    const ctx = this.normalizeContext(context)
    return this.getPointCoordInternal(pointId, ctx, { ignoreFolds: false })
  }

  getSegment(from: string, to: string, context?: EvalContext): [Vec3, Vec3] {
    return [this.getPointCoord(from, context), this.getPointCoord(to, context)]
  }

  getMeasurement(measurementId: string, context?: EvalContext): number {
    const def = this.measurementDefs.get(measurementId)
    if (!def) {
      throw new Error(`未找到测量定义: ${measurementId}`)
    }
    const ctx = this.normalizeContext(context)

    const pts = def.points.map((id) => this.getPointCoordInternal(id, ctx, { ignoreFolds: false }))
    switch (def.type) {
      case 'distance': {
        assertPointsLength(def, 2)
        return distance(pts[0], pts[1])
      }
      case 'angle': {
        if (pts.length === 3) {
          const [P, O, Q] = pts
          const v1 = sub(P, O)
          const v2 = sub(Q, O)
          const denom = length(v1) * length(v2)
          if (denom === 0) return 0
          const cos = dot(v1, v2) / denom
          return radToDeg(safeAcos(cos))
        }
        if (pts.length === 5) {
          // 线面夹角：points = [L1, L2, A, B, C]
          const [L1, L2, A, B, C] = pts
          const L = sub(L2, L1)
          const N = cross(sub(B, A), sub(C, A))
          const denom = length(L) * length(N)
          if (denom === 0) return 0
          const sin = Math.abs(dot(L, N)) / denom
          return radToDeg(safeAsin(sin))
        }
        throw new Error(`angle 测量 points 长度不支持: ${pts.length}`)
      }
      case 'area': {
        if (pts.length === 3) {
          const [A, B, C] = pts
          return length(cross(sub(B, A), sub(C, A))) / 2
        }
        if (pts.length === 4) {
          // 四边形面积：按 ABC + ACD 三角剖分求和
          const [A, B, C, D] = pts
          const area1 = length(cross(sub(B, A), sub(C, A))) / 2
          const area2 = length(cross(sub(C, A), sub(D, A))) / 2
          return area1 + area2
        }
        throw new Error(`area 测量 points 长度不支持: ${pts.length}`)
      }
      case 'volume': {
        assertPointsLength(def, 4)
        const [A, B, C, D] = pts
        const v1 = sub(B, A)
        const v2 = sub(C, A)
        const v3 = sub(D, A)
        return Math.abs(dot(v1, cross(v2, v3))) / 6
      }
      default:
        return assertNever(def.type)
    }
  }

  // 预留：渲染层会需要 edges/faces/vertices
  getBaseEdges(): Array<[string, string]> {
    return this.edges
  }

  getBaseFaces(): string[][] {
    return this.faces
  }

  private normalizeContext(context?: EvalContext): EvalContext {
    const params = new Map<string, number>(this.defaultParams)
    if (context?.params) {
      for (const [k, v] of context.params.entries()) params.set(k, v)
    }

    const foldAngles = new Map<string, number>()
    if (context?.foldAngles) {
      for (const [k, v] of context.foldAngles.entries()) foldAngles.set(k, v)
    }

    return { params, foldAngles }
  }

  private getPointCoordInternal(
    pointId: string,
    ctx: EvalContext,
    opts: { ignoreFolds: boolean }
  ): Vec3 {
    // 特殊：相机 lookAt="center"
    if (pointId === 'center') {
      return vec3(0, 0, 0)
    }

    if (!opts.ignoreFolds) {
      const folded = this.tryEvalFoldedPoint(pointId, ctx)
      if (folded) return folded
    }

    // baseGeometry 顶点
    if (this.vertices.has(pointId)) {
      return this.getVertexCoord(pointId)
    }

    const def = this.pointDefs.get(pointId)
    if (!def) {
      throw new Error(`未找到点定义: ${pointId}`)
    }

    switch (def.type) {
      case 'vertex':
        return this.getVertexCoord(def.id)
      case 'midpoint': {
        if (!def.of || def.of.length !== 2) throw new Error(`midpoint 缺少 of: ${def.id}`)
        const p1 = this.getPointCoordInternal(def.of[0], ctx, { ignoreFolds: false })
        const p2 = this.getPointCoordInternal(def.of[1], ctx, { ignoreFolds: false })
        return scale(add(p1, p2), 0.5)
      }
      case 'ratio': {
        if (!def.from || !def.to || typeof def.ratio !== 'number') {
          throw new Error(`ratio 定义不完整: ${def.id}`)
        }
        const p1 = this.getPointCoordInternal(def.from, ctx, { ignoreFolds: false })
        const p2 = this.getPointCoordInternal(def.to, ctx, { ignoreFolds: false })
        const ratio = normalizeCommonRatio(def.ratio)
        return add(p1, scale(sub(p2, p1), ratio))
      }
      case 'onSegment': {
        if (!def.from || !def.to || !def.param) {
          throw new Error(`onSegment 定义不完整: ${def.id}`)
        }
        const t = this.getParamValue(def.param, ctx)
        const p1 = this.getPointCoordInternal(def.from, ctx, { ignoreFolds: false })
        const p2 = this.getPointCoordInternal(def.to, ctx, { ignoreFolds: false })
        return add(p1, scale(sub(p2, p1), t))
      }
      case 'center': {
        const pointIds = def.points
        if (!pointIds || pointIds.length === 0) {
          throw new Error(`center 缺少 points: ${def.id}`)
        }
        const sum = pointIds
          .map((id) => this.getPointCoordInternal(id, ctx, { ignoreFolds: false }))
          .reduce((acc, v) => add(acc, v), vec3(0, 0, 0))
        return scale(sum, 1 / pointIds.length)
      }
      default:
        return assertNever(def.type)
    }
  }

  private tryEvalFoldedPoint(pointId: string, ctx: EvalContext): Vec3 | null {
    for (const fold of this.foldDefs) {
      const idx = fold.foldedPoints.indexOf(pointId)
      if (idx === -1) continue

      const originalPointId = fold.movingPoints[idx]
      const angleDeg =
        ctx.foldAngles.get(fold.id) ??
        (fold.angleParam ? ctx.params.get(fold.angleParam) : undefined) ??
        fold.defaultAngle ??
        180

      // movingPoint 本身可能是语义点（midpoint/onSegment 等），但这里需要避免再次触发 fold 递归
      const P = this.getPointCoordInternal(originalPointId, ctx, { ignoreFolds: true })
      const A = this.getPointCoordInternal(fold.hinge[0], ctx, { ignoreFolds: true })
      const B = this.getPointCoordInternal(fold.hinge[1], ctx, { ignoreFolds: true })

      return rotatePointAroundAxis(P, A, B, degToRad(angleDeg))
    }
    return null
  }

  private getParamValue(paramId: string, ctx: EvalContext): number {
    const value = ctx.params.get(paramId)
    if (typeof value === 'number') return value
    throw new Error(`缺少参数值: ${paramId}`)
  }
}

function buildBaseVertices(base: SemanticDefinition['baseGeometry']): VertexDict {
  const type = base.type
  switch (type) {
    case 'cube': {
      const size = base.size ?? 1
      const s = size / 2
      return new Map([
        ['A', vec3(-s, -s, -s)],
        ['B', vec3(s, -s, -s)],
        ['C', vec3(s, s, -s)],
        ['D', vec3(-s, s, -s)],
        ['A1', vec3(-s, -s, s)],
        ['B1', vec3(s, -s, s)],
        ['C1', vec3(s, s, s)],
        ['D1', vec3(-s, s, s)],
      ])
    }
    case 'cuboid': {
      const [a = 1, b = 1, c = 1] = base.dimensions ?? [1, 1, 1]
      return new Map([
        ['A', vec3(-a / 2, -b / 2, -c / 2)],
        ['B', vec3(a / 2, -b / 2, -c / 2)],
        ['C', vec3(a / 2, b / 2, -c / 2)],
        ['D', vec3(-a / 2, b / 2, -c / 2)],
        ['A1', vec3(-a / 2, -b / 2, c / 2)],
        ['B1', vec3(a / 2, -b / 2, c / 2)],
        ['C1', vec3(a / 2, b / 2, c / 2)],
        ['D1', vec3(-a / 2, b / 2, c / 2)],
      ])
    }
    case 'tetrahedron': {
      // 正四面体（棱长 a=1）的一组标准坐标（几何中心为原点）：
      // A: 顶点在 z=+sqrt(6)/4，底面三点在 z=-sqrt(6)/12，底面为等边三角形
      const a = base.size ?? 1
      const sqrt3 = Math.sqrt(3)
      const sqrt6 = Math.sqrt(6)
      return new Map([
        ['A', vec3(0, 0, (sqrt6 / 4) * a)],
        ['B', vec3(-a / 2, (-sqrt3 / 6) * a, (-sqrt6 / 12) * a)],
        ['C', vec3(a / 2, (-sqrt3 / 6) * a, (-sqrt6 / 12) * a)],
        ['D', vec3(0, (sqrt3 / 3) * a, (-sqrt6 / 12) * a)],
      ])
    }
    case 'square': {
      const size = base.size ?? 1
      const s = size / 2
      return new Map([
        ['A', vec3(-s, -s, 0)],
        ['B', vec3(s, -s, 0)],
        ['C', vec3(s, s, 0)],
        ['D', vec3(-s, s, 0)],
      ])
    }
    default:
      throw new Error(`不支持的几何体类型: ${type}`)
  }
}

function buildBaseTopology(type: GeometryType): { edges: Array<[string, string]>; faces: string[][] } {
  switch (type) {
    case 'cube':
    case 'cuboid':
      return { edges: DEFAULT_CUBE_EDGES, faces: DEFAULT_CUBE_FACES }
    case 'tetrahedron':
      return { edges: DEFAULT_TETRA_EDGES, faces: DEFAULT_TETRA_FACES }
    case 'square':
      return { edges: DEFAULT_SQUARE_EDGES, faces: DEFAULT_SQUARE_FACES }
    default:
      throw new Error(`不支持的几何体类型: ${type}`)
  }
}

function assertPointsLength(def: MeasurementDefinition, expected: number): void {
  if (def.points.length !== expected) {
    throw new Error(`${def.id} points 长度应为 ${expected}，实际 ${def.points.length}`)
  }
}

function assertNever(x: never): never {
  throw new Error(`未处理的分支: ${String(x)}`)
}

function normalizeCommonRatio(value: number): number {
  // AI 常把 1/3、2/3 写成 0.333、0.667；为了数值稳定与测试一致，做轻量吸附。
  const COMMON = [1 / 2, 1 / 3, 2 / 3, 1 / 4, 3 / 4]
  const EPS = 5e-4

  for (const r of COMMON) {
    if (Math.abs(value - r) <= EPS) return r
  }
  return value
}

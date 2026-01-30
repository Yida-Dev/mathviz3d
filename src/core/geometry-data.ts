import type { EvalContext, FoldDefinition, SemanticDefinition, Vec3 } from '@/core/types'
import { CoordCalculator } from '@/core/coord-calculator'

export interface GeometryData {
  // 基础顶点（静态）
  vertices: Map<string, Vec3>

  // 线框
  edges: Array<[string, string]>

  // 面（用于半透明填充）
  faces: Array<string[]>

  // 语义点（可能是静态值，也可能依赖 params/foldAngles）
  points: Map<string, Vec3 | ((context: EvalContext) => Vec3)>

  // 测量值（同上：可为静态或动态）
  measurements: Map<string, number | ((context: EvalContext) => number)>

  // 翻折定义（用于渲染层把“可动面/边”绑定到 foldedPoints）
  folds?: FoldDefinition[]
}

export function buildGeometryData(semantic: SemanticDefinition): GeometryData {
  const calc = new CoordCalculator(semantic)

  const vertices = new Map<string, Vec3>()
  for (const id of baseVertexIds(semantic.baseGeometry.type)) {
    vertices.set(id, calc.getVertexCoord(id))
  }

  const points = new Map<string, Vec3 | ((context: EvalContext) => Vec3)>()

  // semantic.points：优先保留静态值（便于渲染层直接使用），动点用函数
  for (const p of semantic.points) {
    if (p.type === 'onSegment') {
      points.set(p.id, (ctx) => calc.getPointCoord(p.id, ctx))
    } else {
      points.set(p.id, calc.getPointCoord(p.id))
    }
  }

  // folds：foldedPoints 一定依赖 foldAngles/params，用函数表达
  for (const fold of semantic.folds ?? []) {
    for (const id of fold.foldedPoints) {
      points.set(id, (ctx) => calc.getPointCoord(id, ctx))
    }
  }

  // measurements：统一用函数（未来可加入常量判定）
  const measurements = new Map<string, number | ((context: EvalContext) => number)>()
  for (const m of semantic.measurements ?? []) {
    measurements.set(m.id, (ctx) => calc.getMeasurement(m.id, ctx))
  }

  return {
    vertices,
    edges: calc.getBaseEdges(),
    faces: calc.getBaseFaces(),
    points,
    measurements,
    folds: semantic.folds ?? [],
  }
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

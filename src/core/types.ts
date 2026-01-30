// 核心数据结构类型定义（与 docs/[方案] 系统架构-完整设计方案.md 保持一致）

export interface Vec3 {
  x: number
  y: number
  z: number
}

// 统一求值上下文：动点参数 + 翻折角度
export interface EvalContext {
  params: Map<string, number>
  foldAngles: Map<string, number>
}

// ========= 语义层（Understander 输出）=========

export type GeometryType = 'cube' | 'cuboid' | 'tetrahedron' | 'square' | 'prism' | 'pyramid'

export interface SemanticDefinition {
  problemId: string
  problemText: string

  baseGeometry: {
    type: GeometryType
    size?: number
    dimensions?: [number, number, number]
  }

  points: PointDefinition[]
  folds?: FoldDefinition[]
  measurements?: MeasurementDefinition[]
  params?: ParamDefinition[]

  question: string
}

export type PointType = 'vertex' | 'midpoint' | 'ratio' | 'onSegment' | 'center'

export interface PointDefinition {
  id: string
  type: PointType
  of?: [string, string]
  from?: string
  to?: string
  ratio?: number
  param?: string
  points?: string[]
}

export interface ParamDefinition {
  id: string
  min: number
  max: number
  default: number
}

export type MeasurementType = 'volume' | 'distance' | 'angle' | 'area'

export interface MeasurementDefinition {
  id: string
  type: MeasurementType
  points: string[]
}

export interface FoldDefinition {
  id: string
  hinge: [string, string]
  movingPoints: string[]
  foldedPoints: string[]
  angleParam?: string
  defaultAngle?: number
}

// ========= 动画脚本层（Coder 输出）=========

export interface AnimationScript {
  title: string
  scenes: AnimationScene[]
}

export interface AnimationScene {
  id: string
  narration: string
  camera: CameraConfig
  actions: Action[]
  showMeasurements?: string[]
}

export type CameraPreset = 'front' | 'top' | 'side' | 'isometric' | 'isometric-back'

export type CameraConfig = CameraPreset | CameraFull

export interface CameraFull {
  spherical: {
    radius: number
    theta: number
    phi: number
  }
  lookAt: string
  transition: 'instant' | 'ease' | 'ease-in-out'
}

// 运行时为了容错（Validator/AutoFixer），创建型动作的 id 允许缺失
export type Action =
  | { do: 'show'; target: string }
  | { do: 'hide'; target: string }
  | { do: 'fadeIn'; target: string; duration?: number }
  | { do: 'fadeOut'; target: string; duration?: number }
  | { do: 'highlight'; target: string; color: string }
  | { do: 'pulse'; target: string; color: string; times?: number }
  | { do: 'drawLine'; id?: string; from: string; to: string; style?: 'solid' | 'dashed'; color?: string }
  | { do: 'showPath'; id?: string; from: string; to: string; color?: string }
  | { do: 'showPlane'; id?: string; points: string[]; color?: string; opacity?: number }
  | { do: 'showTetrahedron'; id?: string; vertices: string[]; color?: string; opacity?: number }
  | { do: 'animatePoint'; target: string; from: number; to: number; duration?: number }
  | { do: 'fold'; foldId: string; fromAngle: number; toAngle: number; duration?: number }
  | { do: 'together'; actions: Action[] }
  | { do: 'wait'; duration: number }
  // 兜底：允许未知动作通过类型层（由 Validator 报错）
  | { do: string; [key: string]: unknown }


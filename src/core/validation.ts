// Validator/AutoFixer 的共享类型定义

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  type: ErrorType
  path: string
  message: string
}

export interface ValidationWarning {
  type: WarningType
  path: string
  message: string
}

export type ErrorType =
  | 'missing_reference'
  | 'invalid_fold_id'
  | 'invalid_range'
  | 'invalid_phi'
  | 'missing_id'
  | 'duplicate_id'
  | 'invalid_preset'
  | 'unknown_action'
  | 'invalid_camera'

export type WarningType = 'phi_edge_value' | 'long_scene' | 'missing_narration'

export interface AutoFixResult {
  fixed: boolean
  script?: unknown
  remainingErrors: ValidationError[]
  fixes: FixApplied[]
}

export interface FixApplied {
  errorType: ErrorType
  path: string
  original: unknown
  fixed: unknown
}


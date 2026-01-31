import type { AnimationScript, SemanticDefinition } from '@/core/types'
import type { ValidationError } from '@/core/validation'

export interface Explanation {
  summary: string
  approach: string
  steps: ExplanationStep[]
  answer: string
}

export interface ExplanationStep {
  step: number
  title: string
  content: string
  formula?: string
}

export interface StoryPlan {
  title: string
  scenes: StoryScene[]
}

export interface StoryScene {
  id: string
  title: string
  objective: string
  narration: string
  visualFocus: string[]
  cameraHint: string
  actions: ActionIntent[]
}

export interface ActionIntent {
  intent: string
  targets: string[]
  emphasis?: string
}

export interface PlannerOutput {
  explanation: Explanation
  storyPlan: StoryPlan
}

export interface CoderInput {
  semantic: SemanticDefinition
  storyPlan: StoryPlan
  previousErrors?: ValidationError[]
}

export interface AiPipelineResult {
  semantic: SemanticDefinition
  explanation: Explanation
  storyPlan: StoryPlan
  script: AnimationScript
}

export type AiPipelineProgress =
  | { stage: 'understand'; progress: number; message: string }
  | { stage: 'understood'; progress: number; message: string; semantic: SemanticDefinition }
  | { stage: 'plan'; progress: number; message: string }
  | { stage: 'code'; progress: number; message: string; retry?: number }
  | { stage: 'validate'; progress: number; message: string }

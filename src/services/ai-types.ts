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

export type AiPipelineStage = 'understand' | 'plan' | 'code' | 'validate'

export interface AiPipelineProgress {
  stage: AiPipelineStage
  progress: number
  message: string
  retry?: number
}


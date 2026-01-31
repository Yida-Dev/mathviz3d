import type { AnimationScript, SemanticDefinition } from '@/core/types'
import { AutoFixer } from '@/core/auto-fixer'
import { Validator } from '@/core/validator'
import type { ValidationError } from '@/core/validation'
import type { AiPipelineProgress, AiPipelineResult, StoryPlan } from '@/services/ai-types'

import { understand } from '@/services/agents/understander'
import { plan } from '@/services/agents/planner'
import { code as codeAgent } from '@/services/agents/coder'

export async function runAiPipeline(file: File, onProgress?: (p: AiPipelineProgress) => void): Promise<AiPipelineResult> {
  // Stage 1: Understand
  onProgress?.({ stage: 'understand', progress: 0, message: '正在分析题目图片...' })
  const semantic = await understand(file)
  onProgress?.({ stage: 'understand', progress: 33, message: '题目分析完成' })

  // Stage 2: Plan
  onProgress?.({ stage: 'plan', progress: 33, message: '正在设计讲解方案...' })
  const { explanation, storyPlan } = await plan(semantic)
  onProgress?.({ stage: 'plan', progress: 66, message: '讲解方案设计完成' })

  // Stage 3: Code + Validate + AutoFix + Retry
  onProgress?.({ stage: 'code', progress: 66, message: '正在生成动画脚本...' })
  const script = await generateScriptWithRetry(semantic, storyPlan, 3, onProgress)
  onProgress?.({ stage: 'code', progress: 100, message: '动画脚本生成完成' })

  return { semantic, explanation, storyPlan, script }
}

async function generateScriptWithRetry(
  semantic: SemanticDefinition,
  storyPlan: StoryPlan,
  maxRetries: number,
  onProgress?: (p: AiPipelineProgress) => void,
): Promise<AnimationScript> {
  const validator = new Validator()
  const fixer = new AutoFixer()

  let previousErrors: ValidationError[] = []

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      onProgress?.({
        stage: 'code',
        progress: 66 + attempt * 10,
        message: `重试生成动画脚本 (${attempt + 1}/${maxRetries})...`,
        retry: attempt,
      })
    }

    const script = await codeAgent(semantic, storyPlan, previousErrors)

    onProgress?.({ stage: 'validate', progress: 0, message: '正在校验动画脚本...' })
    const validationResult = validator.validate(script, semantic)
    if (validationResult.valid) {
      return script
    }

    const fixResult = fixer.fix(script, validationResult.errors, semantic)
    if (fixResult.fixed && fixResult.script) {
      return fixResult.script as AnimationScript
    }

    previousErrors = fixResult.remainingErrors
  }

  throw new Error('动画脚本生成失败，请重试')
}


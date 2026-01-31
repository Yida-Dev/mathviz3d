import type { AnimationScript, SemanticDefinition } from '@/core/types'
import type { ValidationError } from '@/core/validation'
import { useAiConfigStore } from '@/stores/ai-config-store'
import { logAiCall } from '@/services/ai-debug-log'
import { callAI } from '@/services/ai-client'
import { parseJsonFromText } from '@/services/ai-json'
import type { StoryPlan } from '@/services/ai-types'

import systemPrompt from '@/services/prompts/coder'

import case1Script from '../../../tests/fixtures/case1/animation.json'
import case2Script from '../../../tests/fixtures/case2/animation.json'
import case3Script from '../../../tests/fixtures/case3/animation.json'

export async function code(
  semantic: SemanticDefinition,
  storyPlan: StoryPlan,
  previousErrors: ValidationError[] = [],
): Promise<AnimationScript> {
  const { baseUrl } = useAiConfigStore.getState()
  if (baseUrl.trim() === 'mock') {
    return mockCode(semantic)
  }

  const inputSummary = `problemId=${semantic.problemId || '(unknown)'}; scenes=${storyPlan.scenes?.length ?? 0}; prevErrors=${previousErrors.length}`
  const startTime = Date.now()

  let rawOutput = ''
  try {
    rawOutput = await callAI(systemPrompt, [
      {
        type: 'text',
        text: [
          '请将下面的 StoryPlan 翻译为 AnimationScript（严格按 Schema 输出 JSON）。',
          '注意：scene.id 与 narration 必须与 StoryPlan 完全一致。',
          '',
          '输入：',
          JSON.stringify({ semantic, storyPlan, previousErrors }, null, 2),
        ].join('\n'),
      },
    ])
  } catch (err) {
    logAiCall({
      agent: 'coder',
      inputSummary,
      rawOutput: '',
      error: String(err),
      durationMs: Date.now() - startTime,
    })
    throw err
  }

  const durationMs = Date.now() - startTime

  try {
    const parsed = parseJsonFromText<AnimationScript>(rawOutput)
    logAiCall({ agent: 'coder', inputSummary, rawOutput, parsedJson: parsed, durationMs })
    return parsed
  } catch (err) {
    logAiCall({ agent: 'coder', inputSummary, rawOutput, error: String(err), durationMs })
    throw err
  }
}

function mockCode(semantic: SemanticDefinition): AnimationScript {
  const id = String(semantic.problemId ?? '').toLowerCase()
  if (id.includes('case-3') || id.includes('fold')) return case3Script as any
  if (id.includes('case-2') || id.includes('tetra')) return case2Script as any
  return case1Script as any
}

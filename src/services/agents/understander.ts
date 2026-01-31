import type { SemanticDefinition } from '@/core/types'
import { useAiConfigStore } from '@/stores/ai-config-store'
import { logAiCall } from '@/services/ai-debug-log'
import { callAI } from '@/services/ai-client'
import { parseJsonFromText } from '@/services/ai-json'
import { validateSemantic } from '@/services/validators/semantic-validator'

import systemPrompt from '@/services/prompts/understander'

import case1Semantic from '../../../tests/fixtures/case1/semantic.json'
import case2Semantic from '../../../tests/fixtures/case2/semantic.json'
import case3Semantic from '../../../tests/fixtures/case3/semantic.json'

export async function understand(file: File): Promise<SemanticDefinition> {
  const { baseUrl } = useAiConfigStore.getState()
  if (baseUrl.trim() === 'mock') {
    return mockUnderstand(file)
  }

  const base64 = await fileToBase64(file)
  const mime = file.type || 'image/png'

  const inputSummary = `file=${file?.name ?? '(unknown)'}; mime=${mime}`
  const startTime = Date.now()

  let rawOutput = ''
  try {
    rawOutput = await callAI(systemPrompt, [
      { type: 'text', text: '分析这道几何题，提取结构化的语义信息（严格按 Schema 输出）。' },
      { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } },
    ])
  } catch (err) {
    logAiCall({
      agent: 'understander',
      inputSummary,
      rawOutput: '',
      error: String(err),
      durationMs: Date.now() - startTime,
    })
    throw err
  }

  const durationMs = Date.now() - startTime

  try {
    const parsed = parseJsonFromText<SemanticDefinition>(rawOutput)
    const validation = validateSemantic(parsed)
    if (!validation.valid) {
      const errorMsg = `AI 返回的 SemanticDefinition 不完整: ${validation.errors.join(', ')}`
      logAiCall({
        agent: 'understander',
        inputSummary,
        rawOutput,
        parsedJson: parsed,
        error: errorMsg,
        durationMs,
      })
      throw new Error(errorMsg)
    }

    logAiCall({ agent: 'understander', inputSummary, rawOutput, parsedJson: parsed, durationMs })
    return parsed
  } catch (err) {
    logAiCall({
      agent: 'understander',
      inputSummary,
      rawOutput,
      error: String(err),
      durationMs,
    })
    throw err
  }
}

function mockUnderstand(file: File): SemanticDefinition {
  const name = (file?.name ?? '').toLowerCase()
  if (name.includes('case3') || name.includes('fold')) return case3Semantic as any
  if (name.includes('case2') || name.includes('tetra')) return case2Semantic as any
  return case1Semantic as any
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

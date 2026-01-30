import type { AnimationScript, SemanticDefinition } from '@/core/types'
import type { CaseId } from '@/types/app'

import case1Semantic from '../../tests/fixtures/case1/semantic.json'
import case1Script from '../../tests/fixtures/case1/animation.json'
import case2Semantic from '../../tests/fixtures/case2/semantic.json'
import case2Script from '../../tests/fixtures/case2/animation.json'
import case3Semantic from '../../tests/fixtures/case3/semantic.json'
import case3Script from '../../tests/fixtures/case3/animation.json'

export interface AiPipelineMockResult {
  caseId: CaseId
  semantic: SemanticDefinition
  script: AnimationScript
}

/**
 * AI Pipeline Mock（Phase 4.5）
 * - 固定延迟返回测试数据（用于打通 UploadZone → AI → UI 的链路）
 * - 通过文件名做简单路由：case2/case3 关键字可触发不同返回
 */
export async function runAiPipelineMock(file: File): Promise<AiPipelineMockResult> {
  await delay(800)

  const name = (file?.name ?? '').toLowerCase()
  if (name.includes('case3') || name.includes('fold')) {
    return { caseId: 'case3', semantic: case3Semantic as any, script: case3Script as any }
  }
  if (name.includes('case2') || name.includes('tetra')) {
    return { caseId: 'case2', semantic: case2Semantic as any, script: case2Script as any }
  }
  return { caseId: 'case1', semantic: case1Semantic as any, script: case1Script as any }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}


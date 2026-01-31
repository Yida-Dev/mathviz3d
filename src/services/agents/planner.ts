import type { SemanticDefinition } from '@/core/types'
import { useAiConfigStore } from '@/stores/ai-config-store'
import { callAI } from '@/services/ai-client'
import { parseJsonFromText } from '@/services/ai-json'
import type { PlannerOutput } from '@/services/ai-types'

import systemPrompt from '@/services/prompts/planner'

export async function plan(semantic: SemanticDefinition): Promise<PlannerOutput> {
  const { baseUrl } = useAiConfigStore.getState()
  if (baseUrl.trim() === 'mock') {
    return mockPlan(semantic)
  }

  const result = await callAI(systemPrompt, [
    {
      type: 'text',
      text: [
        '请根据以下 SemanticDefinition 生成 Explanation 与 StoryPlan（严格按 Schema 输出 JSON）。',
        '',
        'SemanticDefinition:',
        JSON.stringify(semantic, null, 2),
      ].join('\n'),
    },
  ])

  return parseJsonFromText<PlannerOutput>(result)
}

function mockPlan(semantic: SemanticDefinition): PlannerOutput {
  const title = semantic.problemId || 'mock'
  const narration = semantic.question || '（Mock）讲解规划'
  return {
    explanation: {
      summary: '（Mock）这是一个示例讲解总结。',
      approach: '（Mock）这是一个示例解题思路。',
      steps: [
        { step: 1, title: '读题', content: '（Mock）识别题目条件与目标。' },
        { step: 2, title: '建模', content: '（Mock）用坐标或向量表示关键点。' },
        { step: 3, title: '求解', content: '（Mock）计算或证明目标量。' },
      ],
      answer: '（Mock）最终答案见讲解总结。',
    },
    storyPlan: {
      title,
      scenes: [
        {
          id: 'intro',
          title: '开场',
          objective: '认识题目几何体与已知条件',
          narration: narration.slice(0, 20) || '这是一个几何题。',
          visualFocus: ['geometry', 'vertexLabels'],
          cameraHint: '全景，等轴测',
          actions: [
            { intent: '展示几何体', targets: ['geometry'] },
            { intent: '显示顶点标签', targets: ['vertexLabels'] },
          ],
        },
      ],
    },
  }
}


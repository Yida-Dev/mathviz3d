import { useAiConfigStore } from '@/stores/ai-config-store'

export type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export interface CallAiOptions {
  temperature?: number
  maxTokens?: number
}

/**
 * 直连 OpenAI 兼容接口（chat/completions）。
 *
 * 注意：
 * - 这里不做 JSON 解析，Agent 自己负责 parseJsonFromText（便于统一容错）。
 * - baseUrl 由用户配置，一般是 `https://api.openai.com/v1`（或其它兼容服务的 /v1）。
 */
export async function callAI(systemPrompt: string, userContent: MessageContent[], options: CallAiOptions = {}): Promise<string> {
  const { apiKey, baseUrl, model } = useAiConfigStore.getState()

  if (!apiKey || !baseUrl || !model) {
    throw new Error('请先在设置中配置 API Key、Base URL 和 Model')
  }

  const url = `${stripTrailingSlash(baseUrl)}/chat/completions`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 8192,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`AI API 错误: ${response.status} - ${errorText || response.statusText}`)
  }

  const data: any = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error('AI API 返回格式异常：缺少 choices[0].message.content')
  }
  return content
}

function stripTrailingSlash(s: string): string {
  return s.endsWith('/') ? s.slice(0, -1) : s
}

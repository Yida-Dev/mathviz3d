export function parseJsonFromText<T>(text: string): T {
  const raw = (text ?? '').trim()
  if (!raw) {
    throw new Error('AI 返回为空，无法解析 JSON')
  }

  // 优先处理 ```json ... ``` 或 ``` ... ```
  if (raw.startsWith('```')) {
    const firstNewline = raw.indexOf('\n')
    const withoutFence = firstNewline === -1 ? '' : raw.slice(firstNewline + 1)
    const endFence = withoutFence.lastIndexOf('```')
    const inside = endFence === -1 ? withoutFence : withoutFence.slice(0, endFence)
    return parseJsonLoose<T>(inside)
  }

  return parseJsonLoose<T>(raw)
}

function parseJsonLoose<T>(text: string): T {
  const s = text.trim()
  try {
    return JSON.parse(s) as T
  } catch {
    // 兜底：截取第一个 { 到最后一个 } 之间的内容
    const start = s.indexOf('{')
    const end = s.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
      const candidate = s.slice(start, end + 1)
      return JSON.parse(candidate) as T
    }
    throw new Error(`AI 返回不是合法 JSON：${preview(s)}`)
  }
}

function preview(s: string): string {
  const oneLine = s.replace(/\s+/g, ' ').trim()
  if (oneLine.length <= 200) return oneLine
  return `${oneLine.slice(0, 200)}...`
}


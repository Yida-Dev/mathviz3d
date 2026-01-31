// 默认关闭：未配置 URL 时不做任何事（避免影响主流程）
const LOG_WORKER_URL = String((import.meta as any).env?.VITE_AI_LOG_WORKER_URL ?? '').trim()

export type AgentName = 'understander' | 'planner' | 'coder'

export interface AiLogEntry {
  agent: AgentName
  inputSummary?: string
  rawOutput: string
  parsedJson?: unknown
  error?: string
  durationMs?: number
}

export function logAiCall(entry: AiLogEntry): void {
  if (!LOG_WORKER_URL) return
  if (typeof window === 'undefined') return

  const payload = {
    session_id: getSessionId(),
    agent: entry.agent,
    input_summary: entry.inputSummary,
    raw_output: entry.rawOutput ?? '',
    parsed_json: entry.parsedJson != null ? safeStringify(entry.parsedJson) : undefined,
    error: entry.error,
    duration_ms: entry.durationMs != null ? Math.max(0, Math.floor(entry.durationMs)) : undefined,
  }

  // fire-and-forget，不阻塞主流程
  try {
    void fetch(LOG_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // 静默失败，不影响主流程
    })
  } catch {
    // ignore
  }
}

function getSessionId(): string {
  // sessionStorage 在某些环境下可能不可用（隐私模式/沙箱等），统一兜底
  try {
    const storage = window.sessionStorage
    const key = 'ai-session-id'
    let id = storage.getItem(key)
    if (!id) {
      id = safeUuid()
      storage.setItem(key, id)
    }
    return id
  } catch {
    return safeUuid()
  }
}

function safeUuid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  } catch {
    // ignore
  }
  // 兜底：只用于调试日志，不影响核心纯函数/可重复性
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj)
  } catch {
    return '"<unserializable>"'
  }
}

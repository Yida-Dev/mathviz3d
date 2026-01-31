export interface Env {
  DB: D1Database
}

export type AgentName = 'understander' | 'planner' | 'coder'

export interface LogEntry {
  session_id?: string
  agent: AgentName
  input_summary?: string
  raw_output: string
  parsed_json?: string
  error?: string
  duration_ms?: number
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    if (request.method !== 'POST') {
      return withCors(new Response('Method not allowed', { status: 405 }))
    }

    const url = new URL(request.url)
    if (url.pathname !== '/log') {
      return withCors(new Response('Not found', { status: 404 }))
    }

    const startedAt = Date.now()

    try {
      const entry = (await request.json()) as Partial<LogEntry>

      const agent = entry.agent
      if (agent !== 'understander' && agent !== 'planner' && agent !== 'coder') {
        return withCorsJson({ ok: false, error: `Invalid agent: ${String(agent)}` }, 400)
      }

      const rawOutput = typeof entry.raw_output === 'string' ? entry.raw_output : ''
      if (!rawOutput) {
        // 为了便于排查：即便没有 raw_output，也要求至少传空字符串并依赖 error 字段
        // 但这里仍然做一层防护，避免落库为 NULL
      }

      const id = crypto.randomUUID()
      const created_at = Date.now()

      const durationMs =
        typeof entry.duration_ms === 'number' && Number.isFinite(entry.duration_ms) ? Math.max(0, Math.floor(entry.duration_ms)) : null

      await env.DB.prepare(
        `
          INSERT INTO logs (id, created_at, session_id, agent, input_summary, raw_output, parsed_json, error, duration_ms)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
        .bind(
          id,
          created_at,
          typeof entry.session_id === 'string' ? entry.session_id : null,
          agent,
          typeof entry.input_summary === 'string' ? entry.input_summary : null,
          rawOutput,
          typeof entry.parsed_json === 'string' ? entry.parsed_json : null,
          typeof entry.error === 'string' ? entry.error : null,
          durationMs,
        )
        .run()

      const totalMs = Date.now() - startedAt
      return withCorsJson({ ok: true, id, took_ms: totalMs }, 200)
    } catch (err) {
      return withCorsJson({ ok: false, error: String(err) }, 500)
    }
  },
}

function withCors(resp: Response): Response {
  const headers = new Headers(resp.headers)
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v)
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers })
}

function withCorsJson(obj: unknown, status: number): Response {
  return withCors(
    new Response(JSON.stringify(obj), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}


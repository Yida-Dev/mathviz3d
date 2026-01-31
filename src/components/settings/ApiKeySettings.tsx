import { useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAiConfigStore } from '@/stores/ai-config-store'

export function ApiKeySettings(props: { onSaved?: () => void }) {
  const { onSaved } = props

  // 注意：selector 返回对象时必须配合 shallow，否则 React 18 下 getSnapshot 每次返回新对象会导致无限循环/白屏
  const current = useAiConfigStore(useShallow((s) => ({ apiKey: s.apiKey, baseUrl: s.baseUrl, model: s.model })))
  const setConfig = useAiConfigStore((s) => s.setConfig)
  const reset = useAiConfigStore((s) => s.reset)

  const [showKey, setShowKey] = useState(false)
  const [draft, setDraft] = useState(() => ({ ...current }))
  const [error, setError] = useState<string | null>(null)

  const canSave = useMemo(() => {
    return Boolean(draft.apiKey.trim() && draft.baseUrl.trim() && draft.model.trim())
  }, [draft.apiKey, draft.baseUrl, draft.model])

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Base URL（必填）</div>
        <Input
          value={draft.baseUrl}
          placeholder="https://api.openai.com/v1"
          onChange={(e) => {
            setDraft((prev) => ({ ...prev, baseUrl: e.target.value }))
            setError(null)
          }}
        />
      </div>

      <div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Model（必填）</div>
        <Input
          value={draft.model}
          placeholder="gpt-4o / gemini-2.0-flash / claude-3-5-sonnet..."
          onChange={(e) => {
            setDraft((prev) => ({ ...prev, model: e.target.value }))
            setError(null)
          }}
        />
      </div>

      <div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">API Key（必填）</div>
        <div className="relative">
          <Input
            type={showKey ? 'text' : 'password'}
            value={draft.apiKey}
            placeholder="sk-..."
            className="pr-10"
            onChange={(e) => {
              setDraft((prev) => ({ ...prev, apiKey: e.target.value }))
              setError(null)
            }}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md inline-flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={() => setShowKey((v) => !v)}
            aria-label={showKey ? '隐藏 API Key' : '显示 API Key'}
          >
            <i className={`ph-bold ${showKey ? 'ph-eye-slash' : 'ph-eye'}`} aria-hidden />
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <i className="ph-fill ph-info text-primary-600 mt-0.5" aria-hidden />
        <div>配置保存在本地浏览器（localStorage），不会上传到服务器。</div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <div className="flex items-start gap-2">
            <i className="ph-fill ph-warning-circle text-red-600 mt-0.5" aria-hidden />
            <div>{error}</div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            reset()
            setDraft({ apiKey: '', baseUrl: '', model: '' })
            setError(null)
          }}
        >
          清空配置
        </Button>
        <Button
          variant="primary"
          disabled={!canSave}
          onClick={() => {
            if (!draft.apiKey.trim() || !draft.baseUrl.trim() || !draft.model.trim()) {
              setError('请填写 API Key、Base URL 和 Model（均为必填）。')
              return
            }
            setConfig({
              apiKey: draft.apiKey.trim(),
              baseUrl: draft.baseUrl.trim(),
              model: draft.model.trim(),
            })
            setError(null)
            onSaved?.()
          }}
        >
          保存配置
        </Button>
      </div>
    </div>
  )
}

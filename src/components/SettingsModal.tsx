import { useState } from 'react'

import type { ApiSettingsDraft } from '@/hooks/useApiSettings'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'

export interface SettingsModalProps {
  open: boolean
  draft: ApiSettingsDraft
  onChangeDraft: (next: ApiSettingsDraft) => void
  onClose: () => void
  onSave: () => void
  onResetToDefault: () => void
}

export function SettingsModal(props: SettingsModalProps) {
  const { open, draft, onChangeDraft, onClose, onSave, onResetToDefault } = props
  const [showKey, setShowKey] = useState(false)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="API 配置"
      footer={
        <>
          <Button variant="outline" onClick={onResetToDefault}>
            使用默认配置
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onSave()
              onClose()
            }}
          >
            保存配置
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">API 端点</div>
          <Input
            value={draft.baseUrl}
            placeholder="https://api.openai.com/v1"
            onChange={(e) => onChangeDraft({ ...draft, baseUrl: e.target.value })}
          />
        </div>

        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">API Key</div>
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              value={draft.apiKey}
              placeholder="sk-..."
              className="pr-10"
              onChange={(e) => onChangeDraft({ ...draft, apiKey: e.target.value })}
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
          <div>配置保存在本地浏览器，不会上传到服务器。</div>
        </div>
      </div>
    </Modal>
  )
}


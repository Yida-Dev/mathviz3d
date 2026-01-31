import { Modal } from '@/components/ui/Modal'
import { ApiKeySettings } from '@/components/settings/ApiKeySettings'
import { useAiConfigStore } from '@/stores/ai-config-store'

export function SettingsDialog() {
  const open = useAiConfigStore((s) => s.dialogOpen)
  const close = useAiConfigStore((s) => s.closeDialog)

  return (
    <Modal
      open={open}
      onClose={close}
      title="AI API 配置"
      footer={null}
    >
      <ApiKeySettings onSaved={close} />
    </Modal>
  )
}


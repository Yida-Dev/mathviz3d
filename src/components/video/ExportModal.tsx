import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

export function ExportModal(props: { open: boolean; onClose: () => void }) {
  const { open, onClose } = props
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="导出视频"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" disabled>
            开始导出（Phase 5）
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <p>当前阶段仅实现导出弹窗 UI。</p>
        <p className="text-slate-500">视频导出（WebCodecs/Mediabunny）将在 Phase 5 完成。</p>
      </div>
    </Modal>
  )
}


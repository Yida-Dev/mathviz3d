import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { VideoExporter, type ExportCodec } from '@/core/video-exporter'
import type { ElementRegistry } from '@/core/element-registry'
import type { GeometryData } from '@/core/geometry-data'
import type { Timeline } from '@/core/timeline'

export interface ExportModalProps {
  open: boolean
  onClose: () => void
  caseId?: string
  timeline: Timeline | null
  geometryData: GeometryData
  elementRegistry?: ElementRegistry
}

export function ExportModal(props: ExportModalProps) {
  const { open, onClose, caseId, timeline, geometryData, elementRegistry } = props

  const exporter = useMemo(() => new VideoExporter(), [])

  const [preset, setPreset] = useState<'1080p' | '720p'>('1080p')
  const [fps, setFps] = useState<30 | 60>(30)
  const [codec, setCodec] = useState<ExportCodec>('h264')
  const [bitrate, setBitrate] = useState<number>(10_000_000)

  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const { width, height } = preset === '1080p' ? { width: 1920, height: 1080 } : { width: 1280, height: 720 }

  const handleClose = () => {
    if (exporting) return
    setError(null)
    setProgress(0)
    onClose()
  }

  const handleStartExport = async () => {
    if (!timeline) {
      setError('当前没有可导出的 Timeline（请切换到“视频讲解”模式）')
      return
    }

    setExporting(true)
    setProgress(0)
    setError(null)

    try {
      const exportFn = (window as any).__MATHVIZ_E2E_EXPORT__ as
        | undefined
        | ((args: {
            timeline: Timeline
            geometryData: GeometryData
            elementRegistry?: ElementRegistry
            options: { fps: number; width: number; height: number; bitrate: number; codec: ExportCodec; onProgress: (p: number) => void }
          }) => Promise<Blob>)

      const blob = exportFn
        ? await exportFn({
            timeline,
            geometryData,
            elementRegistry,
            options: { fps, width, height, bitrate, codec, onProgress: setProgress },
          })
        : await exporter.export(timeline, geometryData, {
            fps,
            width,
            height,
            bitrate,
            codec,
            elementRegistry,
            onProgress: setProgress,
          })

      triggerDownload(blob, buildFileName(caseId, { width, height, fps, codec }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setExporting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="导出视频"
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={exporting}>
            取消
          </Button>
          <Button
            variant="primary"
            loading={exporting}
            onClick={handleStartExport}
            disabled={!timeline}
            leftIcon={<i className="ph-bold ph-download-simple text-base" aria-hidden />}
          >
            {exporting ? '导出中…' : '开始导出'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="分辨率">
            <select
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-600/10 focus:border-primary-600"
              value={preset}
              onChange={(e) => setPreset(e.target.value as any)}
              disabled={exporting}
              data-testid="export-resolution"
            >
              <option value="1080p">1080p（1920×1080）</option>
              <option value="720p">720p（1280×720）</option>
            </select>
          </Field>
          <Field label="帧率">
            <select
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-600/10 focus:border-primary-600"
              value={String(fps)}
              onChange={(e) => setFps((Number(e.target.value) as any) ?? 30)}
              disabled={exporting}
              data-testid="export-fps"
            >
              <option value="30">30 FPS</option>
              <option value="60">60 FPS</option>
            </select>
          </Field>
          <Field label="编码">
            <select
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-600/10 focus:border-primary-600"
              value={codec}
              onChange={(e) => setCodec(e.target.value as ExportCodec)}
              disabled={exporting}
              data-testid="export-codec"
            >
              <option value="h264">H.264（推荐）</option>
              <option value="vp9">VP9（降级）</option>
            </select>
          </Field>
          <Field label="码率">
            <input
              type="number"
              min={100_000}
              step={100_000}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-600/10 focus:border-primary-600"
              value={bitrate}
              onChange={(e) => setBitrate(Number(e.target.value))}
              disabled={exporting}
              data-testid="export-bitrate"
            />
          </Field>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>进度</span>
            <span data-testid="export-progress-text">{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden" aria-label="导出进度条">
            <div
              className="h-full bg-primary-600 transition-[width]"
              style={{ width: `${Math.round(progress * 100)}%` }}
              data-testid="export-progress"
            />
          </div>
          <p className="text-xs text-slate-500">
            导出在本地浏览器完成（Mediabunny + WebCodecs）。首次导出可能会稍慢。
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" data-testid="export-error">
            <div className="flex items-start gap-2">
              <i className="ph-fill ph-warning-circle text-red-600 mt-0.5" aria-hidden />
              <div>
                <div className="font-bold">导出失败</div>
                <div className="mt-1 whitespace-pre-wrap">{error}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function Field(props: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{props.label}</div>
      {props.children}
    </label>
  )
}

function buildFileName(caseId: string | undefined, args: { width: number; height: number; fps: number; codec: ExportCodec }): string {
  const base = caseId ? `mathviz-${caseId}` : 'mathviz'
  const stamp = formatTimestamp(new Date())
  return `${base}-${args.width}x${args.height}-${args.fps}fps-${args.codec}-${stamp}.mp4`
}

function formatTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const mi = pad(d.getMinutes())
  const ss = pad(d.getSeconds())
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // 给浏览器一点时间开始下载，然后释放 URL
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

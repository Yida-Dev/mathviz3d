import { useId, useState } from 'react'

import { cn } from '@/utils/cn'

export interface UploadZoneProps {
  loading?: boolean
  onFile?: (file: File) => void
}

export function UploadZone(props: UploadZoneProps) {
  const { loading = false, onFile } = props
  const inputId = useId()
  const [isDragging, setIsDragging] = useState(false)

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onFile?.(file)
  }

  return (
    <div>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile?.(file)
        }}
      />

      <label
        htmlFor={inputId}
        className={cn(
          'h-32 w-full rounded-xl border bg-slate-50 flex items-center justify-center text-center cursor-pointer select-none',
          loading ? 'border-primary-600 bg-blue-50/50' : isDragging ? 'border-primary-600 bg-blue-50/50' : 'border-dashed border-slate-200',
          'transition',
        )}
        onDragEnter={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setIsDragging(false)
        }}
        onDrop={onDrop}
      >
        <div className="space-y-2">
          <div className="mx-auto h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center">
            <i className="ph-duotone ph-camera text-primary-600 text-xl" aria-hidden />
          </div>
          <div className="text-xs font-medium text-slate-600">拍照或上传题目图片</div>
          <div className="text-[10px] text-slate-500">支持拖拽上传，或点击选择文件</div>
          {loading && <div className="text-[10px] text-primary-600">解析中...</div>}
        </div>
      </label>
    </div>
  )
}


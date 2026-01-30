export interface SubtitleRendererLike {
  composite(webglCanvas: HTMLCanvasElement, subtitle: string): HTMLCanvasElement
}

export interface SubtitleRendererOptions {
  /**
   * CSS font 字符串（建议包含中文字体兜底）
   * 默认：32px "Microsoft YaHei", "PingFang SC", sans-serif
   */
  font?: string
  /** 字幕填充色 */
  fillStyle?: string
  /** 字幕描边色 */
  strokeStyle?: string
  /** 描边宽度 */
  lineWidth?: number
  /** 底部留白（px） */
  paddingBottom?: number
  /** 每行最大宽度占比（0~1） */
  maxWidthRatio?: number
  /** 行高（px），用于多行换行 */
  lineHeight?: number
}

/**
 * SubtitleRenderer：导出时的“合成画布”字幕渲染器
 *
 * 背景：WebGL Canvas 无法同时作为 2D context 使用，因此导出需要
 * 1) 将 WebGL 帧 drawImage 到独立 2D canvas
 * 2) 在 2D canvas 上绘制字幕
 */
export class SubtitleRenderer implements SubtitleRendererLike {
  private readonly exportCanvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly opts: Required<SubtitleRendererOptions>

  constructor(width: number, height: number, options: SubtitleRendererOptions = {}) {
    this.exportCanvas = document.createElement('canvas')
    this.exportCanvas.width = Math.max(1, Math.floor(width))
    this.exportCanvas.height = Math.max(1, Math.floor(height))

    const ctx = this.exportCanvas.getContext('2d')
    if (!ctx) {
      throw new Error('无法创建 2D Canvas 上下文（CanvasRenderingContext2D）')
    }
    this.ctx = ctx

    this.opts = {
      font: options.font ?? '32px "Microsoft YaHei", "PingFang SC", sans-serif',
      fillStyle: options.fillStyle ?? 'white',
      strokeStyle: options.strokeStyle ?? 'black',
      lineWidth: options.lineWidth ?? 3,
      paddingBottom: options.paddingBottom ?? 60,
      maxWidthRatio: options.maxWidthRatio ?? 0.9,
      lineHeight: options.lineHeight ?? 42,
    }
  }

  composite(webglCanvas: HTMLCanvasElement, subtitle: string): HTMLCanvasElement {
    const w = this.exportCanvas.width
    const h = this.exportCanvas.height

    // 1) 清空并绘制 WebGL 帧（强制缩放到导出分辨率，避免 DPR 导致裁切）
    this.ctx.clearRect(0, 0, w, h)
    this.ctx.drawImage(webglCanvas, 0, 0, w, h)

    // 2) 绘制字幕（底部居中，白字黑边）
    const text = String(subtitle ?? '').trim()
    if (!text) return this.exportCanvas

    this.ctx.save()
    this.ctx.font = this.opts.font
    this.ctx.fillStyle = this.opts.fillStyle
    this.ctx.strokeStyle = this.opts.strokeStyle
    this.ctx.lineWidth = this.opts.lineWidth
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'bottom'

    const maxWidth = Math.max(1, Math.floor(w * this.opts.maxWidthRatio))
    const lines = wrapLines(this.ctx, text, maxWidth)
    const x = w / 2
    const baseY = h - this.opts.paddingBottom

    // 多行：从底部向上堆叠
    const startY = baseY - (lines.length - 1) * this.opts.lineHeight
    for (let i = 0; i < lines.length; i++) {
      const y = startY + i * this.opts.lineHeight
      this.ctx.strokeText(lines[i], x, y)
      this.ctx.fillText(lines[i], x, y)
    }

    this.ctx.restore()
    return this.exportCanvas
  }
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split(/\r?\n/).map((p) => p.trim())
  const out: string[] = []

  for (const paragraph of paragraphs) {
    if (!paragraph) {
      out.push('')
      continue
    }

    // 简单快速路径：一行放得下
    if (ctx.measureText(paragraph).width <= maxWidth) {
      out.push(paragraph)
      continue
    }

    // 逐字贪心换行（中文/英文混排都适用；比按空格更稳）
    let line = ''
    for (const ch of paragraph) {
      const next = line + ch
      if (ctx.measureText(next).width <= maxWidth || line.length === 0) {
        line = next
        continue
      }
      out.push(line)
      line = ch
    }
    if (line) out.push(line)
  }

  // 避免末尾空行导致字幕被“挤上去”
  while (out.length > 0 && out[out.length - 1] === '') out.pop()
  return out.length > 0 ? out : ['']
}


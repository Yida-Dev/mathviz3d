import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { SubtitleRenderer } from '@/core/subtitle-renderer'

describe('SubtitleRenderer', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext
  let ctxMap: WeakMap<HTMLCanvasElement, any>

  beforeEach(() => {
    ctxMap = new WeakMap<HTMLCanvasElement, any>()
    HTMLCanvasElement.prototype.getContext = vi.fn(function (this: HTMLCanvasElement, type: string) {
      if (type !== '2d') return null as any

      const existing = ctxMap.get(this)
      if (existing) return existing

      const ctx = {
        clearRect: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        measureText: vi.fn((text: string) => ({ width: String(text).length * 20 }) as any),
        strokeText: vi.fn(),
        fillText: vi.fn(),

        // 这些属性会在实现中被赋值
        font: '',
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        textAlign: 'left',
        textBaseline: 'alphabetic',
      } satisfies Partial<CanvasRenderingContext2D>

      ctxMap.set(this, ctx)
      return ctx as any
    }) as any
  })

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext
  })

  it('应将 WebGL 帧与字幕合成到同一个 2D 画布', () => {
    const webglCanvas = document.createElement('canvas')
    const renderer = new SubtitleRenderer(100, 50)

    const out = renderer.composite(webglCanvas, '字幕')

    expect(out).toBeInstanceOf(HTMLCanvasElement)
    expect(out.width).toBe(100)
    expect(out.height).toBe(50)

    const ctx = out.getContext('2d') as any
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 100, 50)
    expect(ctx.drawImage).toHaveBeenCalledWith(webglCanvas, 0, 0, 100, 50)
    expect(ctx.strokeText).toHaveBeenCalled()
    expect(ctx.fillText).toHaveBeenCalled()
  })

  it('空字幕应不绘制文字（仍会绘制画面）', () => {
    const webglCanvas = document.createElement('canvas')
    const renderer = new SubtitleRenderer(120, 60)

    const out = renderer.composite(webglCanvas, '')
    const ctx = out.getContext('2d') as any

    expect(ctx.drawImage).toHaveBeenCalled()
    expect(ctx.strokeText).not.toHaveBeenCalled()
    expect(ctx.fillText).not.toHaveBeenCalled()
  })

  it('长字幕应自动换行绘制多行', () => {
    const webglCanvas = document.createElement('canvas')
    const renderer = new SubtitleRenderer(100, 80)

    const out = renderer.composite(webglCanvas, '这是一段非常非常长的字幕')
    const ctx = out.getContext('2d') as any

    // 由于 measureText 被 mock 成 20px/字，100px 宽会触发换行
    expect(ctx.strokeText.mock.calls.length).toBeGreaterThan(1)
    expect(ctx.fillText.mock.calls.length).toBeGreaterThan(1)
  })
})

import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, canEncodeVideo } from 'mediabunny'

import { Player } from '@/core/player'
import { Renderer } from '@/core/renderer'
import { SubtitleRenderer } from '@/core/subtitle-renderer'
import type { ElementRegistry } from '@/core/element-registry'
import type { GeometryData } from '@/core/geometry-data'
import type { SceneState } from '@/core/scene-state'
import type { Timeline } from '@/core/timeline'

export type ExportCodec = 'h264' | 'vp9'

export interface ExportOptions {
  fps?: number
  width?: number
  height?: number
  bitrate?: number
  codec?: ExportCodec
  onProgress?: (progress: number) => void
  elementRegistry?: ElementRegistry
}

export interface ExportRenderer {
  render(state: SceneState): void
  getCanvas(): HTMLCanvasElement
  initAnimationElements?(registry: ElementRegistry): void
  dispose(): void
}

export type CreateRenderer = (args: { width: number; height: number; geometryData: GeometryData; elementRegistry?: ElementRegistry }) => ExportRenderer

export class VideoExporter {
  private readonly player: Player
  private readonly createRenderer: CreateRenderer

  constructor(args: { player?: Player; createRenderer?: CreateRenderer } = {}) {
    this.player = args.player ?? new Player()
    this.createRenderer = args.createRenderer ?? createDomRenderer
  }

  async export(timeline: Timeline, geometryData: GeometryData, options: ExportOptions = {}): Promise<Blob> {
    const fps = normalizeNumber(options.fps, 30, { min: 1, max: 120 })
    const width = Math.floor(normalizeNumber(options.width, 1920, { min: 320, max: 7680 }))
    const height = Math.floor(normalizeNumber(options.height, 1080, { min: 240, max: 4320 }))
    const bitrate = Math.floor(normalizeNumber(options.bitrate, 10_000_000, { min: 100_000, max: 200_000_000 }))
    const preferred = options.codec ?? 'h264'

    if (!hasWebCodecs()) {
      throw new Error('当前浏览器不支持 WebCodecs，无法导出 MP4（可在 Phase 5.4 接入 CCapture.js 降级方案）')
    }

    const codec = await selectCodec(preferred, { width, height, bitrate })

    const renderer = this.createRenderer({ width, height, geometryData, elementRegistry: options.elementRegistry })
    const subtitleRenderer = new SubtitleRenderer(width, height)

    try {
      const duration = Math.max(0, timeline.duration)
      const frameDuration = 1 / fps
      const totalFrames = Math.max(1, Math.ceil(duration * fps))

      options.onProgress?.(0)

      // 0) 首帧渲染，拿到字幕合成画布（作为 Mediabunny 的 CanvasSource 输入）
      const firstState = this.player.getState(timeline, 0)
      renderer.render(firstState)
      const exportCanvas = subtitleRenderer.composite(renderer.getCanvas(), firstState.subtitle)

      // 1) 创建输出（MP4）+ 视频轨道（CanvasSource 内部负责编码并写入 MP4）
      const target = new BufferTarget()
      const output = new Output({ format: new Mp4OutputFormat(), target })
      const videoSource = new CanvasSource(exportCanvas, {
        codec,
        bitrate,
        // 参考设计：约每 2 秒一个关键帧，兼顾体积与 seek 体验
        keyFrameInterval: 2,
      })
      output.addVideoTrack(videoSource)

      await output.start()

      // 2) 逐帧渲染 → 合成字幕 → 写入视频轨
      for (let frame = 0; frame < totalFrames; frame++) {
        const timestamp = frame * frameDuration
        const t = Math.min(timestamp, duration)
        const state = frame === 0 ? firstState : this.player.getState(timeline, t)

        if (frame !== 0) {
          renderer.render(state)
          subtitleRenderer.composite(renderer.getCanvas(), state.subtitle)
        }

        const isLast = frame === totalFrames - 1
        const frameDur = isLast ? clamp(duration - timestamp, 0, frameDuration) || frameDuration : frameDuration

        await videoSource.add(timestamp, frameDur)
        options.onProgress?.((frame + 1) / totalFrames)
      }

      videoSource.close()
      await output.finalize()

      const buffer = target.buffer
      if (!buffer) throw new Error('导出失败：未生成输出数据')

      const mime = await output.getMimeType().catch(() => 'video/mp4')
      return new Blob([buffer], { type: mime })
    } finally {
      renderer.dispose()
    }
  }
}

function hasWebCodecs(): boolean {
  // WebCodecs 最小集：VideoEncoder + VideoFrame（Mediabunny 会进一步校验）
  return typeof (globalThis as any).VideoEncoder !== 'undefined' && typeof (globalThis as any).VideoFrame !== 'undefined'
}

async function selectCodec(preferred: ExportCodec, args: { width: number; height: number; bitrate: number }): Promise<'avc' | 'vp9'> {
  const tryCodec = async (codec: 'avc' | 'vp9') => {
    try {
      return await canEncodeVideo(codec, { width: args.width, height: args.height, bitrate: args.bitrate })
    } catch {
      return false
    }
  }

  const primary = preferred === 'h264' ? 'avc' : 'vp9'
  const fallback = primary === 'avc' ? 'vp9' : 'avc'

  if (await tryCodec(primary)) return primary
  if (await tryCodec(fallback)) return fallback

  throw new Error('当前浏览器不支持 H.264/VP9 视频编码（WebCodecs），无法导出视频')
}

function createDomRenderer(args: { width: number; height: number; geometryData: GeometryData; elementRegistry?: ElementRegistry }): ExportRenderer {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-10000px'
  container.style.top = '-10000px'
  container.style.width = `${args.width}px`
  container.style.height = `${args.height}px`
  container.style.pointerEvents = 'none'
  container.style.opacity = '0'

  // 必须挂到 DOM，否则 clientWidth/clientHeight 可能为 0，导致 Three.js 初始化尺寸错误
  document.body.appendChild(container)

  const renderer = new Renderer(container, args.geometryData)
  if (args.elementRegistry) renderer.initAnimationElements(args.elementRegistry)

  return {
    render: (state) => renderer.render(state),
    getCanvas: () => renderer.getCanvas(),
    initAnimationElements: (registry) => renderer.initAnimationElements(registry),
    dispose: () => {
      renderer.dispose()
      container.remove()
    },
  }
}

function normalizeNumber(value: number | undefined, fallback: number, range?: { min: number; max: number }): number {
  const v = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  if (!range) return v
  return clamp(v, range.min, range.max)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}


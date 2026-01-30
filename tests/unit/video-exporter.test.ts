import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('mediabunny', () => {
  class BufferTarget {
    buffer: ArrayBuffer | null = null
    onwrite: ((start: number, end: number) => unknown) | null = null
  }

  class Mp4OutputFormat {}

  class CanvasSource {
    static lastConfig: any = null
    static lastInstance: any = null

    add = vi.fn(async () => {})
    close = vi.fn(() => {})

    constructor(_canvas: any, config: any) {
      CanvasSource.lastConfig = config
      CanvasSource.lastInstance = this
    }
  }

  class Output {
    format: any
    target: any
    state: any = 'pending'

    addVideoTrack = vi.fn(() => {})
    start = vi.fn(async () => {
      this.state = 'started'
    })
    finalize = vi.fn(async () => {
      this.target.buffer = new ArrayBuffer(8)
      this.state = 'finalized'
    })
    getMimeType = vi.fn(async () => 'video/mp4')
    cancel = vi.fn(async () => {
      this.state = 'canceled'
    })

    constructor(options: any) {
      this.format = options.format
      this.target = options.target
    }
  }

  const canEncodeVideo = vi.fn(async (codec: string) => codec === 'avc')

  return { BufferTarget, CanvasSource, Mp4OutputFormat, Output, canEncodeVideo }
})

describe('VideoExporter', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext

  beforeEach(() => {
    ;(globalThis as any).VideoEncoder = function () {}
    ;(globalThis as any).VideoFrame = function () {}

    // SubtitleRenderer 依赖 2D context：这里用最小 mock
    const ctxMap = new WeakMap<HTMLCanvasElement, any>()
    HTMLCanvasElement.prototype.getContext = vi.fn(function (this: HTMLCanvasElement, type: string) {
      if (type !== '2d') return null as any
      const existing = ctxMap.get(this)
      if (existing) return existing
      const ctx = {
        clearRect: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        measureText: vi.fn((text: string) => ({ width: String(text).length * 10 }) as any),
        strokeText: vi.fn(),
        fillText: vi.fn(),

        font: '',
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        textAlign: 'left',
        textBaseline: 'alphabetic',
      }
      ctxMap.set(this, ctx)
      return ctx as any
    }) as any
  })

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext
    delete (globalThis as any).VideoEncoder
    delete (globalThis as any).VideoFrame
  })

  it('应导出非空 Blob，并正确回调进度', async () => {
    const mediabunny = await import('mediabunny')
    vi.mocked(mediabunny.canEncodeVideo).mockResolvedValue(true)

    const { VideoExporter } = await import('@/core/video-exporter')

    const dispose = vi.fn()
    const fakeRenderer = {
      render: vi.fn(),
      getCanvas: () => document.createElement('canvas'),
      dispose,
    }

    const player = {
      getState: vi.fn(() => ({
        currentSceneId: 's1',
        globalTime: 0,
        sceneLocalTime: 0,
        visibleElements: new Set<string>(),
        opacities: new Map<string, number>(),
        highlights: new Map<string, string>(),
        paramValues: new Map<string, number>(),
        foldAngles: new Map<string, number>(),
        camera: { position: { x: 0, y: 0, z: 0 }, lookAt: { x: 0, y: 0, z: 0 } },
        subtitle: '字幕',
        activeMeasurements: [],
      })),
    }

    const exporter = new VideoExporter({
      player: player as any,
      createRenderer: () => fakeRenderer as any,
    })

    const progressCalls: number[] = []
    const blob = await exporter.export(
      {
        duration: 0.2,
        scenes: [
          {
            id: 's1',
            startTime: 0,
            endTime: 0.2,
            narration: '',
            activeMeasurements: [],
            cameraTrack: [],
            actionTracks: [],
          },
        ],
      } as any,
      {} as any,
      {
        fps: 10,
        width: 320,
        height: 240,
        bitrate: 1_000_000,
        codec: 'h264',
        onProgress: (p) => progressCalls.push(p),
      },
    )

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
    expect(progressCalls[0]).toBe(0)
    expect(progressCalls[progressCalls.length - 1]).toBe(1)
    expect(dispose).toHaveBeenCalled()

    const CanvasSource = mediabunny.CanvasSource as any
    expect(CanvasSource.lastInstance.add).toHaveBeenCalledTimes(2)
  })

  it('当首选 codec 不支持时应自动降级', async () => {
    const mediabunny = await import('mediabunny')
    vi.mocked(mediabunny.canEncodeVideo).mockImplementation(async (codec: any) => codec === 'vp9')

    const { VideoExporter } = await import('@/core/video-exporter')

    const exporter = new VideoExporter({
      player: { getState: vi.fn(() => ({ currentSceneId: 's1', globalTime: 0, sceneLocalTime: 0, visibleElements: new Set(), opacities: new Map(), highlights: new Map(), paramValues: new Map(), foldAngles: new Map(), camera: { position: { x: 0, y: 0, z: 0 }, lookAt: { x: 0, y: 0, z: 0 } }, subtitle: '', activeMeasurements: [] })) } as any,
      createRenderer: () => ({ render: vi.fn(), getCanvas: () => document.createElement('canvas'), dispose: vi.fn() }) as any,
    })

    await exporter.export(
      { duration: 0.01, scenes: [{ id: 's1', startTime: 0, endTime: 0.01, narration: '', activeMeasurements: [], cameraTrack: [], actionTracks: [] }] } as any,
      {} as any,
      { fps: 10, width: 320, height: 240, bitrate: 1_000_000, codec: 'h264' },
    )

    const CanvasSource = mediabunny.CanvasSource as any
    expect(CanvasSource.lastConfig.codec).toBe('vp9')
  })
})


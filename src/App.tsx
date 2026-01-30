import { useCallback, useEffect, useMemo, useState } from 'react'

import { MainCanvas } from '@/components/MainCanvas'
import { AppLayout } from '@/components/layout/AppLayout'
import { Header } from '@/components/layout/Header'
import { LeftPanel, LeftPanelBody, LeftPanelSectionHeader } from '@/components/layout/LeftPanel'
import { TimelinePanel } from '@/components/layout/TimelinePanel'
import { AIResultPanel } from '@/components/interactive/AIResultPanel'
import { MeasureCard } from '@/components/interactive/MeasureCard'
import { ParamControls } from '@/components/interactive/ParamControls'
import { UploadZone } from '@/components/interactive/UploadZone'
import { SettingsModal } from '@/components/SettingsModal'
import { ExplanationPanel } from '@/components/video/ExplanationPanel'
import { ExportModal } from '@/components/video/ExportModal'
import { PlayControls } from '@/components/video/PlayControls'
import { SubtitleBar } from '@/components/video/SubtitleBar'
import { Compiler } from '@/core/compiler'
import { CoordCalculator } from '@/core/coord-calculator'
import { buildGeometryData } from '@/core/geometry-data'
import { Player } from '@/core/player'
import type { EvalContext, SemanticDefinition } from '@/core/types'
import type { SceneState } from '@/core/scene-state'
import { useAppMode, type AppMode } from '@/hooks/useAppMode'
import { useApiSettings } from '@/hooks/useApiSettings'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useParams } from '@/hooks/useParams'
import { usePlayer } from '@/hooks/usePlayer'
import { runAiPipelineMock } from '@/services/ai-pipeline'
import type { CaseId } from '@/types/app'

import case1Semantic from '../tests/fixtures/case1/semantic.json'
import case1Script from '../tests/fixtures/case1/animation.json'
import case2Semantic from '../tests/fixtures/case2/semantic.json'
import case2Script from '../tests/fixtures/case2/animation.json'
import case3Semantic from '../tests/fixtures/case3/semantic.json'
import case3Script from '../tests/fixtures/case3/animation.json'

function App() {
  const breakpoint = useBreakpoint()

  const initialFromUrl = useMemo(() => parseUrlInitial(), [])
  const { mode, setMode } = useAppMode(initialFromUrl.mode)

  const [selectedCaseId, setSelectedCaseId] = useState<CaseId>(initialFromUrl.caseId)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const apiSettings = useApiSettings()
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Tablet 左侧面板折叠
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const saved = window.localStorage.getItem('mathviz:leftPanelOpen')
    if (saved != null) return saved === '1'
    return breakpoint === 'desktop'
  })

  useEffect(() => {
    if (breakpoint === 'desktop') {
      setIsLeftPanelOpen(true)
      return
    }
    if (breakpoint === 'tablet') {
      const saved = window.localStorage.getItem('mathviz:leftPanelOpen')
      setIsLeftPanelOpen(saved != null ? saved === '1' : false)
    }
  }, [breakpoint])

  useEffect(() => {
    if (breakpoint === 'tablet') {
      window.localStorage.setItem('mathviz:leftPanelOpen', isLeftPanelOpen ? '1' : '0')
    }
  }, [breakpoint, isLeftPanelOpen])

  const semantic: SemanticDefinition = useMemo(() => {
    switch (selectedCaseId) {
      case 'case1':
        return case1Semantic as any
      case 'case2':
        return case2Semantic as any
      case 'case3':
        return case3Semantic as any
      default:
        return case1Semantic as any
    }
  }, [selectedCaseId])

  const script = useMemo(() => {
    switch (selectedCaseId) {
      case 'case1':
        return case1Script as any
      case 'case2':
        return case2Script as any
      case 'case3':
        return case3Script as any
      default:
        return case1Script as any
    }
  }, [selectedCaseId])

  // 同步 URL（便于 E2E/调试）
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search)
    qs.set('case', selectedCaseId)
    qs.set('mode', mode)
    const next = `${window.location.pathname}?${qs.toString()}`
    window.history.replaceState(null, '', next)
  }, [selectedCaseId, mode])

  const handleCaseChange = (caseId: CaseId) => {
    setAiError(null)
    setSelectedCaseId(caseId)
  }

  const handleUploadFile = async (file: File) => {
    setAiLoading(true)
    setAiError(null)
    try {
      const result = await runAiPipelineMock(file)
      setSelectedCaseId(result.caseId)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : String(err))
    } finally {
      setAiLoading(false)
    }
  }

  // ========== 交互模式 ==========
  const geometryData = useMemo(() => buildGeometryData(semantic), [semantic])
  const { paramValues, foldAngles, setParam } = useParams(semantic)

  const evalCtx: EvalContext = useMemo(() => ({ params: paramValues, foldAngles }), [paramValues, foldAngles])
  const calc = useMemo(() => new CoordCalculator(semantic), [semantic])

  const constantMeasurements = useMemo(() => computeConstantMeasurements(calc, semantic), [calc, semantic])

  const interactiveState: SceneState = useMemo(() => {
    const visible = new Set<string>(['geometry', 'vertexLabels'])
    for (const id of geometryData.vertices.keys()) visible.add(id)
    for (const id of geometryData.points.keys()) visible.add(id)

    return {
      currentSceneId: 'interactive',
      globalTime: 0,
      sceneLocalTime: 0,
      visibleElements: visible,
      opacities: new Map(),
      highlights: new Map(),
      paramValues,
      foldAngles,
      camera: { position: { x: 4, y: 3, z: 5 }, lookAt: { x: 0, y: 0, z: 0 } },
      subtitle: '',
      activeMeasurements: [],
    }
  }, [geometryData, paramValues, foldAngles])

  const measurementItems = useMemo(() => {
    const defs = semantic.measurements ?? []
    return defs.map((m) => {
      const value = calc.getMeasurement(m.id, evalCtx)
      const { text, unit } = formatMeasurement(m.type, value)
      return {
        id: m.id,
        label: m.id,
        value: text,
        unit,
        isConstant: constantMeasurements.has(m.id),
      }
    })
  }, [semantic.measurements, calc, evalCtx, constantMeasurements])

  // ========== 视频模式 ==========
  const compiler = useMemo(() => new Compiler(), [])
  const player = useMemo(() => new Player(), [])

  const compileResult = useMemo(() => {
    if (mode !== 'video') return null
    return compiler.compile(script, semantic)
  }, [mode, compiler, script, semantic])

  const [playbackRate, setPlaybackRate] = useState<number>(() => {
    if (typeof window === 'undefined') return 1
    const raw = window.localStorage.getItem('mathviz:playbackRate')
    const v = raw != null ? Number(raw) : 1
    return v === 0.5 || v === 1 || v === 1.5 || v === 2 ? v : 1
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('mathviz:playbackRate', String(playbackRate))
  }, [playbackRate])

  const { state: videoState, currentTime, duration, isPlaying, play, pause, seek } = usePlayer(
    compileResult?.timeline ?? null,
    player,
    playbackRate,
  )

  const currentSceneId = videoState?.currentSceneId ?? null

  const onPrevScene = useCallback(() => {
    const timeline = compileResult?.timeline
    const s = currentSceneId
    if (!timeline || !s) return
    const idx = timeline.scenes.findIndex((x) => x.id === s)
    const prev = timeline.scenes[Math.max(0, idx - 1)]
    seek(prev.startTime)
  }, [compileResult, currentSceneId, seek])

  const onNextScene = useCallback(() => {
    const timeline = compileResult?.timeline
    const s = currentSceneId
    if (!timeline || !s) return
    const idx = timeline.scenes.findIndex((x) => x.id === s)
    const next = timeline.scenes[Math.min(timeline.scenes.length - 1, idx + 1)]
    seek(next.startTime)
  }, [compileResult, currentSceneId, seek])

  // 视频模式快捷键：空格播放/暂停，左右键上一/下一步
  useEffect(() => {
    if (mode !== 'video') return

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toUpperCase()
      const isEditable = Boolean(target?.isContentEditable) || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (isEditable) return

      if (e.code === 'Space') {
        e.preventDefault()
        if (isPlaying) pause()
        else play()
        return
      }
      if (e.code === 'ArrowLeft') {
        e.preventDefault()
        onPrevScene()
        return
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault()
        onNextScene()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isPlaying, mode, onNextScene, onPrevScene, pause, play])

  const videoSteps = useMemo(() => {
    const timeline = compileResult?.timeline
    if (!timeline) return []
    return timeline.scenes.map((s) => ({
      id: s.id,
      title: makeSceneTitle(s.narration, s.id),
      timeLabel: formatTime(s.startTime),
    }))
  }, [compileResult])

  const videoMeasurementItems = useMemo(() => {
    if (mode !== 'video') return []
    if (!videoState) return []
    const ids = videoState.activeMeasurements ?? []
    if (ids.length === 0) return []

    const defMap = new Map((semantic.measurements ?? []).map((m) => [m.id, m]))
    const ctx: EvalContext = { params: videoState.paramValues, foldAngles: videoState.foldAngles }

    return ids.map((id) => {
      const def = defMap.get(id)
      const value = calc.getMeasurement(id, ctx)
      const { text, unit } = formatMeasurement(def?.type ?? 'distance', value)
      return {
        id,
        label: id,
        value: text,
        unit,
        isConstant: constantMeasurements.has(id),
      }
    })
  }, [mode, videoState, semantic.measurements, calc, constantMeasurements])

  // ========== 弹窗 ==========
  const [exportOpen, setExportOpen] = useState(false)

  // ========== Render ==========
  const leftPanel = (
    <LeftPanel>
      {mode === 'interactive' ? (
        <>
          <LeftPanelSectionHeader icon="ph-image" title="题目来源" />
          <LeftPanelBody>
            <UploadZone loading={aiLoading} onFile={handleUploadFile} />
            {aiError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <div className="flex items-start gap-2">
                  <i className="ph-fill ph-warning-circle text-red-600 mt-0.5" aria-hidden />
                  <div>
                    <div className="font-bold">解析失败</div>
                    <div className="mt-1">{aiError}</div>
                  </div>
                </div>
              </div>
            )}
            <AIResultPanel semantic={semantic} />

            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">参数调整</div>
              <ParamControls semantic={semantic} values={paramValues} onChange={setParam} />
            </div>

            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">测量值</div>
              <MeasureCard items={measurementItems} />
            </div>
          </LeftPanelBody>
        </>
      ) : (
        <>
          <LeftPanelSectionHeader icon="ph-list" title="讲解大纲" />
          <LeftPanelBody>
            <ExplanationPanel steps={videoSteps} currentId={videoState?.currentSceneId ?? null} />
            {videoMeasurementItems.length > 0 && (
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">测量值</div>
                <MeasureCard items={videoMeasurementItems} />
              </div>
            )}
          </LeftPanelBody>
        </>
      )}
    </LeftPanel>
  )

  const floatingPanel =
    mode === 'interactive' ? (
      <div className="w-64 bg-white/90 backdrop-blur-md border border-white/50 rounded-xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-slate-700">几何参数控制</div>
          <span className="h-2 w-2 rounded-full bg-green-500" aria-label="活跃" />
        </div>
        <ParamControls semantic={semantic} values={paramValues} onChange={setParam} />
      </div>
    ) : null

  const main = (
    <div className="w-full h-full relative">
      <MainCanvas
        semantic={semantic}
        geometryData={geometryData}
        state={mode === 'video' ? videoState ?? undefined : interactiveState}
        registry={mode === 'video' ? compileResult?.elementRegistry : undefined}
      />

      {mode === 'video' && <SubtitleBar subtitle={videoState?.subtitle ?? ''} />}

      {mode === 'interactive' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-full px-4 py-2 shadow-lg text-xs text-slate-600 flex items-center gap-2">
            <i className="ph-duotone ph-hand-grabbing text-primary-600" aria-hidden />
            拖拽旋转视角
            <span className="text-slate-300">|</span>
            滚轮缩放
          </div>
        </div>
      )}
    </div>
  )

  const timeline =
    mode === 'video' ? (
      <TimelinePanel>
        <PlayControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onPlay={play}
          onPause={pause}
          onSeek={seek}
          onPrev={onPrevScene}
          onNext={onNextScene}
          markers={compileResult?.timeline.scenes.map((s) => s.startTime) ?? []}
          playbackRate={playbackRate}
          onChangePlaybackRate={setPlaybackRate}
        />
      </TimelinePanel>
    ) : undefined

  return (
    <>
      <AppLayout
        breakpoint={breakpoint}
        header={
          <Header
            breakpoint={breakpoint}
            mode={mode}
            onModeChange={setMode}
            isLeftPanelOpen={isLeftPanelOpen}
            onToggleLeftPanel={() => setIsLeftPanelOpen((v) => !v)}
            selectedCaseId={selectedCaseId}
            onCaseChange={(v) => handleCaseChange(v as CaseId)}
            onOpenSettings={() => setSettingsOpen(true)}
            onExport={() => setExportOpen(true)}
          />
        }
        leftPanel={leftPanel}
        main={main}
        timeline={timeline}
        floatingPanel={floatingPanel ?? undefined}
        isLeftPanelOpen={isLeftPanelOpen}
        onRequestCloseLeftPanel={() => setIsLeftPanelOpen(false)}
      />

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
      <SettingsModal
        open={settingsOpen}
        draft={apiSettings.draft}
        onChangeDraft={apiSettings.setDraft}
        onClose={() => setSettingsOpen(false)}
        onSave={apiSettings.save}
        onResetToDefault={apiSettings.resetToDefault}
      />
    </>
  )
}

function parseUrlInitial(): { caseId: CaseId; mode?: AppMode } {
  if (typeof window === 'undefined') return { caseId: 'case1' }
  const qs = new URLSearchParams(window.location.search)

  const rawCase = qs.get('case') ?? 'case1'
  const caseId: CaseId = rawCase === 'case2' || rawCase === '2' ? 'case2' : rawCase === 'case3' || rawCase === '3' ? 'case3' : 'case1'

  const rawMode = qs.get('mode')
  const mode: AppMode | undefined = rawMode === 'video' || rawMode === 'animation' ? 'video' : rawMode === 'interactive' ? 'interactive' : undefined

  return { caseId, mode }
}

function formatMeasurement(type: string, value: number): { text: string; unit?: string } {
  switch (type) {
    case 'distance':
      return { text: value.toFixed(2) }
    case 'angle':
      return { text: value.toFixed(1), unit: '°' }
    case 'volume':
      return { text: value.toFixed(4) }
    case 'area':
      return { text: value.toFixed(4) }
    default:
      return { text: String(value) }
  }
}

function computeConstantMeasurements(calc: CoordCalculator, semantic: SemanticDefinition): Set<string> {
  const out = new Set<string>()
  const defs = semantic.measurements ?? []
  const params = semantic.params ?? []

  if (defs.length === 0) return out
  if (params.length === 0) {
    for (const m of defs) out.add(m.id)
    return out
  }

  const baseParams = new Map<string, number>(params.map((p) => [p.id, p.default]))
  const baseFoldAngles = buildFoldAngles(semantic, baseParams)

  const baseCtx: EvalContext = { params: baseParams, foldAngles: baseFoldAngles }

  for (const m of defs) {
    const base = calc.getMeasurement(m.id, baseCtx)
    let constant = true

    for (const p of params) {
      const lowParams = new Map(baseParams)
      lowParams.set(p.id, p.min)
      const highParams = new Map(baseParams)
      highParams.set(p.id, p.max)

      const lowCtx: EvalContext = { params: lowParams, foldAngles: buildFoldAngles(semantic, lowParams) }
      const highCtx: EvalContext = { params: highParams, foldAngles: buildFoldAngles(semantic, highParams) }

      const low = calc.getMeasurement(m.id, lowCtx)
      const high = calc.getMeasurement(m.id, highCtx)

      const eps = 1e-6
      if (Math.abs(low - base) > eps || Math.abs(high - base) > eps) {
        constant = false
        break
      }
    }

    if (constant) out.add(m.id)
  }

  return out
}

function buildFoldAngles(semantic: SemanticDefinition, params: Map<string, number>): Map<string, number> {
  const map = new Map<string, number>()
  for (const fold of semantic.folds ?? []) {
    const byParam = fold.angleParam ? params.get(fold.angleParam) : undefined
    map.set(fold.id, byParam ?? fold.defaultAngle ?? 180)
  }
  return map
}

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function makeSceneTitle(narration: string, fallback: string): string {
  const text = String(narration ?? '').trim()
  if (!text) return fallback
  const max = 16
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export default App

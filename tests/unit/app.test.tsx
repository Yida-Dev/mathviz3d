import { beforeEach, describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '@/App'
import { usePipelineStore } from '@/stores/pipeline-store'

import case2Semantic from '../fixtures/case2/semantic.json'

describe('App', () => {
  beforeEach(() => {
    usePipelineStore.getState().reset()
    // 默认测试环境可能是 tablet/mobile，导致 LeftPanel 不渲染，无法断言 AIResultPanel 内容。
    window.localStorage.removeItem('mathviz:leftPanelOpen')
    window.innerWidth = 1400
    window.dispatchEvent(new Event('resize'))
  })

  it('应渲染标题与副标题', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'MathViz' })).toBeInTheDocument()
    expect(screen.getByText('Student Edition')).toBeInTheDocument()
  })

  it('Planner 失败进入 error 时，只要有 semantic，交互模式也应立即使用该 semantic（不回退到 fixture）', () => {
    usePipelineStore.setState({
      state: { status: 'error', message: 'Planner JSON 解析失败', retryable: true, semantic: case2Semantic as any },
      lastFile: null,
    })

    render(<App />)
    expect(screen.getByText('tetrahedron')).toBeInTheDocument()
  })
})

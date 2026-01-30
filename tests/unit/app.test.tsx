import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '@/App'

describe('App', () => {
  it('应渲染标题与副标题', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'MathViz3D' })).toBeInTheDocument()
    expect(screen.getByText('几何可视化系统')).toBeInTheDocument()
  })
})


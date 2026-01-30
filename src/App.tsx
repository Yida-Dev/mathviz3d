import { useMemo, useState } from 'react'

import { MainCanvas } from '@/components/MainCanvas'

import case1Semantic from '../tests/fixtures/case1/semantic.json'
import case2Semantic from '../tests/fixtures/case2/semantic.json'
import case3Semantic from '../tests/fixtures/case3/semantic.json'

function App() {
  const [selected, setSelected] = useState<'case1' | 'case2' | 'case3'>('case1')

  const semantic = useMemo(() => {
    switch (selected) {
      case 'case1':
        return case1Semantic as any
      case 'case2':
        return case2Semantic as any
      case 'case3':
        return case3Semantic as any
      default:
        return case1Semantic as any
    }
  }, [selected])

  return (
    <div className="min-h-screen bg-surface-dark text-white">
      <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">MathViz3D</h1>
          <p className="text-gray-400 text-sm">几何可视化系统</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-300" htmlFor="case-select">
            用例
          </label>
          <select
            id="case-select"
            className="bg-white/10 border border-white/10 rounded px-3 py-1 text-sm"
            value={selected}
            onChange={(e) => setSelected(e.target.value as any)}
          >
            <option value="case1">case1（cube）</option>
            <option value="case2">case2（tetrahedron）</option>
            <option value="case3">case3（fold）</option>
          </select>
        </div>
      </header>

      <main className="p-6">
        <div className="w-full h-[520px] bg-white rounded-lg overflow-hidden">
          <MainCanvas semantic={semantic} />
        </div>
      </main>
    </div>
  )
}

export default App

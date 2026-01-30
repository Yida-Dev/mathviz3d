import { useEffect, useMemo, useState } from 'react'

import type { SemanticDefinition } from '@/core/types'

export function useParams(semantic: SemanticDefinition) {
  const [paramValues, setParamValues] = useState<Map<string, number>>(() => buildDefaultParams(semantic))

  useEffect(() => {
    setParamValues(buildDefaultParams(semantic))
  }, [semantic])

  const foldAngles = useMemo(() => {
    const map = new Map<string, number>()
    for (const fold of semantic.folds ?? []) {
      const byParam = fold.angleParam ? paramValues.get(fold.angleParam) : undefined
      map.set(fold.id, byParam ?? fold.defaultAngle ?? 180)
    }
    return map
  }, [paramValues, semantic.folds])

  const setParam = (paramId: string, value: number) => {
    setParamValues((prev) => {
      const next = new Map(prev)
      next.set(paramId, value)
      return next
    })
  }

  const reset = () => setParamValues(buildDefaultParams(semantic))

  return { paramValues, foldAngles, setParam, reset }
}

function buildDefaultParams(semantic: SemanticDefinition): Map<string, number> {
  return new Map((semantic.params ?? []).map((p) => [p.id, p.default]))
}


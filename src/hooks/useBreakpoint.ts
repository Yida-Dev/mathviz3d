import { useEffect, useState } from 'react'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

function getBreakpoint(width: number): Breakpoint {
  if (width < 768) return 'mobile'
  if (width < 1280) return 'tablet'
  return 'desktop'
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() => (typeof window === 'undefined' ? 'desktop' : getBreakpoint(window.innerWidth)))

  useEffect(() => {
    const onResize = () => setBp(getBreakpoint(window.innerWidth))
    window.addEventListener('resize', onResize, { passive: true })
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return bp
}


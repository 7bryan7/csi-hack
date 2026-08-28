import { useEffect, useRef, useState } from 'react'

/**
 * Measure an element's width without ResizeObserver (which is unreliable in
 * some embedded browsers). Uses getBoundingClientRect on mount + window resize.
 */
export function useContainerWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const measure = () => {
      if (ref.current) {
        const w = ref.current.getBoundingClientRect().width
        setWidth((prev) => (Math.abs(prev - w) > 1 ? w : prev))
      }
    }
    measure()
    window.addEventListener('resize', measure)
    // Also re-measure shortly after mount in case layout settles late
    const t = setTimeout(measure, 300)
    return () => {
      window.removeEventListener('resize', measure)
      clearTimeout(t)
    }
  }, [])

  return [ref, width]
}
'use client'
import { useEffect, useRef, type RefObject } from 'react'

/**
 * Tracks whether a canvas is on screen via IntersectionObserver, returning a
 * ref<boolean> the animation loop can poll to pause its requestAnimationFrame
 * work when scrolled out of view. Used to retrofit the standalone canvas sims
 * (the QuantumCanvas-based ones already pause themselves).
 */
export function useCanvasVisible(ref: RefObject<HTMLCanvasElement | null>) {
  const visible = useRef(true)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry.isIntersecting
      },
      { threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return visible
}

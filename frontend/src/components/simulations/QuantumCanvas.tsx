'use client'
import { useEffect, useRef, useState } from 'react'

export interface CanvasFrame {
  /** Elapsed simulation time in seconds (scaled by the speed multiplier). */
  t: number
  /** Seconds since the previous frame (already scaled by speed). */
  dt: number
  width: number
  height: number
}

interface QuantumCanvasProps {
  /** Called every animation frame to paint the canvas. */
  draw: (ctx: CanvasRenderingContext2D, frame: CanvasFrame) => void
  /** Logical canvas height in CSS pixels (width tracks the container). */
  height?: number
  /** Show the play/pause/reset + speed controls. Default true. */
  controls?: boolean
  /** Available speed multipliers. */
  speeds?: number[]
  /** Called when the user resets — clear any accumulated state here. */
  onReset?: () => void
  className?: string
  /** Optional extra controls rendered to the right of the built-in ones. */
  children?: React.ReactNode
}

/**
 * Shared animation host for canvas simulations. Owns the requestAnimationFrame
 * loop and exposes consistent play/pause/reset + speed controls so individual
 * sims only describe *what* to paint. It also:
 *   - pauses the loop when scrolled out of the viewport (IntersectionObserver),
 *   - honours `prefers-reduced-motion` (starts paused, paints one static frame),
 *   - scales for devicePixelRatio so canvases stay crisp on retina displays.
 */
export default function QuantumCanvas({
  draw,
  height = 320,
  controls = true,
  speeds = [0.5, 1, 2],
  onReset,
  className,
  children,
}: QuantumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const tRef = useRef(0)
  const lastTsRef = useRef<number | null>(null)
  const speedRef = useRef(1)
  const playingRef = useRef(true)
  const inViewRef = useRef(true)
  // Keep the latest draw callback without restarting the loop each render.
  const drawRef = useRef(draw)
  drawRef.current = draw

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const [playing, setPlaying] = useState(!prefersReduced)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    playingRef.current = playing
  }, [playing])
  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  // Single place that paints one frame at the current sim time.
  const paint = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    drawRef.current(ctx, { t: tRef.current, dt: 0, width: w, height: h })
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let heightPx = height

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.parentElement?.clientWidth ?? 700
      heightPx = height
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(heightPx * dpr)
      canvas.style.width = '100%'
      canvas.style.height = `${heightPx}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // Repaint immediately so a resize while paused isn't blank.
      paint(ctx, width, heightPx)
    }
    resize()

    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    // Pause the loop when the canvas isn't on screen.
    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting
        if (entry.isIntersecting) lastTsRef.current = null
      },
      { threshold: 0.1 }
    )
    io.observe(canvas)

    const loop = (ts: number) => {
      rafRef.current = requestAnimationFrame(loop)
      if (!playingRef.current || !inViewRef.current) {
        lastTsRef.current = null
        return
      }
      if (lastTsRef.current == null) lastTsRef.current = ts
      // Cap dt so returning to a backgrounded tab doesn't jump the sim.
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.1) * speedRef.current
      lastTsRef.current = ts
      tRef.current += dt
      drawRef.current(ctx, { t: tRef.current, dt, width, height: heightPx })
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      io.disconnect()
    }
    // height is the only structural input; draw is read through drawRef.
  }, [height])

  const reset = () => {
    tRef.current = 0
    lastTsRef.current = null
    onReset?.()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (ctx && canvas) {
      paint(ctx, canvas.parentElement?.clientWidth ?? 700, height)
    }
  }

  return (
    <div className={className}>
      <canvas ref={canvasRef} className="w-full rounded-lg block" style={{ background: '#060414' }} />

      {controls && (
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="px-3 py-1.5 rounded-lg border border-quantum-500/30 text-quantum-300 hover:border-quantum-500/60 text-xs font-mono transition-all"
            aria-pressed={playing}
          >
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <button
            onClick={reset}
            className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200 text-xs font-mono transition-all"
          >
            ↺ Reset
          </button>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Speed</span>
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 rounded text-xs font-mono transition-all ${
                  speed === s
                    ? 'bg-quantum-500/15 text-quantum-300'
                    : 'text-slate-600 hover:text-slate-300'
                }`}
              >
                {s}×
              </button>
            ))}
          </div>

          {children}

          {prefersReduced && !playing && (
            <span className="text-[10px] text-slate-600 ml-auto">motion reduced — press play</span>
          )}
        </div>
      )}
    </div>
  )
}

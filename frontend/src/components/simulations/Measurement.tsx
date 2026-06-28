'use client'
import { useRef, useEffect, useState } from 'react'

// Wavefunction collapse: a spread-out |ψ|² snaps to a single localised spike
// when measured, and repeated measurements rebuild the Born distribution.
export default function Measurement() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  // collapseRef holds the measured x (0..1) while collapsing, else null.
  const collapseRef = useRef<number | null>(null)
  const collapseAmtRef = useRef(0) // 0 = spread, 1 = fully collapsed
  const histRef = useRef<number[]>(new Array(60).fill(0))

  const [count, setCount] = useState(0)
  const [collapsed, setCollapsed] = useState(false)

  // |ψ|² as a normalised two-bump superposition over x ∈ [0,1].
  const density = (x: number) =>
    0.7 * Math.exp(-((x - 0.34) ** 2) / 0.012) + 1.0 * Math.exp(-((x - 0.66) ** 2) / 0.02)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    canvas.width = canvas.parentElement?.clientWidth ?? 700
    canvas.height = 320
    const W = canvas.width
    const H = canvas.height
    const padB = 64
    const base = H - padB
    const top = 24

    // Precompute normalisation + CDF for sampling.
    const N = 400
    const pdf: number[] = []
    let sum = 0
    for (let i = 0; i < N; i++) {
      const v = density(i / N)
      pdf.push(v)
      sum += v
    }
    const maxPdf = Math.max(...pdf)

    const render = () => {
      ctx.fillStyle = '#060414'
      ctx.fillRect(0, 0, W, H)

      const collapseX = collapseRef.current
      // Ease the collapse amount toward target.
      const target = collapseX === null ? 0 : 1
      collapseAmtRef.current += (target - collapseAmtRef.current) * 0.12
      const amt = collapseAmtRef.current

      // Current curve: blend spread |ψ|² with a narrow spike at collapseX.
      ctx.beginPath()
      ctx.moveTo(0, base)
      for (let px = 0; px <= W; px++) {
        const x = px / W
        const spread = density(x) / maxPdf
        let spike = 0
        if (collapseX !== null) {
          spike = Math.exp(-((x - collapseX) ** 2) / 0.0004)
        }
        const v = spread * (1 - amt) + spike * amt
        ctx.lineTo(px, base - v * (base - top))
      }
      ctx.lineTo(W, base)
      ctx.closePath()
      const grad = ctx.createLinearGradient(0, top, 0, base)
      grad.addColorStop(0, collapseX !== null ? 'rgba(255,94,196,0.5)' : 'rgba(162,89,255,0.4)')
      grad.addColorStop(1, 'rgba(162,89,255,0.02)')
      ctx.fillStyle = grad
      ctx.fill()
      ctx.strokeStyle = collapseX !== null ? '#ff5ec4' : '#a259ff'
      ctx.lineWidth = 2.5
      ctx.shadowColor = collapseX !== null ? 'rgba(255,94,196,0.5)' : 'rgba(162,89,255,0.5)'
      ctx.shadowBlur = 10
      ctx.beginPath()
      for (let px = 0; px <= W; px++) {
        const x = px / W
        const spread = density(x) / maxPdf
        let spike = 0
        if (collapseX !== null) spike = Math.exp(-((x - collapseX) ** 2) / 0.0004)
        const v = spread * (1 - amt) + spike * amt
        const y = base - v * (base - top)
        px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y)
      }
      ctx.stroke()
      ctx.shadowBlur = 0

      // Histogram of past measurements along the bottom strip.
      const bins = histRef.current
      const maxBin = Math.max(1, ...bins)
      const bw = W / bins.length
      for (let i = 0; i < bins.length; i++) {
        const h = (bins[i] / maxBin) * (padB - 16)
        ctx.fillStyle = 'rgba(110,231,224,0.5)'
        ctx.fillRect(i * bw + 1, H - 8 - h, bw - 2, h)
      }

      // Baseline + labels
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, base)
      ctx.lineTo(W, base)
      ctx.stroke()

      ctx.font = '10px monospace'
      ctx.fillStyle = collapseX !== null ? 'rgba(255,94,196,0.9)' : 'rgba(162,89,255,0.9)'
      ctx.fillText(collapseX !== null ? 'collapsed |ψ|² → eigenstate' : 'superposed |ψ(x)|²', 10, 18)
      ctx.fillStyle = 'rgba(110,231,224,0.8)'
      ctx.fillText('measurement histogram (rebuilds the Born rule)', 10, H - padB + 14)

      animRef.current = requestAnimationFrame(render)
    }
    render()

    // expose sampler via closure on the canvas element
    ;(canvas as unknown as { _sample: () => number })._sample = () => {
      const r = Math.random() * sum
      let acc = 0
      for (let i = 0; i < N; i++) {
        acc += pdf[i]
        if (acc >= r) return i / N
      }
      return 0.5
    }

    return () => cancelAnimationFrame(animRef.current)
  }, [])

  const measure = () => {
    const canvas = canvasRef.current as unknown as { _sample?: () => number }
    const x = canvas._sample ? canvas._sample() : Math.random()
    collapseRef.current = x
    const bin = Math.min(histRef.current.length - 1, Math.floor(x * histRef.current.length))
    histRef.current[bin]++
    setCount((c) => c + 1)
    setCollapsed(true)
  }

  const reset = () => {
    collapseRef.current = null
    setCollapsed(false)
  }

  const clearHist = () => {
    histRef.current = new Array(60).fill(0)
    setCount(0)
    collapseRef.current = null
    setCollapsed(false)
  }

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="w-full rounded-lg" style={{ background: '#060414' }} />

      <div className="flex items-center justify-between text-xs text-slate-600 flex-wrap gap-3">
        <span className="font-mono">
          Measurements: <span className="text-quantum-400">{count}</span>{' '}
          {collapsed && <span className="text-plasma-400">· collapsed</span>}
        </span>
        <div className="flex gap-2">
          <button
            onClick={measure}
            className="px-3 py-1.5 rounded-lg border border-plasma-500/30 text-plasma-400 hover:border-plasma-500/60 text-xs font-mono transition-all"
          >
            ⚡ Measure
          </button>
          <button
            onClick={reset}
            className="px-3 py-1.5 rounded-lg border border-quantum-500/30 text-quantum-400 hover:border-quantum-500/60 text-xs font-mono transition-all"
          >
            ↺ Re-prepare
          </button>
          <button
            onClick={clearHist}
            className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:border-white/20 text-xs font-mono transition-all"
          >
            clear
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-600">
        Each measurement snaps the spread wavefunction to one sharp outcome, drawn with probability
        |ψ|². Re-prepare and repeat: the teal histogram slowly reconstructs the original curve.
      </p>
    </div>
  )
}

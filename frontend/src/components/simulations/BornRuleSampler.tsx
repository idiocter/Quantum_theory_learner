'use client'
import { useRef, useState } from 'react'
import QuantumCanvas, { type CanvasFrame } from './QuantumCanvas'

// Born rule: the probability density of finding the particle at x is |ψ(x)|².
// We use a superposition of the first two infinite-well eigenstates so the
// distribution is visibly asymmetric, then sample from it to show a histogram
// converging to |ψ|² as the number of measurements grows.
const BINS = 48

// ψ(x) = sin(πx) + sin(2πx) on x ∈ [0,1]; P(x) = ψ².
function density(x: number) {
  const psi = Math.sin(Math.PI * x) + Math.sin(2 * Math.PI * x)
  return psi * psi
}

// Peak of P(x), used as the rejection-sampling envelope and the y-axis scale.
const P_MAX = (() => {
  let m = 0
  for (let i = 0; i <= 1000; i++) m = Math.max(m, density(i / 1000))
  return m
})()

function sampleX() {
  // Rejection sampling against the uniform envelope P_MAX.
  for (let tries = 0; tries < 100; tries++) {
    const x = Math.random()
    if (Math.random() * P_MAX < density(x)) return x
  }
  return Math.random()
}

export default function BornRuleSampler() {
  const counts = useRef<number[]>(new Array(BINS).fill(0))
  const totalRef = useRef(0)
  const [total, setTotal] = useState(0)

  const addSamples = (n: number) => {
    for (let i = 0; i < n; i++) {
      const x = sampleX()
      const bin = Math.min(BINS - 1, Math.floor(x * BINS))
      counts.current[bin]++
    }
    totalRef.current += n
    setTotal(totalRef.current)
  }

  const reset = () => {
    counts.current = new Array(BINS).fill(0)
    totalRef.current = 0
    setTotal(0)
  }

  const draw = (ctx: CanvasRenderingContext2D, { dt, width: W, height: H }: CanvasFrame) => {
    // While playing, stream measurements in at a steady rate (speed-scaled via dt).
    if (dt > 0) {
      const n = Math.max(1, Math.round(dt * 150))
      for (let i = 0; i < n; i++) {
        const x = sampleX()
        counts.current[Math.min(BINS - 1, Math.floor(x * BINS))]++
      }
      totalRef.current += n
      // Throttle React updates to ~10/s so we don't thrash on every frame.
      if (totalRef.current % 16 < n) setTotal(totalRef.current)
    }

    ctx.fillStyle = '#060414'
    ctx.fillRect(0, 0, W, H)

    const pad = 24
    const baseY = H - pad
    const plotW = W - pad * 2
    const plotH = H - pad * 2
    const xpx = (x: number) => pad + x * plotW
    const ypx = (p: number) => baseY - (p / P_MAX) * plotH

    // Baseline axis.
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pad, baseY)
    ctx.lineTo(W - pad, baseY)
    ctx.stroke()

    // Histogram bars, normalised to a probability density for comparison.
    const total = totalRef.current
    const binW = plotW / BINS
    if (total > 0) {
      for (let b = 0; b < BINS; b++) {
        const pdf = counts.current[b] / total / (1 / BINS) // empirical density
        const barH = (pdf / P_MAX) * plotH
        ctx.fillStyle = 'rgba(56,198,232,0.35)'
        ctx.fillRect(pad + b * binW + 0.5, baseY - barH, binW - 1, barH)
      }
    }

    // Theoretical |ψ|² curve in quantum purple, glowing.
    ctx.beginPath()
    for (let i = 0; i <= plotW; i++) {
      const x = i / plotW
      const y = ypx(density(x))
      i === 0 ? ctx.moveTo(xpx(x), y) : ctx.lineTo(xpx(x), y)
    }
    ctx.strokeStyle = '#a259ff'
    ctx.lineWidth = 2.5
    ctx.shadowColor = 'rgba(162,89,255,0.6)'
    ctx.shadowBlur = 12
    ctx.stroke()
    ctx.shadowBlur = 0

    // Labels.
    ctx.font = '11px monospace'
    ctx.fillStyle = 'rgba(162,89,255,0.9)'
    ctx.fillText('|ψ(x)|²', pad + 4, pad + 4)
    ctx.fillStyle = 'rgba(56,198,232,0.8)'
    ctx.fillText('measured frequency', pad + 4, pad + 18)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.textAlign = 'right'
    ctx.fillText(`N = ${total.toLocaleString()}`, W - pad, pad + 4)
    ctx.textAlign = 'left'
    ctx.fillText('x', W - pad, baseY + 14)
  }

  return (
    <QuantumCanvas draw={draw} onReset={reset} height={320}>
      <button
        onClick={() => addSamples(100)}
        className="px-3 py-1.5 rounded-lg border border-wave-500/30 text-wave-300 hover:border-wave-500/60 text-xs font-mono transition-all"
      >
        +100 measurements
      </button>
      <span className="text-[10px] text-slate-600 font-mono">{total.toLocaleString()} sampled</span>
    </QuantumCanvas>
  )
}

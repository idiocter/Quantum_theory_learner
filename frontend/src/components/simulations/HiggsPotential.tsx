'use client'
import { useRef, useState } from 'react'
import QuantumCanvas, { type CanvasFrame } from './QuantumCanvas'

// The Higgs potential V(φ) = μ²φ² + λφ⁴. For μ² > 0 the minimum sits at φ = 0
// (symmetric). For μ² < 0 it becomes the "Mexican hat": the field rolls off the
// central bump into a non-zero vacuum value, spontaneously breaking the
// symmetry and giving particles mass. Drag μ² through zero to watch it happen.
const LAMBDA = 1

export default function HiggsPotential() {
  const [mu2, setMu2] = useState(-0.6)
  const mu2Ref = useRef(mu2)
  mu2Ref.current = mu2
  const phi = useRef(0.05) // start just off-centre so it rolls
  const vel = useRef(0)

  const draw = (ctx: CanvasRenderingContext2D, { dt, width: W, height: H }: CanvasFrame) => {
    const m2 = mu2Ref.current
    const V = (x: number) => m2 * x * x + LAMBDA * x * x * x * x
    const dV = (x: number) => 2 * m2 * x + 4 * LAMBDA * x * x * x

    // Ball dynamics with damping (overdamped roll to the minimum).
    if (dt > 0) {
      const ddt = Math.min(dt, 0.05)
      vel.current += -dV(phi.current) * ddt * 4
      vel.current *= 0.92
      phi.current += vel.current * ddt
      if (phi.current > 1.4) phi.current = 1.4
      if (phi.current < -1.4) phi.current = -1.4
    }

    ctx.fillStyle = '#060414'
    ctx.fillRect(0, 0, W, H)

    const pad = 24
    const cx = W / 2
    const phiRange = 1.4
    const xToPx = (x: number) => cx + (x / phiRange) * (W / 2 - pad)
    // Scale V so the curve fills the height across the plotted range.
    let vmin = Infinity, vmax = -Infinity
    for (let i = -100; i <= 100; i++) { const v = V((i / 100) * phiRange); vmin = Math.min(vmin, v); vmax = Math.max(vmax, v) }
    const vToPx = (v: number) => pad + (H - pad * 2) * (1 - (v - vmin) / (vmax - vmin || 1))

    // Potential curve.
    ctx.beginPath()
    for (let i = -100; i <= 100; i++) {
      const x = (i / 100) * phiRange
      const px = xToPx(x), py = vToPx(V(x))
      i === -100 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
    ctx.strokeStyle = '#a259ff'
    ctx.lineWidth = 2.5
    ctx.shadowColor = 'rgba(162,89,255,0.5)'
    ctx.shadowBlur = 10
    ctx.stroke()
    ctx.shadowBlur = 0

    // Vacuum minima markers.
    if (m2 < 0) {
      const v0 = Math.sqrt(-m2 / (2 * LAMBDA))
      for (const x of [v0, -v0]) {
        ctx.beginPath()
        ctx.arc(xToPx(x), vToPx(V(x)), 3, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(250,204,21,0.7)'
        ctx.fill()
      }
    }

    // The rolling field value (the ball).
    ctx.beginPath()
    ctx.arc(xToPx(phi.current), vToPx(V(phi.current)) - 7, 7, 0, Math.PI * 2)
    ctx.fillStyle = '#38c6e8'
    ctx.shadowColor = 'rgba(56,198,232,0.8)'
    ctx.shadowBlur = 12
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.font = '12px monospace'
    ctx.fillStyle = m2 < 0 ? '#facc15' : 'rgba(255,255,255,0.7)'
    ctx.fillText(m2 < 0 ? 'μ² < 0 — symmetry broken, mass generated' : 'μ² > 0 — symmetric vacuum at φ = 0', pad, 16)
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.textAlign = 'right'
    ctx.fillText('V(φ)', pad + 28, 16)
    ctx.textAlign = 'left'
    ctx.fillText('φ →', W - pad - 26, H - 8)
  }

  const reset = () => { phi.current = 0.05; vel.current = 0 }

  return (
    <div className="space-y-3">
      <QuantumCanvas draw={draw} onReset={reset} height={300} speeds={[0.5, 1, 2]} />
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Mass parameter μ²</span>
          <span className="font-mono text-quantum-400">{mu2.toFixed(2)}</span>
        </div>
        <input type="range" min={-1} max={0.6} step={0.01} value={mu2}
          onChange={(e) => { setMu2(Number(e.target.value)); reset() }}
          className="w-full accent-quantum-500 h-1" />
      </div>
    </div>
  )
}

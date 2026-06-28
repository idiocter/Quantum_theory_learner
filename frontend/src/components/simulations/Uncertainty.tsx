'use client'
import { useRef, useEffect, useState } from 'react'

// Heisenberg uncertainty: squeezing the position distribution (Δx) forces the
// conjugate momentum distribution (Δp) to widen, with Δx·Δp ≥ ℏ/2.
export default function Uncertainty() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const sigmaRef = useRef(50) // position spread in px

  const [sigmaX, setSigmaX] = useState(50)

  // Work in scaled natural units where ħ = 1 and Δx·Δp = 1/2 at the bound.
  const dx = sigmaX / 60 // ~0.25 … 2.0
  const dp = 0.5 / dx
  const product = dx * dp

  useEffect(() => {
    sigmaRef.current = sigmaX
  }, [sigmaX])

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    canvas.width = canvas.parentElement?.clientWidth ?? 700
    canvas.height = 300
    const W = canvas.width
    const H = canvas.height
    const panelW = W / 2
    let t = 0

    const gaussian = (x0: number, sigma: number, x: number) =>
      Math.exp(-((x - x0) ** 2) / (2 * sigma * sigma))

    const drawPanel = (ox: number, sigma: number, color: string, title: string, jitter: number) => {
      const cx = ox + panelW / 2
      const base = H - 36
      const peak = H - 230

      // Axis
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(ox + 16, base)
      ctx.lineTo(ox + panelW - 16, base)
      ctx.stroke()

      // Filled Gaussian
      ctx.beginPath()
      ctx.moveTo(ox + 16, base)
      for (let x = ox + 16; x <= ox + panelW - 16; x++) {
        const g = gaussian(cx, sigma, x)
        ctx.lineTo(x, base - g * (base - peak))
      }
      ctx.lineTo(ox + panelW - 16, base)
      ctx.closePath()
      const grad = ctx.createLinearGradient(0, peak, 0, base)
      grad.addColorStop(0, color.replace('rgb', 'rgba').replace(')', ', 0.45)'))
      grad.addColorStop(1, color.replace('rgb', 'rgba').replace(')', ', 0.02)'))
      ctx.fillStyle = grad
      ctx.fill()
      ctx.strokeStyle = color.replace('rgb', 'rgba').replace(')', ', 0.8)')
      ctx.lineWidth = 2
      ctx.stroke()

      // Width markers (±σ)
      ctx.strokeStyle = color.replace('rgb', 'rgba').replace(')', ', 0.4)')
      ctx.setLineDash([3, 4])
      for (const s of [-1, 1]) {
        const mx = cx + s * sigma
        ctx.beginPath()
        ctx.moveTo(mx, base)
        ctx.lineTo(mx, base - gaussian(cx, sigma, mx) * (base - peak))
        ctx.stroke()
      }
      ctx.setLineDash([])

      // Sampled "measurement" dots that scatter within the distribution
      for (let i = 0; i < 3; i++) {
        const u = (Math.sin(t * 1.7 + i * 2.1) * 0.5 + 0.5)
        const sx = cx + (u - 0.5) * 2 * sigma * (0.6 + 0.4 * Math.sin(t + i))
        ctx.beginPath()
        ctx.arc(sx, base - 4, 2, 0, Math.PI * 2)
        ctx.fillStyle = color.replace('rgb', 'rgba').replace(')', ', 0.9)')
        ctx.fill()
      }

      ctx.font = '11px monospace'
      ctx.fillStyle = color.replace('rgb', 'rgba').replace(')', ', 0.9)')
      ctx.fillText(title, ox + 18, 22)
      void jitter
    }

    const render = () => {
      ctx.fillStyle = '#060414'
      ctx.fillRect(0, 0, W, H)

      const sx = sigmaRef.current
      const sp = (2500 / sx) // inverse relationship, scaled to px
      drawPanel(0, sx, 'rgb(56,198,232)', 'Position  |ψ(x)|²', 0)
      drawPanel(panelW, Math.min(sp, panelW / 2 - 20), 'rgb(255,94,196)', 'Momentum  |φ(p)|²', 1)

      // Divider
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.beginPath()
      ctx.moveTo(panelW, 12)
      ctx.lineTo(panelW, H - 12)
      ctx.stroke()

      t += 0.03
      animRef.current = requestAnimationFrame(render)
    }
    render()
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  const ok = product >= 0.499

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="w-full rounded-lg" style={{ background: '#060414' }} />

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Position spread Δx (squeeze the packet)</span>
          <span className="font-mono text-wave-400">{dx.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={15}
          max={120}
          step={1}
          value={sigmaX}
          onChange={(e) => setSigmaX(Number(e.target.value))}
          className="w-full accent-quantum-500 h-1"
        />
      </div>

      <div className="grid grid-cols-3 gap-3 text-center text-xs font-mono">
        <div className="rounded-lg border border-wave-500/20 bg-wave-500/5 py-2">
          <div className="text-slate-500">Δx</div>
          <div className="text-wave-400 text-sm">{dx.toFixed(2)}</div>
        </div>
        <div className="rounded-lg border border-plasma-500/20 bg-plasma-500/5 py-2">
          <div className="text-slate-500">Δp</div>
          <div className="text-plasma-400 text-sm">{dp.toFixed(2)}</div>
        </div>
        <div className={`rounded-lg border py-2 ${ok ? 'border-quantum-500/30 bg-quantum-500/5' : 'border-particle-500/40 bg-particle-500/10'}`}>
          <div className="text-slate-500">Δx·Δp</div>
          <div className={ok ? 'text-quantum-400 text-sm' : 'text-particle-400 text-sm'}>
            {product.toFixed(2)} ≥ ½
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-600">
        Narrowing the cyan position peak forces the pink momentum peak to widen — the product can
        never dip below ℏ/2. Nature enforces the trade-off.
      </p>
    </div>
  )
}

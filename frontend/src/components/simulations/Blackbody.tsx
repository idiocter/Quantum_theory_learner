'use client'
import { useRef, useEffect, useState } from 'react'

// Planck's blackbody spectrum vs. the classical Rayleigh–Jeans law, whose
// divergence at short wavelengths was the "ultraviolet catastrophe".
export default function Blackbody() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const tempRef = useRef(5800) // kelvin (≈ Sun)

  const [temp, setTemp] = useState(5800)

  // Wien's displacement law: λ_peak (nm) = 2.898e6 / T
  const peakNm = 2.898e6 / temp

  useEffect(() => {
    tempRef.current = temp
  }, [temp])

  // Approximate blackbody glow colour for a given temperature.
  const glowColor = (T: number) => {
    if (T < 4000) return 'rgb(255,140,70)'
    if (T < 5500) return 'rgb(255,205,150)'
    if (T < 7000) return 'rgb(255,250,245)'
    if (T < 9000) return 'rgb(210,225,255)'
    return 'rgb(170,200,255)'
  }

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    canvas.width = canvas.parentElement?.clientWidth ?? 700
    canvas.height = 320
    const W = canvas.width
    const H = canvas.height
    const padL = 44
    const padB = 30
    const plotW = W - padL - 16
    const plotH = H - padB - 20
    const lamMax = 2500 // nm on x-axis
    const c2 = 1.4388e7 // hc/k in nm·K
    let glow = 0

    const planck = (lamNm: number, T: number) => {
      const x = c2 / (lamNm * T)
      return 1 / (Math.pow(lamNm, 5) * (Math.exp(x) - 1))
    }
    const rayleigh = (lamNm: number, T: number) => (T * 1) / Math.pow(lamNm, 4)

    const render = () => {
      ctx.fillStyle = '#060414'
      ctx.fillRect(0, 0, W, H)

      const T = tempRef.current

      // Find max of Planck for scaling
      let maxP = 0
      for (let lam = 50; lam <= lamMax; lam += 5) maxP = Math.max(maxP, planck(lam, T))

      // Axes
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(padL, 16)
      ctx.lineTo(padL, H - padB)
      ctx.lineTo(W - 12, H - padB)
      ctx.stroke()

      const xOf = (lam: number) => padL + (lam / lamMax) * plotW
      const yOf = (v: number) => H - padB - (v / maxP) * plotH

      // Visible band shading (380–740 nm)
      ctx.fillStyle = 'rgba(162,89,255,0.05)'
      ctx.fillRect(xOf(380), 16, xOf(740) - xOf(380), plotH + (H - padB - 16 - plotH))

      // Rayleigh–Jeans (classical) — diverges at short λ
      ctx.beginPath()
      let started = false
      for (let lam = 60; lam <= lamMax; lam += 4) {
        const v = rayleigh(lam, T)
        const y = yOf(v)
        if (y < 8) continue
        if (!started) {
          ctx.moveTo(xOf(lam), y)
          started = true
        } else ctx.lineTo(xOf(lam), y)
      }
      ctx.strokeStyle = 'rgba(247,65,108,0.5)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 4])
      ctx.stroke()
      ctx.setLineDash([])

      // Planck curve, filled
      ctx.beginPath()
      ctx.moveTo(xOf(50), H - padB)
      for (let lam = 50; lam <= lamMax; lam += 4) {
        ctx.lineTo(xOf(lam), yOf(planck(lam, T)))
      }
      ctx.lineTo(xOf(lamMax), H - padB)
      ctx.closePath()
      const grad = ctx.createLinearGradient(padL, 0, W, 0)
      grad.addColorStop(0, 'rgba(192,152,255,0.0)')
      grad.addColorStop(0.25, 'rgba(56,198,232,0.25)')
      grad.addColorStop(0.5, 'rgba(162,89,255,0.3)')
      grad.addColorStop(0.8, 'rgba(255,94,196,0.2)')
      grad.addColorStop(1, 'rgba(255,200,61,0.0)')
      ctx.fillStyle = grad
      ctx.fill()
      ctx.beginPath()
      for (let lam = 50; lam <= lamMax; lam += 4) {
        const x = xOf(lam)
        const y = yOf(planck(lam, T))
        lam === 50 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.strokeStyle = '#c098ff'
      ctx.lineWidth = 2.5
      ctx.stroke()

      // Peak marker (Wien)
      const peak = 2.898e6 / T
      ctx.strokeStyle = 'rgba(255,200,61,0.5)'
      ctx.setLineDash([2, 4])
      ctx.beginPath()
      ctx.moveTo(xOf(peak), yOf(planck(peak, T)))
      ctx.lineTo(xOf(peak), H - padB)
      ctx.stroke()
      ctx.setLineDash([])

      // Glowing body swatch
      glow += 0.04
      const r = 16 + Math.sin(glow) * 2
      ctx.beginPath()
      ctx.arc(W - 44, 44, r, 0, Math.PI * 2)
      ctx.fillStyle = glowColor(T)
      ctx.shadowColor = glowColor(T)
      ctx.shadowBlur = 24
      ctx.fill()
      ctx.shadowBlur = 0

      // Labels
      ctx.font = '10px monospace'
      ctx.fillStyle = 'rgba(148,163,184,0.8)'
      ctx.fillText('spectral radiance', 6, 12)
      ctx.fillText('wavelength (nm) →', W - 150, H - 8)
      ctx.fillStyle = 'rgba(247,65,108,0.7)'
      ctx.fillText('classical (Rayleigh–Jeans)', padL + 8, 28)
      ctx.fillStyle = 'rgba(255,200,61,0.9)'
      ctx.fillText(`λpeak ≈ ${Math.round(peak)} nm`, xOf(peak) + 4, 44)

      animRef.current = requestAnimationFrame(render)
    }
    render()
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  const band = peakNm < 400 ? 'ultraviolet' : peakNm < 500 ? 'blue' : peakNm < 600 ? 'green-yellow' : peakNm < 750 ? 'red' : 'infrared'

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="w-full rounded-lg" style={{ background: '#060414' }} />

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Temperature</span>
          <span className="font-mono text-photon-400">{temp} K</span>
        </div>
        <input
          type="range"
          min={3000}
          max={10000}
          step={100}
          value={temp}
          onChange={(e) => setTemp(Number(e.target.value))}
          className="w-full accent-quantum-500 h-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 text-center text-xs font-mono">
        <div className="rounded-lg border border-photon-500/20 bg-photon-500/5 py-2">
          <div className="text-slate-500">peak λ (Wien)</div>
          <div className="text-photon-400 text-sm">{Math.round(peakNm)} nm · {band}</div>
        </div>
        <div className="rounded-lg border border-white/10 py-2">
          <div className="text-slate-500">total power ∝ T⁴</div>
          <div className="text-quantum-400 text-sm">{((temp / 5800) ** 4).toFixed(2)}× Sun</div>
        </div>
      </div>
      <p className="text-xs text-slate-600">
        The dashed classical curve rockets to infinity at short wavelengths — the ultraviolet
        catastrophe. Planck&apos;s quantised energy bundles bend the real curve back down.
      </p>
    </div>
  )
}

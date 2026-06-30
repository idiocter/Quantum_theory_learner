'use client'
import { useMemo, useRef, useState } from 'react'
import QuantumCanvas, { type CanvasFrame } from './QuantumCanvas'

// As a dilute gas of bosons is cooled below the critical temperature, a
// macroscopic fraction drops into the single quantum ground state — a
// Bose–Einstein condensate — and their wavefunctions merge into one broad peak.
const TC = 0.45
const N = 60

export default function BECCondensate() {
  const [temp, setTemp] = useState(0.8)
  const tempRef = useRef(temp)
  tempRef.current = temp

  // Fixed random phases/positions for the thermal cloud.
  const seeds = useMemo(
    () => Array.from({ length: N }, () => ({ p: Math.random() * Math.PI * 2, s: 0.5 + Math.random(), o: Math.random() })),
    []
  )

  // Condensate fraction grows as T drops below Tc: N0/N = 1 - (T/Tc)^3.
  const condensateFraction = temp >= TC ? 0 : 1 - (temp / TC) ** 3

  const draw = (ctx: CanvasRenderingContext2D, { t, width: W, height: H }: CanvasFrame) => {
    ctx.fillStyle = '#060414'
    ctx.fillRect(0, 0, W, H)

    const T = tempRef.current
    const frac = T >= TC ? 0 : 1 - (T / TC) ** 3
    const cx = W / 2
    const baseY = H - 26

    // Trap walls (a harmonic well sketch).
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.beginPath()
    for (let i = 0; i <= W; i++) {
      const x = (i / W) * 2 - 1
      ctx.lineTo(i, baseY - x * x * (H - 60))
    }
    ctx.stroke()

    // Ground-state condensate: a broad Gaussian peak whose height tracks N0.
    if (frac > 0.01) {
      const peak = frac * (H - 70)
      const width = 70
      ctx.beginPath()
      for (let i = 0; i <= W; i++) {
        const g = Math.exp(-((i - cx) ** 2) / (2 * width * width))
        ctx.lineTo(i, baseY - peak * g)
      }
      ctx.lineTo(W, baseY)
      ctx.lineTo(0, baseY)
      ctx.closePath()
      ctx.fillStyle = 'rgba(162,89,255,0.28)'
      ctx.fill()
      ctx.strokeStyle = '#a259ff'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Thermal atoms: number shrinks as the condensate grows; speed ∝ √T.
    const thermalCount = Math.round(N * (1 - frac))
    for (let n = 0; n < thermalCount; n++) {
      const sd = seeds[n]
      const speed = (0.4 + T) * sd.s
      const x = cx + Math.sin(t * speed + sd.p) * (W * 0.4) * (0.4 + T)
      const y = baseY - 20 - sd.o * (H - 90) * (0.3 + T)
      ctx.beginPath()
      ctx.arc(x, y, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(56,198,232,0.7)'
      ctx.fill()
    }

    ctx.font = '12px monospace'
    ctx.fillStyle = frac > 0 ? '#a259ff' : '#38c6e8'
    ctx.fillText(
      frac > 0 ? `T < Tc — ${(frac * 100).toFixed(0)}% condensed into the ground state` : 'T > Tc — thermal gas',
      10, 18
    )
  }

  return (
    <div className="space-y-3">
      <QuantumCanvas draw={draw} height={280} speeds={[0.5, 1, 2]}>
        <span className="text-[10px] text-slate-600 font-mono ml-auto">condensate {(condensateFraction * 100).toFixed(0)}%</span>
      </QuantumCanvas>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Temperature</span>
          <span className="font-mono text-quantum-400">{temp.toFixed(2)}</span>
        </div>
        <input type="range" min={0} max={1} step={0.01} value={temp}
          onChange={(e) => setTemp(Number(e.target.value))}
          className="w-full accent-quantum-500 h-1" />
      </div>
    </div>
  )
}

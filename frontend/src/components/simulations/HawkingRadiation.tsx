'use client'
import { useRef, useState } from 'react'
import QuantumCanvas, { type CanvasFrame } from './QuantumCanvas'

// Vacuum fluctuations near a black hole's horizon occasionally split: one
// particle escapes as Hawking radiation while its negative-energy partner falls
// in, slowly reducing the hole's mass. Smaller holes are hotter (T_H ∝ 1/M) and
// evaporate ever faster — a runaway that ends in a final burst.
interface P { x: number; y: number; vx: number; vy: number; life: number }

export default function HawkingRadiation() {
  const mass = useRef(1)
  const spawnTimer = useRef(0)
  const particles = useRef<P[]>([])
  const [readout, setReadout] = useState({ m: 1, t: 1 })

  const reset = () => {
    mass.current = 1
    particles.current = []
    spawnTimer.current = 0
    setReadout({ m: 1, t: 1 })
  }

  const draw = (ctx: CanvasRenderingContext2D, { dt, width: W, height: H }: CanvasFrame) => {
    ctx.fillStyle = '#04030c'
    ctx.fillRect(0, 0, W, H)
    const cx = W / 2, cy = H / 2

    let M = mass.current
    if (dt > 0 && M > 0.05) {
      // Hawking evaporation: dM/dt ∝ -1/M² (accelerates as it shrinks).
      M = Math.max(0.05, M - (dt * 0.015) / (M * M))
      mass.current = M
    }
    const evaporated = M <= 0.0501
    const R = 18 + M * 70 // horizon radius

    // Accretion-disk glow ring.
    const tempColor = `hsl(${200 - (1 - M) * 200}, 90%, 60%)` // bluer/hotter as M shrinks
    const grad = ctx.createRadialGradient(cx, cy, R, cx, cy, R + 26)
    grad.addColorStop(0, tempColor)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.beginPath(); ctx.arc(cx, cy, R + 26, 0, Math.PI * 2); ctx.fill()

    // Event horizon.
    if (!evaporated) {
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fillStyle = '#000'; ctx.fill()
      ctx.strokeStyle = tempColor; ctx.lineWidth = 1.5; ctx.stroke()
    }

    // Spawn virtual pairs at the horizon; one escapes, one falls in.
    if (dt > 0 && !evaporated) {
      spawnTimer.current += dt
      const interval = 0.12 + M * 0.25 // hotter (small M) radiates faster
      while (spawnTimer.current > interval) {
        spawnTimer.current -= interval
        const ang = Math.random() * Math.PI * 2
        const ox = cx + Math.cos(ang) * R, oy = cy + Math.sin(ang) * R
        const sp = 40 + Math.random() * 30
        particles.current.push({ x: ox, y: oy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1 })
      }
    }

    // Advance escaping radiation.
    const ps = particles.current
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]
      if (dt > 0) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 0.5 }
      if (p.life <= 0 || p.x < 0 || p.x > W || p.y < 0 || p.y > H) { ps.splice(i, 1); continue }
      ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(162,89,255,${p.life})`; ctx.fill()
    }

    const T_H = 1 / (M * 8) // schematic Hawking temperature (∝ 1/M)
    if (dt > 0) setReadout({ m: M, t: T_H })

    ctx.font = '12px monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillText(evaporated ? 'fully evaporated — final burst' : `mass ${(M).toFixed(2)} M₀`, 12, 18)
    ctx.fillStyle = '#a259ff'
    ctx.fillText(`T_H ∝ 1/M = ${T_H.toFixed(2)}`, 12, 34)
  }

  return (
    <QuantumCanvas draw={draw} onReset={reset} height={320} speeds={[0.5, 1, 2]}>
      <span className="text-[10px] text-slate-600 font-mono ml-auto">
        M {readout.m.toFixed(2)} · T_H {readout.t.toFixed(2)}
      </span>
    </QuantumCanvas>
  )
}

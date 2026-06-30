'use client'
import { useRef, useState } from 'react'
import QuantumCanvas, { type CanvasFrame } from './QuantumCanvas'

// A superposition stays coherent only while it is isolated. Coupling to an
// environment damps the off-diagonal (interference) terms as e^(−Γt): the
// stronger the coupling, the shorter the coherence time τ = 1/Γ, and the faster
// quantum behaviour decays into classical statistics.
const WINDOW = 6 // seconds shown across the plot
const OMEGA = 6 // oscillation frequency of the coherent signal

export default function DecoherenceTime() {
  const [coupling, setCoupling] = useState(0.5)
  const gammaRef = useRef(coupling * 1.6)
  gammaRef.current = coupling * 1.6

  const draw = (ctx: CanvasRenderingContext2D, { t, width: W, height: H }: CanvasFrame) => {
    ctx.fillStyle = '#060414'
    ctx.fillRect(0, 0, W, H)

    const pad = 26
    const midY = H / 2
    const plotW = W - pad * 2
    const amp = (H - pad * 2) / 2
    const G = gammaRef.current
    const tNow = t % WINDOW

    // Zero axis.
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.beginPath(); ctx.moveTo(pad, midY); ctx.lineTo(W - pad, midY); ctx.stroke()

    const xOf = (tau: number) => pad + (tau / WINDOW) * plotW
    const env = (tau: number) => Math.exp(-G * tau)

    // Envelope ±e^(−Γt).
    ctx.strokeStyle = 'rgba(250,204,21,0.5)'
    ctx.setLineDash([4, 3]); ctx.lineWidth = 1
    for (const sign of [1, -1]) {
      ctx.beginPath()
      for (let i = 0; i <= plotW; i++) { const tau = (i / plotW) * WINDOW; ctx.lineTo(pad + i, midY - sign * amp * env(tau)) }
      ctx.stroke()
    }
    ctx.setLineDash([])

    // Damped coherent oscillation.
    ctx.beginPath()
    ctx.strokeStyle = '#a259ff'; ctx.lineWidth = 2
    for (let i = 0; i <= plotW; i++) {
      const tau = (i / plotW) * WINDOW
      ctx.lineTo(pad + i, midY - amp * env(tau) * Math.cos(OMEGA * tau))
    }
    ctx.stroke()

    // Sweeping "now" marker.
    const c = env(tNow)
    ctx.strokeStyle = 'rgba(56,198,232,0.6)'
    ctx.beginPath(); ctx.moveTo(xOf(tNow), pad); ctx.lineTo(xOf(tNow), H - pad); ctx.stroke()
    ctx.beginPath()
    ctx.arc(xOf(tNow), midY - amp * c * Math.cos(OMEGA * tNow), 4, 0, Math.PI * 2)
    ctx.fillStyle = '#38c6e8'; ctx.fill()

    ctx.font = '11px monospace'
    ctx.fillStyle = 'rgba(162,89,255,0.9)'
    ctx.fillText('coherence  e^(−Γt)', pad, 16)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#38c6e8'
    ctx.fillText(`coherence ${(c * 100).toFixed(0)}%  ·  τ = ${(1 / G).toFixed(2)}s`, W - pad, 16)
    ctx.textAlign = 'left'
  }

  return (
    <div className="space-y-3">
      <QuantumCanvas draw={draw} height={280} speeds={[0.5, 1, 2]} />
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Environment coupling</span>
          <span className="font-mono text-quantum-400">{coupling.toFixed(2)}</span>
        </div>
        <input type="range" min={0.1} max={1.5} step={0.01} value={coupling}
          onChange={(e) => setCoupling(Number(e.target.value))} className="w-full accent-quantum-500 h-1" />
      </div>
    </div>
  )
}

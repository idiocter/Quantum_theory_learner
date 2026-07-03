'use client'
import { useEffect, useRef, useState } from 'react'

// ── noise_channel ────────────────────────────────────────────────────────────
// Single-qubit decoherence made visible on the Bloch ball. A pure state
// r0 = (sinθ, 0, cosθ) (in the x–z plane, φ=0) is sent through a chosen channel
// with error probability p; the exact Bloch-vector map is applied and the state
// shrinks toward the maximally mixed centre. Purity ½(1+|r|²) and coherence
// |ρ01| = ½√(rx²+ry²) are read out.
//
//   bit-flip (X):     (rx, ry, rz) → (rx, (1-2p)ry, (1-2p)rz)
//   phase-flip (Z):   (rx, ry, rz) → ((1-2p)rx, (1-2p)ry, rz)
//   depolarizing:     r → (1-p) r      [ρ ↦ (1-p)ρ + p I/2]
//
// Verified: phase-flip on |+⟩ (r=(1,0,0)) at p=½ gives r=(0,0,0) — full dephasing,
// coherence 0; depolarizing at p=1 gives the maximally mixed state, purity ½.

type Channel = 'bitflip' | 'phaseflip' | 'depolarizing'

const CHANNELS: Array<{ id: Channel; label: string; formula: string }> = [
  { id: 'phaseflip', label: 'phase-flip (Z)', formula: 'ρ → (1−p)ρ + p·ZρZ' },
  { id: 'bitflip', label: 'bit-flip (X)', formula: 'ρ → (1−p)ρ + p·XρX' },
  { id: 'depolarizing', label: 'depolarizing', formula: 'ρ → (1−p)ρ + p·I/2' },
]

function applyChannel(ch: Channel, p: number, r: [number, number, number]): [number, number, number] {
  const [x, y, z] = r
  if (ch === 'bitflip') return [x, (1 - 2 * p) * y, (1 - 2 * p) * z]
  if (ch === 'phaseflip') return [(1 - 2 * p) * x, (1 - 2 * p) * y, z]
  return [(1 - p) * x, (1 - p) * y, (1 - p) * z]
}

export default function NoiseChannel() {
  const [theta, setTheta] = useState(Math.PI / 2) // |+⟩
  const [p, setP] = useState(0.3)
  const [ch, setCh] = useState<Channel>('phaseflip')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const r0: [number, number, number] = [Math.sin(theta), 0, Math.cos(theta)]
  const r1 = applyChannel(ch, p, r0)
  const mag = Math.hypot(...r1)
  const purity = 0.5 * (1 + mag * mag)
  const coherence = 0.5 * Math.hypot(r1[0], r1[1])

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = cv.clientWidth, h = cv.clientHeight
    cv.width = w * dpr; cv.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 16
    // ball outline
    ctx.strokeStyle = 'rgba(148,163,184,0.25)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke()
    // axes (x horizontal, z vertical)
    ctx.strokeStyle = 'rgba(148,163,184,0.15)'
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy)
    ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke()
    ctx.fillStyle = 'rgba(148,163,184,0.5)'
    ctx.font = '10px monospace'
    ctx.fillText('|0⟩', cx + 4, cy - R + 10)
    ctx.fillText('|1⟩', cx + 4, cy + R - 2)
    ctx.fillText('|+⟩', cx + R - 20, cy - 4)
    const arrow = (rx: number, rz: number, color: string, lw: number) => {
      const ex = cx + rx * R, ey = cy - rz * R
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke()
      ctx.beginPath(); ctx.arc(ex, ey, lw + 1.5, 0, 2 * Math.PI); ctx.fill()
    }
    arrow(r0[0], r0[2], 'rgba(148,163,184,0.45)', 1.5) // original (dim)
    arrow(r1[0], r1[2], '#38c6e8', 2.5) // noisy (bright)
  }, [r0, r1])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">channel</span>
        {CHANNELS.map((c) => (
          <button key={c.id} onClick={() => setCh(c.id)}
            className={`px-2.5 py-1 rounded font-mono text-xs border transition-all ${
              ch === c.id ? 'border-quantum-500/60 bg-quantum-500/15 text-quantum-200' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4 items-center">
        <canvas ref={canvasRef} className="w-full aspect-square max-w-[240px] mx-auto rounded-lg bg-void-950/60 border border-white/5"
          role="img" aria-label={`Bloch x-z plane: noisy Bloch vector magnitude ${mag.toFixed(2)}.`} />

        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>initial state angle θ (from |0⟩)</span>
              <span className="font-mono text-quantum-400">{(theta / Math.PI).toFixed(2)}π</span>
            </div>
            <input type="range" min={0} max={1000} value={Math.round((theta / Math.PI) * 1000)}
              aria-label="Initial state polar angle"
              onChange={(e) => setTheta((Number(e.target.value) / 1000) * Math.PI)}
              className="w-full accent-quantum-500 h-1" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>error probability p</span>
              <span className="font-mono text-plasma-300">{p.toFixed(2)}</span>
            </div>
            <input type="range" min={0} max={1000} value={Math.round(p * 1000)}
              aria-label="Error probability"
              onChange={(e) => setP(Number(e.target.value) / 1000)}
              className="w-full accent-plasma-500 h-1" />
          </div>
          <div className="rounded-lg border border-white/5 bg-void-900/40 p-3 text-xs font-mono grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-slate-500">|r|</span><span className="text-quantum-300 text-right tabular-nums">{mag.toFixed(3)}</span>
            <span className="text-slate-500">purity Tr(ρ²)</span><span className="text-wave-400 text-right tabular-nums">{purity.toFixed(3)}</span>
            <span className="text-slate-500">coherence |ρ₀₁|</span><span className="text-slate-300 text-right tabular-nums">{coherence.toFixed(3)}</span>
            <span className="text-slate-600 col-span-2 text-[10px] pt-1">{CHANNELS.find((c) => c.id === ch)!.formula}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

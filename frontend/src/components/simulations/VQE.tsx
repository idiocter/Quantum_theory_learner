'use client'
import { useEffect, useRef, useState } from 'react'
import { zeroState, applyMat1, GATE } from './qcEngine'

// ── vqe ──────────────────────────────────────────────────────────────────────
// A minimal but exact Variational Quantum Eigensolver. Hamiltonian H = a·X + b·Z,
// ansatz |ψ(θ)⟩ = R_y(θ)|0⟩. The energy E(θ) = a⟨X⟩ + b⟨Z⟩ is computed from the
// exact statevector (qcEngine); the classical optimizer runs gradient descent on
// θ. By the variational principle E(θ) ≥ E₀ = −√(a²+b²), reached at the minimum.
//
// Verified: a=0,b=1 → E(θ)=cosθ, min −1 at θ=π (state |1⟩); a=1,b=1 →
// E₀ = −√2 ≈ −1.414.

function energy(theta: number, a: number, b: number): number {
  const s = zeroState(1)
  applyMat1(s, 0, GATE.Ry(theta))
  const p0 = s.re[0] * s.re[0] + s.im[0] * s.im[0]
  const p1 = s.re[1] * s.re[1] + s.im[1] * s.im[1]
  const expZ = p0 - p1
  const expX = 2 * (s.re[0] * s.re[1] + s.im[0] * s.im[1])
  return a * expX + b * expZ
}

const TWO_PI = 2 * Math.PI

export default function VQE() {
  const [a, setA] = useState(1)
  const [b, setB] = useState(1)
  const [theta, setTheta] = useState(0.6)
  const [optimizing, setOptimizing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const E0 = -Math.hypot(a, b)
  const E = energy(theta, a, b)
  const gap = E - E0

  // gradient descent on θ (dE/dθ = a cosθ − b sinθ)
  useEffect(() => {
    if (!optimizing) return
    let raf = 0
    let cur = theta
    const step = () => {
      const grad = a * Math.cos(cur) - b * Math.sin(cur)
      cur -= 0.12 * grad
      cur = ((cur % TWO_PI) + TWO_PI) % TWO_PI
      setTheta(cur)
      if (Math.abs(grad) > 1e-3) raf = requestAnimationFrame(step)
      else setOptimizing(false)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optimizing])

  // draw E(θ)
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
    const pad = 8
    const amp = Math.hypot(a, b) || 1
    const yOf = (e: number) => h / 2 - (e / (amp * 1.15)) * (h / 2 - pad)
    const xOf = (t: number) => pad + (t / TWO_PI) * (w - 2 * pad)
    // zero + ground lines
    ctx.strokeStyle = 'rgba(148,163,184,0.15)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pad, yOf(0)); ctx.lineTo(w - pad, yOf(0)); ctx.stroke()
    ctx.strokeStyle = 'rgba(52,198,232,0.35)'; ctx.setLineDash([4, 3])
    ctx.beginPath(); ctx.moveTo(pad, yOf(E0)); ctx.lineTo(w - pad, yOf(E0)); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(52,198,232,0.7)'; ctx.font = '9px monospace'
    ctx.fillText(`E₀ = ${E0.toFixed(3)}`, w - 70, yOf(E0) - 3)
    // curve
    ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2
    ctx.beginPath()
    for (let px = 0; px <= 200; px++) {
      const t = (px / 200) * TWO_PI
      const x = xOf(t), y = yOf(energy(t, a, b))
      px === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
    // current point
    ctx.fillStyle = '#ff5ec4'
    ctx.beginPath(); ctx.arc(xOf(theta), yOf(E), 4, 0, TWO_PI); ctx.fill()
  }, [a, b, theta, E, E0])

  const slider = (label: string, val: number, set: (n: number) => void, min: number, max: number, fmt = (v: number) => v.toFixed(2)) => (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[11px] text-slate-500"><span>{label}</span><span className="font-mono text-quantum-400">{fmt(val)}</span></div>
      <input type="range" min={0} max={1000} value={Math.round(((val - min) / (max - min)) * 1000)}
        aria-label={label}
        onChange={(e) => { setOptimizing(false); set(min + (Number(e.target.value) / 1000) * (max - min)) }}
        className="w-full accent-quantum-500 h-1" />
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="text-[11px] text-slate-500 font-mono">H = a·X + b·Z,&nbsp;&nbsp;|ψ(θ)⟩ = R_y(θ)|0⟩,&nbsp;&nbsp;E(θ) = a⟨X⟩ + b⟨Z⟩</div>
      <div className="grid sm:grid-cols-2 gap-4 items-center">
        <canvas ref={canvasRef} className="w-full h-44 rounded-lg bg-void-950/60 border border-white/5"
          role="img" aria-label={`Energy landscape E(theta); current energy ${E.toFixed(3)}, ground ${E0.toFixed(3)}.`} />
        <div className="space-y-3">
          {slider('coefficient a (X)', a, setA, 0, 2)}
          {slider('coefficient b (Z)', b, setB, -2, 2)}
          {slider('parameter θ', theta, setTheta, 0, TWO_PI, (v) => `${(v / Math.PI).toFixed(2)}π`)}
          <div className="flex items-center gap-2">
            <button onClick={() => setOptimizing((o) => !o)}
              className="px-3 py-1.5 rounded-lg border border-plasma-500/30 text-plasma-300 hover:border-plasma-500/60 text-xs font-mono transition-all">
              {optimizing ? '■ stop' : '▶ optimize θ'}
            </button>
            <span className="text-[10px] text-slate-600 font-mono">gradient descent on the device cost</span>
          </div>
          <div className="rounded-lg border border-white/5 bg-void-900/40 p-3 text-xs font-mono grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-slate-500">E(θ)</span><span className="text-plasma-300 text-right tabular-nums">{E.toFixed(4)}</span>
            <span className="text-slate-500">ground E₀</span><span className="text-wave-400 text-right tabular-nums">{E0.toFixed(4)}</span>
            <span className="text-slate-500">gap E − E₀</span><span className={`text-right tabular-nums ${gap < 1e-2 ? 'text-wave-400' : 'text-slate-300'}`}>{gap.toFixed(4)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

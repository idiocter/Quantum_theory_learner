'use client'
import { useRef, useState } from 'react'
import QuantumCanvas, { type CanvasFrame } from './QuantumCanvas'

// Grover's search amplifies the amplitude of one marked item among N via
// repeated oracle (sign flip on the target) + diffusion (inversion about the
// mean). The success probability peaks after ~(π/4)√N iterations.
const N = 16
const STEP_INTERVAL = 0.9 // seconds between auto-iterations while playing

function makeUniform() {
  const a = new Float64Array(N)
  a.fill(1 / Math.sqrt(N))
  return a
}

export default function GroverAmplification() {
  const amp = useRef<Float64Array>(makeUniform()) // logical amplitudes
  const disp = useRef<Float64Array>(makeUniform()) // tweened for display
  const target = useRef<number>(Math.floor(Math.random() * N))
  const iter = useRef(0)
  const timer = useRef(0)

  const [iterCount, setIterCount] = useState(0)
  const [pTarget, setPTarget] = useState(1 / N)

  const sync = () => {
    setIterCount(iter.current)
    setPTarget(amp.current[target.current] ** 2)
  }

  const step = () => {
    const a = amp.current
    a[target.current] *= -1 // oracle
    let mean = 0
    for (let i = 0; i < N; i++) mean += a[i]
    mean /= N
    for (let i = 0; i < N; i++) a[i] = 2 * mean - a[i] // diffusion
    iter.current++
    sync()
  }

  const reset = () => {
    amp.current = makeUniform()
    disp.current = makeUniform()
    iter.current = 0
    timer.current = 0
    sync()
  }

  const newTarget = () => {
    target.current = Math.floor(Math.random() * N)
    reset()
  }

  const draw = (ctx: CanvasRenderingContext2D, { dt, width: W, height: H }: CanvasFrame) => {
    if (dt > 0) {
      timer.current += dt
      if (timer.current >= STEP_INTERVAL) {
        timer.current = 0
        step()
      }
    }

    // Ease displayed amplitudes toward the logical ones.
    const a = amp.current
    const d = disp.current
    const k = dt > 0 ? Math.min(1, dt * 8) : 1
    for (let i = 0; i < N; i++) d[i] += (a[i] - d[i]) * k

    ctx.fillStyle = '#060414'
    ctx.fillRect(0, 0, W, H)

    const pad = 22
    const midY = H / 2
    const plotW = W - pad * 2
    const maxAmp = 1 // amplitudes stay within [-1, 1]
    const scale = (H / 2 - pad) / maxAmp
    const barW = (plotW / N) * 0.7
    const gap = plotW / N

    // Zero axis.
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pad, midY)
    ctx.lineTo(W - pad, midY)
    ctx.stroke()

    for (let i = 0; i < N; i++) {
      const x = pad + i * gap + (gap - barW) / 2
      const h = d[i] * scale
      const isTarget = i === target.current
      ctx.fillStyle = isTarget ? '#ff5ec4' : 'rgba(162,89,255,0.7)'
      ctx.fillRect(x, midY - Math.max(h, 0), barW, Math.abs(h))
    }

    ctx.font = '11px monospace'
    ctx.fillStyle = 'rgba(255,94,196,0.9)'
    ctx.fillText(`marked item: #${target.current}`, pad, pad - 4)
    ctx.textAlign = 'right'
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillText(`iteration ${iter.current}`, W - pad, pad - 4)
    ctx.textAlign = 'left'
  }

  const optimal = Math.round((Math.PI / 4) * Math.sqrt(N))

  return (
    <QuantumCanvas draw={draw} onReset={reset} height={300}>
      <button onClick={step}
        className="px-3 py-1.5 rounded-lg border border-quantum-500/30 text-quantum-300 hover:border-quantum-500/60 text-xs font-mono transition-all">
        Step
      </button>
      <button onClick={newTarget}
        className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:border-white/20 text-xs font-mono transition-all">
        New target
      </button>
      <span className="text-[10px] text-slate-600 font-mono ml-auto">
        iter {iterCount} · P(found) {(pTarget * 100).toFixed(0)}% · optimal ≈ {optimal}
      </span>
    </QuantumCanvas>
  )
}

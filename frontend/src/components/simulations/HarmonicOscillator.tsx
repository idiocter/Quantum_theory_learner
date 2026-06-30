'use client'
import { useCanvasVisible } from '@/lib/hooks/useCanvasVisible'
import { useRef, useEffect, useState } from 'react'

// Hermite physicists' polynomials H0..H6 for the oscillator eigenstates.
function hermite(n: number, x: number): number {
  let h0 = 1
  let h1 = 2 * x
  if (n === 0) return h0
  if (n === 1) return h1
  for (let k = 2; k <= n; k++) {
    const hk = 2 * x * h1 - 2 * (k - 1) * h0
    h0 = h1
    h1 = hk
  }
  return h1
}

// Quantum harmonic oscillator: equally spaced energy levels Eₙ=(n+½)ħω and the
// real Hermite–Gauss eigenstate ψₙ oscillating with phase e^(−iEₙt/ℏ).
export default function HarmonicOscillator() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const visibleRef = useCanvasVisible(canvasRef)
  const animRef = useRef<number>(0)
  const nRef = useRef(2)
  const modeRef = useRef<'psi' | 'prob'>('psi')

  const [n, setN] = useState(2)
  const [mode, setMode] = useState<'psi' | 'prob'>('psi')

  useEffect(() => {
    nRef.current = n
  }, [n])
  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    canvas.width = canvas.parentElement?.clientWidth ?? 700
    canvas.height = 340
    const W = canvas.width
    const H = canvas.height
    const cx = W / 2
    const base = H - 30
    const scale = 46 // px per ξ unit
    let t = 0

    // Rough peak normalisation per n so amplitudes stay on-screen.
    const psi = (nn: number, xi: number) => {
      const env = Math.exp(-(xi * xi) / 2)
      const raw = hermite(nn, xi) * env
      // crude normalisation: divide by sqrt(2^n n!) and a constant
      let norm = 1
      for (let k = 1; k <= nn; k++) norm *= 2 * k
      return raw / Math.sqrt(norm) / 0.75
    }

    const render = () => {
      if (!visibleRef.current) { animRef.current = requestAnimationFrame(render); return }
      ctx.fillStyle = '#060414'
      ctx.fillRect(0, 0, W, H)

      const nn = nRef.current
      const showProb = modeRef.current === 'prob'

      // Parabolic potential V(x) = ½ x²
      ctx.beginPath()
      for (let px = 0; px <= W; px++) {
        const xi = (px - cx) / scale
        const v = 0.5 * xi * xi
        const y = base - v * 26
        px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y)
      }
      ctx.strokeStyle = 'rgba(162,89,255,0.25)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Energy ladder Eₙ = (n+½)
      for (let lvl = 0; lvl <= 6; lvl++) {
        const e = lvl + 0.5
        const y = base - e * 26
        // classical turning points where V = E → ξ = ±√(2E)
        const turn = Math.sqrt(2 * e) * scale
        ctx.beginPath()
        ctx.moveTo(cx - turn, y)
        ctx.lineTo(cx + turn, y)
        ctx.strokeStyle = lvl === nn ? 'rgba(56,198,232,0.55)' : 'rgba(255,255,255,0.07)'
        ctx.lineWidth = lvl === nn ? 1.5 : 1
        ctx.stroke()
      }

      // Selected eigenstate drawn on its energy level
      const e = nn + 0.5
      const levelY = base - e * 26
      const phase = Math.cos(t * (nn + 0.5) * 0.6) // time evolution of real part

      ctx.beginPath()
      const ampPx = 30
      for (let px = 0; px <= W; px++) {
        const xi = (px - cx) / scale
        const p = psi(nn, xi)
        const val = showProb ? p * p : p * phase
        const y = levelY - val * ampPx
        px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y)
      }
      ctx.strokeStyle = showProb ? '#ff5ec4' : '#a259ff'
      ctx.lineWidth = 2.5
      ctx.shadowColor = showProb ? 'rgba(255,94,196,0.5)' : 'rgba(162,89,255,0.5)'
      ctx.shadowBlur = 10
      ctx.stroke()
      ctx.shadowBlur = 0

      // Fill for probability mode
      if (showProb) {
        ctx.lineTo(W, levelY)
        ctx.lineTo(0, levelY)
        ctx.closePath()
        ctx.fillStyle = 'rgba(255,94,196,0.12)'
        ctx.fill()
      }

      // Labels
      ctx.font = '11px monospace'
      ctx.fillStyle = 'rgba(56,198,232,0.9)'
      ctx.fillText(`n = ${nn}`, cx - turnLabel(nn, scale) - 4, levelY - 6)
      ctx.fillStyle = 'rgba(148,163,184,0.8)'
      ctx.fillText(`Eₙ = (n + ½)ℏω = ${(nn + 0.5).toFixed(1)} ℏω`, 12, 20)
      ctx.fillStyle = 'rgba(162,89,255,0.7)'
      ctx.fillText('V(x) = ½mω²x²', W - 130, 20)

      t += 0.03
      animRef.current = requestAnimationFrame(render)
    }

    const turnLabel = (nn: number, sc: number) => Math.sqrt(2 * (nn + 0.5)) * sc

    render()
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="w-full rounded-lg" style={{ background: '#060414' }} />

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Energy level n</span>
          <span className="font-mono text-wave-400">{n}</span>
        </div>
        <input
          type="range"
          min={0}
          max={6}
          step={1}
          value={n}
          onChange={(e) => setN(Number(e.target.value))}
          className="w-full accent-quantum-500 h-1"
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-600">
        <span className="font-mono text-slate-500">
          Levels are evenly spaced by ℏω — the oscillator&apos;s signature.
        </span>
        <div className="flex gap-2">
          {(['psi', 'prob'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                mode === m
                  ? 'border-quantum-500/50 bg-quantum-500/10 text-quantum-300'
                  : 'border-white/10 text-slate-500 hover:border-white/20'
              }`}
            >
              {m === 'psi' ? 'ψₙ(x)' : '|ψₙ|²'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

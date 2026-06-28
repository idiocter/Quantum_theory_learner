'use client'
import { useRef, useEffect, useState } from 'react'

type Outcome = 'up' | 'down' | null

// Two entangled qubits in the singlet state (|01⟩ − |10⟩)/√2: measuring one
// instantly fixes the other to the opposite value, however far apart.
export default function Entanglement() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const stateRef = useRef<{ a: Outcome; b: Outcome }>({ a: null, b: null })

  const [a, setA] = useState<Outcome>(null)
  const [b, setB] = useState<Outcome>(null)
  const [trials, setTrials] = useState(0)
  const [anti, setAnti] = useState(0)

  useEffect(() => {
    stateRef.current = { a, b }
  }, [a, b])

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    canvas.width = canvas.parentElement?.clientWidth ?? 700
    canvas.height = 280
    const W = canvas.width
    const H = canvas.height
    let t = 0

    const drawParticle = (cx: number, cy: number, outcome: Outcome, color: string, label: string) => {
      // Link-pulse glow ring
      ctx.beginPath()
      ctx.arc(cx, cy, 34, 0, Math.PI * 2)
      ctx.strokeStyle = color.replace(')', `, ${0.25 + 0.15 * Math.sin(t * 2)})`).replace('rgb', 'rgba')
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(cx, cy, 26, 0, Math.PI * 2)
      ctx.fillStyle = color.replace('rgb', 'rgba').replace(')', ', 0.12)')
      ctx.fill()
      ctx.strokeStyle = color.replace('rgb', 'rgba').replace(')', ', 0.6)')
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.font = 'bold 22px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      if (outcome === null) {
        // Superposed: flicker both arrows
        ctx.fillStyle = `rgba(231,226,245,${0.4 + 0.3 * Math.sin(t * 6)})`
        ctx.fillText('↑', cx, cy - 1)
        ctx.fillStyle = `rgba(231,226,245,${0.4 + 0.3 * Math.cos(t * 6)})`
        ctx.fillText('↓', cx, cy + 1)
      } else {
        ctx.fillStyle = '#fff'
        ctx.fillText(outcome === 'up' ? '↑' : '↓', cx, cy)
      }
      ctx.font = '11px monospace'
      ctx.fillStyle = 'rgba(148,163,184,0.9)'
      ctx.fillText(label, cx, cy + 48)
      ctx.textAlign = 'start'
      ctx.textBaseline = 'alphabetic'
    }

    const render = () => {
      ctx.fillStyle = '#060414'
      ctx.fillRect(0, 0, W, H)

      const { a: oa, b: ob } = stateRef.current
      const ax = W * 0.25
      const bx = W * 0.75
      const cy = H / 2 - 10

      // Entanglement link
      const linked = oa === null && ob === null
      ctx.beginPath()
      ctx.moveTo(ax + 30, cy)
      ctx.lineTo(bx - 30, cy)
      ctx.strokeStyle = linked
        ? `rgba(162,89,255,${0.3 + 0.25 * Math.sin(t * 3)})`
        : 'rgba(100,116,139,0.2)'
      ctx.lineWidth = linked ? 2 : 1
      ctx.setLineDash(linked ? [] : [4, 6])
      ctx.stroke()
      ctx.setLineDash([])

      if (linked) {
        ctx.font = '10px monospace'
        ctx.fillStyle = 'rgba(162,89,255,0.8)'
        ctx.textAlign = 'center'
        ctx.fillText('(|01⟩ − |10⟩)/√2', W / 2, cy - 14)
        ctx.textAlign = 'start'
      }

      drawParticle(ax, cy, oa, 'rgb(56,198,232)', 'Qubit A (Alice)')
      drawParticle(bx, cy, ob, 'rgb(255,94,196)', 'Qubit B (Bob)')

      t += 0.03
      animRef.current = requestAnimationFrame(render)
    }
    render()
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  const measureA = () => {
    const up = Math.random() < 0.5
    const oa: Outcome = up ? 'up' : 'down'
    const ob: Outcome = up ? 'down' : 'up' // perfectly anti-correlated
    setA(oa)
    setB(ob)
    setTrials((n) => n + 1)
    setAnti((n) => n + 1) // singlet → always anti-correlated on same axis
  }

  const reset = () => {
    setA(null)
    setB(null)
  }

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="w-full rounded-lg" style={{ background: '#060414' }} />

      <p className="text-xs text-slate-500">
        Alice and Bob hold one qubit each from an entangled pair. Neither has a definite value — yet
        the instant Alice measures hers, Bob&apos;s is fixed to the opposite, no signal required.
      </p>

      <div className="flex items-center justify-between text-xs text-slate-600 flex-wrap gap-3">
        <span className="font-mono">
          Trials: <span className="text-quantum-400">{trials}</span> · Anti-correlated:{' '}
          <span className="text-quantum-400">{trials ? Math.round((anti / trials) * 100) : 0}%</span>
        </span>
        <div className="flex gap-2">
          <button
            onClick={measureA}
            disabled={a !== null}
            className="px-3 py-1.5 rounded-lg border border-wave-500/30 text-wave-400 hover:border-wave-500/60 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-mono transition-all"
          >
            ⚡ Measure A
          </button>
          <button
            onClick={reset}
            className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:border-white/20 text-xs font-mono transition-all"
          >
            ↻ New pair
          </button>
        </div>
      </div>
    </div>
  )
}

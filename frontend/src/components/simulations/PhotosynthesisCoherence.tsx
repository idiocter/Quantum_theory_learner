'use client'
import { useRef, useState } from 'react'
import QuantumCanvas, { type CanvasFrame } from './QuantumCanvas'

// In photosynthetic light-harvesting complexes, an absorbed photon's energy must
// hop across a network of chromophores to the reaction centre. A classical
// excitation random-walks and can get lost; quantum coherence lets the
// excitation explore many paths at once, finding the centre quickly.
const NODES = [
  { x: 0.10, y: 0.5 }, // antenna (light in)
  { x: 0.32, y: 0.25 },
  { x: 0.32, y: 0.75 },
  { x: 0.55, y: 0.5 },
  { x: 0.72, y: 0.28 },
  { x: 0.72, y: 0.72 },
  { x: 0.90, y: 0.5 }, // reaction centre (target)
]
const EDGES = [[0, 1], [0, 2], [1, 3], [2, 3], [1, 4], [3, 4], [3, 5], [2, 5], [4, 6], [5, 6]]
const TARGET = 6

export default function PhotosynthesisCoherence() {
  const [quantum, setQuantum] = useState(true)
  const qRef = useRef(quantum)
  qRef.current = quantum

  // Quantum: amplitude on each node. Classical: index of the single walker.
  const amp = useRef<number[]>(NODES.map((_, i) => (i === 0 ? 1 : 0)))
  const walker = useRef(0)
  const hopTimer = useRef(0)
  const [arrived, setArrived] = useState(false)

  const neighbours = (i: number) =>
    EDGES.filter((e) => e.includes(i)).map((e) => (e[0] === i ? e[1] : e[0]))

  const reset = () => {
    amp.current = NODES.map((_, i) => (i === 0 ? 1 : 0))
    walker.current = 0
    hopTimer.current = 0
    setArrived(false)
  }

  const draw = (ctx: CanvasRenderingContext2D, { dt, width: W, height: H }: CanvasFrame) => {
    ctx.fillStyle = '#060414'
    ctx.fillRect(0, 0, W, H)
    const px = (n: { x: number; y: number }) => ({ x: 30 + n.x * (W - 60), y: 24 + n.y * (H - 60) })

    if (dt > 0) {
      if (qRef.current) {
        // Coherent spread: diffuse amplitude to neighbours, slightly biased toward
        // the target, with the reaction centre trapping population.
        const a = amp.current
        const next = a.slice()
        for (let i = 0; i < NODES.length; i++) {
          const nb = neighbours(i)
          for (const j of nb) {
            const flow = a[i] * dt * 1.6 * (j === TARGET ? 1.6 : 1) / nb.length
            next[i] -= flow
            next[j] += flow
          }
        }
        amp.current = next
        if (next[TARGET] > 0.5) setArrived(true)
      } else {
        // Classical random walk: hop to a random neighbour every ~0.5 s.
        hopTimer.current += dt
        if (hopTimer.current > 0.5 && walker.current !== TARGET) {
          hopTimer.current = 0
          const nb = neighbours(walker.current)
          walker.current = nb[Math.floor(Math.random() * nb.length)]
          if (walker.current === TARGET) setArrived(true)
        }
      }
    }

    // Edges.
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1
    for (const [i, j] of EDGES) {
      const a = px(NODES[i]), b = px(NODES[j])
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
    }

    // Nodes.
    NODES.forEach((n, i) => {
      const p = px(n)
      const lit = qRef.current ? Math.min(1, amp.current[i]) : walker.current === i ? 1 : 0
      const isTarget = i === TARGET
      const r = isTarget ? 12 : 9
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
      ctx.fillStyle = isTarget ? 'rgba(250,204,21,0.18)' : 'rgba(255,255,255,0.06)'
      ctx.fill()
      if (lit > 0.02) {
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(162,89,255,${lit})`
        ctx.shadowColor = 'rgba(162,89,255,0.8)'; ctx.shadowBlur = 14 * lit
        ctx.fill(); ctx.shadowBlur = 0
      }
      ctx.strokeStyle = isTarget ? '#facc15' : 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke()
    })

    ctx.font = '11px monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillText('light in', px(NODES[0]).x - 14, px(NODES[0]).y - 16)
    ctx.fillStyle = '#facc15'
    ctx.fillText('reaction centre', px(NODES[TARGET]).x - 40, px(NODES[TARGET]).y - 18)
    ctx.fillStyle = qRef.current ? '#a259ff' : '#38c6e8'
    ctx.fillText(qRef.current ? 'quantum: coherent, explores all paths' : 'classical: single random hop', 12, 16)
  }

  return (
    <div className="space-y-3">
      <QuantumCanvas draw={draw} onReset={reset} height={280} speeds={[0.5, 1, 2]}>
        <span className={`text-[10px] font-mono ml-auto ${arrived ? 'text-quantum-300' : 'text-slate-600'}`}>
          {arrived ? '✓ reached reaction centre' : 'transporting…'}
        </span>
      </QuantumCanvas>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mr-1">Transport</span>
        {[true, false].map((q) => (
          <button key={String(q)} onClick={() => { setQuantum(q); reset() }}
            className={`px-3 py-1 rounded text-xs font-mono transition-all border ${
              quantum === q ? 'border-quantum-500/60 bg-quantum-500/15 text-quantum-200' : 'border-white/10 text-slate-400 hover:border-white/20'
            }`}>
            {q ? 'Quantum' : 'Classical'}
          </button>
        ))}
      </div>
    </div>
  )
}

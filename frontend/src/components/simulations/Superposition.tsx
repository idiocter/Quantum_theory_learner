'use client'
import { useCanvasVisible } from '@/lib/hooks/useCanvasVisible'
import { useRef, useEffect, useState } from 'react'

// Visualises a qubit state |ψ⟩ = cos(θ/2)|0⟩ + sin(θ/2)|1⟩ as two component
// waves plus their superposition, with a measurement that collapses it.
export default function Superposition() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const visibleRef = useCanvasVisible(canvasRef)
  const animRef = useRef<number>(0)
  const thetaRef = useRef(60) // mixing angle in degrees
  const collapsedRef = useRef<null | 0 | 1>(null)

  const [theta, setTheta] = useState(60)
  const [collapsed, setCollapsed] = useState<null | 0 | 1>(null)

  const p0 = Math.cos((theta * Math.PI) / 360) ** 2 // cos²(θ/2)
  const p1 = Math.sin((theta * Math.PI) / 360) ** 2 // sin²(θ/2)

  useEffect(() => {
    thetaRef.current = theta
  }, [theta])
  useEffect(() => {
    collapsedRef.current = collapsed
  }, [collapsed])

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    canvas.width = canvas.parentElement?.clientWidth ?? 700
    canvas.height = 320
    const W = canvas.width
    const H = canvas.height
    const mid = H / 2

    let t = 0

    const wave = (amp: number, k: number, phase: number, color: string, width: number) => {
      ctx.beginPath()
      for (let x = 0; x <= W; x++) {
        const y = mid - amp * Math.sin((x / W) * k * Math.PI * 2 + phase)
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.stroke()
    }

    const render = () => {
      if (!visibleRef.current) { animRef.current = requestAnimationFrame(render); return }
      ctx.fillStyle = '#060414'
      ctx.fillRect(0, 0, W, H)

      // Baseline
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, mid)
      ctx.lineTo(W, mid)
      ctx.stroke()

      const th = (thetaRef.current * Math.PI) / 180
      const a0 = Math.cos(th / 2)
      const a1 = Math.sin(th / 2)
      const collapse = collapsedRef.current

      const amp0 = (collapse === null ? a0 : collapse === 0 ? 1 : 0) * 70
      const amp1 = (collapse === null ? a1 : collapse === 1 ? 1 : 0) * 70

      // Component waves: |0⟩ cyan, |1⟩ rose
      wave(amp0, 2, t, 'rgba(56, 198, 232, 0.45)', 1.5)
      wave(amp1, 3, t * 1.3, 'rgba(255, 94, 196, 0.45)', 1.5)

      // Superposition (sum) in quantum purple, glowing
      ctx.beginPath()
      for (let x = 0; x <= W; x++) {
        const phase0 = (x / W) * 2 * Math.PI * 2 + t
        const phase1 = (x / W) * 3 * Math.PI * 2 + t * 1.3
        const y = mid - (amp0 * Math.sin(phase0) + amp1 * Math.sin(phase1)) * 0.7
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.strokeStyle = '#a259ff'
      ctx.lineWidth = 2.5
      ctx.shadowColor = 'rgba(162,89,255,0.6)'
      ctx.shadowBlur = 12
      ctx.stroke()
      ctx.shadowBlur = 0

      // Labels
      ctx.font = '10px monospace'
      ctx.fillStyle = 'rgba(56,198,232,0.8)'
      ctx.fillText('|0⟩', 8, 16)
      ctx.fillStyle = 'rgba(255,94,196,0.8)'
      ctx.fillText('|1⟩', 8, 30)
      ctx.fillStyle = 'rgba(162,89,255,0.9)'
      ctx.fillText('|ψ⟩ = α|0⟩ + β|1⟩', 8, 44)

      if (collapse !== null) {
        ctx.font = 'bold 13px monospace'
        ctx.fillStyle = '#a259ff'
        ctx.fillText(`collapsed → |${collapse}⟩`, W - 130, 20)
      }

      t += 0.04
      animRef.current = requestAnimationFrame(render)
    }
    render()
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  const measure = () => {
    const r = Math.random()
    setCollapsed(r < p0 ? 0 : 1)
  }

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="w-full rounded-lg" style={{ background: '#060414' }} />

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Mixing angle θ</span>
          <span className="font-mono text-quantum-400">{theta}°</span>
        </div>
        <input
          type="range"
          min={0}
          max={180}
          step={1}
          value={theta}
          onChange={(e) => {
            setTheta(Number(e.target.value))
            setCollapsed(null)
          }}
          className="w-full accent-quantum-500 h-1"
        />
      </div>

      {/* Probability bars */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-wave-400 font-mono">|α|² = P(0)</span>
            <span className="text-slate-400 font-mono">{(p0 * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded bg-void-800 overflow-hidden">
            <div className="h-full bg-wave-500/70" style={{ width: `${p0 * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-plasma-400 font-mono">|β|² = P(1)</span>
            <span className="text-slate-400 font-mono">{(p1 * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded bg-void-800 overflow-hidden">
            <div className="h-full bg-plasma-500/70" style={{ width: `${p1 * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-600">
        <span className="font-mono">
          {collapsed === null ? 'In superposition' : <span className="text-quantum-400">Measured: |{collapsed}⟩</span>}
        </span>
        <button
          onClick={measure}
          className="px-3 py-1.5 rounded-lg border border-quantum-500/30 text-quantum-400 hover:border-quantum-500/60 text-xs font-mono transition-all"
        >
          ⚡ Measure
        </button>
      </div>
    </div>
  )
}

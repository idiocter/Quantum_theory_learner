'use client'
import { useRef, useEffect, useState } from 'react'

const PHI = 1.618033988749895

export default function ParticleInBox() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const tRef = useRef(0)

  const [n, setN] = useState(1) // quantum number
  const [showProb, setShowProb] = useState(true)
  const [isRunning, setIsRunning] = useState(true)
  const runRef = useRef(true)

  useEffect(() => { runRef.current = isRunning }, [isRunning])

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    canvas.width = canvas.parentElement?.clientWidth ?? 700
    canvas.height = 340

    const W = canvas.width
    const H = canvas.height
    const padX = 60
    const boxW = W - padX * 2
    const midY = H * 0.55
    const psiScale = H * 0.32

    const render = () => {
      ctx.fillStyle = '#060414'
      ctx.fillRect(0, 0, W, H)

      // Box walls
      const wallColor = 'rgba(162, 89, 255, 0.4)'
      ctx.fillStyle = wallColor
      ctx.fillRect(padX - 4, midY - psiScale - 20, 4, psiScale * 2 + 40)
      ctx.fillRect(padX + boxW, midY - psiScale - 20, 4, psiScale * 2 + 40)

      // Axis
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(padX, midY)
      ctx.lineTo(padX + boxW, midY)
      ctx.stroke()
      ctx.setLineDash([])

      // Energy levels (thin lines for each level)
      const hbar2_over_2mL2 = 1 // normalised
      for (let en = 1; en <= 5; en++) {
        const E = (en * en) * hbar2_over_2mL2
        const yE = midY - (E / 25) * psiScale * 0.9
        ctx.strokeStyle = en === n ? 'rgba(162, 89, 255, 0.5)' : 'rgba(100, 116, 139, 0.12)'
        ctx.lineWidth = en === n ? 1.5 : 0.5
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(padX + 6, yE)
        ctx.lineTo(padX + boxW - 6, yE)
        ctx.stroke()
        ctx.setLineDash([])

        ctx.font = `${en === n ? 'bold ' : ''}10px monospace`
        ctx.fillStyle = en === n ? '#c098ff' : '#334155'
        ctx.fillText(`n=${en}`, padX - 48, yE + 3)
      }

      if (runRef.current) tRef.current += 0.04

      // Wave function ψ_n(x) = √(2/L) sin(nπx/L)  with time phase
      const phase = tRef.current * n * n  // energy ∝ n²

      const drawWave = (color: string, getData: (x01: number) => number) => {
        ctx.beginPath()
        for (let px = 0; px <= boxW; px++) {
          const x01 = px / boxW
          const y = midY - getData(x01) * psiScale
          if (px === 0) ctx.moveTo(padX + px, y)
          else ctx.lineTo(padX + px, y)
        }
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.stroke()
      }

      if (showProb) {
        // |ψ|² probability density — fill
        ctx.beginPath()
        ctx.moveTo(padX, midY)
        for (let px = 0; px <= boxW; px++) {
          const x01 = px / boxW
          const psi = Math.sqrt(2) * Math.sin(n * Math.PI * x01)
          const prob = psi * psi
          ctx.lineTo(padX + px, midY - prob * psiScale * 0.9)
        }
        ctx.lineTo(padX + boxW, midY)
        ctx.closePath()
        const grad = ctx.createLinearGradient(0, midY - psiScale, 0, midY)
        grad.addColorStop(0, 'rgba(162, 89, 255, 0.25)')
        grad.addColorStop(1, 'rgba(162, 89, 255, 0.02)')
        ctx.fillStyle = grad
        ctx.fill()

        drawWave('rgba(162, 89, 255, 0.8)', (x) => Math.sqrt(2) * Math.sin(n * Math.PI * x) ** 2 * 0.9)
      } else {
        // Real part of time-dependent ψ
        drawWave('rgba(162, 89, 255, 0.9)', (x) =>
          Math.sqrt(2) * Math.sin(n * Math.PI * x) * Math.cos(phase)
        )
        // Imaginary part
        drawWave('rgba(255, 94, 196, 0.5)', (x) =>
          Math.sqrt(2) * Math.sin(n * Math.PI * x) * Math.sin(phase)
        )
      }

      // Node markers
      for (let node = 0; node <= n; node++) {
        const x = padX + (node / n) * boxW
        ctx.beginPath()
        ctx.arc(x, midY, 3, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(162, 89, 255, 0.5)'
        ctx.fill()
      }

      // Labels
      ctx.font = '11px Inter, monospace'
      ctx.fillStyle = '#c098ff'
      ctx.textAlign = 'center'
      ctx.fillText(`n = ${n}`, W / 2, 24)
      const E_n = n * n
      ctx.fillStyle = '#94a3b8'
      ctx.fillText(`E_${n} = ${E_n}E₁`, W / 2, 38)
      ctx.textAlign = 'left'

      // Fibonacci spiral marker at golden-ratio position
      const phiX = padX + boxW / PHI
      ctx.strokeStyle = 'rgba(255, 200, 61, 0.2)'
      ctx.lineWidth = 0.5
      ctx.setLineDash([2, 4])
      ctx.beginPath()
      ctx.moveTo(phiX, midY - psiScale - 10)
      ctx.lineTo(phiX, midY + 20)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.font = '8px monospace'
      ctx.fillStyle = 'rgba(255, 200, 61, 0.3)'
      ctx.fillText('φ', phiX + 3, midY + 32)

      animRef.current = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animRef.current)
  }, [n, showProb])

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="w-full rounded-lg" style={{ background: '#060414' }} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center pt-2">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Quantum number n</span>
            <span className="font-mono text-quantum-400">{n}</span>
          </div>
          <input type="range" min={1} max={8} step={1} value={n} onChange={(e) => setN(Number(e.target.value))} className="accent-quantum-500 h-1" />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => setShowProb((s) => !s)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${showProb ? 'border-quantum-500/50 text-quantum-400' : 'border-slate-700 text-slate-500'}`}
          >
            {showProb ? '|ψ|²  (Prob)' : 'ψ(t) (Wave)'}
          </button>
          <button
            onClick={() => setIsRunning((r) => !r)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${isRunning ? 'border-particle-500/30 text-particle-400' : 'border-wave-500/30 text-wave-400'}`}
          >
            {isRunning ? '⏸' : '▶'}
          </button>
        </div>

        <div className="text-xs font-mono text-slate-600 space-y-0.5">
          <div>Nodes: <span className="text-quantum-400">{n - 1}</span></div>
          <div>E_n ∝ n² = <span className="text-quantum-400">{n * n}E₁</span></div>
          <div>λ = <span className="text-quantum-400">2L/{n}</span></div>
        </div>
      </div>
    </div>
  )
}

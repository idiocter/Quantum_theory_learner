'use client'
import { useRef, useEffect, useState } from 'react'

const GRID = 512

export default function Wavefunction() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const stateRef = useRef<{ re: Float64Array; im: Float64Array } | null>(null)
  const tRef = useRef(0)
  const runRef = useRef(true)

  const [k0, setK0] = useState(8)       // initial momentum
  const [sigma, setSigma] = useState(30) // packet width
  const [isRunning, setIsRunning] = useState(true)
  const [showPhase, setShowPhase] = useState(false)

  useEffect(() => { runRef.current = isRunning }, [isRunning])

  // Initialise Gaussian wave packet
  const initPacket = (N: number, k: number, sig: number) => {
    const re = new Float64Array(N)
    const im = new Float64Array(N)
    const x0 = N / 4
    for (let i = 0; i < N; i++) {
      const dx = i - x0
      const envelope = Math.exp(-(dx * dx) / (2 * sig * sig))
      re[i] = envelope * Math.cos(k * dx / N * Math.PI * 2)
      im[i] = envelope * Math.sin(k * dx / N * Math.PI * 2)
    }
    return { re, im }
  }

  // One Schrödinger time step via split-operator (simplified finite-difference)
  const timeStep = (re: Float64Array, im: Float64Array, dt = 0.5) => {
    const N = re.length
    const newRe = new Float64Array(N)
    const newIm = new Float64Array(N)
    const dx2 = 1.0
    const hbar2_2m = 0.5

    for (let i = 1; i < N - 1; i++) {
      // kinetic T = -(ℏ²/2m) ∂²ψ/∂x²  → finite difference
      const d2re = (re[i + 1] - 2 * re[i] + re[i - 1]) / dx2
      const d2im = (im[i + 1] - 2 * im[i] + im[i - 1]) / dx2
      // iℏ ∂ψ/∂t = Tψ
      newRe[i] = re[i] + dt * hbar2_2m * d2im
      newIm[i] = im[i] - dt * hbar2_2m * d2re
    }
    // Periodic boundary (free particle)
    newRe[0] = newRe[N - 2]
    newIm[0] = newIm[N - 2]
    newRe[N - 1] = newRe[1]
    newIm[N - 1] = newIm[1]
    return { re: newRe, im: newIm }
  }

  useEffect(() => {
    stateRef.current = initPacket(GRID, k0, sigma)
    tRef.current = 0
  }, [k0, sigma])

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    canvas.width = canvas.parentElement?.clientWidth ?? 700
    canvas.height = 300

    const W = canvas.width
    const H = canvas.height
    const midY = H / 2
    const scale = H * 0.38

    const render = () => {
      if (!stateRef.current) { animRef.current = requestAnimationFrame(render); return }

      if (runRef.current) {
        stateRef.current = timeStep(stateRef.current.re, stateRef.current.im)
        tRef.current++
      }

      const { re, im } = stateRef.current

      ctx.fillStyle = 'rgba(6, 4, 20, 0.4)'
      ctx.fillRect(0, 0, W, H)

      // Axis
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.15)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(0, midY)
      ctx.lineTo(W, midY)
      ctx.stroke()
      ctx.setLineDash([])

      const xScale = W / GRID

      if (showPhase) {
        // Phase representation — hue ∝ arg(ψ), brightness ∝ |ψ|
        const imgData = ctx.getImageData(0, 0, W, H)
        for (let i = 0; i < GRID; i++) {
          const px = Math.round(i * xScale)
          const prob = re[i] * re[i] + im[i] * im[i]
          const amp = Math.sqrt(prob) * scale
          const phase = Math.atan2(im[i], re[i]) // -π to π
          const hue = ((phase + Math.PI) / (2 * Math.PI)) * 360
          for (let dy = -Math.round(amp); dy <= Math.round(amp); dy++) {
            const py = Math.round(midY + dy)
            if (py < 0 || py >= H) continue
            const idx = (py * W + px) * 4
            const lightness = Math.max(0, 1 - Math.abs(dy) / (amp + 0.01))
            const [r, g, b] = hslToRgb(hue / 360, 0.9, lightness * 0.5)
            imgData.data[idx] = r
            imgData.data[idx + 1] = g
            imgData.data[idx + 2] = b
            imgData.data[idx + 3] = Math.round(lightness * 200)
          }
        }
        ctx.putImageData(imgData, 0, 0)
      } else {
        // Draw |ψ|² filled
        ctx.beginPath()
        ctx.moveTo(0, midY)
        for (let i = 0; i < GRID; i++) {
          const prob = (re[i] * re[i] + im[i] * im[i])
          ctx.lineTo(i * xScale, midY - prob * scale * 4)
        }
        ctx.lineTo(W, midY)
        ctx.closePath()
        const grad = ctx.createLinearGradient(0, midY - scale, 0, midY)
        grad.addColorStop(0, 'rgba(162, 89, 255, 0.5)')
        grad.addColorStop(1, 'rgba(162, 89, 255, 0.03)')
        ctx.fillStyle = grad
        ctx.fill()

        // Real part
        ctx.beginPath()
        for (let i = 0; i < GRID; i++) {
          const y = midY - re[i] * scale
          if (i === 0) ctx.moveTo(0, y)
          else ctx.lineTo(i * xScale, y)
        }
        ctx.strokeStyle = 'rgba(162, 89, 255, 0.85)'
        ctx.lineWidth = 1.5
        ctx.stroke()

        // Imaginary part
        ctx.beginPath()
        for (let i = 0; i < GRID; i++) {
          const y = midY - im[i] * scale
          if (i === 0) ctx.moveTo(0, y)
          else ctx.lineTo(i * xScale, y)
        }
        ctx.strokeStyle = 'rgba(255, 94, 196, 0.6)'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Labels
      ctx.font = '10px monospace'
      ctx.fillStyle = 'rgba(100, 116, 139, 0.7)'
      ctx.fillText(`t = ${tRef.current}`, 8, 16)

      animRef.current = requestAnimationFrame(render)
    }

    ctx.fillStyle = '#060414'
    ctx.fillRect(0, 0, W, H)
    render()
    return () => cancelAnimationFrame(animRef.current)
  }, [showPhase])

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="w-full rounded-lg" style={{ background: '#060414' }} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Momentum k₀</span>
            <span className="font-mono text-quantum-400">{k0}</span>
          </div>
          <input type="range" min={1} max={24} step={1} value={k0} onChange={(e) => setK0(Number(e.target.value))} className="accent-quantum-500 h-1" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Width σ</span>
            <span className="font-mono text-quantum-400">{sigma}</span>
          </div>
          <input type="range" min={8} max={80} step={1} value={sigma} onChange={(e) => setSigma(Number(e.target.value))} className="accent-quantum-500 h-1" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowPhase((s) => !s)} className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${showPhase ? 'border-plasma-500/50 text-plasma-400' : 'border-slate-700 text-slate-500'}`}>
            {showPhase ? 'Phase' : '|ψ|²'}
          </button>
          <button onClick={() => setIsRunning((r) => !r)} className={`px-3 py-1.5 rounded-lg border text-xs font-mono ${isRunning ? 'border-particle-500/30 text-particle-400' : 'border-wave-500/30 text-wave-400'}`}>
            {isRunning ? '⏸' : '▶'}
          </button>
        </div>
        <div className="text-xs font-mono text-slate-600">
          <div>Δx·Δp ≥ ℏ/2</div>
          <div className="text-slate-700 mt-0.5">Wave packet spreads due to dispersion</div>
        </div>
      </div>
    </div>
  )
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h * 12) % 12
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
}

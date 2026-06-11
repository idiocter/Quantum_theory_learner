'use client'
import { useRef, useEffect, useState } from 'react'

export default function QuantumTunneling() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const tRef = useRef(0)
  const runRef = useRef(true)

  const [V0, setV0] = useState(50)      // barrier height (arbitrary units)
  const [barrierW, setBarrierW] = useState(30) // barrier width px
  const [energy, setEnergy] = useState(35)  // particle energy
  const [isRunning, setIsRunning] = useState(true)

  useEffect(() => { runRef.current = isRunning }, [isRunning])

  // Analytic transmission coefficient for rectangular barrier
  const computeT = (E: number, V: number, a: number) => {
    if (E >= V) {
      // Classically allowed — oscillatory
      const k = Math.sqrt(E)
      const q = Math.sqrt(E - V)
      const ka = k * a * 0.05
      const qa = q * a * 0.05
      const denom = 1 + ((k * k - q * q) ** 2 * Math.sin(qa) ** 2) / (4 * k * k * q * q)
      return 1 / denom
    }
    const kappa = Math.sqrt(V - E)
    const ka2 = kappa * a * 0.05
    const T = 1 / (1 + (V * V * Math.sinh(ka2) ** 2) / (4 * E * (V - E)))
    return Math.max(0, Math.min(1, T))
  }

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    canvas.width = canvas.parentElement?.clientWidth ?? 700
    canvas.height = 300

    const W = canvas.width
    const H = canvas.height
    const barrierX = W * 0.55
    const midY = H * 0.65
    const potScale = H * 0.5
    const waveScale = H * 0.22

    const render = () => {
      if (runRef.current) tRef.current += 0.06

      ctx.fillStyle = '#020408'
      ctx.fillRect(0, 0, W, H)

      const T = computeT(energy, V0, barrierW)
      const R = 1 - T
      const isClassical = energy >= V0

      // ── Potential well ────────────────────────────────────────────────────
      const barrierH = Math.min((V0 / 100) * potScale, potScale * 0.95)
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(0, midY)
      ctx.lineTo(barrierX, midY)
      ctx.lineTo(barrierX, midY - barrierH)
      ctx.lineTo(barrierX + barrierW, midY - barrierH)
      ctx.lineTo(barrierX + barrierW, midY)
      ctx.lineTo(W, midY)
      ctx.stroke()

      // Barrier fill
      const grad = ctx.createLinearGradient(barrierX, midY - barrierH, barrierX + barrierW, midY)
      grad.addColorStop(0, 'rgba(245, 158, 11, 0.15)')
      grad.addColorStop(1, 'rgba(245, 158, 11, 0.03)')
      ctx.fillStyle = grad
      ctx.fillRect(barrierX, midY - barrierH, barrierW, barrierH)

      // Energy level
      const energyY = midY - (energy / 100) * potScale
      ctx.setLineDash([5, 5])
      ctx.strokeStyle = energy < V0 ? 'rgba(0, 102, 255, 0.6)' : 'rgba(16, 185, 129, 0.6)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, energyY)
      ctx.lineTo(W, energyY)
      ctx.stroke()
      ctx.setLineDash([])

      // ── Incident wave (left region) ────────────────────────────────────────
      const k = Math.sqrt(Math.max(0.1, energy)) * 0.15
      ctx.beginPath()
      for (let x = 0; x < barrierX; x++) {
        const phase = k * x - tRef.current * 2
        // Superposition of incident + reflected
        const incident = Math.sin(phase)
        const reflected = Math.sqrt(R) * Math.sin(-k * x - tRef.current * 2)
        const y = energyY - (incident + reflected) * waveScale * 0.5
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.strokeStyle = 'rgba(0, 102, 255, 0.85)'
      ctx.lineWidth = 2
      ctx.stroke()

      // ── Inside barrier ────────────────────────────────────────────────────
      if (!isClassical) {
        // Evanescent wave decays exponentially
        const kappa = Math.sqrt(Math.max(0.01, V0 - energy)) * 0.12
        ctx.beginPath()
        for (let x = 0; x <= barrierW; x++) {
          const amp = Math.exp(-kappa * x)
          const y = energyY - amp * waveScale * Math.cos(tRef.current * 1.5) * 0.4
          if (x === 0) ctx.moveTo(barrierX + x, y)
          else ctx.lineTo(barrierX + x, y)
        }
        ctx.strokeStyle = `rgba(245, 158, 11, 0.5)`
        ctx.lineWidth = 1.5
        ctx.stroke()
      } else {
        const q = Math.sqrt(energy - V0) * 0.15
        ctx.beginPath()
        for (let x = 0; x <= barrierW; x++) {
          const y = energyY - Math.sin(q * x - tRef.current * 2) * waveScale * 0.6
          if (x === 0) ctx.moveTo(barrierX + x, y)
          else ctx.lineTo(barrierX + x, y)
        }
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      // ── Transmitted wave (right region) ──────────────────────────────────
      const transmittedAlpha = T * 0.9 + 0.05
      ctx.globalAlpha = transmittedAlpha
      ctx.beginPath()
      for (let x = barrierX + barrierW; x < W; x++) {
        const xr = x - (barrierX + barrierW)
        const y = energyY - Math.sqrt(T) * Math.sin(k * xr - tRef.current * 2) * waveScale
        if (xr === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.9)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.globalAlpha = 1

      // ── Labels ───────────────────────────────────────────────────────────
      ctx.font = '11px monospace'
      ctx.fillStyle = '#94a3b8'

      ctx.fillText('V₀', barrierX + barrierW / 2 - 8, midY - barrierH - 6)
      ctx.fillStyle = energy < V0 ? '#60a5fa' : '#34d399'
      ctx.fillText(`E = ${energy}`, 8, energyY - 6)

      // T / R coefficients
      ctx.font = 'bold 13px monospace'
      ctx.fillStyle = '#34d399'
      ctx.fillText(`T = ${(T * 100).toFixed(1)}%`, W - 100, 20)
      ctx.fillStyle = '#60a5fa'
      ctx.fillText(`R = ${(R * 100).toFixed(1)}%`, W - 100, 36)

      ctx.font = '9px monospace'
      ctx.fillStyle = '#334155'
      ctx.fillText(energy < V0 ? 'QUANTUM TUNNELING' : 'CLASSICAL PASSAGE', barrierX + barrierW / 2 - 45, H - 8)

      animRef.current = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animRef.current)
  }, [V0, barrierW, energy])

  const T = computeT(energy, V0, barrierW)

  const Slider = ({ label, value, min, max, step, onChange, color = 'quantum' }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; color?: string }) => (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span className={`font-mono text-${color}-400`}>{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className={`accent-${color}-500 h-1`} />
    </div>
  )

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="w-full rounded-lg" style={{ background: '#020408' }} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
        <Slider label="Particle Energy E" value={energy} min={5} max={95} step={1} onChange={setEnergy} color="quantum" />
        <Slider label="Barrier Height V₀" value={V0} min={10} max={95} step={1} onChange={setV0} color="photon" />
        <Slider label="Barrier Width" value={barrierW} min={10} max={120} step={2} onChange={setBarrierW} color="photon" />
        <div className="flex flex-col gap-2 justify-center">
          <div className="text-xs font-mono text-wave-400">T = {(T * 100).toFixed(2)}%</div>
          <div className="text-xs font-mono text-quantum-400">R = {((1 - T) * 100).toFixed(2)}%</div>
          <button onClick={() => setIsRunning((r) => !r)} className={`px-3 py-1.5 rounded-lg border text-xs font-mono w-fit ${isRunning ? 'border-particle-500/30 text-particle-400' : 'border-wave-500/30 text-wave-400'}`}>
            {isRunning ? '⏸' : '▶'}
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-700">
        {energy < V0
          ? 'Classically forbidden — particle tunnels through the barrier with T > 0.'
          : 'Energy exceeds barrier — still shows partial reflection (quantum reflection).'}
      </p>
    </div>
  )
}

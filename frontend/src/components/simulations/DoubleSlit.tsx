'use client'
import { useRef, useEffect, useState } from 'react'

interface Params {
  wavelength: number      // nm, controls spatial frequency
  slitSeparation: number  // px units, distance between slits
  slitWidth: number       // px, each slit width
  numParticles: number    // particles per frame
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
}

export default function DoubleSlit() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const interfPatternRef = useRef<Float32Array | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const animRef = useRef<number>(0)
  const runningRef = useRef(true)

  const [params, setParams] = useState<Params>({
    wavelength: 500,
    slitSeparation: 80,
    slitWidth: 20,
    numParticles: 3,
  })
  const [isRunning, setIsRunning] = useState(true)
  const [particleCount, setParticleCount] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    canvas.width = canvas.parentElement?.clientWidth ?? 700
    canvas.height = 380

    const W = canvas.width
    const H = canvas.height
    const slitX = W * 0.35  // barrier position
    const screenX = W * 0.85 // detection screen

    // Precompute double-slit interference pattern on detection screen
    const patternH = H
    const pattern = new Float32Array(patternH)
    const k = (2 * Math.PI) / (params.wavelength * 0.5) // scaled

    for (let y = 0; y < patternH; y++) {
      const theta = Math.atan2(y - H / 2, screenX - slitX)
      // Single-slit envelope
      const beta = (Math.PI * params.slitWidth * 0.3 * Math.sin(theta)) / (params.wavelength * 0.2)
      const single = beta === 0 ? 1 : (Math.sin(beta) / beta) ** 2
      // Double-slit fringes
      const delta = (Math.PI * params.slitSeparation * 0.5 * Math.sin(theta)) / (params.wavelength * 0.2)
      const intensity = single * Math.cos(delta) ** 2
      pattern[y] = Math.max(0, intensity)
    }
    interfPatternRef.current = pattern

    // Normalise for sampling
    const maxI = Math.max(...pattern)
    const normPattern = pattern.map((v) => v / maxI)

    const sampleY = () => {
      // Rejection sampling
      for (let attempt = 0; attempt < 100; attempt++) {
        const y = Math.random() * patternH
        const yi = Math.floor(y)
        if (Math.random() < normPattern[yi]) return y
      }
      return Math.random() * patternH
    }

    const hitmap = new Uint32Array(W * H)
    let total = 0

    const spawnParticles = () => {
      for (let i = 0; i < params.numParticles; i++) {
        const slitY = H / 2 + (Math.random() < 0.5 ? -1 : 1) * params.slitSeparation * 0.5 + (Math.random() - 0.5) * params.slitWidth * 0.3
        particlesRef.current.push({
          x: slitX,
          y: slitY,
          vx: 3.5,
          vy: 0,
          alpha: 1,
        })
      }
    }

    const render = () => {
      if (!runningRef.current) { animRef.current = requestAnimationFrame(render); return }

      ctx.fillStyle = 'rgba(2, 4, 8, 0.15)'
      ctx.fillRect(0, 0, W, H)

      // Draw barrier
      ctx.fillStyle = 'rgba(0, 102, 255, 0.15)'
      ctx.fillRect(slitX - 3, 0, 6, H)

      const sy1 = H / 2 - params.slitSeparation / 2
      const sy2 = H / 2 + params.slitSeparation / 2

      ctx.fillStyle = '#020408'
      ctx.fillRect(slitX - 3, 0, 6, sy1 - params.slitWidth / 2)
      ctx.fillRect(slitX - 3, sy1 + params.slitWidth / 2, 6, sy2 - sy1 - params.slitWidth)
      ctx.fillRect(slitX - 3, sy2 + params.slitWidth / 2, 6, H - sy2 - params.slitWidth / 2)

      // Detection screen
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(screenX, 0)
      ctx.lineTo(screenX, H)
      ctx.stroke()

      // Move & draw active particles
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx
        p.alpha -= 0.02

        if (p.x >= screenX) {
          // Particle hits screen — quantum jump to interference-determined y
          const finalY = sampleY()
          const xi = Math.round(screenX + 2)
          const yi = Math.round(finalY)
          if (xi < W && yi >= 0 && yi < H) {
            hitmap[yi * W + xi]++
            total++
            setParticleCount(total)
          }
          return false
        }

        // Apply quantum-mechanical lateral drift toward screen y
        const targetY = sampleY()
        p.vy += (targetY - p.y) * 0.002

        ctx.beginPath()
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0, 102, 255, ${p.alpha})`
        ctx.fill()

        return p.alpha > 0 && p.x < W
      })

      // Render accumulation map on screen
      const maxHit = Math.max(1, ...Array.from(hitmap.slice(0, W * H)).filter((_, i) => i % W === Math.round(screenX + 2)))
      for (let y = 0; y < H; y++) {
        const hits = hitmap[y * W + Math.round(screenX + 2)]
        if (hits === 0) continue
        const intensity = hits / maxHit
        const alpha = Math.min(1, intensity * 3)
        ctx.fillStyle = `rgba(0, ${Math.round(102 + 153 * intensity)}, 255, ${alpha})`
        ctx.fillRect(screenX + 2, y, 8, 1)
      }

      // Labels
      ctx.font = '10px monospace'
      ctx.fillStyle = 'rgba(100, 116, 139, 0.8)'
      ctx.fillText('SOURCE', 8, 14)
      ctx.fillText('SLIT', slitX - 12, 14)
      ctx.fillText('SCREEN', screenX + 12, 14)

      spawnParticles()
      animRef.current = requestAnimationFrame(render)
    }

    // Fade-in initial background
    ctx.fillStyle = '#020408'
    ctx.fillRect(0, 0, W, H)

    render()

    return () => {
      cancelAnimationFrame(animRef.current)
      runningRef.current = true // reset for next mount
    }
  }, [params])

  useEffect(() => {
    runningRef.current = isRunning
  }, [isRunning])

  const P = (label: string, key: keyof Params, min: number, max: number, step: number) => (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span className="font-mono text-quantum-400">{params[key]}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={params[key]}
        onChange={(e) => setParams((p) => ({ ...p, [key]: Number(e.target.value) }))}
        className="w-full accent-quantum-500 h-1"
      />
    </div>
  )

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="w-full rounded-lg" style={{ background: '#020408' }} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
        {P('Wavelength (nm)', 'wavelength', 200, 900, 10)}
        {P('Slit Separation', 'slitSeparation', 30, 160, 5)}
        {P('Slit Width', 'slitWidth', 5, 60, 1)}
        {P('Rate', 'numParticles', 1, 10, 1)}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-600">
        <span className="font-mono">Particles detected: <span className="text-quantum-400">{particleCount}</span></span>
        <button
          onClick={() => setIsRunning((r) => !r)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${isRunning ? 'border-particle-500/30 text-particle-400 hover:border-particle-500/60' : 'border-wave-500/30 text-wave-400 hover:border-wave-500/60'}`}
        >
          {isRunning ? '⏸ Pause' : '▶ Resume'}
        </button>
      </div>
    </div>
  )
}

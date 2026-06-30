'use client'
import { useCanvasVisible } from '@/lib/hooks/useCanvasVisible'
import { useRef, useEffect, useState } from 'react'

interface Photon { x: number; y: number; hit: boolean }
interface Electron { x: number; y: number; vx: number; vy: number; ke: number }

// Photoelectric effect: electrons eject only when photon frequency exceeds the
// work-function threshold. Intensity changes the count, not the kinetic energy.
export default function Photoelectric() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const visibleRef = useCanvasVisible(canvasRef)
  const animRef = useRef<number>(0)
  const freqRef = useRef(7) // ×10^14 Hz
  const intensityRef = useRef(4)

  const [freq, setFreq] = useState(7)
  const [intensity, setIntensity] = useState(4)
  const [ejected, setEjected] = useState(0)

  const threshold = 5.0 // work function in same units
  const ke = Math.max(0, freq - threshold) // KE ∝ (f − f₀)
  const emits = freq >= threshold

  useEffect(() => {
    freqRef.current = freq
  }, [freq])
  useEffect(() => {
    intensityRef.current = intensity
  }, [intensity])

  // Map frequency to a visible colour (red→violet) for the photon beam.
  const freqColor = (f: number) => {
    const tNorm = Math.min(1, Math.max(0, (f - 3) / 8))
    const hue = 280 - tNorm * 280 // 280 (violet) … 0 (red) reversed
    return `hsl(${hue}, 85%, 62%)`
  }

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    canvas.width = canvas.parentElement?.clientWidth ?? 700
    canvas.height = 300
    const W = canvas.width
    const H = canvas.height
    const plateX = W * 0.32
    const photons: Photon[] = []
    const electrons: Electron[] = []
    let frame = 0
    let count = 0

    const render = () => {
      if (!visibleRef.current) { animRef.current = requestAnimationFrame(render); return }
      ctx.fillStyle = 'rgba(6,4,20,0.3)'
      ctx.fillRect(0, 0, W, H)

      const f = freqRef.current
      const intens = intensityRef.current
      const emit = f >= threshold
      const energy = Math.max(0, f - threshold)
      const color = freqColor(f)

      // Metal plate
      const grad = ctx.createLinearGradient(plateX - 14, 0, plateX, 0)
      grad.addColorStop(0, 'rgba(148,163,184,0.05)')
      grad.addColorStop(1, 'rgba(192,152,255,0.25)')
      ctx.fillStyle = grad
      ctx.fillRect(plateX - 14, 30, 14, H - 60)
      ctx.strokeStyle = 'rgba(192,152,255,0.4)'
      ctx.strokeRect(plateX - 14, 30, 14, H - 60)

      // Spawn photons proportional to intensity
      if (frame % Math.max(1, 7 - Math.round(intens / 2)) === 0) {
        for (let i = 0; i < Math.ceil(intens / 3); i++) {
          photons.push({ x: W, y: 40 + Math.random() * (H - 80), hit: false })
        }
      }

      // Photons travel right→left toward the plate
      for (let i = photons.length - 1; i >= 0; i--) {
        const p = photons[i]
        p.x -= 5
        // draw as a short wavy streak
        ctx.beginPath()
        for (let s = 0; s < 18; s++) {
          const px = p.x + s
          const py = p.y + Math.sin((px + frame) * 0.5) * 3
          s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
        }
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.stroke()

        if (p.x <= plateX) {
          if (emit) {
            const speed = 1.5 + energy * 1.1
            electrons.push({
              x: plateX,
              y: p.y,
              vx: -(speed),
              vy: (Math.random() - 0.5) * 1.2,
              ke: energy,
            })
            count++
            setEjected(count)
          }
          photons.splice(i, 1)
        }
      }

      // Electrons fly off to the left if ejected
      for (let i = electrons.length - 1; i >= 0; i--) {
        const e = electrons[i]
        e.x += e.vx
        e.y += e.vy
        ctx.beginPath()
        ctx.arc(e.x, e.y, 3, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(110,231,224,0.9)'
        ctx.shadowColor = 'rgba(56,198,232,0.7)'
        ctx.shadowBlur = 8
        ctx.fill()
        ctx.shadowBlur = 0
        if (e.x < -10 || e.y < 0 || e.y > H) electrons.splice(i, 1)
      }

      // Status text
      ctx.font = '11px monospace'
      ctx.fillStyle = emit ? 'rgba(110,231,224,0.9)' : 'rgba(247,65,108,0.9)'
      ctx.fillText(
        emit ? `electrons ejected · KE = ${energy.toFixed(1)} eV` : 'below threshold — no emission',
        12,
        20
      )
      ctx.fillStyle = 'rgba(192,152,255,0.7)'
      ctx.fillText('metal', plateX - 14, H - 36)

      frame++
      animRef.current = requestAnimationFrame(render)
    }
    ctx.fillStyle = '#060414'
    ctx.fillRect(0, 0, W, H)
    render()
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="w-full rounded-lg" style={{ background: '#060414' }} />

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Frequency (×10¹⁴ Hz)</span>
            <span className="font-mono" style={{ color: freqColor(freq) }}>{freq.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={3}
            max={11}
            step={0.1}
            value={freq}
            onChange={(e) => setFreq(Number(e.target.value))}
            className="w-full accent-quantum-500 h-1"
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Intensity (brightness)</span>
            <span className="font-mono text-quantum-400">{intensity}</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="w-full accent-quantum-500 h-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center text-xs font-mono">
        <div className="rounded-lg border border-white/10 py-2">
          <div className="text-slate-500">threshold f₀</div>
          <div className="text-slate-300 text-sm">{threshold.toFixed(1)}</div>
        </div>
        <div className={`rounded-lg border py-2 ${emits ? 'border-wave-500/30 bg-wave-500/5' : 'border-particle-500/40 bg-particle-500/10'}`}>
          <div className="text-slate-500">KE = h(f − f₀)</div>
          <div className={emits ? 'text-wave-400 text-sm' : 'text-particle-400 text-sm'}>
            {ke.toFixed(1)} eV
          </div>
        </div>
        <div className="rounded-lg border border-white/10 py-2">
          <div className="text-slate-500">ejected</div>
          <div className="text-quantum-400 text-sm">{ejected}</div>
        </div>
      </div>
      <p className="text-xs text-slate-600">
        Cranking intensity below the threshold still ejects nothing — only raising the frequency
        past f₀ frees electrons, and only frequency sets their energy.
      </p>
    </div>
  )
}

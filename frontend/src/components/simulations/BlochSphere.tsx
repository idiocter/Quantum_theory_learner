'use client'
import { useRef, useEffect, useState } from 'react'

type Vec = { x: number; y: number; z: number }

// Single-qubit Bloch sphere: a pure state is a point on the unit sphere, and
// quantum gates rotate that point. Auto-spins the viewpoint for depth.
export default function BlochSphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const vecRef = useRef<Vec>({ x: 0, y: 0, z: 1 }) // start at |0⟩ (north pole)

  const [vec, setVec] = useState<Vec>({ x: 0, y: 0, z: 1 })

  useEffect(() => {
    vecRef.current = vec
  }, [vec])

  const p0 = (1 + vec.z) / 2
  const p1 = 1 - p0

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    canvas.width = canvas.parentElement?.clientWidth ?? 700
    canvas.height = 340
    const W = canvas.width
    const H = canvas.height
    const cx = W / 2
    const cy = H / 2
    const R = Math.min(W, H) * 0.4
    let spin = 0
    const tilt = 0.42 // fixed x-axis tilt for a 3D look

    // Project a 3D point (sphere coords) to 2D with viewpoint spin + tilt.
    const project = (p: Vec) => {
      // rotate about z (azimuth spin)
      const x1 = p.x * Math.cos(spin) - p.y * Math.sin(spin)
      const y1 = p.x * Math.sin(spin) + p.y * Math.cos(spin)
      const z1 = p.z
      // tilt about x
      const y2 = y1 * Math.cos(tilt) - z1 * Math.sin(tilt)
      const z2 = y1 * Math.sin(tilt) + z1 * Math.cos(tilt)
      return { sx: cx + x1 * R, sy: cy - z2 * R, depth: y2 }
    }

    const ellipse = (axis: 'eq' | 'mer', color: string) => {
      ctx.beginPath()
      for (let a = 0; a <= 360; a += 4) {
        const r = (a * Math.PI) / 180
        const p: Vec =
          axis === 'eq'
            ? { x: Math.cos(r), y: Math.sin(r), z: 0 }
            : { x: Math.cos(r), y: 0, z: Math.sin(r) }
        const { sx, sy } = project(p)
        a === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy)
      }
      ctx.closePath()
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.stroke()
    }

    const render = () => {
      ctx.fillStyle = '#060414'
      ctx.fillRect(0, 0, W, H)

      // Sphere outline
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(162,89,255,0.18)'
      ctx.lineWidth = 1
      ctx.stroke()

      ellipse('eq', 'rgba(56,198,232,0.2)')
      ellipse('mer', 'rgba(255,94,196,0.15)')

      // Axes |0⟩ (z+), |1⟩ (z−), x, y
      const axisEnds: [Vec, string][] = [
        [{ x: 0, y: 0, z: 1.15 }, 'rgba(56,198,232,0.7)'],
        [{ x: 0, y: 0, z: -1.15 }, 'rgba(255,94,196,0.7)'],
        [{ x: 1.15, y: 0, z: 0 }, 'rgba(148,163,184,0.4)'],
        [{ x: 0, y: 1.15, z: 0 }, 'rgba(148,163,184,0.4)'],
      ]
      const origin = project({ x: 0, y: 0, z: 0 })
      for (const [end, color] of axisEnds) {
        const e = project(end)
        ctx.beginPath()
        ctx.moveTo(origin.sx, origin.sy)
        ctx.lineTo(e.sx, e.sy)
        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.stroke()
      }
      const zUp = project({ x: 0, y: 0, z: 1.3 })
      const zDn = project({ x: 0, y: 0, z: -1.3 })
      ctx.font = '11px monospace'
      ctx.fillStyle = 'rgba(56,198,232,0.9)'
      ctx.fillText('|0⟩', zUp.sx - 8, zUp.sy)
      ctx.fillStyle = 'rgba(255,94,196,0.9)'
      ctx.fillText('|1⟩', zDn.sx - 8, zDn.sy + 12)

      // State vector
      const v = vecRef.current
      const tip = project(v)
      ctx.beginPath()
      ctx.moveTo(origin.sx, origin.sy)
      ctx.lineTo(tip.sx, tip.sy)
      ctx.strokeStyle = '#a259ff'
      ctx.lineWidth = 2.5
      ctx.shadowColor = 'rgba(162,89,255,0.6)'
      ctx.shadowBlur = 12
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.beginPath()
      ctx.arc(tip.sx, tip.sy, 5, 0, Math.PI * 2)
      ctx.fillStyle = '#c098ff'
      ctx.fill()

      spin += 0.006
      animRef.current = requestAnimationFrame(render)
    }
    render()
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  const setAngles = (theta: number, phi: number) => {
    const t = (theta * Math.PI) / 180
    const f = (phi * Math.PI) / 180
    setVec({ x: Math.sin(t) * Math.cos(f), y: Math.sin(t) * Math.sin(f), z: Math.cos(t) })
  }

  // Gates rotate the Bloch vector by π about their axis.
  const gate = (g: 'X' | 'Y' | 'Z' | 'H') => {
    setVec((v) => {
      switch (g) {
        case 'X':
          return { x: v.x, y: -v.y, z: -v.z }
        case 'Y':
          return { x: -v.x, y: v.y, z: -v.z }
        case 'Z':
          return { x: -v.x, y: -v.y, z: v.z }
        case 'H':
          return { x: v.z, y: -v.y, z: v.x }
      }
    })
  }

  const theta = (Math.acos(Math.max(-1, Math.min(1, vec.z))) * 180) / Math.PI
  const phi = ((Math.atan2(vec.y, vec.x) * 180) / Math.PI + 360) % 360

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="w-full rounded-lg" style={{ background: '#060414' }} />

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Polar θ</span>
            <span className="font-mono text-quantum-400">{theta.toFixed(0)}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={180}
            value={theta}
            onChange={(e) => setAngles(Number(e.target.value), phi)}
            className="w-full accent-quantum-500 h-1"
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Azimuth φ</span>
            <span className="font-mono text-quantum-400">{phi.toFixed(0)}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            value={phi}
            onChange={(e) => setAngles(theta, Number(e.target.value))}
            className="w-full accent-quantum-500 h-1"
          />
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <span className="text-xs font-mono text-slate-500">
          P(0) = <span className="text-wave-400">{(p0 * 100).toFixed(0)}%</span> · P(1) ={' '}
          <span className="text-plasma-400">{(p1 * 100).toFixed(0)}%</span>
        </span>
        <div className="flex gap-2">
          {(['X', 'Y', 'Z', 'H'] as const).map((g) => (
            <button
              key={g}
              onClick={() => gate(g)}
              className="w-9 h-9 rounded-lg border border-quantum-500/30 text-quantum-300 hover:border-quantum-500/60 hover:bg-quantum-500/10 text-sm font-mono transition-all"
            >
              {g}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

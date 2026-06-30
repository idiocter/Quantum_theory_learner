'use client'
import { useCanvasVisible } from '@/lib/hooks/useCanvasVisible'
import { useRef, useEffect, useState, useCallback } from 'react'

// ── Lesson-focused Bloch sphere (registry key: bloch_sphere) ─────────────────
// A pure single-qubit state is
//     |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩
// which maps to the Bloch vector
//     (x, y, z) = (sin θ cos φ, sin θ sin φ, cos θ).
// Drag on the sphere (or use the keyboard-operable sliders / preset buttons) to
// set (θ, φ); the readouts show the exact complex amplitudes, the Born-rule
// probabilities P(0)=cos²(θ/2), P(1)=sin²(θ/2), and the Bloch coordinates.
// All numbers are computed from θ, φ — nothing here is faked.

const DEG = 180 / Math.PI
const RAD = Math.PI / 180
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

type Vec = { x: number; y: number; z: number }

// The six cardinal eigenstates and where they sit on the sphere.
const MARKERS: { label: string; vec: Vec; color: string }[] = [
  { label: '|0⟩', vec: { x: 0, y: 0, z: 1 }, color: 'rgba(56,198,232,0.95)' },
  { label: '|1⟩', vec: { x: 0, y: 0, z: -1 }, color: 'rgba(255,94,196,0.95)' },
  { label: '|+⟩', vec: { x: 1, y: 0, z: 0 }, color: 'rgba(192,152,255,0.9)' },
  { label: '|−⟩', vec: { x: -1, y: 0, z: 0 }, color: 'rgba(192,152,255,0.9)' },
  { label: '|i⟩', vec: { x: 0, y: 1, z: 0 }, color: 'rgba(110,231,224,0.9)' },
  { label: '|−i⟩', vec: { x: 0, y: -1, z: 0 }, color: 'rgba(110,231,224,0.9)' },
]

// Quick-set presets (θ, φ in degrees).
const PRESETS: { label: string; theta: number; phi: number }[] = [
  { label: '|0⟩', theta: 0, phi: 0 },
  { label: '|1⟩', theta: 180, phi: 0 },
  { label: '|+⟩', theta: 90, phi: 0 },
  { label: '|−⟩', theta: 90, phi: 180 },
  { label: '|i⟩', theta: 90, phi: 90 },
  { label: '|−i⟩', theta: 90, phi: 270 },
]

const HEIGHT = 340

export default function BlochSphereQC() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const visibleRef = useCanvasVisible(canvasRef)
  const animRef = useRef<number>(0)

  // The qubit state, stored as the Bloch angles (degrees).
  const [theta, setTheta] = useState(45) // polar, 0..180
  const [phi, setPhi] = useState(60) // azimuth, 0..360

  const angRef = useRef({ theta, phi })
  angRef.current = { theta, phi }

  const dragRef = useRef<{ active: boolean; x: number; y: number } | null>(null)

  // Exact amplitudes / probabilities derived from (θ, φ).
  const tr = theta * RAD
  const a = Math.cos(tr / 2) // α is real & ≥ 0 (global phase fixed)
  const s = Math.sin(tr / 2)
  const bRe = s * Math.cos(phi * RAD) // β = e^{iφ} sin(θ/2)
  const bIm = s * Math.sin(phi * RAD)
  const p0 = a * a
  const p1 = s * s
  // Bloch coordinates.
  const bx = Math.sin(tr) * Math.cos(phi * RAD)
  const by = Math.sin(tr) * Math.sin(phi * RAD)
  const bz = Math.cos(tr)

  // ── Drag: horizontal → φ, vertical → θ (incremental, robust to viewpoint) ──
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { active: true, x: e.clientX, y: e.clientY }
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current
    if (!d?.active) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    d.x = e.clientX
    d.y = e.clientY
    setPhi((p) => (((p + dx * 0.7) % 360) + 360) % 360)
    setTheta((t) => clamp(t + dy * 0.7, 0, 180))
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current) dragRef.current.active = false
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* noop */ }
  }, [])

  // ── Canvas render loop ──
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    let W = 0
    let R = 0
    let cx = 0
    const cy = HEIGHT / 2

    const resize = () => {
      W = canvas.parentElement?.clientWidth ?? 700
      R = Math.min(W, HEIGHT) * 0.38
      cx = W / 2
      canvas.width = Math.floor(W * dpr)
      canvas.height = Math.floor(HEIGHT * dpr)
      canvas.style.width = '100%'
      canvas.style.height = `${HEIGHT}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    let spin = -0.6
    const tilt = 0.42

    const project = (p: Vec) => {
      const x1 = p.x * Math.cos(spin) - p.y * Math.sin(spin)
      const y1 = p.x * Math.sin(spin) + p.y * Math.cos(spin)
      const z1 = p.z
      const y2 = y1 * Math.cos(tilt) - z1 * Math.sin(tilt)
      const z2 = y1 * Math.sin(tilt) + z1 * Math.cos(tilt)
      return { sx: cx + x1 * R, sy: cy - z2 * R, depth: y2 }
    }

    const ellipse = (axis: 'eq' | 'mer', color: string) => {
      ctx.beginPath()
      for (let deg = 0; deg <= 360; deg += 4) {
        const r = deg * RAD
        const p: Vec =
          axis === 'eq'
            ? { x: Math.cos(r), y: Math.sin(r), z: 0 }
            : { x: Math.cos(r), y: 0, z: Math.sin(r) }
        const { sx, sy } = project(p)
        deg === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy)
      }
      ctx.closePath()
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.stroke()
    }

    const render = () => {
      animRef.current = requestAnimationFrame(render)
      if (!visibleRef.current) return

      ctx.fillStyle = '#060414'
      ctx.fillRect(0, 0, W, HEIGHT)

      // Sphere outline.
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(162,89,255,0.18)'
      ctx.lineWidth = 1
      ctx.stroke()

      ellipse('eq', 'rgba(56,198,232,0.16)')
      ellipse('mer', 'rgba(255,94,196,0.12)')

      const origin = project({ x: 0, y: 0, z: 0 })

      // Axes.
      const axes: [Vec, string][] = [
        [{ x: 1.18, y: 0, z: 0 }, 'rgba(148,163,184,0.35)'],
        [{ x: 0, y: 1.18, z: 0 }, 'rgba(148,163,184,0.35)'],
        [{ x: 0, y: 0, z: 1.18 }, 'rgba(148,163,184,0.35)'],
        [{ x: 0, y: 0, z: -1.18 }, 'rgba(148,163,184,0.35)'],
      ]
      for (const [end, color] of axes) {
        const e = project(end)
        ctx.beginPath()
        ctx.moveTo(origin.sx, origin.sy)
        ctx.lineTo(e.sx, e.sy)
        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Cardinal-state markers (depth-sorted so far ones draw first).
      ctx.font = '11px monospace'
      const sorted = [...MARKERS].sort((m1, m2) => project(m1.vec).depth - project(m2.vec).depth)
      for (const m of sorted) {
        const pr = project({ x: m.vec.x * 1.0, y: m.vec.y * 1.0, z: m.vec.z * 1.0 })
        const near = pr.depth >= 0
        ctx.beginPath()
        ctx.arc(pr.sx, pr.sy, 3, 0, Math.PI * 2)
        ctx.fillStyle = m.color
        ctx.globalAlpha = near ? 1 : 0.4
        ctx.fill()
        const lp = project({ x: m.vec.x * 1.22, y: m.vec.y * 1.22, z: m.vec.z * 1.22 })
        ctx.fillStyle = m.color
        ctx.fillText(m.label, lp.sx - 8, lp.sy + 4)
        ctx.globalAlpha = 1
      }

      // The live state vector.
      const { theta: th, phi: ph } = angRef.current
      const t = th * RAD
      const f = ph * RAD
      const v: Vec = {
        x: Math.sin(t) * Math.cos(f),
        y: Math.sin(t) * Math.sin(f),
        z: Math.cos(t),
      }
      const tip = project(v)
      ctx.beginPath()
      ctx.moveTo(origin.sx, origin.sy)
      ctx.lineTo(tip.sx, tip.sy)
      ctx.strokeStyle = '#a259ff'
      ctx.lineWidth = 2.6
      ctx.shadowColor = 'rgba(162,89,255,0.6)'
      ctx.shadowBlur = 12
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.beginPath()
      ctx.arc(tip.sx, tip.sy, 5.5, 0, Math.PI * 2)
      ctx.fillStyle = '#c098ff'
      ctx.fill()

      // Slow auto-spin for depth (cosmetic only; state is unchanged).
      spin += 0.004
    }
    render()

    return () => {
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
    }
  }, [visibleRef])

  const fmt = (n: number) => (Math.abs(n) < 5e-4 ? '0.000' : n.toFixed(3))
  const phaseDeg = ((phi % 360) + 360) % 360

  return (
    <div className="space-y-4">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Bloch sphere showing a qubit state at polar angle theta ${theta.toFixed(0)} degrees and azimuth phi ${phaseDeg.toFixed(0)} degrees. Probability of measuring 0 is ${(p0 * 100).toFixed(0)} percent.`}
        className="w-full rounded-lg block touch-none cursor-grab active:cursor-grabbing"
        style={{ background: '#060414' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      <p className="text-[10px] text-slate-600 text-center -mt-2">
        drag the sphere to rotate the state vector, or use the sliders / preset buttons below
      </p>

      {/* Sliders (keyboard-operable). */}
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
            step={1}
            value={theta}
            aria-label="Polar angle theta in degrees"
            onChange={(e) => setTheta(Number(e.target.value))}
            className="w-full accent-quantum-500 h-1"
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Azimuth φ</span>
            <span className="font-mono text-quantum-400">{phaseDeg.toFixed(0)}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={phaseDeg}
            aria-label="Azimuthal angle phi in degrees"
            onChange={(e) => setPhi(Number(e.target.value))}
            className="w-full accent-quantum-500 h-1"
          />
        </div>
      </div>

      {/* Presets. */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mr-1">Set</span>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => { setTheta(p.theta); setPhi(p.phi) }}
            className="px-2.5 py-1 rounded font-mono text-xs border border-white/10 text-slate-300 hover:border-quantum-500/60 hover:text-quantum-200 transition-all"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Live readouts. */}
      <div className="grid sm:grid-cols-2 gap-3 text-xs font-mono">
        <div className="rounded-lg border border-white/5 bg-void-900/40 p-3 space-y-1.5">
          <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">Amplitudes</div>
          <div className="flex justify-between">
            <span className="text-wave-400">α = ⟨0|ψ⟩</span>
            <span className="text-slate-300 tabular-nums">{fmt(a)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-plasma-400">β = ⟨1|ψ⟩</span>
            <span className="text-slate-300 tabular-nums">
              {fmt(bRe)}{bIm >= 0 ? ' + ' : ' − '}{fmt(Math.abs(bIm))}i
            </span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>|β| · e^{'{iφ}'}</span>
            <span className="tabular-nums">{fmt(s)} · e^(i{phaseDeg.toFixed(0)}°)</span>
          </div>
        </div>
        <div className="rounded-lg border border-white/5 bg-void-900/40 p-3 space-y-1.5">
          <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">
            Probabilities (Born rule)
          </div>
          <div className="flex justify-between">
            <span className="text-wave-400">P(0) = cos²(θ/2)</span>
            <span className="text-slate-300 tabular-nums">{(p0 * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-plasma-400">P(1) = sin²(θ/2)</span>
            <span className="text-slate-300 tabular-nums">{(p1 * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Bloch (x, y, z)</span>
            <span className="tabular-nums">({fmt(bx)}, {fmt(by)}, {fmt(bz)})</span>
          </div>
        </div>
      </div>
    </div>
  )
}

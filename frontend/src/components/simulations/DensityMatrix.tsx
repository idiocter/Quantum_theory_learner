'use client'
import { useCanvasVisible } from '@/lib/hooks/useCanvasVisible'
import { useEffect, useMemo, useRef, useState } from 'react'
import { basisState, applyMat1, applyCNOT, GATE, blochVector } from './qcEngine'

// ── density_matrix ───────────────────────────────────────────────────────────
// A classical (probabilistic) mixture of two pure qubit states A, B with weight
// p: ρ = p|A⟩⟨A| + (1−p)|B⟩⟨B|. Bloch vectors add linearly, so r = p·r_A +
// (1−p)·r_B lies on the chord between the two surface points — inside the ball
// for any genuine mix. Readouts: ρ (2×2), purity Tr(ρ²) = ½(1+|r|²), and |r|.
// The partial-trace panel takes the |Φ+⟩ Bell state and traces out one qubit,
// giving the maximally mixed I/2 (r = 0, purity ½) — computed from the engine.

const RAD = Math.PI / 180
const HEIGHT = 300

type Bloch = { x: number; y: number; z: number }
const blochFromAngles = (thetaDeg: number, phiDeg: number): Bloch => ({
  x: Math.sin(thetaDeg * RAD) * Math.cos(phiDeg * RAD),
  y: Math.sin(thetaDeg * RAD) * Math.sin(phiDeg * RAD),
  z: Math.cos(thetaDeg * RAD),
})

function AngleSliders({ label, theta, phi, setTheta, setPhi, accent }: {
  label: string; theta: number; phi: number
  setTheta: (n: number) => void; setPhi: (n: number) => void; accent: string
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-void-900/40 p-3 space-y-2">
      <div className={`text-[10px] uppercase tracking-widest font-mono ${accent}`}>{label}</div>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[11px] text-slate-500"><span>θ</span><span className="font-mono">{theta}°</span></div>
        <input type="range" min={0} max={180} value={theta} aria-label={`${label} polar angle theta`}
          onChange={(e) => setTheta(Number(e.target.value))} className="w-full accent-quantum-500 h-1" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[11px] text-slate-500"><span>φ</span><span className="font-mono">{phi}°</span></div>
        <input type="range" min={0} max={360} value={phi} aria-label={`${label} azimuth phi`}
          onChange={(e) => setPhi(Number(e.target.value))} className="w-full accent-quantum-500 h-1" />
      </div>
    </div>
  )
}

export default function DensityMatrix() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const visibleRef = useCanvasVisible(canvasRef)
  const animRef = useRef(0)

  const [thA, setThA] = useState(0)
  const [phA, setPhA] = useState(0)
  const [thB, setThB] = useState(180)
  const [phB, setPhB] = useState(0)
  const [p, setP] = useState(50) // percent weight on A

  const rA = useMemo(() => blochFromAngles(thA, phA), [thA, phA])
  const rB = useMemo(() => blochFromAngles(thB, phB), [thB, phB])
  const w = p / 100
  const r: Bloch = { x: w * rA.x + (1 - w) * rB.x, y: w * rA.y + (1 - w) * rB.y, z: w * rA.z + (1 - w) * rB.z }
  const rMag = Math.hypot(r.x, r.y, r.z)
  const purity = 0.5 * (1 + rMag * rMag)

  // ρ = ½(I + r·σ)
  const rho = {
    r00: 0.5 * (1 + r.z), i00: 0,
    r01: 0.5 * r.x, i01: -0.5 * r.y,
    r10: 0.5 * r.x, i10: 0.5 * r.y,
    r11: 0.5 * (1 - r.z), i11: 0,
  }

  // Partial trace of |Φ+⟩ — computed from the engine, must be maximally mixed.
  const bellReduced = useMemo(() => {
    const s = basisState(2, 0)
    applyMat1(s, 0, GATE.H())
    applyCNOT(s, 0, 1)
    return blochVector(s, 0) // expect (0,0,0), r ≈ 0
  }, [])

  const drawRef = useRef({ rA, rB, r })
  drawRef.current = { rA, rB, r }

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let W = 0, R = 0, cx = 0
    const cy = HEIGHT / 2
    const resize = () => {
      W = canvas.parentElement?.clientWidth ?? 500
      R = Math.min(W, HEIGHT) * 0.38
      cx = W / 2
      canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(HEIGHT * dpr)
      canvas.style.width = '100%'; canvas.style.height = `${HEIGHT}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    let spin = -0.6
    const tilt = 0.42
    const project = (pt: Bloch) => {
      const x1 = pt.x * Math.cos(spin) - pt.y * Math.sin(spin)
      const y1 = pt.x * Math.sin(spin) + pt.y * Math.cos(spin)
      return { sx: cx + x1 * R, sy: cy - (y1 * Math.sin(tilt) + pt.z * Math.cos(tilt)) * R }
    }
    const ring = (axis: 'eq' | 'mer', color: string) => {
      ctx.beginPath()
      for (let d = 0; d <= 360; d += 5) {
        const a = d * RAD
        const pt: Bloch = axis === 'eq' ? { x: Math.cos(a), y: Math.sin(a), z: 0 } : { x: Math.cos(a), y: 0, z: Math.sin(a) }
        const { sx, sy } = project(pt); d === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy)
      }
      ctx.closePath(); ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke()
    }
    const render = () => {
      animRef.current = requestAnimationFrame(render)
      if (!visibleRef.current) return
      ctx.fillStyle = '#060414'; ctx.fillRect(0, 0, W, HEIGHT)
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(162,89,255,0.18)'; ctx.lineWidth = 1; ctx.stroke()
      ring('eq', 'rgba(56,198,232,0.16)'); ring('mer', 'rgba(255,94,196,0.12)')
      const o = project({ x: 0, y: 0, z: 0 })
      const { rA: a, rB: b, r: m } = drawRef.current
      const pa = project(a), pb = project(b), pm = project(m)
      // chord A—B
      ctx.beginPath(); ctx.moveTo(pa.sx, pa.sy); ctx.lineTo(pb.sx, pb.sy)
      ctx.strokeStyle = 'rgba(110,231,224,0.4)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([])
      // endpoints
      for (const [pt, col, lbl] of [[pa, '#38c6e8', 'A'], [pb, '#ff5ec4', 'B']] as [{ sx: number; sy: number }, string, string][]) {
        ctx.beginPath(); ctx.arc(pt.sx, pt.sy, 4, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill()
        ctx.fillStyle = col; ctx.font = '11px monospace'; ctx.fillText(lbl, pt.sx + 6, pt.sy - 4)
      }
      // mixture point + radius from origin
      ctx.beginPath(); ctx.moveTo(o.sx, o.sy); ctx.lineTo(pm.sx, pm.sy)
      ctx.strokeStyle = '#a259ff'; ctx.lineWidth = 2; ctx.stroke()
      ctx.beginPath(); ctx.arc(pm.sx, pm.sy, 6, 0, Math.PI * 2)
      ctx.fillStyle = '#c098ff'; ctx.shadowColor = 'rgba(162,89,255,0.6)'; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0
      spin += 0.004
    }
    render()
    return () => { cancelAnimationFrame(animRef.current); ro.disconnect() }
  }, [visibleRef])

  const fmt = (n: number) => (Math.abs(n) < 5e-4 ? '0.000' : n.toFixed(3))
  const cx = (re: number, im: number) =>
    Math.abs(im) < 5e-4 ? fmt(re) : `${fmt(re)}${im < 0 ? '−' : '+'}${fmt(Math.abs(im))}i`

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4 items-start">
        <div>
          <canvas ref={canvasRef} role="img"
            aria-label={`Bloch ball with mixture point at radius ${rMag.toFixed(2)}. Purity ${purity.toFixed(2)}.`}
            className="w-full rounded-lg block" style={{ background: '#060414' }} />
          <p className="text-[10px] text-slate-600 text-center mt-1">
            violet = mixed state ρ · the mixture lies on the A—B chord, inside the ball
          </p>
        </div>
        <div className="space-y-3">
          <AngleSliders label="Pure state A" theta={thA} phi={phA} setTheta={setThA} setPhi={setPhA} accent="text-wave-400" />
          <AngleSliders label="Pure state B" theta={thB} phi={phB} setTheta={setThB} setPhi={setPhB} accent="text-plasma-400" />
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Mix weight p (on A)</span><span className="font-mono text-quantum-400">{p}% A / {100 - p}% B</span>
            </div>
            <input type="range" min={0} max={100} value={p} aria-label="Mixture weight on state A"
              onChange={(e) => setP(Number(e.target.value))} className="w-full accent-quantum-500 h-1" />
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {/* ρ matrix */}
        <div className="rounded-lg border border-white/5 bg-void-900/40 p-3">
          <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-2 font-mono">Density matrix ρ</div>
          <div className="inline-grid grid-cols-2 gap-x-5 gap-y-1 font-mono text-[11px] text-slate-300 tabular-nums">
            <span className="text-right">{cx(rho.r00, rho.i00)}</span><span className="text-right">{cx(rho.r01, rho.i01)}</span>
            <span className="text-right">{cx(rho.r10, rho.i10)}</span><span className="text-right">{cx(rho.r11, rho.i11)}</span>
          </div>
        </div>
        {/* purity / |r| */}
        <div className="rounded-lg border border-white/5 bg-void-900/40 p-3 space-y-1.5 font-mono text-xs">
          <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">State character</div>
          <div className="flex justify-between text-slate-400"><span>Tr(ρ²) purity</span><span className="text-quantum-300 tabular-nums">{purity.toFixed(3)}</span></div>
          <div className="flex justify-between text-slate-400"><span>|r| (Bloch radius)</span><span className="text-quantum-300 tabular-nums">{rMag.toFixed(3)}</span></div>
          <div className="flex justify-between text-slate-500">
            <span>classification</span>
            <span className={rMag > 1 - 1e-3 ? 'text-wave-400' : 'text-plasma-300'}>
              {rMag > 1 - 1e-3 ? 'pure (on surface)' : rMag < 1e-3 ? 'maximally mixed' : 'mixed (inside)'}
            </span>
          </div>
        </div>
      </div>

      {/* partial trace panel */}
      <div className="rounded-lg border border-white/5 bg-void-900/40 p-3 text-xs font-mono flex flex-wrap items-center gap-x-6 gap-y-1">
        <span className="text-[10px] text-slate-600 uppercase tracking-widest w-full">
          Partial trace: |Φ⁺⟩ = (|00⟩+|11⟩)/√2, trace out q1
        </span>
        <span className="text-slate-400">ρ₀ Bloch |r| = <span className="text-quantum-300">{bellReduced.r.toFixed(3)}</span></span>
        <span className="text-slate-400">Tr(ρ₀²) = <span className="text-quantum-300">{(0.5 * (1 + bellReduced.r * bellReduced.r)).toFixed(3)}</span></span>
        <span className="text-plasma-300">→ reduced state is I/2, maximally mixed (the hallmark of entanglement)</span>
      </div>
    </div>
  )
}

'use client'
import { useCanvasVisible } from '@/lib/hooks/useCanvasVisible'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  GATE, applyMat1, blochVector, fmtComplex, zeroState, cloneState, type State, type Mat1,
} from './qcEngine'

// ── single_qubit_gate ────────────────────────────────────────────────────────
// Apply X/Y/Z/H/S/T and R_x/R_y/R_z(θ) to one qubit. The 2×2 matrix, the exact
// output amplitudes and the Bloch vector are all computed from the statevector
// (qcEngine). Verified: H|0⟩ = (|0⟩+|1⟩)/√2 → Bloch (1,0,0); Z on |+⟩ → |−⟩
// → (−1,0,0); Rx(π)|0⟩ = −i|1⟩ → (0,0,−1).

const FIXED = ['X', 'Y', 'Z', 'H', 'S', 'T'] as const
const ROT = ['Rx', 'Ry', 'Rz'] as const
type FixedKey = (typeof FIXED)[number]
type RotKey = (typeof ROT)[number]

const HEIGHT = 260
const DEG = 180 / Math.PI

function gateMatrix(key: FixedKey | RotKey, theta: number): number[] {
  switch (key) {
    case 'X': return GATE.X()
    case 'Y': return GATE.Y()
    case 'Z': return GATE.Z()
    case 'H': return GATE.H()
    case 'S': return GATE.S()
    case 'T': return GATE.T()
    case 'Rx': return GATE.Rx(theta)
    case 'Ry': return GATE.Ry(theta)
    case 'Rz': return GATE.Rz(theta)
  }
}

function MatrixView({ m }: { m: number[] }) {
  const cell = (r: number, i: number) => fmtComplex(m[r], m[i])
  return (
    <div className="inline-grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-white/5 bg-void-900/40 p-3 font-mono text-[11px] text-slate-300 tabular-nums">
      <span className="text-right">{cell(0, 1)}</span>
      <span className="text-right">{cell(2, 3)}</span>
      <span className="text-right">{cell(4, 5)}</span>
      <span className="text-right">{cell(6, 7)}</span>
    </div>
  )
}

export default function SingleQubitGate() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const visibleRef = useCanvasVisible(canvasRef)
  const animRef = useRef(0)

  const [tool, setTool] = useState<FixedKey | RotKey>('H')
  const [theta, setTheta] = useState(90) // degrees for rotation gates
  const [history, setHistory] = useState<{ label: string; g: Mat1 }[]>([])

  const isRot = (ROT as readonly string[]).includes(tool)
  const thetaRad = theta * (Math.PI / 180)
  const previewMat = useMemo(() => gateMatrix(tool, thetaRad), [tool, thetaRad])

  // Current state = |0⟩ with the applied history folded in.
  const state = useMemo(() => {
    const s = zeroState(1)
    for (const h of history) applyMat1(s, 0, h.g)
    return s
  }, [history])

  // The previous state (before the last gate) for the "Bloch move" arc.
  const prevState = useMemo(() => {
    const s = zeroState(1)
    for (let k = 0; k < history.length - 1; k++) applyMat1(s, 0, history[k].g)
    return s
  }, [history])

  const bloch = blochVector(state, 0)
  const prevBloch = blochVector(prevState, 0)
  const a0 = { re: state.re[0], im: state.im[0] }
  const a1 = { re: state.re[1], im: state.im[1] }
  const p0 = a0.re * a0.re + a0.im * a0.im
  const p1 = a1.re * a1.re + a1.im * a1.im

  const stateRef = useRef<{ b: typeof bloch; pb: typeof prevBloch }>({ b: bloch, pb: prevBloch })
  stateRef.current = { b: bloch, pb: prevBloch }

  const apply = () => {
    const label = isRot ? `${tool}(${theta}°)` : tool
    setHistory((h) => [...h, { label, g: gateMatrix(tool, thetaRad) }])
  }
  const reset = () => setHistory([])
  const undo = () => setHistory((h) => h.slice(0, -1))

  // ── Bloch canvas ──
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let W = 0, R = 0, cx = 0
    const cy = HEIGHT / 2
    const resize = () => {
      W = canvas.parentElement?.clientWidth ?? 600
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
    type V = { x: number; y: number; z: number }
    const project = (p: V) => {
      const x1 = p.x * Math.cos(spin) - p.y * Math.sin(spin)
      const y1 = p.x * Math.sin(spin) + p.y * Math.cos(spin)
      const y2 = y1 * Math.cos(tilt) - p.z * Math.sin(tilt)
      return { sx: cx + x1 * R, sy: cy - (y1 * Math.sin(tilt) + p.z * Math.cos(tilt)) * R, depth: y2 }
    }
    const ring = (axis: 'eq' | 'mer', color: string) => {
      ctx.beginPath()
      for (let d = 0; d <= 360; d += 5) {
        const r = d * (Math.PI / 180)
        const p: V = axis === 'eq'
          ? { x: Math.cos(r), y: Math.sin(r), z: 0 }
          : { x: Math.cos(r), y: 0, z: Math.sin(r) }
        const { sx, sy } = project(p)
        d === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy)
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
      for (const [end, lbl] of [
        [{ x: 0, y: 0, z: 1.2 }, '|0⟩'], [{ x: 0, y: 0, z: -1.2 }, '|1⟩'],
        [{ x: 1.2, y: 0, z: 0 }, '|+⟩'], [{ x: 0, y: 1.2, z: 0 }, 'i'],
      ] as [V, string][]) {
        const e = project(end)
        ctx.beginPath(); ctx.moveTo(o.sx, o.sy); ctx.lineTo(e.sx, e.sy)
        ctx.strokeStyle = 'rgba(148,163,184,0.3)'; ctx.lineWidth = 1; ctx.stroke()
        ctx.fillStyle = 'rgba(148,163,184,0.6)'; ctx.font = '10px monospace'
        ctx.fillText(lbl, e.sx - 6, e.sy - 3)
      }
      const { b, pb } = stateRef.current
      // Previous vector (faint).
      if (pb.r > 1e-3) {
        const t0 = project(pb)
        ctx.beginPath(); ctx.moveTo(o.sx, o.sy); ctx.lineTo(t0.sx, t0.sy)
        ctx.strokeStyle = 'rgba(110,231,224,0.35)'; ctx.lineWidth = 1.5; ctx.stroke()
      }
      // Current vector.
      const t1 = project(b)
      ctx.beginPath(); ctx.moveTo(o.sx, o.sy); ctx.lineTo(t1.sx, t1.sy)
      ctx.strokeStyle = '#a259ff'; ctx.lineWidth = 2.6
      ctx.shadowColor = 'rgba(162,89,255,0.6)'; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0
      ctx.beginPath(); ctx.arc(t1.sx, t1.sy, 5, 0, Math.PI * 2); ctx.fillStyle = '#c098ff'; ctx.fill()
      spin += 0.004
    }
    render()
    return () => { cancelAnimationFrame(animRef.current); ro.disconnect() }
  }, [visibleRef])

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4 items-start">
        <div>
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Bloch sphere. Current qubit Bloch vector is (${bloch.x.toFixed(2)}, ${bloch.y.toFixed(2)}, ${bloch.z.toFixed(2)}). Probability of 0 is ${(p0 * 100).toFixed(0)} percent.`}
            className="w-full rounded-lg block"
            style={{ background: '#060414' }}
          />
          <p className="text-[10px] text-slate-600 text-center mt-1">
            teal = state before last gate · violet = current state
          </p>
        </div>

        <div className="space-y-3">
          {/* Gate palette */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mr-1">Gate</span>
            {FIXED.map((g) => (
              <button key={g} onClick={() => setTool(g)}
                className={`px-2.5 py-1 rounded font-mono text-xs border transition-all ${
                  tool === g ? 'border-quantum-500/60 bg-quantum-500/15 text-quantum-200' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
                {g}
              </button>
            ))}
            {ROT.map((g) => (
              <button key={g} onClick={() => setTool(g)}
                className={`px-2.5 py-1 rounded font-mono text-xs border transition-all ${
                  tool === g ? 'border-wave-500/60 bg-wave-500/15 text-wave-400' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
                {g}
              </button>
            ))}
          </div>

          {isRot && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Angle θ</span><span className="font-mono text-wave-400">{theta}°</span>
              </div>
              <input type="range" min={0} max={360} step={1} value={theta}
                aria-label="Rotation angle theta in degrees"
                onChange={(e) => setTheta(Number(e.target.value))}
                className="w-full accent-wave-500 h-1" />
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Matrix U</span>
            <MatrixView m={previewMat} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={apply}
              className="px-3 py-1.5 rounded-lg border border-plasma-500/30 text-plasma-300 hover:border-plasma-500/60 text-xs font-mono transition-all">
              ▸ Apply {isRot ? `${tool}(${theta}°)` : tool}
            </button>
            <button onClick={undo} disabled={!history.length}
              className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200 disabled:opacity-30 text-xs font-mono transition-all">
              ↶ Undo
            </button>
            <button onClick={reset}
              className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200 text-xs font-mono transition-all">
              ↺ Reset to |0⟩
            </button>
          </div>

          {history.length > 0 && (
            <div className="text-[11px] font-mono text-slate-500">
              |0⟩ → {history.map((h) => h.label).join(' → ')}
            </div>
          )}
        </div>
      </div>

      {/* Amplitude readout */}
      <div className="grid sm:grid-cols-2 gap-3 text-xs font-mono">
        <div className="rounded-lg border border-white/5 bg-void-900/40 p-3 space-y-1.5">
          <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">Amplitudes</div>
          <div className="flex justify-between"><span className="text-wave-400">⟨0|ψ⟩</span>
            <span className="text-slate-300 tabular-nums">{fmtComplex(a0.re, a0.im)}</span></div>
          <div className="flex justify-between"><span className="text-plasma-400">⟨1|ψ⟩</span>
            <span className="text-slate-300 tabular-nums">{fmtComplex(a1.re, a1.im)}</span></div>
        </div>
        <div className="rounded-lg border border-white/5 bg-void-900/40 p-3 space-y-1.5">
          <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">Bloch & Born</div>
          <div className="flex justify-between text-slate-400"><span>P(0), P(1)</span>
            <span className="text-slate-300 tabular-nums">{(p0 * 100).toFixed(1)}% / {(p1 * 100).toFixed(1)}%</span></div>
          <div className="flex justify-between text-slate-400"><span>Bloch (x,y,z)</span>
            <span className="text-slate-300 tabular-nums">({bloch.x.toFixed(2)}, {bloch.y.toFixed(2)}, {bloch.z.toFixed(2)})</span></div>
          <div className="flex justify-between text-slate-500"><span>polar θ</span>
            <span className="tabular-nums">{(Math.acos(Math.max(-1, Math.min(1, bloch.z))) * DEG).toFixed(0)}°</span></div>
        </div>
      </div>
    </div>
  )
}

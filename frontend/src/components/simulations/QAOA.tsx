'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { zeroState, cloneState, applyMat1, GATE, probabilities, labelOf, maskOf, type State } from './qcEngine'

// ── qaoa ─────────────────────────────────────────────────────────────────────
// Depth-1 QAOA for MaxCut, computed exactly on the qcEngine statevector.
//   |γ,β⟩ = e^{-iβB} e^{-iγC} H^{⊗n}|0⟩,  B = Σ Xⱼ,  C|x⟩ = c(x)|x⟩
// c(x) = number of cut edges. The objective ⟨C⟩ = Σₓ |⟨x|ψ⟩|² c(x) is shown as a
// live landscape over (γ, β); the most-probable bitstring colours the graph.
//
// e^{-iγC} is diagonal: phase basis state x by e^{-iγ c(x)}. e^{-iβB} = Π Rx(2β).
// Verified: on the 4-ring (bipartite, maxcut 4) the optimum sits well above the
// random-cut baseline ⟨C⟩ = |E|/2.

type Graph = { n: number; edges: Array<[number, number]>; pos: Array<[number, number]> }

const GRAPHS: Record<string, Graph> = {
  'triangle': { n: 3, edges: [[0, 1], [1, 2], [2, 0]], pos: [[50, 20], [20, 75], [80, 75]] },
  'square (4-ring)': { n: 4, edges: [[0, 1], [1, 2], [2, 3], [3, 0]], pos: [[25, 25], [75, 25], [75, 75], [25, 75]] },
  'bowtie (5)': { n: 5, edges: [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 2]], pos: [[15, 25], [15, 75], [50, 50], [85, 25], [85, 75]] },
}

/** cut value c(x) for each basis index (qubit q bit via qcEngine MSB convention). */
function cutValues(g: Graph): Int8Array {
  const dim = 1 << g.n
  const c = new Int8Array(dim)
  for (let x = 0; x < dim; x++) {
    let cut = 0
    for (const [i, j] of g.edges) {
      const bi = (x & maskOf(g.n, i)) ? 1 : 0
      const bj = (x & maskOf(g.n, j)) ? 1 : 0
      if (bi !== bj) cut++
    }
    c[x] = cut
  }
  return c
}

/** QAOA p=1 state for given γ, β, starting from the uniform superposition. */
function qaoaState(uniform: State, cuts: Int8Array, gamma: number, beta: number): State {
  const s = cloneState(uniform)
  // e^{-iγC}: diagonal phase per basis state
  for (let i = 0; i < s.re.length; i++) {
    const ph = -gamma * cuts[i]
    const cr = Math.cos(ph), ci = Math.sin(ph)
    const r = s.re[i], im = s.im[i]
    s.re[i] = r * cr - im * ci
    s.im[i] = r * ci + im * cr
  }
  // e^{-iβB} = Π Rx(2β)
  for (let q = 0; q < s.n; q++) applyMat1(s, q, GATE.Rx(2 * beta))
  return s
}

const expectedCut = (probs: Float64Array, cuts: Int8Array): number => {
  let e = 0
  for (let i = 0; i < probs.length; i++) e += probs[i] * cuts[i]
  return e
}

const GAMMA_MAX = Math.PI
const BETA_MAX = Math.PI

export default function QAOA() {
  const [gkey, setGkey] = useState('square (4-ring)')
  const [gamma, setGamma] = useState(0.8)
  const [beta, setBeta] = useState(0.5)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const g = GRAPHS[gkey]
  const cuts = useMemo(() => cutValues(g), [g])
  const uniform = useMemo(() => {
    const s = zeroState(g.n)
    for (let q = 0; q < g.n; q++) applyMat1(s, q, GATE.H())
    return s
  }, [g])
  const maxCut = useMemo(() => cuts.reduce((m, c) => Math.max(m, c), 0), [cuts])

  const state = useMemo(() => qaoaState(uniform, cuts, gamma, beta), [uniform, cuts, gamma, beta])
  const probs = useMemo(() => probabilities(state), [state])
  const expC = expectedCut(probs, cuts)
  const randomBaseline = g.edges.length / 2

  const best = useMemo(() => {
    let bi = 0, bp = -1
    for (let i = 0; i < probs.length; i++) if (probs[i] > bp) { bp = probs[i]; bi = i }
    return { x: bi, p: bp, cut: cuts[bi] }
  }, [probs, cuts])

  // landscape ⟨C⟩(γ,β)
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = cv.clientWidth, h = cv.clientHeight
    cv.width = w * dpr; cv.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const GRID = 40
    const cw = w / GRID, ch = h / GRID
    for (let gy = 0; gy < GRID; gy++) {
      const bta = (gy / (GRID - 1)) * BETA_MAX
      for (let gx = 0; gx < GRID; gx++) {
        const gma = (gx / (GRID - 1)) * GAMMA_MAX
        const val = expectedCut(probabilities(qaoaState(uniform, cuts, gma, bta)), cuts)
        const f = maxCut > 0 ? val / maxCut : 0
        // teal (low) → magenta (high)
        const r = Math.round(56 + f * (255 - 56))
        const gg = Math.round(198 - f * (198 - 94))
        const bl = Math.round(232 - f * (232 - 196))
        ctx.fillStyle = `rgb(${r},${gg},${bl})`
        ctx.fillRect(gx * cw, h - (gy + 1) * ch, cw + 1, ch + 1)
      }
    }
    // current point
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2
    const px = (gamma / GAMMA_MAX) * w, py = h - (beta / BETA_MAX) * h
    ctx.beginPath(); ctx.arc(px, py, 4, 0, 2 * Math.PI); ctx.stroke()
  }, [uniform, cuts, maxCut, gamma, beta])

  const bit = (x: number, q: number) => ((x & maskOf(g.n, q)) ? 1 : 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">graph</span>
        {Object.keys(GRAPHS).map((k) => (
          <button key={k} onClick={() => setGkey(k)}
            className={`px-2.5 py-1 rounded font-mono text-xs border transition-all ${
              gkey === k ? 'border-quantum-500/60 bg-quantum-500/15 text-quantum-200' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
            {k}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* landscape */}
        <div className="space-y-2">
          <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">⟨C⟩ landscape over (γ, β)</div>
          <canvas ref={canvasRef} className="w-full h-40 rounded-lg border border-white/5"
            role="img" aria-label={`QAOA expected-cut landscape; current expected cut ${expC.toFixed(2)}.`} />
          <div className="text-[10px] text-slate-600 font-mono">γ → horizontal (0…π), β → vertical (0…π); brighter = higher cut. ○ = current angles.</div>
        </div>

        {/* graph + readout */}
        <div className="space-y-3">
          <svg viewBox="0 0 100 95" className="w-full max-w-[180px] mx-auto" role="img" aria-label="MaxCut graph coloured by the most probable bitstring">
            {g.edges.map(([i, j], k) => {
              const cut = bit(best.x, i) !== bit(best.x, j)
              return <line key={k} x1={g.pos[i][0]} y1={g.pos[i][1]} x2={g.pos[j][0]} y2={g.pos[j][1]}
                stroke={cut ? '#ff5ec4' : 'rgba(148,163,184,0.3)'} strokeWidth={cut ? 2.2 : 1.4} strokeDasharray={cut ? '' : '3 2'} />
            })}
            {g.pos.map(([x, y], q) => (
              <circle key={q} cx={x} cy={y} r={7} fill={bit(best.x, q) ? '#a78bfa' : '#38c6e8'} stroke="#0b0f1a" strokeWidth={1.5} />
            ))}
          </svg>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] text-slate-500"><span>γ (cost)</span><span className="font-mono text-quantum-400">{gamma.toFixed(2)}</span></div>
              <input type="range" min={0} max={1000} value={Math.round((gamma / GAMMA_MAX) * 1000)} aria-label="gamma"
                onChange={(e) => setGamma((Number(e.target.value) / 1000) * GAMMA_MAX)} className="w-full accent-quantum-500 h-1" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] text-slate-500"><span>β (mixer)</span><span className="font-mono text-plasma-300">{beta.toFixed(2)}</span></div>
              <input type="range" min={0} max={1000} value={Math.round((beta / BETA_MAX) * 1000)} aria-label="beta"
                onChange={(e) => setBeta((Number(e.target.value) / 1000) * BETA_MAX)} className="w-full accent-plasma-500 h-1" />
            </div>
          </div>
          <div className="rounded-lg border border-white/5 bg-void-900/40 p-3 text-xs font-mono grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-slate-500">⟨C⟩</span><span className="text-plasma-300 text-right tabular-nums">{expC.toFixed(3)}</span>
            <span className="text-slate-500">max cut</span><span className="text-wave-400 text-right tabular-nums">{maxCut}</span>
            <span className="text-slate-500">random baseline</span><span className="text-slate-400 text-right tabular-nums">{randomBaseline.toFixed(2)}</span>
            <span className="text-slate-500">best |x⟩</span><span className="text-quantum-300 text-right">|{labelOf(best.x, g.n)}⟩ · {best.cut}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'
import { useMemo, useState } from 'react'

// ── surface_code ─────────────────────────────────────────────────────────────
// A conceptual, interactive surface-code lattice (a real code needs far more
// qubits than a statevector allows, so this is exact *syndrome logic*, not a
// statevector sim). Data qubits sit on the edges of an L×L vertex grid; each
// vertex is a star (X-type) stabilizer that detects Z errors on its incident
// edges. Toggling Z errors on edges lights the vertices whose parity flips —
// so an error CHAIN lights only its two ENDPOINTS (the interior cancels mod 2).
// A minimum-weight-matching-style decoder pairs lit vertices and applies a
// connecting correction chain, clearing the syndrome.
//
// Key idea shown: local checks + endpoint syndromes ⇒ only a lattice-spanning
// (logical) chain escapes detection, and its probability ↓ as distance ↑.

const L = 5
const PAD = 24
const CELL = 46

type Edge = string // "h-r-c" (r,c)-(r,c+1)  |  "v-r-c" (r,c)-(r+1,c)

function incidentEdges(r: number, c: number): Edge[] {
  const e: Edge[] = []
  if (c > 0) e.push(`h-${r}-${c - 1}`)
  if (c < L - 1) e.push(`h-${r}-${c}`)
  if (r > 0) e.push(`v-${r - 1}-${c}`)
  if (r < L - 1) e.push(`v-${r}-${c}`)
  return e
}

function pathEdges(v1: [number, number], v2: [number, number]): Edge[] {
  const [r1, c1] = v1, [r2, c2] = v2
  const out: Edge[] = []
  for (let c = Math.min(c1, c2); c < Math.max(c1, c2); c++) out.push(`h-${r1}-${c}`)
  for (let r = Math.min(r1, r2); r < Math.max(r1, r2); r++) out.push(`v-${r}-${c2}`)
  return out
}

const vxPos = (r: number, c: number): [number, number] => [PAD + c * CELL, PAD + r * CELL]

export default function SurfaceCode() {
  const [errs, setErrs] = useState<Set<Edge>>(new Set())

  const toggle = (e: Edge) => setErrs((prev) => {
    const n = new Set(prev)
    n.has(e) ? n.delete(e) : n.add(e)
    return n
  })

  const toggleMany = (es: Edge[]) => setErrs((prev) => {
    const n = new Set(prev)
    for (const e of es) (n.has(e) ? n.delete(e) : n.add(e))
    return n
  })

  // syndrome: vertices with odd incident-error parity
  const lit = useMemo(() => {
    const s: Array<[number, number]> = []
    for (let r = 0; r < L; r++) for (let c = 0; c < L; c++) {
      const parity = incidentEdges(r, c).reduce((acc, e) => acc ^ (errs.has(e) ? 1 : 0), 0)
      if (parity) s.push([r, c])
    }
    return s
  }, [errs])

  const correct = () => {
    // greedy matching: pair lit vertices in scan order, toggle a connecting chain
    const pts = [...lit]
    const chain: Edge[] = []
    for (let i = 0; i + 1 < pts.length; i += 2) chain.push(...pathEdges(pts[i], pts[i + 1]))
    toggleMany(chain)
  }

  const randomChain = () => {
    // a random walk of a few edges → a connected error chain
    let r = Math.floor(Math.random() * L), c = Math.floor(Math.random() * L)
    const chain: Edge[] = []
    for (let k = 0; k < 3; k++) {
      const opts = incidentEdges(r, c)
      const e = opts[Math.floor(Math.random() * opts.length)]
      chain.push(e)
      const [t, a, b] = e.split('-').map((x, idx) => (idx === 0 ? x : Number(x))) as [string, number, number]
      if (t === 'h') { r = a; c = b === c ? b + 1 : b } else { r = a === r ? a + 1 : a; c = b }
    }
    toggleMany(chain)
  }

  const w = PAD * 2 + (L - 1) * CELL

  const litSet = new Set(lit.map(([r, c]) => `${r}-${c}`))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={randomChain}
          className="px-2.5 py-1 rounded font-mono text-[10px] border border-plasma-500/30 text-plasma-300 hover:border-plasma-500/60 transition-all">+ random error chain</button>
        <button onClick={correct} disabled={lit.length === 0}
          className="px-2.5 py-1 rounded font-mono text-[10px] border border-wave-500/30 text-wave-300 hover:border-wave-500/60 disabled:opacity-40 transition-all">match &amp; correct</button>
        <button onClick={() => setErrs(new Set())}
          className="px-2.5 py-1 rounded font-mono text-[10px] border border-white/10 text-slate-400 hover:border-white/20 transition-all">clear</button>
        <span className="text-[10px] text-slate-600 font-mono ml-1">click an edge to toggle a Z error</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <svg viewBox={`0 0 ${w} ${w}`} className="w-full max-w-[320px]" role="img"
          aria-label={`Surface code lattice, ${lit.length} lit syndromes.`}>
          {/* edges (data qubits) */}
          {Array.from({ length: L }).flatMap((_, r) =>
            Array.from({ length: L - 1 }).map((__, c) => {
              const e = `h-${r}-${c}`
              const [x1, y1] = vxPos(r, c), [x2, y2] = vxPos(r, c + 1)
              const on = errs.has(e)
              return <line key={e} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={on ? '#ff5ec4' : 'rgba(148,163,184,0.22)'} strokeWidth={on ? 4 : 2}
                className="cursor-pointer" onClick={() => toggle(e)} />
            }))}
          {Array.from({ length: L - 1 }).flatMap((_, r) =>
            Array.from({ length: L }).map((__, c) => {
              const e = `v-${r}-${c}`
              const [x1, y1] = vxPos(r, c), [x2, y2] = vxPos(r + 1, c)
              const on = errs.has(e)
              return <line key={e} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={on ? '#ff5ec4' : 'rgba(148,163,184,0.22)'} strokeWidth={on ? 4 : 2}
                className="cursor-pointer" onClick={() => toggle(e)} />
            }))}
          {/* vertices (star stabilizers) */}
          {Array.from({ length: L }).flatMap((_, r) =>
            Array.from({ length: L }).map((__, c) => {
              const [x, y] = vxPos(r, c)
              const on = litSet.has(`${r}-${c}`)
              return <circle key={`${r}-${c}`} cx={x} cy={y} r={on ? 6 : 3.5}
                fill={on ? '#f43f5e' : 'rgba(148,163,184,0.5)'}
                stroke={on ? '#f43f5e' : 'none'} strokeWidth={on ? 3 : 0}
                strokeOpacity={0.3} />
            }))}
        </svg>

        <div className="space-y-2 text-xs font-mono">
          <div className="rounded-lg border border-white/5 bg-void-900/40 p-3 space-y-1">
            <div className="text-slate-400">data qubits (edges): <span className="text-quantum-300">{2 * L * (L - 1)}</span></div>
            <div className="text-slate-400">Z errors placed: <span className="text-plasma-300">{errs.size}</span></div>
            <div className="text-slate-400">lit syndromes: <span className={lit.length ? 'text-rose-400' : 'text-wave-400'}>{lit.length}</span></div>
          </div>
          <p className="text-slate-600 text-[10px] leading-relaxed max-w-[220px]">
            Each red vertex is a star (X-type) check that flipped. An error chain lights only its two
            endpoints — the interior parities cancel. The decoder pairs endpoints and applies a correcting
            chain. Only a chain spanning the lattice (a logical error) evades detection; its likelihood
            falls exponentially with code distance.
          </p>
        </div>
      </div>
    </div>
  )
}

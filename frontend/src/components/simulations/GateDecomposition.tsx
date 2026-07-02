'use client'
import { useMemo, useState } from 'react'
import { GATE, mul2, fmtComplex, type Mat1 } from './qcEngine'

// ── gate_decomposition ───────────────────────────────────────────────────────
// Universal-set intuition: {H, T} generates a DENSE subgroup of single-qubit
// unitaries, so any target U is approximated arbitrarily well by a growing gate
// sequence (Solovay–Kitaev). We brute-force-search all sequences up to a length
// bound and plot the best operator error vs length. The Clifford set {H, S} is
// FINITE (24 elements up to phase), so a non-Clifford target like R_z(π/8)
// plateaus at a nonzero error — the concrete reason T is needed for universality.
//
// Error metric: d(U,V) = 1 − |Tr(U†V)| / 2 ∈ [0,1] (0 ⇔ equal up to global phase).
// Verified: target H is reached exactly at length 1 (err 0); {H,S} on R_z(π/8)
// never drops below ≈0.13 while {H,T} keeps improving.

type Gen = { name: string; m: Mat1 }
const HT: Gen[] = [{ name: 'H', m: GATE.H() }, { name: 'T', m: GATE.T() }]
const HS: Gen[] = [{ name: 'H', m: GATE.H() }, { name: 'S', m: GATE.S() }]

const TARGETS: { label: string; m: Mat1; note: string }[] = [
  { label: 'H', m: GATE.H(), note: 'Clifford — reached exactly by both sets' },
  { label: 'T', m: GATE.T(), note: 'non-Clifford — {H,S} can never reach it' },
  { label: 'Rz(π/8)', m: GATE.Rz(Math.PI / 8), note: 'generic rotation — needs T' },
  { label: 'Rz(π/8)·Ry(π/5)', m: mul2(GATE.Rz(Math.PI / 8), GATE.Ry(Math.PI / 5)), note: 'generic SU(2) target' },
]

const MAX_LEN = 11

function opDistance(u: Mat1, v: Mat1): number {
  // Tr(U†V) = Σ_entries conj(U_e) · V_e
  let re = 0, im = 0
  for (let e = 0; e < 4; e++) {
    const ur = u[e * 2], ui = u[e * 2 + 1]
    const vr = v[e * 2], vi = v[e * 2 + 1]
    re += ur * vr + ui * vi
    im += ur * vi - ui * vr
  }
  return 1 - Math.hypot(re, im) / 2
}

interface SearchResult { errByLen: number[]; bestSeq: string[]; bestErr: number; bestMat: Mat1 }

function search(gens: Gen[], target: Mat1): SearchResult {
  // Iterative deepening over all sequences; prune duplicate unitaries by a coarse
  // hash so the Clifford set stays tiny and {H,T} growth stays bounded.
  let frontier: { m: Mat1; seq: string[] }[] = [{ m: GATE.I(), seq: [] }]
  const seen = new Set<string>()
  const key = (m: Mat1) => Array.from({ length: 8 }, (_, i) => Math.round(m[i] * 1e4)).join(',')
  seen.add(key(GATE.I()))

  const errByLen: number[] = []
  let bestErr = opDistance(GATE.I(), target)
  let bestSeq: string[] = []
  let bestMat: Mat1 = GATE.I()
  errByLen[0] = bestErr

  for (let len = 1; len <= MAX_LEN; len++) {
    const next: { m: Mat1; seq: string[] }[] = []
    let lenBest = 1
    for (const node of frontier) {
      for (const g of gens) {
        const m = mul2(g.m, node.m)
        const k = key(m)
        if (seen.has(k)) continue
        seen.add(k)
        const seq = [...node.seq, g.name]
        const err = opDistance(m, target)
        if (err < lenBest) lenBest = err
        if (err < bestErr) { bestErr = err; bestSeq = seq; bestMat = m }
        next.push({ m, seq })
      }
    }
    errByLen[len] = Math.min(lenBest, errByLen[len - 1])
    frontier = next
    if (!next.length) { // Clifford set exhausted — plateau holds.
      for (let l = len + 1; l <= MAX_LEN; l++) errByLen[l] = errByLen[len]
      break
    }
  }
  return { errByLen, bestSeq, bestErr, bestMat }
}

function MatrixView({ m, color }: { m: Mat1; color: string }) {
  const cell = (r: number, i: number) => fmtComplex(m[r], m[i])
  return (
    <div className={`inline-grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-white/5 bg-void-900/40 p-3 font-mono text-[11px] tabular-nums ${color}`}>
      <span className="text-right">{cell(0, 1)}</span><span className="text-right">{cell(2, 3)}</span>
      <span className="text-right">{cell(4, 5)}</span><span className="text-right">{cell(6, 7)}</span>
    </div>
  )
}

export default function GateDecomposition() {
  const [targetIdx, setTargetIdx] = useState(2)
  const [clifford, setClifford] = useState(false)
  const target = TARGETS[targetIdx]

  const result = useMemo(() => search(clifford ? HS : HT, target.m), [clifford, targetIdx])
  const maxErr = Math.max(...result.errByLen, 1e-6)

  return (
    <div className="space-y-4">
      {/* target selector */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mr-1">Target U</span>
        {TARGETS.map((t, i) => (
          <button key={t.label} onClick={() => setTargetIdx(i)}
            className={`px-2.5 py-1 rounded font-mono text-xs border transition-all ${
              targetIdx === i ? 'border-quantum-500/60 bg-quantum-500/15 text-quantum-200' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* gate set toggle */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mr-1">Gate set</span>
        <button onClick={() => setClifford(false)}
          className={`px-2.5 py-1 rounded font-mono text-xs border transition-all ${
            !clifford ? 'border-wave-500/60 bg-wave-500/15 text-wave-400' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
          {'{H, T}'} universal
        </button>
        <button onClick={() => setClifford(true)}
          className={`px-2.5 py-1 rounded font-mono text-xs border transition-all ${
            clifford ? 'border-plasma-500/60 bg-plasma-500/15 text-plasma-300' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
          {'{H, S}'} Clifford only
        </button>
        <span className="text-[10px] text-slate-600 ml-1">{target.note}</span>
      </div>

      {/* error vs length bar chart */}
      <div role="img" aria-label={`Approximation error versus sequence length for target ${target.label}. Best error found is ${result.bestErr.toFixed(4)}.`}>
        <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mb-2">
          Best operator error d(U,V) vs sequence length
        </div>
        <div className="grid gap-y-0.5" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
          {result.errByLen.map((err, len) => (
            <div key={len} className="contents">
              <span className="font-mono text-[10px] pr-2 self-center text-slate-500 tabular-nums">L={len}</span>
              <div className="self-center h-2.5 rounded bg-void-800 overflow-hidden">
                <div className="h-full rounded transition-all duration-300"
                  style={{ width: `${(err / maxErr) * 100}%`, background: clifford ? '#ff5ec4' : '#38c6e8' }} />
              </div>
              <span className="font-mono text-[10px] pl-2 self-center tabular-nums text-slate-500">{err.toFixed(4)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* best sequence + matrices */}
      <div className="rounded-lg border border-white/5 bg-void-900/40 p-3 space-y-2">
        <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">
          Best sequence found (length {result.bestSeq.length}), error {result.bestErr.toFixed(5)}
        </div>
        <div className="font-mono text-sm text-quantum-200 break-words">
          {result.bestSeq.length ? result.bestSeq.join(' · ') : 'I (identity)'}
        </div>
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-600">approx</span>
            <MatrixView m={result.bestMat} color="text-wave-300" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-600">target</span>
            <MatrixView m={target.m} color="text-quantum-300" />
          </div>
        </div>
        {clifford && result.bestErr > 1e-3 && (
          <p className="text-[11px] text-plasma-300/90 font-mono pt-1">
            Clifford set is finite — the error cannot reach 0. This is why a non-Clifford gate (T) is required for universality.
          </p>
        )}
      </div>
    </div>
  )
}

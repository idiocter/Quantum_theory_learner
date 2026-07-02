'use client'
import { useMemo, useState } from 'react'
import {
  GATE, applyMat1, applyCNOT, applyCZ, applySWAP, applyToffoli,
  basisState, cloneState, probabilities, reducedPurity, fmtComplex, labelOf, type State,
} from './qcEngine'

// ── multi_qubit_gate ─────────────────────────────────────────────────────────
// CNOT / CZ / SWAP / Toffoli (and H for building superpositions) on 2–3 qubits.
// Shows the gate's truth-table action, the exact output statevector, and an
// entanglement test from the reduced-state purity Tr(ρ²) of qubit 0 (1 = product,
// ½ = maximally entangled). Verified: H(q0)+CNOT(q0→q1) on |00⟩ → (|00⟩+|11⟩)/√2
// with purity ½ (entangled); CZ on |++⟩ imparts the |11⟩ phase flip (kickback).

type Op =
  | { kind: 'H'; q: number }
  | { kind: 'CNOT' | 'CZ' | 'SWAP'; a: number; b: number }
  | { kind: 'CCX'; c1: number; c2: number; t: number }

function applyOp(s: State, op: Op) {
  switch (op.kind) {
    case 'H': applyMat1(s, op.q, GATE.H()); break
    case 'CNOT': applyCNOT(s, op.a, op.b); break
    case 'CZ': applyCZ(s, op.a, op.b); break
    case 'SWAP': applySWAP(s, op.a, op.b); break
    case 'CCX': applyToffoli(s, op.c1, op.c2, op.t); break
  }
}

const opLabel = (op: Op) =>
  op.kind === 'H' ? `H(q${op.q})`
    : op.kind === 'CCX' ? `CCX(q${op.c1},q${op.c2}→q${op.t})`
      : `${op.kind}(q${op.a}${op.kind === 'SWAP' ? ',q' : '→q'}${op.b})`

export default function MultiQubitGate() {
  const [n, setN] = useState(2)
  const [input, setInput] = useState(0)
  const [ops, setOps] = useState<Op[]>([])
  const [gate, setGate] = useState<'H' | 'CNOT' | 'CZ' | 'SWAP' | 'CCX'>('CNOT')
  // Role selections for the pending gate.
  const [qA, setQA] = useState(0)
  const [qB, setQB] = useState(1)
  const [qC, setQC] = useState(2)

  const dim = 1 << n
  const qubits = Array.from({ length: n }, (_, i) => i)

  const state = useMemo(() => {
    const s = basisState(n, input % dim)
    for (const op of ops) applyOp(s, op)
    return s
  }, [n, input, ops, dim])

  const probs = probabilities(state)
  const purity0 = reducedPurity(state, 0)
  const entangled = purity0 < 1 - 1e-6

  // Truth-table action of the currently-selected gate alone (basis → basis/phase).
  const truth = useMemo(() => {
    const rows: { from: number; to: number; phase: number }[] = []
    let pending: Op | null = null
    if (gate === 'H') pending = null
    else if (gate === 'CCX') { if (n >= 3 && new Set([qA, qB, qC]).size === 3) pending = { kind: 'CCX', c1: qA, c2: qB, t: qC } }
    else if (qA !== qB) pending = { kind: gate, a: qA, b: qB }
    if (!pending) return null
    for (let i = 0; i < dim; i++) {
      const s = basisState(n, i)
      applyOp(s, pending)
      let to = -1, phase = 1
      for (let j = 0; j < dim; j++) {
        if (Math.abs(s.re[j]) > 1e-6 || Math.abs(s.im[j]) > 1e-6) { to = j; phase = s.re[j] < 0 ? -1 : 1; break }
      }
      rows.push({ from: i, to, phase })
    }
    return rows
  }, [gate, qA, qB, qC, n, dim])

  const addGate = () => {
    if (gate === 'H') { setOps((o) => [...o, { kind: 'H', q: qA }]); return }
    if (gate === 'CCX') {
      if (n >= 3 && new Set([qA, qB, qC]).size === 3) setOps((o) => [...o, { kind: 'CCX', c1: qA, c2: qB, t: qC }])
      return
    }
    if (qA !== qB) setOps((o) => [...o, { kind: gate, a: qA, b: qB }])
  }

  const QubitPick = ({ value, onPick, label }: { value: number; onPick: (q: number) => void; label: string }) => (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-slate-600">{label}</span>
      {qubits.map((q) => (
        <button key={q} onClick={() => onPick(q)}
          className={`w-6 h-6 rounded font-mono text-[11px] border transition-all ${
            value === q ? 'border-quantum-500/60 bg-quantum-500/15 text-quantum-200' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
          {q}
        </button>
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* qubit count + input */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Qubits</span>
          {[2, 3].map((k) => (
            <button key={k} onClick={() => { setN(k); setOps([]); setInput(0); setQA(0); setQB(1); setQC(2) }}
              className={`px-2.5 py-1 rounded font-mono text-xs border transition-all ${
                n === k ? 'border-quantum-500/60 bg-quantum-500/15 text-quantum-200' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
              {k}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Input</span>
          {qubits.map((q) => {
            const b = 1 << (n - 1 - q)
            const v = (input & b) ? 1 : 0
            return (
              <button key={q} onClick={() => setInput((x) => x ^ b)}
                aria-label={`Toggle input qubit ${q}, currently ${v}`}
                className="px-2 py-1 rounded font-mono text-xs border border-white/10 text-slate-300 hover:border-quantum-500/60 transition-all">
                q{q}=|{v}⟩
              </button>
            )
          })}
          <span className="font-mono text-xs text-slate-500 ml-1">|{labelOf(input % dim, n)}⟩</span>
        </div>
      </div>

      {/* gate builder */}
      <div className="rounded-lg bg-void-950/60 border border-white/5 p-3 space-y-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mr-1">Gate</span>
          {(['H', 'CNOT', 'CZ', 'SWAP', 'CCX'] as const).map((g) => (
            <button key={g} onClick={() => setGate(g)} disabled={g === 'CCX' && n < 3}
              className={`px-2.5 py-1 rounded font-mono text-xs border transition-all disabled:opacity-30 ${
                gate === g ? 'border-wave-500/60 bg-wave-500/15 text-wave-400' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
              {g}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {gate === 'H' && <QubitPick value={qA} onPick={setQA} label="on" />}
          {(gate === 'CNOT' || gate === 'CZ') && (<>
            <QubitPick value={qA} onPick={setQA} label="ctrl" />
            <QubitPick value={qB} onPick={setQB} label="targ" />
          </>)}
          {gate === 'SWAP' && (<>
            <QubitPick value={qA} onPick={setQA} label="a" />
            <QubitPick value={qB} onPick={setQB} label="b" />
          </>)}
          {gate === 'CCX' && (<>
            <QubitPick value={qA} onPick={setQA} label="c1" />
            <QubitPick value={qB} onPick={setQB} label="c2" />
            <QubitPick value={qC} onPick={setQC} label="targ" />
          </>)}
          <button onClick={addGate}
            className="px-3 py-1.5 rounded-lg border border-plasma-500/30 text-plasma-300 hover:border-plasma-500/60 text-xs font-mono transition-all">
            ▸ Add
          </button>
          <button onClick={() => setOps((o) => o.slice(0, -1))} disabled={!ops.length}
            className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:border-white/20 disabled:opacity-30 text-xs font-mono transition-all">
            ↶ Undo
          </button>
          <button onClick={() => setOps([])}
            className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:border-white/20 text-xs font-mono transition-all">
            ↺ Clear
          </button>
        </div>
        {ops.length > 0 && (
          <div className="text-[11px] font-mono text-slate-500">circuit: {ops.map(opLabel).join(' · ')}</div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Truth table of the selected gate */}
        <div>
          <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mb-2">
            Truth table — {gate} action on each basis state
          </div>
          {truth ? (
            <div className="grid gap-y-0.5 font-mono text-[11px]" style={{ gridTemplateColumns: 'auto auto auto' }}>
              {truth.map((row) => {
                const moved = row.to !== row.from || row.phase < 0
                return (
                  <div key={row.from} className="contents">
                    <span className="text-slate-400">|{labelOf(row.from, n)}⟩</span>
                    <span className="text-slate-600 px-2">→</span>
                    <span className={moved ? 'text-quantum-300' : 'text-slate-500'}>
                      {row.phase < 0 ? '−' : ' '}|{labelOf(row.to, n)}⟩
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-[11px] text-slate-600 font-mono">pick distinct qubits for the selected gate</p>
          )}
        </div>

        {/* Output statevector */}
        <div role="img" aria-label={`Output statevector of ${n} qubits. ${entangled ? 'The state is entangled' : 'The state is a product state'}.`}>
          <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mb-2">Output statevector</div>
          <div className="grid gap-y-0.5" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
            {Array.from({ length: dim }).map((_, i) => {
              const p = probs[i]
              const dimd = p < 1e-6
              const neg = state.re[i] < -5e-4
              return (
                <div key={i} className="contents">
                  <span className={`font-mono text-[11px] pr-2 self-center ${dimd ? 'text-slate-700' : 'text-slate-300'}`}>|{labelOf(i, n)}⟩</span>
                  <div className="self-center h-2.5 rounded bg-void-800 overflow-hidden">
                    <div className="h-full rounded transition-all duration-300" style={{ width: `${p * 100}%`, background: neg ? '#ff5ec4' : '#a259ff' }} />
                  </div>
                  <span className={`font-mono text-[10px] pl-2 self-center tabular-nums ${dimd ? 'text-slate-700' : 'text-slate-500'}`}>
                    {dimd ? '·' : fmtComplex(state.re[i], state.im[i])}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Entanglement test */}
      <div className="rounded-lg border border-white/5 bg-void-900/40 p-3 text-xs font-mono flex flex-wrap items-center gap-x-6 gap-y-1">
        <span className="text-[10px] text-slate-600 uppercase tracking-widest w-full">Entanglement test (reduced state of q0)</span>
        <span className="text-slate-400">Tr(ρ₀²) = <span className="text-quantum-300">{purity0.toFixed(3)}</span></span>
        <span className={entangled ? 'text-plasma-300' : 'text-wave-400'}>
          {entangled ? 'ENTANGLED — not factorizable into single-qubit states' : 'PRODUCT state — factorizable'}
        </span>
      </div>
    </div>
  )
}

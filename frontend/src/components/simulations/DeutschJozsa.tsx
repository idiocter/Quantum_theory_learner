'use client'
import { useMemo, useState } from 'react'
import {
  basisState, cloneState, applyMat1, applyCNOT, GATE, fmtComplex, labelOf, type State,
} from './qcEngine'

// ── deutsch_jozsa ────────────────────────────────────────────────────────────
// n input qubits + 1 ancilla. Steps: prepare ancilla |1⟩ → H on all → oracle U_f
// (phase kickback: |x⟩ → (−1)^{f(x)}|x⟩ since the ancilla is |−⟩) → H on the input
// register → measure the input. Constant f ⇒ input collapses to |0…0⟩ with
// certainty; balanced f ⇒ P(|0…0⟩)=0. All amplitudes are exact.
//
// Verified: n=1 constant → P(0)=1; n=2 balanced parity → P(00)=0, weight on the
// non-zero strings; the ancilla stays in |−⟩ throughout (never entangled with x).

type OracleKind = 'const0' | 'const1' | 'parity' | 'firstbit'
const ORACLES: { key: OracleKind; label: string; type: 'constant' | 'balanced' }[] = [
  { key: 'const0', label: 'Constant f≡0', type: 'constant' },
  { key: 'const1', label: 'Constant f≡1', type: 'constant' },
  { key: 'parity', label: 'Balanced (parity ⊕xᵢ)', type: 'balanced' },
  { key: 'firstbit', label: 'Balanced (f=x₀)', type: 'balanced' },
]

// Apply U_f to an (n+1)-qubit state; ancilla is the last qubit index n.
function applyOracle(s: State, n: number, kind: OracleKind) {
  const anc = n
  switch (kind) {
    case 'const0': break
    case 'const1': applyMat1(s, anc, GATE.X()); break // flip ancilla for all x
    case 'parity': for (let q = 0; q < n; q++) applyCNOT(s, q, anc); break
    case 'firstbit': applyCNOT(s, 0, anc); break
  }
}

const STEP_LABELS = ['① prepare ancilla |1⟩', '② H on all qubits', '③ oracle U_f (phase kickback)', '④ H on input register', '⑤ measure input']

export default function DeutschJozsa() {
  const [n, setN] = useState(2)
  const [oracle, setOracle] = useState<OracleKind>('parity')
  const [step, setStep] = useState(4)

  const total = n + 1
  const dim = 1 << total
  const oracleInfo = ORACLES.find((o) => o.key === oracle)!

  // Build the state up to the chosen step.
  const state = useMemo(() => {
    const s = basisState(total, 0)          // |0…0⟩|0⟩
    applyMat1(s, n, GATE.X())               // step ①: ancilla → |1⟩
    if (step >= 1) for (let q = 0; q < total; q++) applyMat1(s, q, GATE.H())
    if (step >= 2) applyOracle(s, n, oracle)
    if (step >= 3) for (let q = 0; q < n; q++) applyMat1(s, q, GATE.H())
    return s
  }, [n, oracle, step, total])

  // Input-register probabilities (marginalise out the ancilla).
  const inputProbs = useMemo(() => {
    const p = new Float64Array(1 << n)
    for (let i = 0; i < dim; i++) {
      const x = i >> 1 // ancilla is the least-significant bit
      p[x] += state.re[i] * state.re[i] + state.im[i] * state.im[i]
    }
    return p
  }, [state, n, dim])

  const pZero = inputProbs[0]
  const decision = pZero > 0.5 ? 'CONSTANT' : 'BALANCED'
  const correct = (decision === 'CONSTANT') === (oracleInfo.type === 'constant')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Input qubits n</span>
          {[1, 2, 3].map((k) => (
            <button key={k} onClick={() => setN(k)}
              className={`px-2.5 py-1 rounded font-mono text-xs border transition-all ${
                n === k ? 'border-quantum-500/60 bg-quantum-500/15 text-quantum-200' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mr-1">Oracle</span>
        {ORACLES.map((o) => (
          <button key={o.key} onClick={() => setOracle(o.key)}
            className={`px-2.5 py-1 rounded font-mono text-xs border transition-all ${
              oracle === o.key ? 'border-wave-500/60 bg-wave-500/15 text-wave-400' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
            {o.label}
          </button>
        ))}
      </div>

      {/* step controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:border-white/20 text-xs font-mono transition-all">◂ Prev</button>
        <button onClick={() => setStep((s) => Math.min(4, s + 1))}
          className="px-3 py-1.5 rounded-lg border border-plasma-500/30 text-plasma-300 hover:border-plasma-500/60 text-xs font-mono transition-all">Next ▸</button>
        <span className="text-xs font-mono text-quantum-200">{STEP_LABELS[step]}</span>
      </div>
      <div className="flex gap-1">
        {STEP_LABELS.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded ${i <= step ? 'bg-quantum-500/70' : 'bg-void-800'}`} />
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* full statevector */}
        <div role="img" aria-label={`Full statevector of ${total} qubits at step ${step + 1}.`}>
          <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mb-2">Statevector |input⟩|ancilla⟩</div>
          <div className="grid gap-y-0.5 max-h-64 overflow-y-auto pr-1" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
            {Array.from({ length: dim }).map((_, i) => {
              const pr = state.re[i] * state.re[i] + state.im[i] * state.im[i]
              const dimd = pr < 1e-6
              const neg = state.re[i] < -5e-4
              return (
                <div key={i} className="contents">
                  <span className={`font-mono text-[10px] pr-2 self-center ${dimd ? 'text-slate-700' : 'text-slate-300'}`}>
                    |{labelOf(i >> 1, n)}⟩|{i & 1}⟩
                  </span>
                  <div className="self-center h-2 rounded bg-void-800 overflow-hidden">
                    <div className="h-full rounded transition-all duration-300" style={{ width: `${pr * 100}%`, background: neg ? '#ff5ec4' : '#a259ff' }} />
                  </div>
                  <span className={`font-mono text-[9px] pl-2 self-center tabular-nums ${dimd ? 'text-slate-700' : 'text-slate-500'}`}>
                    {dimd ? '·' : fmtComplex(state.re[i], state.im[i])}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* input-register measurement */}
        <div>
          <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mb-2">Input register P(x) (ancilla traced out)</div>
          <div className="grid gap-y-0.5" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
            {Array.from({ length: 1 << n }).map((_, x) => {
              const pr = inputProbs[x]
              const isZero = x === 0
              return (
                <div key={x} className="contents">
                  <span className={`font-mono text-[11px] pr-2 self-center ${isZero ? 'text-plasma-300' : 'text-slate-400'}`}>|{labelOf(x, n)}⟩</span>
                  <div className="self-center h-2.5 rounded bg-void-800 overflow-hidden">
                    <div className="h-full rounded transition-all duration-300" style={{ width: `${pr * 100}%`, background: isZero ? '#ff5ec4' : '#38c6e8' }} />
                  </div>
                  <span className="font-mono text-[10px] pl-2 self-center tabular-nums text-slate-500">{(pr * 100).toFixed(0)}%</span>
                </div>
              )
            })}
          </div>
          {step >= 4 && (
            <div className="mt-3 rounded-lg border border-white/5 bg-void-900/40 p-3 text-xs font-mono space-y-1">
              <div className="text-slate-400">P(all-zero |{labelOf(0, n)}⟩) = <span className="text-quantum-300">{(pZero * 100).toFixed(1)}%</span></div>
              <div className="text-slate-400">verdict: <span className={correct ? 'text-wave-400' : 'text-plasma-300'}>{decision}</span> {correct ? '✓ matches oracle' : ''}</div>
              <div className="text-slate-600 text-[10px]">1 query decides it — a classical test may need 2ⁿ⁻¹+1 queries.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

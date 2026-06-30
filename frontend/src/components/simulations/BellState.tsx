'use client'
import { useMemo, useState } from 'react'

// ── 2-qubit Bell-state simulator (registry key: bell_state) ──────────────────
// Exact 4-amplitude complex statevector (re/im Float64Arrays), same approach as
// QuantumCircuit.tsx. Qubit 0 is the most-significant bit, so basis states read
// |q0 q1⟩. Starting from a chosen computational-basis input, applying H on q0
// then CNOT (control q0, target q1) produces the four maximally-entangled Bell
// states:
//     |00⟩ → |Φ+⟩ = (|00⟩+|11⟩)/√2      |10⟩ → |Φ−⟩ = (|00⟩−|11⟩)/√2
//     |01⟩ → |Ψ+⟩ = (|01⟩+|10⟩)/√2      |11⟩ → |Ψ−⟩ = (|01⟩−|10⟩)/√2
// Measurement uses Born-rule sampling; for the X / Y bases each qubit is rotated
// into the Z basis before sampling. The single-qubit marginals stay 50/50 in
// every basis — the no-signaling property — while the two outcomes are perfectly
// correlated, which is the signature of entanglement.

const DIM = 4
const S = Math.SQRT1_2
type State = { re: Float64Array; im: Float64Array }

const bit = (q: number) => 1 << (1 - q) // qubit 0 = MSB (bit 1), qubit 1 = bit 0
const label = (i: number) => i.toString(2).padStart(2, '0')

// In-place Hadamard on qubit q.
function applyH(st: State, q: number) {
  const b = bit(q)
  const { re, im } = st
  for (let i = 0; i < DIM; i++) {
    if (i & b) continue
    const j = i | b
    const r0 = re[i], i0 = im[i], r1 = re[j], i1 = im[j]
    re[i] = S * (r0 + r1); im[i] = S * (i0 + i1)
    re[j] = S * (r0 - r1); im[j] = S * (i0 - i1)
  }
}

// In-place S† (phase −90°) on qubit q: |1⟩ → −i|1⟩. Used to map the Y basis to Z.
function applySdag(st: State, q: number) {
  const b = bit(q)
  const { re, im } = st
  for (let i = 0; i < DIM; i++) {
    if (!(i & b)) continue
    const r = re[i], im0 = im[i]
    // multiply by −i: (r + i·im0)·(−i) = im0 − i·r
    re[i] = im0
    im[i] = -r
  }
}

// In-place CNOT, control q0 → target q1.
function applyCNOT(st: State) {
  const c = bit(0), t = bit(1)
  const { re, im } = st
  for (let i = 0; i < DIM; i++) {
    if (!(i & c) || (i & t)) continue
    const j = i | t
    ;[re[i], re[j]] = [re[j], re[i]]
    ;[im[i], im[j]] = [im[j], im[i]]
  }
}

function makeState(inputBits: number): State {
  const re = new Float64Array(DIM)
  const im = new Float64Array(DIM)
  re[inputBits] = 1
  return { re, im }
}

function clone(st: State): State {
  return { re: Float64Array.from(st.re), im: Float64Array.from(st.im) }
}

type Basis = 'Z' | 'X' | 'Y'

// Rotate every qubit from the chosen measurement basis into the Z basis so that
// a Z-basis (computational) readout reports the chosen-basis outcome.
function rotateToZ(st: State, basis: Basis) {
  if (basis === 'Z') return
  for (let q = 0; q < 2; q++) {
    if (basis === 'Y') applySdag(st, q) // Y → X then X → Z below
    applyH(st, q) // X (and post-Sdag Y) → Z
  }
}

const PRESETS: { name: string; tex: string; input: number; desc: string }[] = [
  { name: 'Φ⁺', tex: '(|00⟩+|11⟩)/√2', input: 0b00, desc: 'H·CNOT on |00⟩' },
  { name: 'Φ⁻', tex: '(|00⟩−|11⟩)/√2', input: 0b10, desc: 'H·CNOT on |10⟩' },
  { name: 'Ψ⁺', tex: '(|01⟩+|10⟩)/√2', input: 0b01, desc: 'H·CNOT on |01⟩' },
  { name: 'Ψ⁻', tex: '(|01⟩−|10⟩)/√2', input: 0b11, desc: 'H·CNOT on |11⟩' },
]

export default function BellState() {
  const [input, setInput] = useState(0b00) // initial |q0 q1⟩
  const [useH, setUseH] = useState(true)
  const [useCnot, setUseCnot] = useState(true)
  const [basis, setBasis] = useState<Basis>('Z')
  // Tally of sampled outcomes (in the current measurement basis).
  const [counts, setCounts] = useState<number[]>([0, 0, 0, 0])
  const [last, setLast] = useState<number | null>(null)

  // Prepared state |ψ⟩ in the computational basis.
  const state = useMemo(() => {
    const st = makeState(input)
    if (useH) applyH(st, 0)
    if (useCnot) applyCNOT(st)
    return st
  }, [input, useH, useCnot])

  // Probabilities in the chosen measurement basis (= Z probs after rotation).
  const measProbs = useMemo(() => {
    const rotated = clone(state)
    rotateToZ(rotated, basis)
    const p = new Float64Array(DIM)
    for (let i = 0; i < DIM; i++) p[i] = rotated.re[i] ** 2 + rotated.im[i] ** 2
    return p
  }, [state, basis])

  // Computational-basis amplitudes for the bar chart (always shown in Z).
  const amps = useMemo(() => {
    return Array.from({ length: DIM }, (_, i) => ({
      re: state.re[i],
      im: state.im[i],
      p: state.re[i] ** 2 + state.im[i] ** 2,
    }))
  }, [state])

  // Single-qubit marginals in the measurement basis (no-signaling check).
  const marg = useMemo(() => {
    // P(q0=0) = p[00]+p[01]; P(q1=0) = p[00]+p[10]
    const q0_0 = measProbs[0b00] + measProbs[0b01]
    const q1_0 = measProbs[0b00] + measProbs[0b10]
    return { q0_0, q1_0 }
  }, [measProbs])

  const total = counts.reduce((s, c) => s + c, 0)

  const reset = () => { setCounts([0, 0, 0, 0]); setLast(null) }

  const sampleOnce = (probs: Float64Array | number[]) => {
    const r = Math.random()
    let acc = 0
    for (let i = 0; i < DIM; i++) {
      acc += probs[i]
      if (r <= acc) return i
    }
    return DIM - 1
  }

  const measure = (shots = 1) => {
    const next = [...counts]
    let lastOutcome = last
    for (let n = 0; n < shots; n++) {
      const o = sampleOnce(measProbs)
      next[o] += 1
      lastOutcome = o
    }
    setCounts(next)
    setLast(lastOutcome)
  }

  // When a preset button is used, set the input and force the H·CNOT pipeline on.
  const applyPreset = (inputBits: number) => {
    setInput(inputBits)
    setUseH(true)
    setUseCnot(true)
    reset()
  }

  const fmt = (n: number) => (Math.abs(n) < 5e-4 ? '0' : n.toFixed(3))
  const ampText = (re: number, im: number) => {
    if (Math.abs(im) < 5e-4) return fmt(re)
    return `${fmt(re)}${im >= 0 ? '+' : '−'}${fmt(Math.abs(im))}i`
  }

  // Outcome labels respect the measurement basis (e.g. ++ / +− in the X basis).
  const symFor = (bitVal: number) =>
    basis === 'Z' ? String(bitVal) : basis === 'X' ? (bitVal ? '−' : '+') : (bitVal ? '↓' : '↑')
  const outcomeLabel = (i: number) => {
    const q0 = (i >> 1) & 1
    const q1 = i & 1
    return basis === 'Z' ? `|${q0}${q1}⟩` : `${symFor(q0)}${symFor(q1)}`
  }

  return (
    <div className="space-y-4">
      {/* Bell-state presets. */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mr-1">Bell state</span>
        {PRESETS.map((p) => {
          const active = useH && useCnot && input === p.input
          return (
            <button
              key={p.name}
              onClick={() => applyPreset(p.input)}
              title={p.desc}
              className={`px-2.5 py-1 rounded font-mono text-xs transition-all border ${
                active
                  ? 'border-quantum-500/60 bg-quantum-500/15 text-quantum-200'
                  : 'border-white/10 text-slate-400 hover:border-white/20'
              }`}
            >
              |{p.name}⟩
            </button>
          )
        })}
      </div>

      {/* Circuit toggles: input bits + gates. */}
      <div className="rounded-lg bg-void-950/60 border border-white/5 p-3 flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Input</span>
          {[0, 1].map((q) => {
            const v = (input >> (1 - q)) & 1
            return (
              <button
                key={q}
                onClick={() => { setInput((b) => b ^ bit(q)); reset() }}
                aria-label={`Toggle input qubit ${q} (currently ${v})`}
                className="px-2 py-1 rounded font-mono text-xs border border-white/10 text-slate-300 hover:border-quantum-500/60 transition-all"
              >
                q{q}=|{v}⟩
              </button>
            )
          })}
        </div>
        <label className="flex items-center gap-1.5 text-xs font-mono text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={useH}
            onChange={(e) => { setUseH(e.target.checked); reset() }}
            className="accent-quantum-500"
          />
          H on q0
        </label>
        <label className="flex items-center gap-1.5 text-xs font-mono text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={useCnot}
            onChange={(e) => { setUseCnot(e.target.checked); reset() }}
            className="accent-wave-500"
          />
          CNOT q0→q1
        </label>
      </div>

      {/* Statevector amplitude bar chart (computational basis). */}
      <div role="img" aria-label={`Two-qubit statevector. Amplitudes: ${amps.map((amp, i) => `${label(i)} ${ampText(amp.re, amp.im)}`).join(', ')}.`}>
        <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mb-2">
          Statevector — amplitude (re, im) and P = |amplitude|²
        </div>
        <div className="grid gap-y-1" style={{ gridTemplateColumns: 'auto 1fr auto auto' }}>
          {amps.map((amp, i) => {
            const dim = amp.p < 1e-6
            const neg = amp.re < -5e-4
            return (
              <div key={i} className="contents">
                <span className={`font-mono text-[11px] pr-2 self-center ${dim ? 'text-slate-700' : 'text-slate-300'}`}>
                  |{label(i)}⟩
                </span>
                <div className="self-center h-2.5 rounded bg-void-800 overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-300"
                    style={{ width: `${amp.p * 100}%`, background: neg ? '#ff5ec4' : '#a259ff' }}
                  />
                </div>
                <span className={`font-mono text-[10px] px-2 self-center tabular-nums ${dim ? 'text-slate-700' : 'text-slate-500'}`}>
                  {dim ? '·' : ampText(amp.re, amp.im)}
                </span>
                <span className={`font-mono text-[10px] self-center tabular-nums text-right w-12 ${dim ? 'text-slate-700' : 'text-slate-400'}`}>
                  {(amp.p * 100).toFixed(0)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Measurement basis + actions. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Basis</span>
          {(['Z', 'X', 'Y'] as const).map((b) => (
            <button
              key={b}
              onClick={() => { setBasis(b); reset() }}
              className={`px-2.5 py-1 rounded font-mono text-xs transition-all border ${
                basis === b
                  ? 'border-wave-500/60 bg-wave-500/15 text-wave-400'
                  : 'border-white/10 text-slate-400 hover:border-white/20'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
        <button
          onClick={() => measure(1)}
          className="px-3 py-1.5 rounded-lg border border-plasma-500/30 text-plasma-300 hover:border-plasma-500/60 text-xs font-mono transition-all"
        >
          ⚡ Measure
        </button>
        <button
          onClick={() => measure(200)}
          className="px-3 py-1.5 rounded-lg border border-plasma-500/30 text-plasma-300 hover:border-plasma-500/60 text-xs font-mono transition-all"
        >
          ⚡ ×200
        </button>
        <button
          onClick={reset}
          className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200 text-xs font-mono transition-all"
        >
          ↺ Clear
        </button>
        {last !== null && (
          <span className="text-xs font-mono text-plasma-300">
            → q0={symFor((last >> 1) & 1)}, q1={symFor(last & 1)} {((last >> 1) & 1) === (last & 1) ? '(correlated)' : '(anti-correlated)'}
          </span>
        )}
      </div>

      {/* Outcome tallies (sampled, converging to Born-rule probabilities). */}
      <div>
        <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mb-2">
          Sampled outcomes in {basis} basis — {total} shot{total === 1 ? '' : 's'}
        </div>
        <div className="grid gap-y-1" style={{ gridTemplateColumns: 'auto 1fr auto auto' }}>
          {Array.from({ length: DIM }).map((_, i) => {
            const frac = total ? counts[i] / total : 0
            const theory = measProbs[i]
            return (
              <div key={i} className="contents">
                <span className="font-mono text-[11px] pr-2 self-center text-slate-300">{outcomeLabel(i)}</span>
                <div className="self-center h-2.5 rounded bg-void-800 overflow-hidden relative">
                  <div className="h-full rounded transition-all duration-200" style={{ width: `${frac * 100}%`, background: '#38c6e8' }} />
                  {/* theory tick */}
                  <div className="absolute top-0 h-full w-px bg-quantum-300/70" style={{ left: `${theory * 100}%` }} />
                </div>
                <span className="font-mono text-[10px] px-2 self-center tabular-nums text-slate-500">{counts[i]}</span>
                <span className="font-mono text-[10px] self-center tabular-nums text-right w-20 text-slate-400">
                  {(frac * 100).toFixed(0)}% / {(theory * 100).toFixed(0)}%
                </span>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-slate-600 mt-1">
          cyan = sampled fraction · violet tick = Born-rule probability
        </p>
      </div>

      {/* No-signaling marginals. */}
      <div className="rounded-lg border border-white/5 bg-void-900/40 p-3 text-xs font-mono flex flex-wrap gap-x-6 gap-y-1">
        <span className="text-[10px] text-slate-600 uppercase tracking-widest w-full">
          No-signaling marginals ({basis} basis)
        </span>
        <span className="text-slate-400">
          P(q0={symFor(0)}) = <span className="text-quantum-300">{(marg.q0_0 * 100).toFixed(0)}%</span>
        </span>
        <span className="text-slate-400">
          P(q1={symFor(0)}) = <span className="text-quantum-300">{(marg.q1_0 * 100).toFixed(0)}%</span>
        </span>
        <span className="text-slate-600">
          each qubit alone looks maximally mixed regardless of basis — no information is transmitted
        </span>
      </div>
    </div>
  )
}

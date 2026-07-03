'use client'
import { useMemo, useState } from 'react'
import {
  zeroState, applyMat1, applyCNOT, GATE, probabilities, labelOf, maskOf, type State,
} from './qcEngine'

// ── bit_flip_code ────────────────────────────────────────────────────────────
// The 3-qubit repetition code, simulated exactly on the qcEngine statevector.
// A basis toggle covers both Module-5 lessons:
//   bit-flip code  — encode α|000⟩+β|111⟩, protect against X, check Z-parities
//   phase-flip code — Hadamard-conjugated (α|+++⟩+β|---⟩), protect against Z,
//                     check X-parities. This is exactly Shor's inner/outer block.
// Steps: encode → inject error → measure syndrome (on the state, deterministic
// on the code space) → correct. Correction is verified by state fidelity ≈ 1.
//
// Verified: X on qubit 1 (bit code) → syndrome (1,1) → correct X₁ → fidelity 1;
// Z on qubit 0 (phase code) → syndrome (1,0) → correct Z₀ → fidelity 1.

type Logical = '0' | '1' | '+'
type Basis = 'bit' | 'phase'

function encoded(logical: Logical, basis: Basis): State {
  const s = zeroState(3)
  if (logical === '1') applyMat1(s, 0, GATE.X())
  if (logical === '+') applyMat1(s, 0, GATE.H())
  applyCNOT(s, 0, 1)
  applyCNOT(s, 0, 2)
  if (basis === 'phase') for (let q = 0; q < 3; q++) applyMat1(s, q, GATE.H())
  return s
}

/** ⟨Z_a Z_b⟩ from the statevector (deterministic ±1 on the code space). */
function zParity(s: State, a: number, b: number): number {
  const ma = maskOf(3, a), mb = maskOf(3, b)
  let e = 0
  for (let i = 0; i < 8; i++) {
    const p = s.re[i] * s.re[i] + s.im[i] * s.im[i]
    const par = (((i & ma) ? 1 : 0) ^ ((i & mb) ? 1 : 0))
    e += (par ? -1 : 1) * p
  }
  return e
}

/** ⟨X_a X_b⟩ = Σ_i Re(ψ_i* ψ_{i⊕mask}). */
function xParity(s: State, a: number, b: number): number {
  const m = maskOf(3, a) | maskOf(3, b)
  let e = 0
  for (let i = 0; i < 8; i++) e += s.re[i] * s.re[i ^ m] + s.im[i] * s.im[i ^ m]
  return e
}

const DECODE: Record<string, number> = { '00': -1, '10': 0, '11': 1, '01': 2 }

const STEPS = ['① encode', '② inject error', '③ measure syndrome', '④ correct'] as const

export default function BitFlipCode() {
  const [logical, setLogical] = useState<Logical>('+')
  const [basis, setBasis] = useState<Basis>('bit')
  const [errQ, setErrQ] = useState<number>(1) // -1 = none, 0..2 = qubit
  const [step, setStep] = useState(3)

  const errName = basis === 'bit' ? 'X' : 'Z'

  const { state, base, syndrome, decoded, fidelity } = useMemo(() => {
    const base = encoded(logical, basis)
    const s = encoded(logical, basis)
    // ② error
    if (step >= 1 && errQ >= 0) applyMat1(s, errQ, basis === 'bit' ? GATE.X() : GATE.Z())
    // ③ syndrome
    let syndrome: [number, number] | null = null
    let decoded: number | null = null
    if (step >= 2) {
      const par = basis === 'bit' ? zParity : xParity
      const s1 = par(s, 0, 1) < -0.5 ? 1 : 0
      const s2 = par(s, 1, 2) < -0.5 ? 1 : 0
      syndrome = [s1, s2]
      decoded = DECODE[`${s1}${s2}`]
    }
    // ④ correct
    if (step >= 3 && decoded !== null && decoded >= 0) {
      applyMat1(s, decoded, basis === 'bit' ? GATE.X() : GATE.Z())
    }
    // fidelity vs the clean encoded state
    let fr = 0, fi = 0
    for (let i = 0; i < 8; i++) { fr += base.re[i] * s.re[i] + base.im[i] * s.im[i]; fi += base.re[i] * s.im[i] - base.im[i] * s.re[i] }
    const fidelity = fr * fr + fi * fi
    return { state: s, base, syndrome, decoded, fidelity }
  }, [logical, basis, errQ, step])

  const probs = probabilities(state)
  const checks = basis === 'bit' ? ['Z₀Z₁', 'Z₁Z₂'] : ['X₀X₁', 'X₁X₂']

  return (
    <div className="space-y-4">
      {/* controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">code</span>
          {(['bit', 'phase'] as Basis[]).map((b) => (
            <button key={b} onClick={() => setBasis(b)}
              className={`px-2.5 py-1 rounded font-mono text-xs border transition-all ${
                basis === b ? 'border-quantum-500/60 bg-quantum-500/15 text-quantum-200' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
              {b === 'bit' ? 'bit-flip' : 'phase-flip'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">logical</span>
          {(['0', '1', '+'] as Logical[]).map((l) => (
            <button key={l} onClick={() => setLogical(l)}
              className={`px-2.5 py-1 rounded font-mono text-xs border transition-all ${
                logical === l ? 'border-wave-500/60 bg-wave-500/15 text-wave-400' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
              |{l}⟩ₗ
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">{errName} error on</span>
          {[-1, 0, 1, 2].map((q) => (
            <button key={q} onClick={() => setErrQ(q)}
              className={`px-2.5 py-1 rounded font-mono text-xs border transition-all ${
                errQ === q ? 'border-plasma-500/60 bg-plasma-500/15 text-plasma-300' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
              {q < 0 ? 'none' : `q${q}`}
            </button>
          ))}
        </div>
      </div>

      {/* steps */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:border-white/20 text-xs font-mono transition-all">◂ Prev</button>
        <button onClick={() => setStep((s) => Math.min(3, s + 1))}
          className="px-3 py-1.5 rounded-lg border border-plasma-500/30 text-plasma-300 hover:border-plasma-500/60 text-xs font-mono transition-all">Next ▸</button>
        <span className="text-xs font-mono text-quantum-200">{STEPS[step]}</span>
      </div>
      <div className="flex gap-1">
        {STEPS.map((_, i) => <div key={i} className={`h-1 flex-1 rounded ${i <= step ? 'bg-quantum-500/70' : 'bg-void-800'}`} />)}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* statevector */}
        <div>
          <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mb-2">3-qubit state (computational basis)</div>
          <div className="grid gap-y-0.5" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
            {Array.from({ length: 8 }).map((_, i) => {
              if (probs[i] < 1e-9) return null
              return (
                <div key={i} className="contents">
                  <span className="font-mono text-[10px] pr-2 self-center text-quantum-200">|{labelOf(i, 3)}⟩</span>
                  <div className="self-center h-2.5 rounded bg-void-800 overflow-hidden">
                    <div className="h-full rounded transition-all duration-200" style={{ width: `${probs[i] * 100}%`, background: '#38c6e8' }} />
                  </div>
                  <span className="font-mono text-[10px] pl-2 self-center tabular-nums text-slate-500">{(probs[i] * 100).toFixed(0)}%</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* syndrome / result */}
        <div className="rounded-lg border border-white/5 bg-void-900/40 p-3 text-xs font-mono space-y-1.5">
          <div className="text-slate-400">stabilizers: <span className="text-quantum-300">{checks[0]}, {checks[1]}</span></div>
          {step >= 1 && (
            <div className="text-slate-400">error: <span className="text-plasma-300">{errQ < 0 ? 'none' : `${errName} on q${errQ}`}</span></div>
          )}
          {syndrome && (
            <div className="text-slate-400">syndrome ({checks[0]}, {checks[1]}) = <span className="text-plasma-300">({syndrome[0]}, {syndrome[1]})</span></div>
          )}
          {decoded !== null && (
            <div className="text-slate-400">decoded → <span className="text-wave-400">{decoded < 0 ? 'no error' : `${errName} on q${decoded}`}</span></div>
          )}
          {step >= 3 && (
            <div className={`pt-1 ${fidelity > 0.999 ? 'text-wave-400' : 'text-plasma-300'}`}>
              {fidelity > 0.999 ? '✓ recovered — fidelity 1.000' : `✗ uncorrected — fidelity ${fidelity.toFixed(3)}`}
            </div>
          )}
          {basis === 'bit' && (
            <div className="text-slate-600 text-[10px] pt-1">A Z (phase) error would leave every Z-parity unchanged — undetectable here. Switch to the phase-flip code to catch it.</div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'
import { useMemo, useState } from 'react'
import {
  basisState, applyMat1, applyControlledMat1, applySWAP, GATE, probabilities, labelOf, type State,
} from './qcEngine'

// ── phase_estimation ─────────────────────────────────────────────────────────
// Estimate the eigenphase φ of U = diag(1, e^{2πiφ}) on its eigenstate |1⟩.
// t counting qubits + 1 target. Steps: X on target (→ eigenstate |1⟩); H on the
// counting register; controlled-U^{2^{t-1-j}} from counting qubit j (phase
// kickback writes (1/√2^t) Σ_y e^{2πiφy}|y⟩); inverse QFT; measure → integer m,
// estimate φ ≈ m/2^t. Everything is an exact (t+1)-qubit statevector (t ≤ 4).
//
// Verified: φ = 0.25 with t = 2 gives m = 1 with probability 1 (0.25 = 1/4
// exact); a non-dyadic φ (e.g. 1/3) spreads but peaks at the nearest m/2^t.

// Inverse QFT on qubits 0..t-1 of the state (bit-reversal swaps + conjugated R_k).
function inverseQFT(s: State, t: number) {
  for (let i = 0; i < Math.floor(t / 2); i++) applySWAP(s, i, t - 1 - i)
  for (let j = t - 1; j >= 0; j--) {
    for (let k = t - 1; k > j; k--) {
      const angle = -Math.PI / (1 << (k - j))
      applyControlledMat1(s, k, j, GATE.P(angle))
    }
    applyMat1(s, j, GATE.H())
  }
}

const STEP_LABELS = ['① target → |1⟩', '② H on counting register', '③ controlled-U^{2ʲ}', '④ inverse QFT', '⑤ measure counting'] as const

const PRESETS = [
  { label: '1/4 = 0.250', phi: 0.25 },
  { label: '3/8 = 0.375', phi: 0.375 },
  { label: '1/3 ≈ 0.333', phi: 1 / 3 },
  { label: '0.100', phi: 0.1 },
]

export default function PhaseEstimation() {
  const [t, setT] = useState(3)
  const [phi, setPhi] = useState(0.375)
  const [step, setStep] = useState(4)

  const total = t + 1
  const N = 1 << t

  const state = useMemo(() => {
    const s = basisState(total, 0)
    applyMat1(s, t, GATE.X()) // ① target eigenstate |1⟩
    if (step >= 1) for (let j = 0; j < t; j++) applyMat1(s, j, GATE.H())
    if (step >= 2) {
      for (let j = 0; j < t; j++) {
        const power = 1 << (t - 1 - j)
        applyControlledMat1(s, j, t, GATE.P(2 * Math.PI * phi * power))
      }
    }
    if (step >= 3) inverseQFT(s, t)
    return s
  }, [t, phi, step, total])

  // Counting-register probabilities (target is |1⟩, factorises out).
  const countProbs = useMemo(() => {
    const p = probabilities(state)
    const out = new Float64Array(N)
    for (let i = 0; i < p.length; i++) out[i >> 1] += p[i]
    return out
  }, [state, N])

  const best = useMemo(() => {
    let m = 0, pm = -1
    for (let k = 0; k < N; k++) if (countProbs[k] > pm) { pm = countProbs[k]; m = k }
    return { m, p: pm }
  }, [countProbs, N])

  const estPhi = best.m / N
  const trueM = phi * N
  const err = Math.abs(estPhi - phi)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Counting qubits t</span>
          {[2, 3, 4].map((k) => (
            <button key={k} onClick={() => setT(k)}
              className={`px-2.5 py-1 rounded font-mono text-xs border transition-all ${
                t === k ? 'border-quantum-500/60 bg-quantum-500/15 text-quantum-200' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
              {k}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">φ</span>
          {PRESETS.map((p) => (
            <button key={p.label} onClick={() => setPhi(p.phi)}
              className={`px-2.5 py-1 rounded font-mono text-xs border transition-all ${
                Math.abs(phi - p.phi) < 1e-9 ? 'border-wave-500/60 bg-wave-500/15 text-wave-400' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1 max-w-md">
        <div className="flex justify-between text-[11px] text-slate-500"><span>true φ (U = diag(1, e^{'{2πiφ}'}))</span><span className="font-mono text-quantum-400">{phi.toFixed(4)}</span></div>
        <input type="range" min={0} max={1000} value={Math.round(phi * 1000)} aria-label="True eigenphase phi"
          onChange={(e) => setPhi(Number(e.target.value) / 1000)} className="w-full accent-quantum-500 h-1" />
      </div>

      {/* steps */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:border-white/20 text-xs font-mono transition-all">◂ Prev</button>
        <button onClick={() => setStep((s) => Math.min(4, s + 1))}
          className="px-3 py-1.5 rounded-lg border border-plasma-500/30 text-plasma-300 hover:border-plasma-500/60 text-xs font-mono transition-all">Next ▸</button>
        <span className="text-xs font-mono text-quantum-200">{STEP_LABELS[step]}</span>
      </div>
      <div className="flex gap-1">
        {STEP_LABELS.map((_, i) => <div key={i} className={`h-1 flex-1 rounded ${i <= step ? 'bg-quantum-500/70' : 'bg-void-800'}`} />)}
      </div>

      {/* counting register distribution */}
      <div role="img" aria-label={`Counting register distribution. Most probable outcome m=${best.m}, estimate phi=${estPhi.toFixed(3)}.`}>
        <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mb-2">
          Counting register P(m) → estimate φ ≈ m/2ᵗ
        </div>
        <div className="grid gap-y-0.5" style={{ gridTemplateColumns: 'auto auto 1fr auto' }}>
          {Array.from({ length: N }).map((_, m) => {
            const pr = countProbs[m]
            const isBest = m === best.m
            return (
              <div key={m} className="contents">
                <span className={`font-mono text-[10px] pr-2 self-center ${isBest ? 'text-plasma-300' : 'text-slate-400'}`}>|{labelOf(m, t)}⟩</span>
                <span className="font-mono text-[10px] pr-2 self-center text-slate-600 tabular-nums">{(m / N).toFixed(3)}</span>
                <div className="self-center h-2.5 rounded bg-void-800 overflow-hidden">
                  <div className="h-full rounded transition-all duration-200" style={{ width: `${pr * 100}%`, background: isBest ? '#ff5ec4' : '#38c6e8' }} />
                </div>
                <span className="font-mono text-[10px] pl-2 self-center tabular-nums text-slate-500">{(pr * 100).toFixed(0)}%</span>
              </div>
            )
          })}
        </div>
      </div>

      {step >= 4 && (
        <div className="rounded-lg border border-white/5 bg-void-900/40 p-3 text-xs font-mono grid sm:grid-cols-2 gap-x-6 gap-y-1">
          <span className="text-slate-400">measured m = <span className="text-plasma-300">{best.m}</span> (2ᵗφ = {trueM.toFixed(2)})</span>
          <span className="text-slate-400">success P = <span className="text-quantum-300">{(best.p * 100).toFixed(1)}%</span></span>
          <span className="text-slate-400">estimate φ̂ = m/2ᵗ = <span className="text-wave-400">{estPhi.toFixed(4)}</span></span>
          <span className="text-slate-400">|φ̂ − φ| = <span className={err < 1 / N ? 'text-wave-400' : 'text-slate-300'}>{err.toFixed(4)}</span></span>
          <span className="text-slate-600 sm:col-span-2 text-[10px]">
            more counting qubits → finer resolution (1/2ᵗ) and higher success probability for non-dyadic φ.
          </span>
        </div>
      )}
    </div>
  )
}

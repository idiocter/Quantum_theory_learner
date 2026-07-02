'use client'
import { useMemo, useState } from 'react'
import {
  basisState, applyMat1, applyControlledMat1, applySWAP, GATE, labelOf, type State,
} from './qcEngine'

// ── qft ──────────────────────────────────────────────────────────────────────
// The quantum Fourier transform on n = 3–4 qubits, built as the textbook network
// (Hadamards + controlled-phase R_k + final bit-reversal swaps) and stepped gate
// by gate. For a basis input |x⟩ the output must equal the analytic DFT
//     QFT|x⟩ = (1/√N) Σ_k e^{2πi x k / N} |k⟩,
// so every amplitude has magnitude 1/√N and phase 2π x k / N. The panel shows the
// engine's amplitude/phase next to the analytic value — they coincide (this is
// the built-in correctness check). Verified: QFT|0⟩ = uniform (all phases 0).

interface Op { label: string; apply: (s: State) => void }

function buildOps(n: number): Op[] {
  const ops: Op[] = []
  for (let j = 0; j < n; j++) {
    ops.push({ label: `H q${j}`, apply: (s) => applyMat1(s, j, GATE.H()) })
    for (let k = j + 1; k < n; k++) {
      const angle = Math.PI / (1 << (k - j))
      ops.push({
        label: `R${k - j + 1}(q${k}→q${j})`,
        apply: (s) => applyControlledMat1(s, k, j, GATE.P(angle)),
      })
    }
  }
  for (let i = 0; i < Math.floor(n / 2); i++) {
    const a = i, b = n - 1 - i
    ops.push({ label: `SWAP q${a},q${b}`, apply: (s) => applySWAP(s, a, b) })
  }
  return ops
}

export default function QFT() {
  const [n, setN] = useState(3)
  const [x, setX] = useState(1)
  const N = 1 << n
  const ops = useMemo(() => buildOps(n), [n])
  const [step, setStep] = useState(0)

  // Clamp inputs when n changes.
  const xClamped = x % N
  const stepClamped = Math.min(step, ops.length)

  const state = useMemo(() => {
    const s = basisState(n, xClamped)
    for (let i = 0; i < stepClamped; i++) ops[i].apply(s)
    return s
  }, [n, xClamped, ops, stepClamped])

  const rows = useMemo(() => {
    return Array.from({ length: N }, (_, k) => {
      const re = state.re[k], im = state.im[k]
      const mag = Math.hypot(re, im)
      const phase = Math.abs(mag) < 1e-9 ? 0 : (Math.atan2(im, re) * 180) / Math.PI
      // analytic (only strictly the QFT output once all ops applied)
      const analyticPhase = (((360 * xClamped * k) / N) % 360 + 360) % 360
      return { k, mag, phase: (phase + 360) % 360, analyticPhase }
    })
  }, [state, N, xClamped])

  const done = stepClamped === ops.length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Qubits n</span>
          {[3, 4].map((k) => (
            <button key={k} onClick={() => { setN(k); setStep(0); setX((v) => v % (1 << k)) }}
              className={`px-2.5 py-1 rounded font-mono text-xs border transition-all ${
                n === k ? 'border-quantum-500/60 bg-quantum-500/15 text-quantum-200' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
              {k}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Input |x⟩</span>
          <button onClick={() => { setX((v) => (v - 1 + N) % N); setStep(0) }}
            className="w-6 h-6 rounded border border-white/10 text-slate-400 hover:border-white/20 font-mono text-xs">−</button>
          <span className="font-mono text-xs text-quantum-200 w-20 text-center">x={xClamped} |{labelOf(xClamped, n)}⟩</span>
          <button onClick={() => { setX((v) => (v + 1) % N); setStep(0) }}
            className="w-6 h-6 rounded border border-white/10 text-slate-400 hover:border-white/20 font-mono text-xs">+</button>
        </div>
      </div>

      {/* step controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:border-white/20 text-xs font-mono transition-all">◂ Prev</button>
        <button onClick={() => setStep((s) => Math.min(ops.length, s + 1))}
          className="px-3 py-1.5 rounded-lg border border-plasma-500/30 text-plasma-300 hover:border-plasma-500/60 text-xs font-mono transition-all">Next ▸</button>
        <button onClick={() => setStep(ops.length)}
          className="px-3 py-1.5 rounded-lg border border-wave-500/30 text-wave-400 hover:border-wave-500/60 text-xs font-mono transition-all">Run all ▸▸</button>
        <button onClick={() => setStep(0)}
          className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:border-white/20 text-xs font-mono transition-all">↺</button>
        <span className="text-xs font-mono text-slate-500">
          {stepClamped}/{ops.length} · {stepClamped < ops.length ? `next: ${ops[stepClamped].label}` : 'QFT complete'}
        </span>
      </div>

      {/* gate network */}
      <div className="flex flex-wrap gap-1">
        {ops.map((op, i) => (
          <span key={i}
            className={`px-1.5 py-0.5 rounded font-mono text-[10px] border ${
              i < stepClamped ? 'border-quantum-500/40 bg-quantum-500/10 text-quantum-300'
                : i === stepClamped ? 'border-plasma-500/60 bg-plasma-500/10 text-plasma-300'
                  : 'border-white/10 text-slate-600'}`}>
            {op.label}
          </span>
        ))}
      </div>

      {/* amplitudes + phases vs analytic DFT */}
      <div role="img" aria-label={`QFT output amplitudes for input x=${xClamped} on ${n} qubits.`}>
        <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mb-2">
          Output |k⟩: magnitude, phase, and analytic DFT phase 2πxk/N
        </div>
        <div className="grid gap-y-0.5" style={{ gridTemplateColumns: 'auto 1fr auto auto' }}>
          {rows.map((r) => (
            <div key={r.k} className="contents">
              <span className="font-mono text-[10px] pr-2 self-center text-slate-400">|{labelOf(r.k, n)}⟩</span>
              <div className="self-center h-2.5 rounded bg-void-800 overflow-hidden">
                <div className="h-full rounded transition-all duration-200" style={{ width: `${r.mag * r.mag * 100 * N}%`, background: '#a259ff' }} />
              </div>
              <span className="font-mono text-[10px] px-2 self-center tabular-nums text-slate-500 w-16 text-right">
                ∠{r.phase.toFixed(0)}°
              </span>
              <span className="font-mono text-[10px] self-center tabular-nums w-20 text-right"
                style={{ color: done ? (Math.abs(((r.phase - r.analyticPhase + 540) % 360) - 180) < 1 ? '#6ee7e0' : '#ff5ec4') : '#475569' }}>
                {done ? `≈${r.analyticPhase.toFixed(0)}°` : '—'}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-600 mt-1">
          bar = |amp|²·N (all equal to 1 for a basis input) · right column = analytic 2πxk/N (teal when it matches the circuit)
        </p>
      </div>
    </div>
  )
}

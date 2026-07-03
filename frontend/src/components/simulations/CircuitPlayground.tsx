'use client'
import { useMemo, useState } from 'react'
import {
  zeroState, applyMat1, applyCNOT, applyCZ, applySWAP, applyToffoli, GATE,
  probabilities, labelOf, fmtComplex, type State,
} from './qcEngine'

// ── circuit_playground ───────────────────────────────────────────────────────
// A safe, in-browser quantum "programming" environment. It runs a restricted
// circuit language — NOT arbitrary Python — on the exact statevector engine
// (qcEngine.ts), so nothing is executed server-side. Supported instructions:
//   h/x/y/z/s/t/sdg/tdg q0       single-qubit gates
//   rx(pi/2) q0  |  ry 0.5 q1    parameterized rotations (angle: number or pi/N)
//   cx q0 q1  |  cz q0 q1        two-qubit gates (control target)
//   swap q0 q1  |  ccx q0 q1 q2  SWAP / Toffoli
//   measure                       marks readout (no-op for the statevector)
//   # comment                     ignored
// Qubit count is inferred from the highest index (capped at 8 → 256 amplitudes).
//
// Verified: `h q0; cx q0 q1` → amplitudes 1/√2 on |00⟩,|11⟩ (Bell); sampling
// converges to ~50/50 on 00/11.

interface ParseResult {
  n: number
  apply: (s: State) => void
  error: string | null
  measured: boolean
}

const NO_PARAM_GATE: Record<string, () => number[]> = {
  h: GATE.H, x: GATE.X, y: GATE.Y, z: GATE.Z,
  s: GATE.S, t: GATE.T, sdg: GATE.Sdg, tdg: GATE.Tdg,
}
const NO_PARAM = new Set(Object.keys(NO_PARAM_GATE))
const MAX_QUBITS = 8

function parseAngle(tok: string): number {
  let t = tok.trim()
  let sign = 1
  if (t.startsWith('-')) { sign = -1; t = t.slice(1) }
  const val = (s: string) => (s === 'pi' ? Math.PI : parseFloat(s))
  const [a, b] = t.split('/')
  let num = val(a)
  if (b !== undefined) num = num / val(b)
  if (Number.isNaN(num)) throw new Error(`bad angle "${tok}"`)
  return sign * num
}

function qIdx(tok: string): number {
  const m = tok.match(/^q?(\d+)$/)
  if (!m) throw new Error(`bad qubit "${tok}"`)
  return parseInt(m[1], 10)
}

function parseProgram(src: string): ParseResult {
  const steps: Array<(s: State) => void> = []
  let maxQ = 0
  let measured = false
  try {
    const lines = src.split('\n')
    for (let ln = 0; ln < lines.length; ln++) {
      let line = lines[ln].trim()
      const hash = line.indexOf('#')
      if (hash >= 0) line = line.slice(0, hash).trim()
      if (line.startsWith('//') || line === '') continue
      // allow multiple instructions per line separated by ';'
      for (const raw of line.split(';')) {
        const stmt = raw.trim()
        if (!stmt) continue
        const tok = stmt.split(/\s+/)
        let op = tok[0].toLowerCase()
        if (op === 'measure') { measured = true; continue }

        // rotation with parenthesised angle, e.g. rx(pi/2) q0
        const rot = op.match(/^(rx|ry|rz)\((.+)\)$/)
        if (rot) {
          const angle = parseAngle(rot[2])
          const q = qIdx(tok[1])
          maxQ = Math.max(maxQ, q)
          const g = rot[1] === 'rx' ? GATE.Rx(angle) : rot[1] === 'ry' ? GATE.Ry(angle) : GATE.Rz(angle)
          steps.push((s) => applyMat1(s, q, g))
          continue
        }
        // rotation with separate angle token, e.g. rx 0.5 q0
        if (op === 'rx' || op === 'ry' || op === 'rz') {
          const angle = parseAngle(tok[1])
          const q = qIdx(tok[2])
          maxQ = Math.max(maxQ, q)
          const g = op === 'rx' ? GATE.Rx(angle) : op === 'ry' ? GATE.Ry(angle) : GATE.Rz(angle)
          steps.push((s) => applyMat1(s, q, g))
          continue
        }
        if (NO_PARAM.has(op)) {
          const q = qIdx(tok[1])
          maxQ = Math.max(maxQ, q)
          const g = NO_PARAM_GATE[op]()
          steps.push((s) => applyMat1(s, q, g))
          continue
        }
        if (op === 'cx' || op === 'cnot' || op === 'cz') {
          const c = qIdx(tok[1]), t = qIdx(tok[2])
          if (c === t) throw new Error('control and target must differ')
          maxQ = Math.max(maxQ, c, t)
          steps.push((s) => (op === 'cz' ? applyCZ(s, c, t) : applyCNOT(s, c, t)))
          continue
        }
        if (op === 'swap') {
          const a = qIdx(tok[1]), b = qIdx(tok[2])
          maxQ = Math.max(maxQ, a, b)
          steps.push((s) => applySWAP(s, a, b))
          continue
        }
        if (op === 'ccx' || op === 'toffoli') {
          const c1 = qIdx(tok[1]), c2 = qIdx(tok[2]), t = qIdx(tok[3])
          maxQ = Math.max(maxQ, c1, c2, t)
          steps.push((s) => applyToffoli(s, c1, c2, t))
          continue
        }
        throw new Error(`unknown instruction "${op}"`)
      }
    }
    const n = maxQ + 1
    if (n > MAX_QUBITS) throw new Error(`too many qubits (${n} > ${MAX_QUBITS})`)
    return { n, measured, error: null, apply: (s) => steps.forEach((f) => f(s)) }
  } catch (e) {
    return { n: 1, measured, error: (e as Error).message, apply: () => {} }
  }
}

const EXAMPLES: Record<string, string> = {
  'Bell': 'h q0\ncx q0 q1\nmeasure',
  'GHZ (3q)': 'h q0\ncx q0 q1\ncx q1 q2\nmeasure',
  'Deutsch–Jozsa (balanced)': '# input q0,q1 ; ancilla q2 in |->\nx q2\nh q0\nh q1\nh q2\n# balanced oracle f(x)=x0⊕x1\ncx q0 q2\ncx q1 q2\nh q0\nh q1\nmeasure',
  'Grover (2q, mark 11)': 'h q0\nh q1\n# oracle: phase-flip |11>\ncz q0 q1\n# diffusion\nh q0\nh q1\nx q0\nx q1\ncz q0 q1\nx q0\nx q1\nh q0\nh q1\nmeasure',
}

export default function CircuitPlayground() {
  const [src, setSrc] = useState(EXAMPLES['Bell'])
  const [shots, setShots] = useState(1024)
  const [counts, setCounts] = useState<Record<number, number> | null>(null)

  const parsed = useMemo(() => parseProgram(src), [src])

  const state = useMemo(() => {
    if (parsed.error) return null
    const s = zeroState(parsed.n)
    parsed.apply(s)
    return s
  }, [parsed])

  const probs = useMemo(() => (state ? probabilities(state) : null), [state])

  const runShots = () => {
    if (!state || !probs) return
    const N = 1 << state.n
    const acc: Record<number, number> = {}
    for (let k = 0; k < shots; k++) {
      const r = Math.random()
      let c = 0
      for (let i = 0; i < N; i++) { c += probs[i]; if (r <= c) { acc[i] = (acc[i] ?? 0) + 1; break } }
    }
    setCounts(acc)
  }

  const loadExample = (name: string) => { setSrc(EXAMPLES[name]); setCounts(null) }

  return (
    <div className="space-y-4">
      {/* examples */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mr-1">load</span>
        {Object.keys(EXAMPLES).map((name) => (
          <button key={name} onClick={() => loadExample(name)}
            className="px-2.5 py-1 rounded font-mono text-[10px] border border-white/10 text-slate-400 hover:border-quantum-500/50 hover:text-quantum-200 transition-all">
            {name}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* editor */}
        <div className="space-y-2">
          <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">circuit program</div>
          <textarea
            value={src}
            onChange={(e) => { setSrc(e.target.value); setCounts(null) }}
            spellCheck={false}
            aria-label="Quantum circuit program editor"
            className="w-full h-56 rounded-lg bg-void-950/70 border border-white/10 p-3 font-mono text-xs text-slate-200 focus:border-quantum-500/50 focus:outline-none resize-none leading-relaxed"
          />
          <div className="text-[10px] text-slate-600 font-mono leading-relaxed">
            gates: h x y z s t sdg tdg · rx(θ) ry(θ) rz(θ) · cx cz swap ccx · measure
          </div>
          {parsed.error && (
            <div className="text-[11px] font-mono text-plasma-300 border border-plasma-500/30 bg-plasma-500/5 rounded px-2 py-1">
              ⚠ {parsed.error}
            </div>
          )}
        </div>

        {/* output */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">
              statevector {state ? `(${state.n} qubit${state.n > 1 ? 's' : ''})` : ''}
            </span>
            <div className="flex items-center gap-1.5">
              <input type="number" min={64} max={100000} step={256} value={shots}
                onChange={(e) => setShots(Math.max(1, Number(e.target.value) || 1))}
                aria-label="Number of shots"
                className="w-20 rounded bg-void-950/70 border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-slate-300" />
              <button onClick={runShots} disabled={!state}
                className="px-2.5 py-1 rounded font-mono text-[10px] border border-wave-500/30 text-wave-300 hover:border-wave-500/60 disabled:opacity-40 transition-all">
                ⟳ sample
              </button>
            </div>
          </div>

          {state && probs ? (
            <div className="grid gap-y-0.5" style={{ gridTemplateColumns: 'auto auto 1fr auto' }}>
              {Array.from({ length: 1 << state.n }).map((_, i) => {
                if (probs[i] < 1e-9 && !(counts && counts[i])) return null
                const shot = counts ? (counts[i] ?? 0) / shots : null
                return (
                  <div key={i} className="contents">
                    <span className="font-mono text-[10px] pr-2 self-center text-quantum-200">|{labelOf(i, state.n)}⟩</span>
                    <span className="font-mono text-[10px] pr-2 self-center text-slate-600 tabular-nums">
                      {fmtComplex(state.re[i], state.im[i])}
                    </span>
                    <div className="self-center h-2.5 rounded bg-void-800 overflow-hidden relative">
                      <div className="h-full rounded transition-all duration-200"
                        style={{ width: `${probs[i] * 100}%`, background: '#38c6e8' }} />
                      {shot !== null && (
                        <div className="absolute top-0 h-full border-r-2 border-plasma-400"
                          style={{ width: `${shot * 100}%` }} />
                      )}
                    </div>
                    <span className="font-mono text-[10px] pl-2 self-center tabular-nums text-slate-500">
                      {(probs[i] * 100).toFixed(1)}%
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-[11px] text-slate-600 font-mono">fix the program to see the statevector</div>
          )}

          {counts && (
            <div className="text-[10px] text-slate-600 font-mono">
              magenta line = sampled frequency over {shots} shots (converges to the blue Born-rule bar as shots→∞)
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

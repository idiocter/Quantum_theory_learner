'use client'
import { useMemo, useState } from 'react'

// ── 4-qubit statevector simulator ────────────────────────────────────────────
// State is 2^4 = 16 complex amplitudes (re/im arrays). Gates are applied as
// matrix products directly on the statevector — no external library needed at
// this size. Qubit 0 is the most-significant bit so basis states read |q0q1q2q3⟩.
const N_QUBITS = 4
const DIM = 1 << N_QUBITS

type Cplx = readonly [number, number] // [re, im]
type Gate1 = readonly [Cplx, Cplx, Cplx, Cplx] // row-major 2×2

const S = Math.SQRT1_2
const R45 = Math.cos(Math.PI / 4)
const I45 = Math.sin(Math.PI / 4)

const GATES_1Q: Record<string, Gate1> = {
  H: [[S, 0], [S, 0], [S, 0], [-S, 0]],
  X: [[0, 0], [1, 0], [1, 0], [0, 0]],
  Y: [[0, 0], [0, -1], [0, 1], [0, 0]],
  Z: [[1, 0], [0, 0], [0, 0], [-1, 0]],
  S: [[1, 0], [0, 0], [0, 0], [0, 1]],
  T: [[1, 0], [0, 0], [0, 0], [R45, I45]],
}

// Which qubits each op touches; one op per circuit column.
type Op =
  | { kind: '1q'; gate: keyof typeof GATES_1Q; q: number }
  | { kind: '2q'; gate: 'CNOT' | 'CZ'; control: number; target: number }

const bit = (q: number) => 1 << (N_QUBITS - 1 - q) // qubit 0 = MSB

function applyOps(ops: Op[]) {
  const re = new Float64Array(DIM)
  const im = new Float64Array(DIM)
  re[0] = 1 // start in |0000⟩

  for (const op of ops) {
    if (op.kind === '1q') {
      const m = GATES_1Q[op.gate]
      const b = bit(op.q)
      for (let i = 0; i < DIM; i++) {
        if (i & b) continue
        const j = i | b
        const a0r = re[i], a0i = im[i], a1r = re[j], a1i = im[j]
        // new0 = m00·a0 + m01·a1
        re[i] = m[0][0] * a0r - m[0][1] * a0i + m[1][0] * a1r - m[1][1] * a1i
        im[i] = m[0][0] * a0i + m[0][1] * a0r + m[1][0] * a1i + m[1][1] * a1r
        // new1 = m10·a0 + m11·a1
        re[j] = m[2][0] * a0r - m[2][1] * a0i + m[3][0] * a1r - m[3][1] * a1i
        im[j] = m[2][0] * a0i + m[2][1] * a0r + m[3][0] * a1i + m[3][1] * a1r
      }
    } else {
      const c = bit(op.control)
      const t = bit(op.target)
      for (let i = 0; i < DIM; i++) {
        if (!(i & c)) continue
        if (op.gate === 'CZ') {
          if (i & t) { re[i] = -re[i]; im[i] = -im[i] }
        } else if (!(i & t)) {
          // CNOT: swap target-0 with target-1 when control is set
          const j = i | t
          ;[re[i], re[j]] = [re[j], re[i]]
          ;[im[i], im[j]] = [im[j], im[i]]
        }
      }
    }
  }
  return { re, im }
}

const label = (i: number) => i.toString(2).padStart(N_QUBITS, '0')

export default function QuantumCircuit() {
  const [ops, setOps] = useState<Op[]>([])
  const [tool, setTool] = useState<keyof typeof GATES_1Q | 'CNOT' | 'CZ'>('H')
  // Half-placed two-qubit gate: control chosen, awaiting target.
  const [pendingControl, setPendingControl] = useState<number | null>(null)
  const [measured, setMeasured] = useState<number | null>(null)

  const { re, im } = useMemo(() => applyOps(ops), [ops])
  const probs = useMemo(() => {
    const p = new Float64Array(DIM)
    for (let i = 0; i < DIM; i++) p[i] = re[i] * re[i] + im[i] * im[i]
    return p
  }, [re, im])

  const reset = () => {
    setOps([])
    setPendingControl(null)
    setMeasured(null)
  }

  const placeOnQubit = (q: number) => {
    setMeasured(null)
    if (tool === 'CNOT' || tool === 'CZ') {
      if (pendingControl === null) {
        setPendingControl(q)
      } else if (pendingControl !== q) {
        setOps((o) => [...o, { kind: '2q', gate: tool, control: pendingControl, target: q }])
        setPendingControl(null)
      }
      return
    }
    setOps((o) => [...o, { kind: '1q', gate: tool, q }])
  }

  const removeOp = (idx: number) => {
    setMeasured(null)
    setOps((o) => o.filter((_, i) => i !== idx))
  }

  const measure = () => {
    const r = Math.random()
    let acc = 0
    for (let i = 0; i < DIM; i++) {
      acc += probs[i]
      if (r <= acc) { setMeasured(i); return }
    }
    setMeasured(DIM - 1)
  }

  // ── Circuit grid geometry (SVG) ──
  const colW = 44
  const rowH = 40
  const padL = 44
  const padT = 16
  const cols = Math.max(ops.length + 1, 6)
  const width = padL + cols * colW
  const height = padT * 2 + N_QUBITS * rowH
  const cx = (col: number) => padL + col * colW + colW / 2
  const cy = (q: number) => padT + q * rowH + rowH / 2

  return (
    <div className="space-y-4">
      {/* Gate palette */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mr-1">Gate</span>
        {(['H', 'X', 'Y', 'Z', 'S', 'T', 'CNOT', 'CZ'] as const).map((g) => (
          <button
            key={g}
            onClick={() => { setTool(g); setPendingControl(null) }}
            className={`px-2.5 py-1 rounded font-mono text-xs transition-all border ${
              tool === g
                ? 'border-quantum-500/60 bg-quantum-500/15 text-quantum-200'
                : 'border-white/10 text-slate-400 hover:border-white/20'
            }`}
          >
            {g}
          </button>
        ))}
        <span className="text-[10px] text-slate-600 ml-2">
          {tool === 'CNOT' || tool === 'CZ'
            ? pendingControl === null
              ? 'click control qubit'
              : `control q${pendingControl} — click target`
            : 'click a wire to add'}
        </span>
      </div>

      {/* Circuit grid */}
      <div className="rounded-lg bg-void-950/60 border border-white/5 overflow-x-auto">
        <svg width={width} height={height} className="block" style={{ minWidth: '100%' }}>
          {Array.from({ length: N_QUBITS }).map((_, q) => (
            <g key={q}>
              <text x={12} y={cy(q) + 4} className="fill-slate-500" fontSize={12} fontFamily="monospace">
                q{q}
              </text>
              <line x1={padL} y1={cy(q)} x2={width} y2={cy(q)} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
              {/* click target to add a gate on this wire (last column) */}
              <rect
                x={cx(ops.length) - colW / 2}
                y={cy(q) - rowH / 2}
                width={colW}
                height={rowH}
                fill="transparent"
                className="cursor-pointer"
                onClick={() => placeOnQubit(q)}
              />
              {pendingControl === q && (
                <circle cx={cx(ops.length)} cy={cy(q)} r={5} fill="#a259ff" opacity={0.6} />
              )}
            </g>
          ))}

          {ops.map((op, col) => {
            if (op.kind === '1q') {
              return (
                <g key={col} className="cursor-pointer" onClick={() => removeOp(col)}>
                  <rect x={cx(col) - 13} y={cy(op.q) - 13} width={26} height={26} rx={5}
                    fill="#16102e" stroke="#a259ff" strokeWidth={1.4} />
                  <text x={cx(col)} y={cy(op.q) + 4} textAnchor="middle" fontSize={12}
                    fontFamily="monospace" className="fill-quantum-200">{op.gate}</text>
                </g>
              )
            }
            const yc = cy(op.control), yt = cy(op.target)
            return (
              <g key={col} className="cursor-pointer" onClick={() => removeOp(col)}>
                <line x1={cx(col)} y1={yc} x2={cx(col)} y2={yt} stroke="#38c6e8" strokeWidth={1.6} />
                <circle cx={cx(col)} cy={yc} r={5} fill="#38c6e8" />
                {op.gate === 'CZ' ? (
                  <circle cx={cx(col)} cy={yt} r={5} fill="#38c6e8" />
                ) : (
                  <>
                    <circle cx={cx(col)} cy={yt} r={11} fill="none" stroke="#38c6e8" strokeWidth={1.6} />
                    <line x1={cx(col) - 11} y1={yt} x2={cx(col) + 11} y2={yt} stroke="#38c6e8" strokeWidth={1.6} />
                    <line x1={cx(col)} y1={yt - 11} x2={cx(col)} y2={yt + 11} stroke="#38c6e8" strokeWidth={1.6} />
                  </>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={reset}
          className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200 text-xs font-mono transition-all">
          ↺ Clear
        </button>
        <button onClick={measure}
          className="px-3 py-1.5 rounded-lg border border-plasma-500/30 text-plasma-300 hover:border-plasma-500/60 text-xs font-mono transition-all">
          ⚡ Measure
        </button>
        {measured !== null && (
          <span className="text-xs font-mono text-plasma-300">→ |{label(measured)}⟩</span>
        )}
        <span className="text-[10px] text-slate-600 ml-auto">click a placed gate to remove it</span>
      </div>

      {/* Statevector bar chart */}
      <div>
        <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mb-2">
          Statevector — P = |amplitude|²
        </div>
        <div className="grid gap-y-0.5" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
          {Array.from({ length: DIM }).map((_, i) => {
            const p = probs[i]
            const dim = p < 1e-6
            return (
              <div key={i} className="contents">
                <span className={`font-mono text-[10px] pr-2 self-center ${dim ? 'text-slate-700' : measured === i ? 'text-plasma-300' : 'text-slate-400'}`}>
                  |{label(i)}⟩
                </span>
                <div className="self-center h-2.5 rounded bg-void-800 overflow-hidden">
                  <div className="h-full rounded transition-all duration-300"
                    style={{ width: `${p * 100}%`, background: measured === i ? '#ff5ec4' : '#a259ff' }} />
                </div>
                <span className={`font-mono text-[10px] pl-2 self-center tabular-nums ${dim ? 'text-slate-700' : 'text-slate-500'}`}>
                  {(p * 100).toFixed(1)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

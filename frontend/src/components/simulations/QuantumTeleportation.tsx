'use client'
import { useState } from 'react'

// Teleportation moves an unknown qubit state |ψ⟩ from Alice to Bob using a
// shared entangled (Bell) pair plus two classical bits. No qubit travels — only
// the two measurement bits do — and Alice's copy is destroyed (no cloning).
const STEPS = [
  {
    title: 'Share a Bell pair',
    body: 'Alice and Bob each take one qubit of an entangled pair |Φ⁺⟩ = (|00⟩+|11⟩)/√2. Alice also holds the unknown state |ψ⟩ = α|0⟩ + β|1⟩ she wants to send.',
  },
  {
    title: 'Entangle |ψ⟩ with the pair',
    body: 'Alice applies CNOT from |ψ⟩ to her half of the Bell pair, then a Hadamard on |ψ⟩. This couples the unknown state into the three-qubit entanglement.',
  },
  {
    title: 'Alice measures her two qubits',
    body: 'Measuring collapses Alice’s qubits to two classical bits (m₁, m₀). Each of the four outcomes is equally likely — the bits carry no usable information on their own.',
  },
  {
    title: 'Send the classical bits',
    body: 'Alice sends (m₁, m₀) to Bob over an ordinary classical channel. This is limited by the speed of light, so teleportation transmits no information faster than light.',
  },
  {
    title: 'Bob corrects his qubit',
    body: 'Bob applies X if m₁=1 and then Z if m₀=1. His qubit is now exactly |ψ⟩ — the original is gone from Alice’s side, consistent with no-cloning.',
  },
]

export default function QuantumTeleportation() {
  const [step, setStep] = useState(0)
  const [bits, setBits] = useState<[number, number] | null>(null)

  const advance = () => {
    setStep((s) => {
      const next = Math.min(STEPS.length - 1, s + 1)
      // Sample the measurement outcome when reaching the measurement step.
      if (next === 2 && bits === null) {
        setBits([Math.random() < 0.5 ? 0 : 1, Math.random() < 0.5 ? 0 : 1])
      }
      return next
    })
  }
  const reset = () => { setStep(0); setBits(null) }

  const W = 560, H = 180
  const lanes = [
    { y: 40, label: 'Alice  |ψ⟩', color: '#a259ff' },
    { y: 90, label: 'Alice  (pair)', color: '#38c6e8' },
    { y: 140, label: 'Bob    (pair)', color: '#38c6e8' },
  ]
  const x = { bell: 150, cnot: 230, h: 270, meas: 330, corr: 470 }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-void-950/60 border border-white/5 overflow-x-auto">
        <svg width={W} height={H} className="block" style={{ minWidth: '100%' }}>
          {lanes.map((ln, i) => (
            <g key={i}>
              <text x={8} y={ln.y + 4} fontSize={11} fontFamily="monospace" className="fill-slate-500">{ln.label}</text>
              <line x1={108} y1={ln.y} x2={W - 12} y2={ln.y} stroke="rgba(255,255,255,0.12)" />
            </g>
          ))}

          {/* Entanglement bracket between the two pair lanes */}
          {step >= 0 && (
            <path d={`M ${x.bell} ${lanes[1].y} C ${x.bell - 26} ${lanes[1].y}, ${x.bell - 26} ${lanes[2].y}, ${x.bell} ${lanes[2].y}`}
              fill="none" stroke="#38c6e8" strokeWidth={1.4} strokeDasharray="3 3" opacity={0.8} />
          )}

          {/* CNOT + H (step 1+) */}
          {step >= 1 && (
            <g opacity={step === 1 ? 1 : 0.5}>
              <line x1={x.cnot} y1={lanes[0].y} x2={x.cnot} y2={lanes[1].y} stroke="#a259ff" strokeWidth={1.6} />
              <circle cx={x.cnot} cy={lanes[0].y} r={4} fill="#a259ff" />
              <circle cx={x.cnot} cy={lanes[1].y} r={9} fill="none" stroke="#a259ff" strokeWidth={1.6} />
              <rect x={x.h - 11} y={lanes[0].y - 11} width={22} height={22} rx={4} fill="#16102e" stroke="#a259ff" />
              <text x={x.h} y={lanes[0].y + 4} textAnchor="middle" fontSize={11} fontFamily="monospace" className="fill-quantum-200">H</text>
            </g>
          )}

          {/* Measurement (step 2+) */}
          {step >= 2 && (
            <g>
              {[0, 1].map((k) => (
                <g key={k}>
                  <rect x={x.meas - 12} y={lanes[k].y - 12} width={24} height={24} rx={4} fill="#1a1030" stroke="#ff5ec4" />
                  <text x={x.meas} y={lanes[k].y + 4} textAnchor="middle" fontSize={12} className="fill-plasma-300">⊟</text>
                </g>
              ))}
              {bits && (
                <text x={x.meas + 18} y={lanes[0].y - 16} fontSize={11} fontFamily="monospace" className="fill-plasma-300">
                  m₁={bits[0]} m₀={bits[1]}
                </text>
              )}
            </g>
          )}

          {/* Classical channel (step 3+) */}
          {step >= 3 && (
            <line x1={x.meas} y1={lanes[1].y + 14} x2={x.corr} y2={lanes[2].y - 14}
              stroke="#facc15" strokeWidth={1.4} strokeDasharray="5 3" markerEnd="" opacity={0.9} />
          )}

          {/* Bob's correction (step 4) */}
          {step >= 4 && (
            <g>
              <rect x={x.corr - 12} y={lanes[2].y - 12} width={24} height={24} rx={4} fill="#16102e" stroke="#38c6e8" />
              <text x={x.corr} y={lanes[2].y + 4} textAnchor="middle" fontSize={10} fontFamily="monospace" className="fill-wave-300">
                {bits ? `${bits[0] ? 'X' : ''}${bits[1] ? 'Z' : ''}` || 'I' : 'XZ'}
              </text>
              <text x={x.corr + 18} y={lanes[2].y + 4} fontSize={11} fontFamily="monospace" className="fill-quantum-200">= |ψ⟩</text>
            </g>
          )}
        </svg>
      </div>

      <div className="card-quantum p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-quantum-400">Step {step + 1}/{STEPS.length}</span>
          <span className="text-sm font-medium text-white">{STEPS[step].title}</span>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">{STEPS[step].body}</p>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={reset}
          className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:border-white/20 text-xs font-mono transition-all">
          ↺ Restart
        </button>
        <button onClick={advance} disabled={step >= STEPS.length - 1}
          className="px-3 py-1.5 rounded-lg border border-quantum-500/30 text-quantum-300 hover:border-quantum-500/60 disabled:opacity-40 text-xs font-mono transition-all">
          Next step →
        </button>
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'

// An explorer for canonical tree-level Feynman diagrams. Each process is a set
// of lines (fermions with arrows, wavy photons/W bosons) meeting at vertices.
// (Freeform drag-to-build is simplified to a curated set so every diagram is a
// physically valid process.)
type LineKind = 'fermion' | 'photon' | 'wboson'
interface Seg { kind: LineKind; x1: number; y1: number; x2: number; y2: number; label?: string }
interface Process { id: string; name: string; desc: string; segs: Seg[]; vertices: [number, number][] }

const PROCESSES: Process[] = [
  {
    id: 'moller', name: 'Møller scattering', desc: 'e⁻e⁻ → e⁻e⁻: two electrons repel by exchanging a virtual photon (t-channel).',
    vertices: [[230, 60], [230, 180]],
    segs: [
      { kind: 'fermion', x1: 50, y1: 60, x2: 230, y2: 60, label: 'e⁻' },
      { kind: 'fermion', x1: 230, y1: 60, x2: 410, y2: 60, label: 'e⁻' },
      { kind: 'fermion', x1: 50, y1: 180, x2: 230, y2: 180, label: 'e⁻' },
      { kind: 'fermion', x1: 230, y1: 180, x2: 410, y2: 180, label: 'e⁻' },
      { kind: 'photon', x1: 230, y1: 60, x2: 230, y2: 180, label: 'γ' },
    ],
  },
  {
    id: 'compton', name: 'Compton scattering', desc: 'e⁻γ → e⁻γ: a photon scatters off an electron via a virtual electron propagator.',
    vertices: [[180, 120], [300, 120]],
    segs: [
      { kind: 'fermion', x1: 50, y1: 180, x2: 180, y2: 120, label: 'e⁻' },
      { kind: 'photon', x1: 50, y1: 60, x2: 180, y2: 120, label: 'γ' },
      { kind: 'fermion', x1: 180, y1: 120, x2: 300, y2: 120, label: 'e⁻' },
      { kind: 'fermion', x1: 300, y1: 120, x2: 410, y2: 60, label: 'e⁻' },
      { kind: 'photon', x1: 300, y1: 120, x2: 410, y2: 180, label: 'γ' },
    ],
  },
  {
    id: 'annihilation', name: 'Pair annihilation', desc: 'e⁺e⁻ → γγ: an electron and positron annihilate into two photons.',
    vertices: [[190, 80], [190, 160]],
    segs: [
      { kind: 'fermion', x1: 50, y1: 60, x2: 190, y2: 80, label: 'e⁻' },
      { kind: 'fermion', x1: 50, y1: 200, x2: 190, y2: 160, label: 'e⁺' },
      { kind: 'fermion', x1: 190, y1: 80, x2: 190, y2: 160 },
      { kind: 'photon', x1: 190, y1: 80, x2: 410, y2: 50, label: 'γ' },
      { kind: 'photon', x1: 190, y1: 160, x2: 410, y2: 190, label: 'γ' },
    ],
  },
  {
    id: 'beta', name: 'Beta-minus decay', desc: 'A down quark turns into an up quark, emitting a W⁻ that decays to an electron and antineutrino.',
    vertices: [[200, 55], [285, 150]],
    segs: [
      { kind: 'fermion', x1: 50, y1: 55, x2: 200, y2: 55, label: 'd' },
      { kind: 'fermion', x1: 200, y1: 55, x2: 410, y2: 55, label: 'u' },
      { kind: 'wboson', x1: 200, y1: 55, x2: 285, y2: 150, label: 'W⁻' },
      { kind: 'fermion', x1: 285, y1: 150, x2: 410, y2: 120, label: 'e⁻' },
      { kind: 'fermion', x1: 285, y1: 150, x2: 410, y2: 195, label: 'ν̄ₑ' },
    ],
  },
]

// Build a wavy SVG path between two points (photons / W bosons).
function wavy(x1: number, y1: number, x2: number, y2: number, amp: number) {
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.hypot(dx, dy)
  const ux = dx / len, uy = dy / len
  const px = -uy, py = ux // perpendicular
  const waves = Math.max(3, Math.round(len / 14))
  let d = `M ${x1} ${y1}`
  for (let i = 1; i <= waves * 6; i++) {
    const f = i / (waves * 6)
    const off = Math.sin(f * waves * Math.PI * 2) * amp
    d += ` L ${x1 + dx * f + px * off} ${y1 + dy * f + py * off}`
  }
  return d
}

export default function FeynmanDiagram() {
  const [proc, setProc] = useState<Process>(PROCESSES[0])
  const COLOR: Record<LineKind, string> = { fermion: '#38c6e8', photon: '#a259ff', wboson: '#f59e0b' }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        {PROCESSES.map((p) => (
          <button key={p.id} onClick={() => setProc(p)}
            className={`px-2.5 py-1 rounded text-xs transition-all border ${
              proc.id === p.id ? 'border-quantum-500/60 bg-quantum-500/15 text-quantum-200' : 'border-white/10 text-slate-400 hover:border-white/20'
            }`}>
            {p.name}
          </button>
        ))}
      </div>

      <div className="rounded-lg bg-void-950/60 border border-white/5 overflow-x-auto">
        <svg width={460} height={250} className="block" style={{ minWidth: '100%' }}>
          <defs>
            <marker id="fm-arrow" markerWidth="9" markerHeight="9" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#38c6e8" />
            </marker>
          </defs>
          {proc.segs.map((s, i) => {
            const mx = (s.x1 + s.x2) / 2, my = (s.y1 + s.y2) / 2
            return (
              <g key={i}>
                {/* Fermion: two segments so a midpoint arrowhead shows the flow. */}
                {s.kind === 'fermion' && (
                  <>
                    <line x1={s.x1} y1={s.y1} x2={mx} y2={my} stroke={COLOR.fermion} strokeWidth={1.8} markerEnd="url(#fm-arrow)" />
                    <line x1={mx} y1={my} x2={s.x2} y2={s.y2} stroke={COLOR.fermion} strokeWidth={1.8} />
                  </>
                )}
                {s.kind !== 'fermion' && (
                  <path d={wavy(s.x1, s.y1, s.x2, s.y2, s.kind === 'wboson' ? 7 : 5)} fill="none" stroke={COLOR[s.kind]} strokeWidth={1.8} />
                )}
                {s.label && (() => {
                  // Label the external (off-graph) end; internal lines label their midpoint.
                  const leftExt = s.x1 <= 60 || s.x2 <= 60
                  const rightExt = s.x1 >= 410 || s.x2 >= 410
                  if (leftExt) {
                    const y = s.x1 <= 60 ? s.y1 : s.y2
                    return <text x={Math.min(s.x1, s.x2) - 6} y={y + 4} textAnchor="end" fontSize={12} fontFamily="monospace" fill={COLOR[s.kind]}>{s.label}</text>
                  }
                  if (rightExt) {
                    const y = s.x1 >= 410 ? s.y1 : s.y2
                    return <text x={Math.max(s.x1, s.x2) + 6} y={y + 4} fontSize={12} fontFamily="monospace" fill={COLOR[s.kind]}>{s.label}</text>
                  }
                  return <text x={mx + 8} y={my + 2} fontSize={12} fontFamily="monospace" fill={COLOR[s.kind]}>{s.label}</text>
                })()}
              </g>
            )
          })}
          {proc.vertices.map(([vx, vy], i) => (
            <circle key={i} cx={vx} cy={vy} r={4} fill="#fff" stroke="#a259ff" strokeWidth={1.5} />
          ))}
          <text x={10} y={242} fontSize={10} fontFamily="monospace" className="fill-slate-600">
            time →   ·   {proc.vertices.length} vertices
          </text>
        </svg>
      </div>

      <p className="text-sm text-slate-400 leading-relaxed">{proc.desc}</p>
    </div>
  )
}

'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import type { SimulationType } from '@/types'

const DoubleSlit = dynamic(() => import('@/components/simulations/DoubleSlit'), { ssr: false })
const ParticleInBox = dynamic(() => import('@/components/simulations/ParticleInBox'), { ssr: false })
const Wavefunction = dynamic(() => import('@/components/simulations/Wavefunction'), { ssr: false })
const QuantumTunneling = dynamic(() => import('@/components/simulations/QuantumTunneling'), { ssr: false })

type Difficulty = 'beginner' | 'intermediate' | 'advanced'

interface Topic {
  id: SimulationType
  label: string
  tagline: string
  icon: string
  difficulty: Difficulty
  /** Short narrative explanation, rendered above the live animation. */
  explanation: string[]
  /** Bullet takeaways highlighted beside the explanation. */
  keyPoints: string[]
  render: () => React.ReactNode
}

// Quantum topics presented serially — each unlocks an explanation + live animation on click.
const TOPICS: Topic[] = [
  {
    id: 'double_slit',
    label: 'The Double-Slit Experiment',
    tagline: 'Why a single particle interferes with itself.',
    icon: '◈',
    difficulty: 'beginner',
    explanation: [
      'Fire particles one at a time at a barrier with two narrow openings. Classically you would expect two bright bands behind the slits. Instead, an interference pattern of many fringes builds up — even though particles arrive one by one and never meet.',
      'Each particle travels as a probability wave that passes through both slits at once. The two paths interfere, and the squared amplitude of the combined wave sets the odds of where the particle lands. Where the waves add you get bright fringes; where they cancel, dark gaps.',
    ],
    keyPoints: [
      'A particle behaves like a wave until it is detected.',
      'Probability = |ψ|² of the combined two-path amplitude.',
      'Fringe spacing grows with wavelength and shrinks with slit separation.',
    ],
    render: () => <DoubleSlit />,
  },
  {
    id: 'particle_in_box',
    label: 'Particle in a Box',
    tagline: 'How confinement quantises energy.',
    icon: '⊞',
    difficulty: 'beginner',
    explanation: [
      'Trap a particle between two infinitely high walls. Its wavefunction must vanish at both walls, so only standing waves with a whole number of half-wavelengths fit — exactly like the harmonics of a guitar string.',
      'Because only certain wavelengths are allowed, only certain energies are allowed: E ∝ n². Energy becomes discrete, or "quantised", purely as a consequence of confining the particle. The lowest state still carries non-zero zero-point energy.',
    ],
    keyPoints: [
      'Boundary conditions force ψ = 0 at the walls.',
      'Allowed energies are discrete: Eₙ ∝ n².',
      'There is no zero-energy state — confinement guarantees motion.',
    ],
    render: () => <ParticleInBox />,
  },
  {
    id: 'wavefunction',
    label: 'Wavefunction Evolution',
    tagline: 'How a wave packet spreads through time.',
    icon: '∿',
    difficulty: 'intermediate',
    explanation: [
      'A free particle can be described by a Gaussian wave packet — a localised bump of probability. The Schrödinger equation tells that packet how to evolve, and the result is that it inevitably spreads out as time passes.',
      'Spreading is the price of localisation: a tightly-pinned position requires a wide spread of momenta, and those momentum components travel at different speeds, smearing the packet. Position and momentum cannot both be sharp — the uncertainty principle in motion.',
    ],
    keyPoints: [
      'The Schrödinger equation drives the time evolution of ψ.',
      'A localised packet necessarily disperses over time.',
      'Δx · Δp ≥ ℏ/2 — sharper position means fuzzier momentum.',
    ],
    render: () => <Wavefunction />,
  },
  {
    id: 'quantum_tunneling',
    label: 'Quantum Tunneling',
    tagline: 'Passing through walls that should stop you.',
    icon: '→',
    difficulty: 'advanced',
    explanation: [
      'Send a particle at a potential barrier taller than its energy. Classically it must bounce back. Quantum mechanically its wavefunction decays inside the barrier rather than stopping dead — and if the barrier is thin enough, a small amplitude survives on the far side.',
      'That surviving amplitude means a real, non-zero chance of finding the particle beyond a wall it could never climb. Tunneling powers radioactive alpha decay, the scanning tunneling microscope, and fusion in the core of the Sun.',
    ],
    keyPoints: [
      'ψ decays exponentially inside a classically forbidden barrier.',
      'Thinner, lower barriers give exponentially higher transmission.',
      'Real-world payoff: alpha decay, STM imaging, stellar fusion.',
    ],
    render: () => <QuantumTunneling />,
  },
]

const DIFF_LABEL: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export default function SimulationsPage() {
  // Serial walkthrough: one topic expanded at a time. First topic open by default.
  const [openId, setOpenId] = useState<SimulationType | null>(TOPICS[0].id)

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Quantum Simulations</h1>
        <p className="text-sm text-slate-500">
          Work through each quantum topic in order. Click a topic to reveal its explanation and a
          live, interactive animation.
        </p>
      </div>

      <ol className="space-y-4">
        {TOPICS.map((topic, i) => {
          const isOpen = openId === topic.id
          return (
            <li key={topic.id}>
              <div
                className={cn(
                  'card-quantum overflow-hidden transition-all duration-300',
                  isOpen ? 'shadow-quantum-glow border-quantum-500/40' : 'border-white/5'
                )}
              >
                {/* Clickable topic header */}
                <button
                  onClick={() => setOpenId(isOpen ? null : topic.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-4 p-5 text-left transition-colors hover:bg-white/[0.02]"
                >
                  {/* Serial number badge */}
                  <span
                    className={cn(
                      'flex items-center justify-center w-9 h-9 rounded-full font-mono text-sm shrink-0 border transition-colors',
                      isOpen
                        ? 'border-quantum-500/50 bg-quantum-500/10 text-quantum-300'
                        : 'border-white/10 text-slate-500'
                    )}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <span
                    className={cn(
                      'text-2xl font-mono shrink-0 transition-colors',
                      isOpen ? 'text-quantum-400' : 'text-slate-600'
                    )}
                  >
                    {topic.icon}
                  </span>

                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-semibold text-white">{topic.label}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded badge-${topic.difficulty}`}>
                        {DIFF_LABEL[topic.difficulty]}
                      </span>
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5">{topic.tagline}</span>
                  </span>

                  <span
                    className={cn(
                      'text-slate-500 transition-transform duration-300 shrink-0',
                      isOpen && 'rotate-180'
                    )}
                  >
                    ▾
                  </span>
                </button>

                {/* Expanded panel: explanation + live animation */}
                {isOpen && (
                  <div className="px-5 pb-6 border-t border-white/5">
                    <div className="grid md:grid-cols-[1.1fr_1fr] gap-6 pt-5">
                      <div className="space-y-3">
                        {topic.explanation.map((para, p) => (
                          <p key={p} className="text-sm text-slate-300 leading-relaxed">
                            {para}
                          </p>
                        ))}
                      </div>
                      <div>
                        <h3 className="text-[11px] font-mono uppercase tracking-widest text-slate-500 mb-3">
                          Key ideas
                        </h3>
                        <ul className="space-y-2">
                          {topic.keyPoints.map((point, k) => (
                            <li key={k} className="flex gap-2 text-sm text-slate-400">
                              <span className="text-quantum-400 shrink-0">▸</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="h-px flex-1 bg-white/5" />
                        <span className="text-[11px] font-mono uppercase tracking-widest text-quantum-400">
                          Live animation
                        </span>
                        <span className="h-px flex-1 bg-white/5" />
                      </div>
                      {topic.render()}
                    </div>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

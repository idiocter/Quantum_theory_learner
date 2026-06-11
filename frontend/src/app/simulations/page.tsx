'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import type { SimulationType } from '@/types'

const DoubleSlit = dynamic(() => import('@/components/simulations/DoubleSlit'), { ssr: false })
const ParticleInBox = dynamic(() => import('@/components/simulations/ParticleInBox'), { ssr: false })
const Wavefunction = dynamic(() => import('@/components/simulations/Wavefunction'), { ssr: false })
const QuantumTunneling = dynamic(() => import('@/components/simulations/QuantumTunneling'), { ssr: false })

const SIMULATIONS: { id: SimulationType; label: string; desc: string; icon: string }[] = [
  {
    id: 'double_slit',
    label: 'Double-Slit Experiment',
    desc: 'Observe quantum interference as particles pass through two slits simultaneously.',
    icon: '◈',
  },
  {
    id: 'particle_in_box',
    label: 'Particle in a Box',
    desc: 'Visualize standing wave eigenstates of an infinite square well potential.',
    icon: '⊞',
  },
  {
    id: 'wavefunction',
    label: 'Wavefunction Evolution',
    desc: 'Watch a Gaussian wave packet spread and evolve over time.',
    icon: '∿',
  },
  {
    id: 'quantum_tunneling',
    label: 'Quantum Tunneling',
    desc: 'See how particles penetrate classically forbidden potential barriers.',
    icon: '→',
  },
]

export default function SimulationsPage() {
  const [active, setActive] = useState<SimulationType>('double_slit')

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Quantum Simulations</h1>
        <p className="text-sm text-slate-500">
          Interactive quantum physics experiments. Adjust parameters and observe the results.
        </p>
      </div>

      {/* Tab selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {SIMULATIONS.map((sim) => (
          <button
            key={sim.id}
            onClick={() => setActive(sim.id)}
            className={cn(
              'p-4 rounded-xl border text-left transition-all duration-300',
              active === sim.id
                ? 'border-quantum-500/50 bg-quantum-500/10 shadow-quantum-glow'
                : 'border-white/5 bg-void-900/40 hover:border-white/10 hover:bg-void-800/40'
            )}
          >
            <div className={cn('text-xl mb-2 font-mono', active === sim.id ? 'text-quantum-400' : 'text-slate-600')}>
              {sim.icon}
            </div>
            <div className="text-xs font-semibold text-white">{sim.label}</div>
          </button>
        ))}
      </div>

      {/* Simulation panel */}
      <div className="card-quantum p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">
            {SIMULATIONS.find((s) => s.id === active)?.label}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {SIMULATIONS.find((s) => s.id === active)?.desc}
          </p>
        </div>

        <div className="min-h-[420px]">
          {active === 'double_slit' && <DoubleSlit />}
          {active === 'particle_in_box' && <ParticleInBox />}
          {active === 'wavefunction' && <Wavefunction />}
          {active === 'quantum_tunneling' && <QuantumTunneling />}
        </div>
      </div>
    </div>
  )
}

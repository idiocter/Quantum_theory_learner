'use client'
// Client-only registry of the interactive simulation components. These are
// canvas/Three.js animations that can't render on the server, so they are
// loaded with `dynamic(..., { ssr: false })` — which Next only permits inside a
// Client Component. Keeping them here lets the server-safe topic data in
// `@/data/topics` reference them without dragging `ssr: false` into the RSC graph.
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

// Skeleton shown while a simulation's JS chunk loads (each sim is code-split).
function SimLoading() {
  return (
    <div className="h-64 flex items-center justify-center rounded-lg bg-void-900/40 text-slate-600 text-xs font-mono animate-pulse">
      loading simulation…
    </div>
  )
}
export const DoubleSlit = dynamic(() => import('@/components/simulations/DoubleSlit'), { ssr: false, loading: SimLoading })
export const ParticleInBox = dynamic(() => import('@/components/simulations/ParticleInBox'), { ssr: false, loading: SimLoading })
export const Wavefunction = dynamic(() => import('@/components/simulations/Wavefunction'), { ssr: false, loading: SimLoading })
export const QuantumTunneling = dynamic(() => import('@/components/simulations/QuantumTunneling'), { ssr: false, loading: SimLoading })
export const Superposition = dynamic(() => import('@/components/simulations/Superposition'), { ssr: false, loading: SimLoading })
export const Entanglement = dynamic(() => import('@/components/simulations/Entanglement'), { ssr: false, loading: SimLoading })
export const Uncertainty = dynamic(() => import('@/components/simulations/Uncertainty'), { ssr: false, loading: SimLoading })
export const SternGerlach = dynamic(() => import('@/components/simulations/SternGerlach'), { ssr: false, loading: SimLoading })
export const HarmonicOscillator = dynamic(() => import('@/components/simulations/HarmonicOscillator'), { ssr: false, loading: SimLoading })
export const BlochSphere = dynamic(() => import('@/components/simulations/BlochSphere'), { ssr: false, loading: SimLoading })
export const Photoelectric = dynamic(() => import('@/components/simulations/Photoelectric'), { ssr: false, loading: SimLoading })
export const Blackbody = dynamic(() => import('@/components/simulations/Blackbody'), { ssr: false, loading: SimLoading })
export const Measurement = dynamic(() => import('@/components/simulations/Measurement'), { ssr: false, loading: SimLoading })
export const BornRuleSampler = dynamic(() => import('@/components/simulations/BornRuleSampler'), { ssr: false, loading: SimLoading })
export const QuantumCircuit = dynamic(() => import('@/components/simulations/QuantumCircuit'), { ssr: false, loading: SimLoading })
export const GroverAmplification = dynamic(() => import('@/components/simulations/GroverAmplification'), { ssr: false, loading: SimLoading })
export const BB84Protocol = dynamic(() => import('@/components/simulations/BB84Protocol'), { ssr: false, loading: SimLoading })
export const QuantumTeleportation = dynamic(() => import('@/components/simulations/QuantumTeleportation'), { ssr: false, loading: SimLoading })
export const BandTheory = dynamic(() => import('@/components/simulations/BandTheory'), { ssr: false, loading: SimLoading })
export const CooperPairs = dynamic(() => import('@/components/simulations/CooperPairs'), { ssr: false, loading: SimLoading })
export const BECCondensate = dynamic(() => import('@/components/simulations/BECCondensate'), { ssr: false, loading: SimLoading })
export const StandardModelTable = dynamic(() => import('@/components/simulations/StandardModelTable'), { ssr: false, loading: SimLoading })
export const FeynmanDiagram = dynamic(() => import('@/components/simulations/FeynmanDiagram'), { ssr: false, loading: SimLoading })
export const HiggsPotential = dynamic(() => import('@/components/simulations/HiggsPotential'), { ssr: false, loading: SimLoading })
export const BellTest = dynamic(() => import('@/components/simulations/BellTest'), { ssr: false, loading: SimLoading })
export const ManyWorldsBranching = dynamic(() => import('@/components/simulations/ManyWorldsBranching'), { ssr: false, loading: SimLoading })
export const DecoherenceTime = dynamic(() => import('@/components/simulations/DecoherenceTime'), { ssr: false, loading: SimLoading })
export const HawkingRadiation = dynamic(() => import('@/components/simulations/HawkingRadiation'), { ssr: false, loading: SimLoading })
export const PhotosynthesisCoherence = dynamic(() => import('@/components/simulations/PhotosynthesisCoherence'), { ssr: false, loading: SimLoading })

// Maps a Concept's `related_simulation` key (set in the seed, e.g. "double_slit")
// to its interactive component. AnimationSlot uses this to render the right sim
// on a topic page. Stub topics carry an empty key and render no slot.
export const SIMULATION_BY_KEY: Record<string, ComponentType> = {
  double_slit: DoubleSlit,
  particle_in_box: ParticleInBox,
  wavefunction: Wavefunction,
  quantum_tunneling: QuantumTunneling,
  superposition: Superposition,
  entanglement: Entanglement,
  uncertainty: Uncertainty,
  spin: SternGerlach,
  harmonic_oscillator: HarmonicOscillator,
  qubit: BlochSphere,
  photoelectric: Photoelectric,
  blackbody: Blackbody,
  measurement: Measurement,
  born_rule: BornRuleSampler,
  quantum_circuit: QuantumCircuit,
  grover: GroverAmplification,
  bb84: BB84Protocol,
  teleportation: QuantumTeleportation,
  band_theory: BandTheory,
  cooper_pairs: CooperPairs,
  bec: BECCondensate,
  standard_model: StandardModelTable,
  feynman: FeynmanDiagram,
  higgs: HiggsPotential,
  bell: BellTest,
  many_worlds: ManyWorldsBranching,
  decoherence: DecoherenceTime,
  hawking: HawkingRadiation,
  photosynthesis: PhotosynthesisCoherence,
}

export function getSimulation(key?: string | null): ComponentType | null {
  if (!key) return null
  return SIMULATION_BY_KEY[key] ?? null
}

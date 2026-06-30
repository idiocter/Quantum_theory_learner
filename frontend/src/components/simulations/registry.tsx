'use client'
// Client-only registry of the interactive simulation components. These are
// canvas/Three.js animations that can't render on the server, so they are
// loaded with `dynamic(..., { ssr: false })` — which Next only permits inside a
// Client Component. Keeping them here lets the server-safe topic data in
// `@/data/topics` reference them without dragging `ssr: false` into the RSC graph.
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

export const DoubleSlit = dynamic(() => import('@/components/simulations/DoubleSlit'), { ssr: false })
export const ParticleInBox = dynamic(() => import('@/components/simulations/ParticleInBox'), { ssr: false })
export const Wavefunction = dynamic(() => import('@/components/simulations/Wavefunction'), { ssr: false })
export const QuantumTunneling = dynamic(() => import('@/components/simulations/QuantumTunneling'), { ssr: false })
export const Superposition = dynamic(() => import('@/components/simulations/Superposition'), { ssr: false })
export const Entanglement = dynamic(() => import('@/components/simulations/Entanglement'), { ssr: false })
export const Uncertainty = dynamic(() => import('@/components/simulations/Uncertainty'), { ssr: false })
export const SternGerlach = dynamic(() => import('@/components/simulations/SternGerlach'), { ssr: false })
export const HarmonicOscillator = dynamic(() => import('@/components/simulations/HarmonicOscillator'), { ssr: false })
export const BlochSphere = dynamic(() => import('@/components/simulations/BlochSphere'), { ssr: false })
export const Photoelectric = dynamic(() => import('@/components/simulations/Photoelectric'), { ssr: false })
export const Blackbody = dynamic(() => import('@/components/simulations/Blackbody'), { ssr: false })
export const Measurement = dynamic(() => import('@/components/simulations/Measurement'), { ssr: false })
export const BornRuleSampler = dynamic(() => import('@/components/simulations/BornRuleSampler'), { ssr: false })
export const QuantumCircuit = dynamic(() => import('@/components/simulations/QuantumCircuit'), { ssr: false })
export const GroverAmplification = dynamic(() => import('@/components/simulations/GroverAmplification'), { ssr: false })
export const BB84Protocol = dynamic(() => import('@/components/simulations/BB84Protocol'), { ssr: false })
export const QuantumTeleportation = dynamic(() => import('@/components/simulations/QuantumTeleportation'), { ssr: false })
export const BandTheory = dynamic(() => import('@/components/simulations/BandTheory'), { ssr: false })
export const CooperPairs = dynamic(() => import('@/components/simulations/CooperPairs'), { ssr: false })
export const BECCondensate = dynamic(() => import('@/components/simulations/BECCondensate'), { ssr: false })
export const StandardModelTable = dynamic(() => import('@/components/simulations/StandardModelTable'), { ssr: false })
export const FeynmanDiagram = dynamic(() => import('@/components/simulations/FeynmanDiagram'), { ssr: false })
export const HiggsPotential = dynamic(() => import('@/components/simulations/HiggsPotential'), { ssr: false })
export const BellTest = dynamic(() => import('@/components/simulations/BellTest'), { ssr: false })
export const ManyWorldsBranching = dynamic(() => import('@/components/simulations/ManyWorldsBranching'), { ssr: false })
export const DecoherenceTime = dynamic(() => import('@/components/simulations/DecoherenceTime'), { ssr: false })
export const HawkingRadiation = dynamic(() => import('@/components/simulations/HawkingRadiation'), { ssr: false })
export const PhotosynthesisCoherence = dynamic(() => import('@/components/simulations/PhotosynthesisCoherence'), { ssr: false })

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

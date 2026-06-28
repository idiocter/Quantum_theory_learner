'use client'
// Client-only registry of the interactive simulation components. These are
// canvas/Three.js animations that can't render on the server, so they are
// loaded with `dynamic(..., { ssr: false })` — which Next only permits inside a
// Client Component. Keeping them here lets the server-safe topic data in
// `@/data/topics` reference them without dragging `ssr: false` into the RSC graph.
import dynamic from 'next/dynamic'

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

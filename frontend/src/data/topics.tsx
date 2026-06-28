import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'

const DoubleSlit = dynamic(() => import('@/components/simulations/DoubleSlit'), { ssr: false })
const ParticleInBox = dynamic(() => import('@/components/simulations/ParticleInBox'), { ssr: false })
const Wavefunction = dynamic(() => import('@/components/simulations/Wavefunction'), { ssr: false })
const QuantumTunneling = dynamic(() => import('@/components/simulations/QuantumTunneling'), { ssr: false })
const Superposition = dynamic(() => import('@/components/simulations/Superposition'), { ssr: false })
const Entanglement = dynamic(() => import('@/components/simulations/Entanglement'), { ssr: false })
const Uncertainty = dynamic(() => import('@/components/simulations/Uncertainty'), { ssr: false })
const SternGerlach = dynamic(() => import('@/components/simulations/SternGerlach'), { ssr: false })

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

/** Thematic grouping used to break the serial walkthrough into chapters. */
export type TopicCategory = 'foundations' | 'dynamics' | 'information' | 'light-and-matter'

export const CATEGORY_META: Record<TopicCategory, { label: string; blurb: string }> = {
  foundations: {
    label: 'Foundations',
    blurb: 'The experiments and principles that forced physics to go quantum.',
  },
  dynamics: {
    label: 'States & Dynamics',
    blurb: 'How quantum states are shaped, confined, and evolve in time.',
  },
  information: {
    label: 'Quantum Information',
    blurb: 'Superposition, entanglement, and the qubit as a unit of computation.',
  },
  'light-and-matter': {
    label: 'Light & Matter',
    blurb: 'Where quantisation first showed up: photons, electrons, and heat.',
  },
}

/** Order chapters render in. */
export const CATEGORY_ORDER: TopicCategory[] = [
  'foundations',
  'dynamics',
  'information',
  'light-and-matter',
]

export interface Topic {
  id: string
  label: string
  tagline: string
  icon: string
  difficulty: Difficulty
  category: TopicCategory
  /** Narrative explanation, rendered as stacked paragraphs above the animation. */
  explanation: string[]
  /** Bullet takeaways highlighted beside the explanation. */
  keyPoints: string[]
  /** Optional headline equation, shown as a monospace formula chip. */
  equation?: string
  /** The live, interactive animation for this topic. */
  render: () => ReactNode
}

export const TOPICS: Topic[] = [
  {
    id: 'double_slit',
    label: 'The Double-Slit Experiment',
    tagline: 'Why a single particle interferes with itself.',
    icon: '◈',
    difficulty: 'beginner',
    category: 'foundations',
    equation: 'P(y) = |ψ₁ + ψ₂|²',
    explanation: [
      'Fire particles one at a time at a barrier with two narrow openings. Classically you would expect two bright bands behind the slits. Instead, an interference pattern of many fringes builds up — even though particles arrive one by one and never meet.',
      'Each particle travels as a probability wave that passes through both slits at once. The two paths interfere, and the squared amplitude of the combined wave sets the odds of where the particle lands. Where the waves add you get bright fringes; where they cancel, dark gaps.',
      'Crucially, if you place a detector to learn which slit the particle went through, the interference vanishes and you recover two plain bands. Knowing the path destroys the superposition — measurement changes the outcome.',
    ],
    keyPoints: [
      'A particle behaves like a wave until it is detected.',
      'Probability = |ψ|² of the combined two-path amplitude.',
      'Fringe spacing grows with wavelength, shrinks with slit separation.',
      'Which-path information erases the interference pattern.',
    ],
    render: () => <DoubleSlit />,
  },
  {
    id: 'particle_in_box',
    label: 'Particle in a Box',
    tagline: 'How confinement quantises energy.',
    icon: '⊞',
    difficulty: 'beginner',
    category: 'dynamics',
    equation: 'Eₙ = n²h² / 8mL²',
    explanation: [
      'Trap a particle between two infinitely high walls. Its wavefunction must vanish at both walls, so only standing waves with a whole number of half-wavelengths fit — exactly like the harmonics of a guitar string.',
      'Because only certain wavelengths are allowed, only certain energies are allowed: E ∝ n². Energy becomes discrete, or "quantised", purely as a consequence of confining the particle. The lowest state still carries non-zero zero-point energy.',
      'Squaring each standing wave gives the probability of finding the particle at each position — with nodes where it is never found. This toy model underlies quantum dots, conjugated molecules, and nanoscale electronics.',
    ],
    keyPoints: [
      'Boundary conditions force ψ = 0 at the walls.',
      'Allowed energies are discrete: Eₙ ∝ n².',
      'There is no zero-energy state — confinement guarantees motion.',
      '|ψₙ|² has n−1 nodes where the particle is never found.',
    ],
    render: () => <ParticleInBox />,
  },
  {
    id: 'wavefunction',
    label: 'Wavefunction Evolution',
    tagline: 'How a wave packet spreads through time.',
    icon: '∿',
    difficulty: 'intermediate',
    category: 'dynamics',
    equation: 'iℏ ∂ψ/∂t = Ĥψ',
    explanation: [
      'A free particle can be described by a Gaussian wave packet — a localised bump of probability. The Schrödinger equation tells that packet how to evolve, and the result is that it inevitably spreads out as time passes.',
      'Spreading is the price of localisation: a tightly-pinned position requires a wide spread of momenta, and those momentum components travel at different speeds, smearing the packet. Position and momentum cannot both be sharp — the uncertainty principle in motion.',
      'The complex phase of ψ rotates as it travels, but only |ψ|² — the real probability density — is observable. The total probability always integrates to one, so the packet broadens and flattens rather than vanishing.',
    ],
    keyPoints: [
      'The Schrödinger equation drives the time evolution of ψ.',
      'A localised packet necessarily disperses over time.',
      'Δx · Δp ≥ ℏ/2 — sharper position means fuzzier momentum.',
      'Only |ψ|² is measurable; the phase stays hidden.',
    ],
    render: () => <Wavefunction />,
  },
  {
    id: 'quantum_tunneling',
    label: 'Quantum Tunneling',
    tagline: 'Passing through walls that should stop you.',
    icon: '→',
    difficulty: 'advanced',
    category: 'dynamics',
    equation: 'T ≈ e^(−2κL)',
    explanation: [
      'Send a particle at a potential barrier taller than its energy. Classically it must bounce back. Quantum mechanically its wavefunction decays inside the barrier rather than stopping dead — and if the barrier is thin enough, a small amplitude survives on the far side.',
      'That surviving amplitude means a real, non-zero chance of finding the particle beyond a wall it could never climb. The transmission probability falls off exponentially with barrier width and height, so tunneling is dramatic only at atomic scales.',
      'Tunneling powers radioactive alpha decay, the scanning tunneling microscope, flash memory, and the proton fusion that lets the Sun shine at temperatures far too low for classical collisions.',
    ],
    keyPoints: [
      'ψ decays exponentially inside a classically forbidden barrier.',
      'Thinner, lower barriers give exponentially higher transmission.',
      'Energy is conserved — tunneling does not "borrow" then repay it.',
      'Real-world payoff: alpha decay, STM imaging, stellar fusion.',
    ],
    render: () => <QuantumTunneling />,
  },
  {
    id: 'superposition',
    label: 'Quantum Superposition',
    tagline: 'Being in many states at once — until you look.',
    icon: '⊕',
    difficulty: 'beginner',
    category: 'information',
    equation: '|ψ⟩ = α|0⟩ + β|1⟩,  |α|² + |β|² = 1',
    explanation: [
      'A quantum system need not be in just one state. It can occupy a weighted sum — a superposition — of several at once. A qubit, the quantum bit, lives as α|0⟩ + β|1⟩, simultaneously a bit of zero and a bit of one.',
      'The complex weights α and β are amplitudes, not probabilities. You never observe the superposition directly: when measured, the state collapses to a single outcome, with probability |α|² for 0 and |β|² for 1. The two must sum to one because something definite always happens.',
      'Superposition is not ignorance about a hidden true value — the interference of the double-slit proves both branches are physically real before measurement. It is the resource that lets a quantum computer explore many possibilities in a single coherent state.',
    ],
    keyPoints: [
      'Amplitudes α, β are complex; probabilities are |α|² and |β|².',
      'Normalisation |α|² + |β|² = 1 — one definite outcome on measurement.',
      'Measurement collapses the superposition to a single basis state.',
      'It is a physical state, not mere lack of knowledge.',
    ],
    render: () => <Superposition />,
  },
  {
    id: 'entanglement',
    label: 'Quantum Entanglement',
    tagline: 'Correlations no classical signal can explain.',
    icon: '∞',
    difficulty: 'intermediate',
    category: 'information',
    equation: '|Ψ⁻⟩ = (|01⟩ − |10⟩) / √2',
    explanation: [
      'Two particles can share a single joint state that cannot be written as "particle A is here" and "particle B is there" separately. In the singlet state, neither qubit has a definite spin, yet they are guaranteed to be opposite whenever measured along the same axis.',
      'Measure one and you instantly know the other — even light-years away. Einstein called it "spooky action at a distance", but no usable signal travels: each side alone sees pure randomness, and only by comparing notes through a classical channel do the correlations appear.',
      'Bell\'s theorem turns this into a testable inequality. Real experiments violate it, ruling out any local hidden-variable explanation. Entanglement is the backbone of quantum teleportation, superdense coding, and the speed-ups of quantum computing.',
    ],
    keyPoints: [
      'The joint state cannot be factored into independent parts.',
      'Outcomes are perfectly correlated but individually random.',
      'No faster-than-light signalling — only shared randomness.',
      'Bell-inequality violations rule out local hidden variables.',
    ],
    render: () => <Entanglement />,
  },
  {
    id: 'uncertainty',
    label: 'The Uncertainty Principle',
    tagline: 'Why sharp position means fuzzy momentum.',
    icon: 'Δ',
    difficulty: 'intermediate',
    category: 'foundations',
    equation: 'Δx · Δp ≥ ℏ / 2',
    explanation: [
      'Heisenberg\'s principle says certain pairs of properties — position and momentum, energy and time — can never both be pinned down at once. The more precisely you fix one, the more the other must blur. This is not clumsy measurement; it is built into the wave nature of matter.',
      'A wavefunction sharply peaked in position is, mathematically, a sum of many different momentum waves — so its momentum is spread wide. Conversely, a single pure momentum is an infinite wave with no definite location. The two descriptions are Fourier transforms of each other, and you cannot make both narrow.',
      'The floor is ℏ/2, an absurdly small number, so the trade-off is invisible for baseballs but dominant for electrons. It explains why atoms don\'t collapse: confining an electron too tightly would spike its momentum and kinetic energy, pushing it back out.',
    ],
    keyPoints: [
      'Conjugate pairs (x,p) cannot both be sharp simultaneously.',
      'Position and momentum wavefunctions are Fourier transforms.',
      'The bound ℏ/2 is fundamental, not a measurement limitation.',
      'It stabilises atoms against collapse into the nucleus.',
    ],
    render: () => <Uncertainty />,
  },
  {
    id: 'spin',
    label: 'Quantum Spin & Stern–Gerlach',
    tagline: 'Intrinsic angular momentum that comes in steps.',
    icon: '⇅',
    difficulty: 'intermediate',
    category: 'foundations',
    equation: 'Sz = ±½ ℏ',
    explanation: [
      'Spin is an intrinsic angular momentum carried by particles like electrons — not a literal spinning ball, but a genuine quantum degree of freedom with no classical counterpart. For a spin-½ particle, measuring spin along any axis yields only two values: up or down.',
      'The 1922 Stern–Gerlach experiment sent silver atoms through a non-uniform magnetic field. Classically their random magnetic orientations should smear into one continuous band. Instead the beam split cleanly into two — direct proof that the projection of spin is quantised.',
      'Chain two analysers and it gets stranger: measuring spin along x scrambles a previously definite z-spin, because those components are incompatible observables. Spin underpins the Pauli exclusion principle, magnetism, MRI, and most qubit hardware.',
    ],
    keyPoints: [
      'Spin is intrinsic angular momentum with no classical analogue.',
      'A spin-½ measurement gives only two outcomes: ↑ or ↓.',
      'The beam splits in two — orientation is quantised, not continuous.',
      'Spin components along different axes are incompatible.',
    ],
    render: () => <SternGerlach />,
  },
]

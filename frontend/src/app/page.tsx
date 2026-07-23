import type { Metadata } from 'next'
import Link from 'next/link'
import { TOPICS } from '@/data/topics'

export const metadata: Metadata = {
  title: 'Quantum Learning System — Master Quantum Mechanics',
  description: 'Master quantum mechanics through interactive simulations, adaptive quizzes, a dynamic knowledge graph, and an AI tutor powered by Claude.',
  openGraph: {
    title: 'Quantum Learning System',
    description: 'Interactive quantum mechanics education with simulations, AI tutoring, and adaptive quizzes.',
    type: 'website',
  },
}

const FEATURES = [
  {
    icon: '◈',
    title: 'Live Simulations',
    desc: 'Work through a serial tour of quantum topics — double-slit, superposition, entanglement, the Bloch sphere and more — each with an interactive animation.',
    href: '/simulations',
    accent: 'quantum',
  },
  {
    icon: '⬡',
    title: 'Knowledge Graph',
    desc: 'Navigate interconnected quantum concepts through a force-directed graph showing prerequisites and relationships between topics.',
    href: '/knowledge-graph',
    accent: 'plasma',
  },
  {
    icon: 'Ψ',
    title: 'AI Tutor',
    desc: 'Ask anything about quantum mechanics. Adaptive explanations in LaTeX at beginner, intermediate, or advanced level.',
    href: '/tutor',
    accent: 'wave',
  },
  {
    icon: '⊞',
    title: 'Adaptive Quizzes',
    desc: 'Test your understanding at every difficulty tier. Track your score, XP, and streak as you progress through the curriculum.',
    href: '/quiz',
    accent: 'photon',
  },
  {
    icon: '∫',
    title: 'Formula Reference',
    desc: 'Browse a comprehensive library of quantum mechanics equations with LaTeX rendering and context explanations.',
    href: '/formulas',
    accent: 'quantum',
  },
  {
    icon: '◉',
    title: 'Concept Browser',
    desc: 'Explore the full knowledge base of quantum concepts, filtered by difficulty and branch, at your own pace.',
    href: '/concepts',
    accent: 'plasma',
  },
] as const

const STATS = [
  { value: String(TOPICS.length), label: 'Simulations', color: 'text-quantum-400' },
  { value: 'φ', label: 'Fibonacci UI', color: 'text-plasma-400' },
  { value: '∞', label: 'AI Conversations', color: 'text-wave-400' },
  { value: '3', label: 'Difficulty Levels', color: 'text-photon-400' },
]

const ACCENT_STYLES = {
  quantum: { border: 'border-quantum-500/30 hover:border-quantum-500/60', glow: 'hover:shadow-quantum-glow', icon: 'text-quantum-400' },
  plasma:  { border: 'border-plasma-500/30 hover:border-plasma-500/60', glow: 'hover:shadow-plasma-glow', icon: 'text-plasma-400' },
  wave:    { border: 'border-wave-500/30 hover:border-wave-500/60', glow: 'hover:shadow-wave-glow', icon: 'text-wave-400' },
  photon:  { border: 'border-photon-500/30 hover:border-photon-500/60', glow: '', icon: 'text-photon-400' },
}

export default function LandingPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center" aria-labelledby="hero-heading">
        <div className="relative mb-8" aria-hidden>
          <div className="text-8xl font-serif text-quantum-500/20 select-none absolute -top-4 left-1/2 -translate-x-1/2 blur-lg">Ψ</div>
          <div className="text-6xl font-serif text-quantum-300 relative z-10">Ψ</div>
        </div>

        <h1 id="hero-heading" className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 max-w-4xl">
          Quantum Learning{' '}
          <span className="bg-gradient-to-r from-quantum-400 via-plasma-400 to-wave-400 bg-clip-text text-transparent">
            System
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
          Master quantum mechanics through interactive simulations, adaptive quizzes,
          a dynamic knowledge graph, and an AI tutor powered by Claude.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/login" className="btn-quantum text-base px-8 py-4">
            Begin Your Journey
          </Link>
          <Link href="/concepts" className="btn-ghost text-base px-8 py-4">
            Explore Concepts →
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl w-full" role="list" aria-label="Key statistics">
          {STATS.map(({ value, label, color }) => (
            <div key={label} className="card-quantum p-6 text-center" role="listitem">
              <div className={`text-4xl font-mono font-bold ${color} mb-2`} aria-hidden>{value}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section className="px-6 pb-16 max-w-6xl mx-auto w-full" aria-labelledby="features-heading">
        <h2 id="features-heading" className="text-xs font-mono text-slate-500 uppercase tracking-widest text-center mb-8">
          Everything you need to learn quantum mechanics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon, title, desc, href, accent }) => {
            const s = ACCENT_STYLES[accent]
            return (
              <Link
                key={title}
                href={href}
                className={`card-quantum p-8 transition-all duration-300 group ${s.border} ${s.glow}`}
              >
                <div className={`text-3xl mb-4 font-mono ${s.icon} transition-transform duration-300 group-hover:scale-110`} aria-hidden>
                  {icon}
                </div>
                <h3 className="text-base font-semibold text-white mb-2 group-hover:text-quantum-200 transition-colors">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs text-slate-600 group-hover:text-quantum-400 transition-colors">
                  Explore <span aria-hidden>→</span>
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* CTA strip */}
      <section className="px-6 pb-24 max-w-6xl mx-auto w-full">
        <div className="card-quantum p-10 text-center border-quantum-500/30">
          <div className="text-2xl font-serif text-quantum-300 mb-4" aria-hidden>Ψ</div>
          <h2 className="text-2xl font-bold text-white mb-3">Ready to explore the quantum realm?</h2>
          <p className="text-slate-400 text-sm mb-7 max-w-md mx-auto">
            Sign in with Google to track your progress, earn XP, and unlock adaptive learning paths.
          </p>
          <Link href="/login" className="btn-quantum text-base px-8 py-4">
            Get started for free
          </Link>
        </div>
      </section>
    </div>
  )
}

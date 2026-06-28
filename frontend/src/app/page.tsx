import Link from 'next/link'
import { TOPICS } from '@/data/topics'

export default function LandingPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        {/* Psi symbol */}
        <div className="relative mb-8">
          <div className="text-8xl font-serif text-quantum-500/20 select-none absolute -top-4 left-1/2 -translate-x-1/2 blur-lg">
            Ψ
          </div>
          <div className="text-6xl font-serif text-quantum-300 relative z-10" aria-hidden>Ψ</div>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 max-w-4xl">
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
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl w-full">
          {[
            { value: String(TOPICS.length), label: 'Simulations', color: 'text-quantum-400' },
            { value: 'φ', label: 'Fibonacci UI', color: 'text-plasma-400' },
            { value: '∞', label: 'AI Conversations', color: 'text-wave-400' },
            { value: '3', label: 'Difficulty Levels', color: 'text-photon-400' },
          ].map(({ value, label, color }) => (
            <div key={label} className="card-quantum p-6 text-center">
              <div className={`text-4xl font-mono font-bold ${color} mb-2`}>{value}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section className="px-6 pb-24 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: '◈',
              title: 'Live Simulations',
              desc: 'Work through a serial tour of quantum topics — double-slit, superposition, entanglement, the Bloch sphere and more — each with an interactive animation.',
              color: 'border-quantum-500/30 hover:border-quantum-500/60',
              glow: 'hover:shadow-quantum-glow',
            },
            {
              icon: '⬡',
              title: 'Knowledge Graph',
              desc: 'Navigate interconnected quantum concepts through a force-directed graph showing prerequisites and relationships.',
              color: 'border-plasma-500/30 hover:border-plasma-500/60',
              glow: 'hover:shadow-plasma-glow',
            },
            {
              icon: 'Ψ',
              title: 'AI Tutor',
              desc: 'Ask Claude anything about quantum mechanics. Adaptive explanations in LaTeX at beginner, intermediate, or advanced level.',
              color: 'border-wave-500/30 hover:border-wave-500/60',
              glow: 'hover:shadow-wave-glow',
            },
          ].map(({ icon, title, desc, color, glow }) => (
            <div key={title} className={`card-quantum p-8 transition-all duration-300 ${color} ${glow}`}>
              <div className="text-4xl mb-4 font-mono text-slate-400">{icon}</div>
              <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

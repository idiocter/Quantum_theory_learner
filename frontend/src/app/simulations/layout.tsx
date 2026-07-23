import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Simulations',
  description: 'Run interactive quantum mechanics simulations — double-slit, superposition, entanglement, Bloch sphere and more.',
  openGraph: {
    title: 'Quantum Simulations | QLS',
    description: 'Run interactive quantum mechanics simulations.',
  },
}

export default function SimulationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

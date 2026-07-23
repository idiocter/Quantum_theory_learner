import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Formula Reference',
  description: 'Complete quantum mechanics formula reference with LaTeX rendering, covering operators, wave functions, and core equations.',
  openGraph: {
    title: 'Formula Reference | QLS',
    description: 'Complete quantum mechanics formula reference with LaTeX rendering.',
  },
}

export default function FormulasLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Tutor',
  description: 'Ask Claude anything about quantum mechanics. Adaptive explanations at beginner, intermediate, or advanced level with LaTeX rendering.',
  openGraph: {
    title: 'AI Tutor | QLS',
    description: 'Ask Claude anything about quantum mechanics.',
  },
}

export default function TutorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

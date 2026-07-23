import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Quizzes',
  description: 'Test your quantum mechanics knowledge with adaptive quizzes across beginner, intermediate, and advanced levels.',
  openGraph: {
    title: 'Quantum Quizzes | QLS',
    description: 'Test your quantum mechanics knowledge with adaptive quizzes.',
  },
}

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

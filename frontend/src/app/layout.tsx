import type { Metadata } from 'next'
import './globals.css'
import Providers from './providers'
import Navbar from '@/components/layout/Navbar'
import FibonacciBackground from '@/components/layout/FibonacciBackground'

export const metadata: Metadata = {
  title: {
    default: 'Quantum Learning System',
    template: '%s | QLS',
  },
  description: 'Master quantum mechanics through interactive simulations, adaptive quizzes, and AI-powered tutoring.',
  keywords: ['quantum mechanics', 'physics', 'learning', 'simulations', 'AI tutor'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="quantum-mesh scanlines min-h-screen">
        <a href="#main-content" className="skip-nav">
          Skip to main content
        </a>
        <Providers>
          <FibonacciBackground />
          <Navbar />
          <main id="main-content" className="relative z-10 pt-16 min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}

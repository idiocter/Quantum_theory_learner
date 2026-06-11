'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/concepts', label: 'Concepts' },
  { href: '/knowledge-graph', label: 'Graph' },
  { href: '/simulations', label: 'Simulations' },
  { href: '/quiz', label: 'Quizzes' },
  { href: '/tutor', label: 'AI Tutor' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-quantum-800/30 bg-void-950/80 backdrop-blur-xl">
      <nav className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
        {/* Logo — Fibonacci spiral mark */}
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative w-8 h-8">
            <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none">
              <circle cx="16" cy="16" r="15" stroke="rgba(0,102,255,0.4)" strokeWidth="0.5" />
              <circle cx="16" cy="16" r="9.7" stroke="rgba(0,102,255,0.3)" strokeWidth="0.5" />
              <circle cx="16" cy="16" r="6" stroke="rgba(0,102,255,0.2)" strokeWidth="0.5" />
              <path
                d="M16 6 Q22 10 22 16 Q22 22 16 25 Q10 22 10 16 Q10 10 16 6"
                stroke="#0066ff"
                strokeWidth="1.5"
                fill="none"
                className="group-hover:drop-shadow-[0_0_4px_rgba(0,102,255,0.8)] transition-all"
              />
              <circle cx="16" cy="16" r="2" fill="#0066ff" />
            </svg>
          </div>
          <span className="font-mono font-semibold text-white tracking-tight group-hover:text-quantum-300 transition-colors">
            QLS
          </span>
        </Link>

        {/* Nav links */}
        <ul className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname.startsWith(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    active
                      ? 'text-quantum-300 bg-quantum-500/10 border border-quantum-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  )}
                >
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* User section */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/dashboard" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-full border border-quantum-500/30 bg-quantum-500/10 flex items-center justify-center text-xs font-mono text-quantum-300 group-hover:border-quantum-500/60 transition-colors">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block text-sm text-slate-400 group-hover:text-slate-200 transition-colors">
                  {user.username}
                </span>
              </Link>
              <button
                onClick={logout}
                className="btn-ghost text-xs px-3 py-1.5"
              >
                Exit
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost text-sm px-4 py-2">Log in</Link>
              <Link href="/register" className="btn-quantum text-sm px-4 py-2">Register</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}

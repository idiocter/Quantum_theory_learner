'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { cn } from '@/lib/utils'
import GlobalSearch from '@/components/layout/GlobalSearch'

const NAV_LINKS = [
  { href: '/concepts', label: 'Concepts' },
  { href: '/knowledge-graph', label: 'Graph' },
  { href: '/formulas', label: 'Formulas' },
  { href: '/simulations', label: 'Simulations' },
  { href: '/quiz', label: 'Quizzes' },
  { href: '/tutor', label: 'AI Tutor' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)

  // ⌘K / Ctrl+K opens the global search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-quantum-800/30 bg-void-950/80 backdrop-blur-xl">
      <nav className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
        {/* Logo — Fibonacci spiral mark */}
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative w-8 h-8">
            <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none">
              <defs>
                <linearGradient id="galaxyArm" x1="0" y1="0" x2="32" y2="32">
                  <stop offset="0" stopColor="#ffe6a8" />
                  <stop offset="0.5" stopColor="#a259ff" />
                  <stop offset="1" stopColor="#ff8fd4" />
                </linearGradient>
                <radialGradient id="galaxyCore" cx="0.5" cy="0.5" r="0.5">
                  <stop offset="0" stopColor="#fff4d6" />
                  <stop offset="1" stopColor="#a259ff" stopOpacity="0" />
                </radialGradient>
              </defs>
              {/* Orbital disc rings */}
              <ellipse cx="16" cy="16" rx="15" ry="8.7" stroke="rgba(162,89,255,0.35)" strokeWidth="0.5" />
              <ellipse cx="16" cy="16" rx="9.5" ry="5.5" stroke="rgba(255,143,212,0.3)" strokeWidth="0.5" />
              {/* Spiral galaxy arms (golden-angle wind) */}
              <path
                d="M16 8 Q23 11 23 16 Q23 21 16 24"
                stroke="url(#galaxyArm)"
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
                className="group-hover:drop-shadow-[0_0_5px_rgba(162,89,255,0.9)] transition-all"
              />
              <path
                d="M16 24 Q9 21 9 16 Q9 11 16 8"
                stroke="url(#galaxyArm)"
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
                opacity="0.8"
              />
              {/* Bright core */}
              <circle cx="16" cy="16" r="6" fill="url(#galaxyCore)" />
              <circle cx="16" cy="16" r="1.8" fill="#fff4d6" />
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
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300 transition-all text-xs"
            aria-label="Search"
          >
            <span>⌕ Search</span>
            <kbd className="font-mono text-[10px] border border-white/10 rounded px-1">⌘K</kbd>
          </button>
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
            <Link href="/login" className="btn-quantum text-sm px-4 py-2">Sign in</Link>
          )}
        </div>
      </nav>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}

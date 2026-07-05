'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { conceptsApi } from '@/lib/api/concepts'
import { difficultyLabel } from '@/lib/utils'
import type { Concept } from '@/types'

const DIFFICULTIES = ['', 'beginner', 'intermediate', 'advanced'] as const

function ConceptCard({ c }: { c: Concept }) {
  return (
    <Link href={`/concepts/${c.slug}`} className="card-quantum p-6 group flex flex-col gap-3 h-full">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold leading-snug text-white group-hover:text-quantum-300 transition-colors">
          {c.title}
        </h3>
        <span className={`text-xs px-2 py-0.5 rounded-md shrink-0 badge-${c.difficulty}`}>
          {difficultyLabel(c.difficulty)}
        </span>
      </div>
      <p className="text-sm text-slate-500 flex-1 line-clamp-3">{c.description}</p>
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span
          className="px-2 py-0.5 rounded text-xs"
          style={{ backgroundColor: `${c.category?.color ?? '#666'}22`, color: c.category?.color ?? '#aaa' }}
        >
          {c.category?.name ?? 'Uncategorized'}
        </span>
        <span>{c.estimated_minutes} min</span>
      </div>
    </Link>
  )
}

export default function ConceptsPage() {
  const [difficulty, setDifficulty] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Simple debounce
  const handleSearch = (v: string) => {
    setSearch(v)
    clearTimeout((window as unknown as { _searchTimeout: ReturnType<typeof setTimeout> })._searchTimeout)
    ;(window as unknown as { _searchTimeout: ReturnType<typeof setTimeout> })._searchTimeout = setTimeout(
      () => setDebouncedSearch(v),
      300
    )
  }

  const { data, isLoading } = useQuery({
    queryKey: ['concepts', difficulty, debouncedSearch],
    queryFn: () =>
      conceptsApi.list({ difficulty: difficulty || undefined, search: debouncedSearch || undefined }).then((r) => r.data),
  })

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Quantum Concepts</h1>
        <p className="text-slate-500 text-sm">Browse the quantum mechanics knowledge base.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          type="search"
          placeholder="Search concepts..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="input-quantum sm:max-w-xs"
        />
        <div className="flex gap-2 flex-wrap">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 border ${
                difficulty === d
                  ? 'border-quantum-500/50 bg-quantum-500/10 text-quantum-300'
                  : 'border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-300'
              }`}
            >
              {d ? difficultyLabel(d) : 'All'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-quantum p-6 animate-pulse h-44">
              <div className="h-4 bg-void-700 rounded w-3/4 mb-3" />
              <div className="h-3 bg-void-700 rounded w-full mb-2" />
              <div className="h-3 bg-void-700 rounded w-5/6" />
            </div>
          ))}
        </div>
      ) : data?.results.length === 0 ? (
        <div className="text-center py-20 text-slate-600">
          <div className="text-4xl mb-3">◈</div>
          <p>No concepts found. Try a different filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data?.results.map((c) => <ConceptCard key={c.id} c={c} />)}
        </div>
      )}

      {data && data.count > data.results.length && (
        <p className="text-center text-xs text-slate-600 mt-8">
          Showing {data.results.length} of {data.count} concepts
        </p>
      )}
    </div>
  )
}

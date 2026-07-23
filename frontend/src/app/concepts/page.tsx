'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { conceptsApi } from '@/lib/api/concepts'
import { cn, difficultyLabel } from '@/lib/utils'
import { useDebounce } from '@/lib/hooks/useDebounce'
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
      <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
        <span
          title={c.category?.name ?? 'Uncategorized'}
          className="px-2 py-0.5 rounded text-xs truncate min-w-0"
          style={{ backgroundColor: `${c.category?.color ?? '#666'}22`, color: c.category?.color ?? '#aaa' }}
        >
          {c.category?.name ?? 'Uncategorized'}
        </span>
        <span className="shrink-0 whitespace-nowrap">{c.estimated_minutes} min</span>
      </div>
    </Link>
  )
}

// Compact page selector: always shows the first & last page, the current page
// and its immediate neighbours, and collapses the rest into ellipses.
function pageWindow(current: number, total: number): (number | 'gap')[] {
  const out: (number | 'gap')[] = [1]
  const left = Math.max(2, current - 1)
  const right = Math.min(total - 1, current + 1)
  if (left > 2) out.push('gap')
  for (let i = left; i <= right; i++) out.push(i)
  if (right < total - 1) out.push('gap')
  if (total > 1) out.push(total)
  return out
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (p: number) => void
}) {
  const go = (p: number) => {
    if (p >= 1 && p <= totalPages && p !== page) onChange(p)
  }
  const cell =
    'w-9 h-9 flex items-center justify-center rounded-lg text-xs font-medium border transition-all'
  return (
    <nav className="flex items-center justify-center gap-1.5 mt-10" aria-label="Concept pages">
      <button
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={cn(cell, 'border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-300 disabled:opacity-30 disabled:pointer-events-none')}
      >
        ‹
      </button>
      {pageWindow(page, totalPages).map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className="w-9 h-9 flex items-center justify-center text-slate-600 select-none">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => go(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              cell,
              p === page
                ? 'border-quantum-500/50 bg-quantum-500/10 text-quantum-300'
                : 'border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-300'
            )}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className={cn(cell, 'border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-300 disabled:opacity-30 disabled:pointer-events-none')}
      >
        ›
      </button>
    </nav>
  )
}

export default function ConceptsPage() {
  const [difficulty, setDifficulty] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [difficulty, debouncedSearch])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['concepts', difficulty, debouncedSearch, page],
    queryFn: () =>
      conceptsApi
        .list({ difficulty: difficulty || undefined, search: debouncedSearch || undefined, page })
        .then((r) => r.data),
    // Keep the current page visible while the next one loads (no flash to skeletons).
    placeholderData: keepPreviousData,
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
          onChange={(e) => setSearch(e.target.value)}
          className="input-quantum sm:max-w-xs"
          aria-label="Search concepts"
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
        <div
          className={cn(
            'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 transition-opacity',
            isFetching && 'opacity-60'
          )}
        >
          {data?.results.map((c) => <ConceptCard key={c.id} c={c} />)}
        </div>
      )}

      {data && data.total_pages > 1 && (
        <Pagination
          page={page}
          totalPages={data.total_pages}
          onChange={(p) => {
            setPage(p)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      )}
    </div>
  )
}

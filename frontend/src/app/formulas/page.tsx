'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useFormulaIndex } from '@/lib/hooks/useConcepts'
import { Tex } from '@/components/ui/Tex'
import type { Formula } from '@/types'

function matches(f: Formula, q: string) {
  if (!q) return true
  const hay = [
    f.latex,
    f.description,
    f.concept_title,
    f.branch ?? '',
    ...Object.keys(f.symbols ?? {}),
    ...Object.values(f.symbols ?? {}),
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(q.toLowerCase())
}

export default function FormulaIndexPage() {
  const { data: formulas, isLoading } = useFormulaIndex()
  const [query, setQuery] = useState('')

  const filtered = useMemo(
    () => (formulas ?? []).filter((f) => matches(f, query.trim())),
    [formulas, query]
  )

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Formula Index</h1>
        <p className="text-sm text-slate-500">
          Every formula across the course. Search by symbol, keyword, or topic; click one to open its topic.
        </p>
      </div>

      <input
        type="search"
        placeholder="Search formulas — e.g. entropy, ℏ, Schrödinger, lambda…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="input-quantum w-full mb-6"
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-quantum p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-600">
          <div className="text-4xl mb-3">∅</div>
          <p>No formulas match “{query}”.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-600 mb-3">
            {filtered.length} formula{filtered.length === 1 ? '' : 's'}
            {query && ` matching “${query}”`}
          </p>
          <div className="space-y-3">
            {filtered.map((f) => (
              <Link
                key={f.id}
                href={`/concepts/${f.concept_slug}`}
                className="card-quantum p-5 group flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <Tex block className="text-quantum-100 overflow-x-auto flex-1">{f.latex}</Tex>
                  <span className="text-xs text-slate-600 shrink-0 text-right">
                    <span className="block text-slate-400 group-hover:text-quantum-300 transition-colors">
                      {f.concept_title}
                    </span>
                    {f.branch && <span className="text-[10px]">{f.branch}</span>}
                  </span>
                </div>
                {f.description && <p className="text-sm text-slate-500">{f.description}</p>}
                {f.symbols && Object.keys(f.symbols).length > 0 && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                    {Object.entries(f.symbols).map(([sym, mean]) => (
                      <span key={sym} className="inline-flex items-baseline gap-1">
                        <span className="font-mono text-quantum-400/80"><Tex>{sym}</Tex></span>
                        <span>{mean}</span>
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

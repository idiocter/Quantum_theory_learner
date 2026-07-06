'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConceptSearch } from '@/lib/hooks/useConcepts'
import { difficultyLabel, cn } from '@/lib/utils'
import type { ConceptSearchResult } from '@/types'

// Global ⌘K / Ctrl+K search overlay. Hits the FTS-ranked /concepts/search/
// endpoint (debounced), groups hits by branch, and supports full keyboard
// navigation. Mounted once in the Navbar so it is available on every page.
export default function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce keystrokes by 250ms before querying.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 250)
    return () => clearTimeout(id)
  }, [query])

  // Reset and focus when opened.
  useEffect(() => {
    if (open) {
      setQuery('')
      setDebounced('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const { data: results, isFetching } = useConceptSearch(debounced)
  const flat = useMemo<ConceptSearchResult[]>(() => (Array.isArray(results) ? results : []), [results])

  // Reset highlight when the result set changes.
  useEffect(() => setActive(0), [debounced])

  const go = (r: ConceptSearchResult) => {
    onClose()
    router.push(`/concepts/${r.slug}`)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(flat.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
    else if (e.key === 'Enter' && flat[active]) { e.preventDefault(); go(flat[active]) }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }

  if (!open) return null

  // Group results by branch, preserving rank order within each group.
  const groups: { name: string; color: string; items: ConceptSearchResult[] }[] = []
  for (const r of flat) {
    const name = r.category?.name ?? 'Other'
    let g = groups.find((x) => x.name === name)
    if (!g) { g = { name, color: r.category?.color ?? '#888', items: [] }; groups.push(g) }
    g.items.push(r)
  }

  let idx = -1 // running index across groups for highlight + key nav

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-void-950/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-quantum-500/20 bg-void-900/95 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b border-white/5">
          <span className="text-slate-600">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search all topics…"
            className="flex-1 bg-transparent py-4 text-sm text-white placeholder:text-slate-600 focus:outline-none"
          />
          <kbd className="text-[10px] font-mono text-slate-600 border border-white/10 rounded px-1.5 py-0.5">esc</kbd>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2">
          {debounced && flat.length === 0 && !isFetching && (
            <p className="text-center text-sm text-slate-600 py-8">No topics match “{debounced}”.</p>
          )}
          {!debounced && (
            <p className="text-center text-sm text-slate-600 py-8">
              Type to search · <span className="font-mono">↑↓</span> to navigate · <span className="font-mono">↵</span> to open
            </p>
          )}
          {groups.map((g) => (
            <div key={g.name} className="mb-2">
              <div className="flex items-center gap-2 px-2 py-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{g.name}</span>
              </div>
              {g.items.map((r) => {
                idx++
                const isActive = idx === active
                return (
                  <button
                    key={r.id}
                    onMouseEnter={() => setActive(flat.indexOf(r))}
                    onClick={() => go(r)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                      isActive ? 'bg-quantum-500/15' : 'hover:bg-white/5'
                    )}
                  >
                    <span className="min-w-0">
                      <span className={cn('text-sm block truncate', isActive ? 'text-white' : 'text-slate-300')}>
                        {r.title}
                      </span>
                      <span className="text-xs text-slate-600 block truncate">{r.description}</span>
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded shrink-0 badge-${r.difficulty}`}>
                      {difficultyLabel(r.difficulty)}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

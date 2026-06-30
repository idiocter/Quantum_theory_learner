'use client'
import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { conceptsApi } from '@/lib/api/concepts'
import { useBranches, useAllConcepts } from '@/lib/hooks/useConcepts'
import { useConceptsStore } from '@/lib/store/concepts'
import { cn } from '@/lib/utils'

const KnowledgeGraphCanvas = dynamic(
  () => import('@/components/layout/KnowledgeGraphCanvas'),
  { ssr: false, loading: () => <GraphLoading /> }
)

function GraphLoading() {
  return (
    <div className="flex items-center justify-center h-[580px]">
      <div className="text-center">
        <div className="text-4xl text-slate-700 mb-4 animate-pulse">⬡</div>
        <p className="text-xs font-mono text-slate-600">Building knowledge graph...</p>
      </div>
    </div>
  )
}

export default function KnowledgeGraphPage() {
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const { data: graph, isLoading } = useQuery({
    queryKey: ['knowledge-graph'],
    queryFn: () => conceptsApi.knowledgeGraph().then((r) => r.data),
    staleTime: 5 * 60_000,
  })
  const { data: branches } = useBranches()
  const { data: topicsPage } = useAllConcepts()
  const visited = useConceptsStore((s) => s.visitedTopics)

  // Per-branch totals (from the topic list) and visited counts (from the store).
  const stats = useMemo(() => {
    const total: Record<string, number> = {}
    const seen: Record<string, number> = {}
    const slugBranch: Record<string, string> = {}
    topicsPage?.results.forEach((t) => {
      const b = t.category?.slug ?? ''
      total[b] = (total[b] ?? 0) + 1
      slugBranch[t.slug] = b
    })
    visited.forEach((slug) => {
      const b = slugBranch[slug]
      if (b) seen[b] = (seen[b] ?? 0) + 1
    })
    return { total, seen }
  }, [topicsPage, visited])

  const toggle = (slug: string) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Knowledge Graph</h1>
        <p className="text-sm text-slate-500">
          All 65 topics, coloured by branch and sized by how connected they are. Drag nodes, scroll to
          zoom, click a node to open it. Toggle a branch to focus.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_220px] gap-4">
        <div className="card-quantum p-2 min-h-[580px] relative overflow-hidden order-2 lg:order-1">
          {isLoading ? (
            <GraphLoading />
          ) : graph ? (
            <KnowledgeGraphCanvas graph={graph} hiddenBranches={hidden} />
          ) : (
            <div className="flex items-center justify-center h-[580px] text-slate-600">
              No graph data available yet.
            </div>
          )}
        </div>

        {/* Branch filter + progress */}
        <aside className="order-1 lg:order-2 space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-2">
            Branches · visited
          </div>
          {branches
            ?.slice()
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((b) => {
              const off = hidden.has(b.slug)
              const seen = stats.seen[b.slug] ?? 0
              const total = stats.total[b.slug] ?? b.topic_count
              return (
                <button
                  key={b.id}
                  onClick={() => toggle(b.slug)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all border',
                    off ? 'border-white/5 opacity-40' : 'border-white/10 hover:border-white/20'
                  )}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                  <span className="text-slate-300 truncate flex-1 text-left">{b.name}</span>
                  <span className="font-mono text-[10px] text-slate-500">{seen}/{total}</span>
                </button>
              )
            })}
          <p className="text-[10px] text-slate-600 pt-2 leading-relaxed">
            Visited counts update as you open topics.
          </p>
        </aside>
      </div>
    </div>
  )
}

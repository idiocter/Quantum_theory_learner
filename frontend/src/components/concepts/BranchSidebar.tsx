'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAllConcepts, useBranches } from '@/lib/hooks/useConcepts'
import { useConceptsStore } from '@/lib/store/concepts'
import { cn } from '@/lib/utils'
import type { Branch, Concept } from '@/types'

function BranchSection({
  branch,
  topics,
  activeSlug,
  defaultOpen,
}: {
  branch: Branch
  topics: Concept[]
  activeSlug?: string
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const visited = useConceptsStore((s) => s.visitedTopics)

  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 py-2.5 text-left group"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: branch.color }}
          />
          <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors truncate">
            {branch.name}
          </span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-slate-600">{branch.topic_count}</span>
          <span className={cn('text-slate-600 transition-transform', open && 'rotate-90')}>›</span>
        </span>
      </button>

      {open && (
        <ul className="pb-2 pl-4 flex flex-col gap-0.5">
          {topics.length === 0 ? (
            <li className="text-xs text-slate-600 py-1">No topics yet</li>
          ) : (
            topics.map((t) => {
              const isActive = t.slug === activeSlug
              return (
                <li key={t.id}>
                  <Link
                    href={`/concepts/${t.slug}`}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                      isActive
                        ? 'bg-quantum-500/10 text-quantum-300'
                        : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                    )}
                  >
                    <span
                      className={cn(
                        'w-1 h-1 rounded-full shrink-0',
                        visited.includes(t.slug) ? 'bg-quantum-400' : 'bg-transparent'
                      )}
                    />
                    <span className="truncate">{t.title}</span>
                  </Link>
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}

export default function BranchSidebar() {
  const params = useParams<{ id?: string }>()
  const activeSlug = params?.id
  const { data: branches, isLoading } = useBranches()
  // One large fetch of the topic list, grouped client-side by branch.
  const { data: topicsPage } = useAllConcepts()

  if (isLoading) {
    return (
      <nav className="flex flex-col gap-2 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-7 bg-void-800 rounded" />
        ))}
      </nav>
    )
  }

  const topicsByBranch = (slug: string) =>
    (topicsPage?.results ?? []).filter((t) => t.category?.slug === slug)

  return (
    <nav className="flex flex-col">
      <Link
        href="/concepts"
        className={cn(
          'text-xs font-mono uppercase tracking-widest py-2 transition-colors',
          activeSlug ? 'text-slate-500 hover:text-slate-300' : 'text-quantum-300'
        )}
      >
        ◈ All concepts
      </Link>
      {(branches ?? [])
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((branch) => {
          const topics = topicsByBranch(branch.slug)
          return (
            <BranchSection
              key={branch.id}
              branch={branch}
              topics={topics}
              activeSlug={activeSlug}
              // Auto-open the branch that contains the active topic.
              defaultOpen={topics.some((t) => t.slug === activeSlug)}
            />
          )
        })}
    </nav>
  )
}

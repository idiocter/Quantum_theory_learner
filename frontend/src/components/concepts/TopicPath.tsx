'use client'
import Link from 'next/link'
import { useAllConcepts } from '@/lib/hooks/useConcepts'
import { useConceptsStore } from '@/lib/store/concepts'
import { cn } from '@/lib/utils'

function titleize(slug: string) {
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function Node({
  slug,
  title,
  kind,
  visited,
}: {
  slug?: string
  title: string
  kind: 'prereq' | 'current' | 'unlock'
  visited?: boolean
}) {
  const base =
    'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm whitespace-nowrap transition-colors'

  if (kind === 'current') {
    return (
      <div className={cn(base, 'border-quantum-500/50 bg-quantum-500/10 text-quantum-200 font-semibold')}>
        <span className="w-1.5 h-1.5 rounded-full bg-quantum-400" />
        {title}
      </div>
    )
  }

  const accent =
    kind === 'prereq'
      ? 'text-amber-200/90 border-amber-400/25 hover:border-amber-400/50'
      : 'text-slate-300 border-white/10 hover:border-quantum-400/40'

  return (
    <Link href={`/concepts/${slug}`} className={cn(base, 'bg-void-800/40 hover:text-white', accent)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', visited ? 'bg-quantum-400' : 'bg-white/15')} />
      {title}
    </Link>
  )
}

const Arrow = () => <span className="text-slate-600 select-none px-0.5">→</span>

/**
 * The topic's place on the learning roadmap, drawn as a single left-to-right
 * path: prerequisites (what to learn first) → this topic → what it unlocks.
 * Titles resolve from the cached topic list; visited state comes from the store.
 */
export default function TopicPath({
  currentTitle,
  prerequisites = [],
  unlocks = [],
}: {
  currentTitle: string
  prerequisites?: string[]
  unlocks?: string[]
}) {
  const { data } = useAllConcepts()
  const visited = useConceptsStore((s) => s.visitedTopics)

  const titleBySlug: Record<string, string> = {}
  data?.results.forEach((c) => {
    titleBySlug[c.slug] = c.title
  })
  const nameOf = (slug: string) => titleBySlug[slug] ?? titleize(slug)

  const standalone = prerequisites.length === 0 && unlocks.length === 0

  return (
    <div>
      <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">Learning path</h2>
      <div className="card-quantum p-4 overflow-x-auto">
        <div className="flex items-center gap-2 w-max">
          {prerequisites.map((slug) => (
            <span key={slug} className="flex items-center gap-2">
              <Node slug={slug} title={nameOf(slug)} kind="prereq" visited={visited.includes(slug)} />
              <Arrow />
            </span>
          ))}

          <Node title={currentTitle} kind="current" />

          {unlocks.map((slug) => (
            <span key={slug} className="flex items-center gap-2">
              <Arrow />
              <Node slug={slug} title={nameOf(slug)} kind="unlock" visited={visited.includes(slug)} />
            </span>
          ))}
        </div>
      </div>
      {standalone && (
        <p className="text-xs text-slate-600 mt-2">
          A standalone topic — no linked prerequisites or follow-ups yet.
        </p>
      )}
    </div>
  )
}

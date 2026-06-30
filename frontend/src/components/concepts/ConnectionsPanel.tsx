'use client'
import Link from 'next/link'
import { useAllConcepts } from '@/lib/hooks/useConcepts'

function titleize(slug: string) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function ConnectionCard({
  slug,
  titleBySlug,
  kind,
}: {
  slug: string
  titleBySlug: Record<string, string>
  kind: 'prereq' | 'unlock'
}) {
  const accent = kind === 'prereq' ? 'text-amber-300/90' : 'text-quantum-300'
  return (
    <Link
      href={`/concepts/${slug}`}
      className="card-quantum px-4 py-3 flex items-center gap-2 group"
    >
      <span className={`text-xs ${accent}`}>{kind === 'prereq' ? '←' : '→'}</span>
      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
        {titleBySlug[slug] ?? titleize(slug)}
      </span>
    </Link>
  )
}

/**
 * Renders a concept's prerequisites (topics to learn first) and unlocks (topics
 * it leads into) as navigable cards. Slugs come from the detail endpoint; titles
 * are resolved from the (cached) topic list, falling back to a titleized slug.
 */
export default function ConnectionsPanel({
  prerequisites = [],
  unlocks = [],
}: {
  prerequisites?: string[]
  unlocks?: string[]
}) {
  const { data } = useAllConcepts()
  const titleBySlug: Record<string, string> = {}
  data?.results.forEach((c) => {
    titleBySlug[c.slug] = c.title
  })

  if (prerequisites.length === 0 && unlocks.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {prerequisites.length > 0 && (
        <div>
          <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">
            Prerequisites
          </h2>
          <div className="flex flex-col gap-2">
            {prerequisites.map((slug) => (
              <ConnectionCard key={slug} slug={slug} titleBySlug={titleBySlug} kind="prereq" />
            ))}
          </div>
        </div>
      )}

      {unlocks.length > 0 && (
        <div>
          <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">
            Leads to
          </h2>
          <div className="flex flex-col gap-2">
            {unlocks.map((slug) => (
              <ConnectionCard key={slug} slug={slug} titleBySlug={titleBySlug} kind="unlock" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

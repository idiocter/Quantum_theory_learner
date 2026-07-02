'use client'
import { Fragment, type ReactNode } from 'react'
import Link from 'next/link'
import { Tex } from '@/components/ui/Tex'
import { useGlossary } from '@/lib/hooks/useGlossary'
import type { GlossaryTerm } from '@/types'

/**
 * Renderer for lesson prose that mixes KaTeX math and glossary markers.
 *
 * It understands three inline constructs and leaves everything else as plain
 * text (so physics-track prose with none of them renders unchanged):
 *   - display math   `$$ ... $$`  → <Tex block>
 *   - inline math    `$ ... $`     → <Tex>
 *   - glossary marker `[[slug]]` / `[[slug|surface text]]` → hover/linked term
 *
 * Per CONTENT_SCHEMA §7 markers never appear inside math, so math is tokenized
 * first and markers are only resolved in the remaining prose. Unknown slugs
 * fail safe to plain surface text.
 */

type Segment =
  | { kind: 'text'; value: string }
  | { kind: 'inline-math'; value: string }
  | { kind: 'block-math'; value: string }
  | { kind: 'term'; slug: string; surface: string }

// $$...$$ (display) or $...$ (inline). `[\s\S]` so display math can span lines.
const MATH_RE = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g
// [[slug]] or [[slug|surface text]] — slug is kebab-case.
const MARKER_RE = /\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g

function tokenizeMarkers(text: string): Segment[] {
  const out: Segment[] = []
  let last = 0
  let m: RegExpExecArray | null
  MARKER_RE.lastIndex = 0
  while ((m = MARKER_RE.exec(text)) !== null) {
    if (m.index > last) out.push({ kind: 'text', value: text.slice(last, m.index) })
    out.push({ kind: 'term', slug: m[1], surface: m[2] ?? '' })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) })
  return out
}

function tokenize(prose: string): Segment[] {
  const out: Segment[] = []
  let last = 0
  let m: RegExpExecArray | null
  MATH_RE.lastIndex = 0
  while ((m = MATH_RE.exec(prose)) !== null) {
    if (m.index > last) out.push(...tokenizeMarkers(prose.slice(last, m.index)))
    if (m[1] !== undefined) out.push({ kind: 'block-math', value: m[1] })
    else out.push({ kind: 'inline-math', value: m[2] })
    last = m.index + m[0].length
  }
  if (last < prose.length) out.push(...tokenizeMarkers(prose.slice(last)))
  return out
}

function GlossaryTermSpan({ term, surface }: { term: GlossaryTerm; surface: string }) {
  const label = surface || term.term
  return (
    <span className="group relative inline-block">
      <span
        tabIndex={0}
        className="cursor-help border-b border-dotted border-quantum-400/60 text-quantum-200 outline-none focus-visible:ring-1 focus-visible:ring-quantum-400/60 rounded-sm"
      >
        {label}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute left-0 top-full z-30 mt-1 w-72 rounded-lg border border-white/10 bg-void-900 p-3 text-left text-xs text-slate-300 opacity-0 shadow-xl transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 group-hover:pointer-events-auto group-focus-within:pointer-events-auto"
      >
        <span className="mb-1 block font-semibold text-white">{term.term}</span>
        <span className="block leading-relaxed">{term.definition}</span>
        {term.concept_slug && (
          <Link
            href={`/concepts/${term.concept_slug}`}
            className="mt-2 inline-block text-quantum-300 hover:underline"
          >
            Learn more →
          </Link>
        )}
      </span>
    </span>
  )
}

function renderSegment(seg: Segment, i: number, map: Record<string, GlossaryTerm>): ReactNode {
  switch (seg.kind) {
    case 'text':
      return <Fragment key={i}>{seg.value}</Fragment>
    case 'inline-math':
      return <Tex key={i}>{seg.value}</Tex>
    case 'block-math':
      return (
        <Tex key={i} block className="katex-display my-2">
          {seg.value}
        </Tex>
      )
    case 'term': {
      const term = map[seg.slug]
      // Fail safe: unknown slug (or glossary still loading) → plain surface text.
      if (!term) return <Fragment key={i}>{seg.surface || seg.slug}</Fragment>
      return <GlossaryTermSpan key={i} term={term} surface={seg.surface} />
    }
  }
}

export function GlossaryText({
  content,
  className,
}: {
  content: string
  className?: string
}) {
  const { map } = useGlossary()
  const paragraphs = content.split('\n\n').filter((p) => p.trim().length > 0)

  return (
    <>
      {paragraphs.map((para, pi) => {
        const segments = tokenize(para)
        return (
          // A div (not <p>) so display-math blocks nest validly.
          <div key={pi} className={className}>
            {segments.map((seg, i) => renderSegment(seg, i, map))}
          </div>
        )
      })}
    </>
  )
}

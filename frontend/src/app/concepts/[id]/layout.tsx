import type { Metadata } from 'next'

// Server component wrapper that supplies per-topic SEO metadata. It fetches the
// concept from Django at request time (the page itself is a client component and
// fetches its own data via TanStack Query). Failures fall back to generic copy
// so the page never breaks if the API is unreachable at render time.
const API = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  try {
    const res = await fetch(`${API}/concepts/${id}/`, { next: { revalidate: 300 } })
    if (!res.ok) throw new Error('not ok')
    const c = await res.json()
    const description: string = (c.summary || c.description || '').slice(0, 160)
    return {
      title: c.title,
      description,
      openGraph: { title: `${c.title} | QLS`, description, type: 'article' },
    }
  } catch {
    return { title: 'Concept' }
  }
}

export default function ConceptDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}

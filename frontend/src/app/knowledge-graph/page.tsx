'use client'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { conceptsApi } from '@/lib/api/concepts'

const KnowledgeGraphCanvas = dynamic(
  () => import('@/components/layout/KnowledgeGraphCanvas'),
  { ssr: false, loading: () => <GraphLoading /> }
)

function GraphLoading() {
  return (
    <div className="flex items-center justify-center h-[600px]">
      <div className="text-center">
        <div className="text-4xl text-slate-700 mb-4 animate-pulse">⬡</div>
        <p className="text-xs font-mono text-slate-600">Building knowledge graph...</p>
      </div>
    </div>
  )
}

export default function KnowledgeGraphPage() {
  const { data: graph, isLoading } = useQuery({
    queryKey: ['knowledge-graph'],
    queryFn: () => conceptsApi.knowledgeGraph().then((r) => r.data),
    staleTime: 5 * 60_000,
  })

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Knowledge Graph</h1>
        <p className="text-sm text-slate-500">
          Drag nodes to explore. Edges show concept dependencies.
        </p>
      </div>

      <div className="card-quantum p-2 min-h-[600px] relative overflow-hidden">
        {isLoading ? (
          <GraphLoading />
        ) : graph ? (
          <KnowledgeGraphCanvas graph={graph} />
        ) : (
          <div className="flex items-center justify-center h-[600px] text-slate-600">
            No graph data available yet.
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-6 text-xs text-slate-600 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-wave-500" />
          <span>Beginner</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-photon-500" />
          <span>Intermediate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-particle-500" />
          <span>Advanced</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-px bg-quantum-500/40" />
          <span>Prerequisite →</span>
        </div>
      </div>
    </div>
  )
}

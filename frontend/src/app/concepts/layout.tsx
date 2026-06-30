'use client'
import { useConceptsStore } from '@/lib/store/concepts'
import { cn } from '@/lib/utils'
import BranchSidebar from '@/components/concepts/BranchSidebar'

export default function ConceptsLayout({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useConceptsStore((s) => s.sidebarOpen)
  const toggleSidebar = useConceptsStore((s) => s.toggleSidebar)

  return (
    <div className="relative flex">
      {/* Branch navigation — collapsible, sticky under the navbar. */}
      <aside
        className={cn(
          'shrink-0 border-r border-white/5 bg-void-950/40 transition-all duration-300 overflow-hidden',
          sidebarOpen ? 'w-64' : 'w-0'
        )}
      >
        <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto px-4 py-6 w-64">
          <BranchSidebar />
        </div>
      </aside>

      {/* Collapse / expand handle. */}
      <button
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        className="fixed left-0 top-20 z-20 h-8 w-6 flex items-center justify-center rounded-r-md border border-l-0 border-white/10 bg-void-900/80 text-slate-500 hover:text-quantum-300 transition-colors"
        style={{ transform: sidebarOpen ? 'translateX(15rem)' : 'translateX(0)' }}
      >
        <span className={cn('transition-transform', sidebarOpen && 'rotate-180')}>›</span>
      </button>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

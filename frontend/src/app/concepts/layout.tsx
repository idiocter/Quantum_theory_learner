'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useConceptsStore } from '@/lib/store/concepts'
import { cn } from '@/lib/utils'
import BranchSidebar from '@/components/concepts/BranchSidebar'

export default function ConceptsLayout({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useConceptsStore((s) => s.sidebarOpen)
  const toggleSidebar = useConceptsStore((s) => s.toggleSidebar)
  const pathname = usePathname()

  // Close sidebar on navigation on small screens
  useEffect(() => {
    if (window.innerWidth < 768) {
      useConceptsStore.getState().setSidebarOpen(false)
    }
  }, [pathname])

  return (
    <div className="relative flex">
      {/* Mobile overlay — tap outside to close */}
      <div
        className={cn(
          'fixed inset-0 z-10 bg-void-950/60 backdrop-blur-sm transition-opacity duration-300 md:hidden',
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        aria-hidden
        onClick={toggleSidebar}
      />

      {/* Branch navigation sidebar */}
      <aside
        aria-label="Concept branches"
        className={cn(
          'shrink-0 border-r border-white/5 bg-void-950/40 transition-all duration-300 overflow-hidden',
          'md:relative fixed top-16 left-0 bottom-0 z-20',
          sidebarOpen ? 'w-64' : 'w-0'
        )}
      >
        <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto px-4 py-6 w-64">
          <BranchSidebar />
        </div>
      </aside>

      {/* Sidebar toggle handle */}
      <button
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? 'Collapse branch sidebar' : 'Expand branch sidebar'}
        aria-expanded={sidebarOpen}
        aria-controls="concepts-sidebar"
        className={cn(
          'fixed top-20 z-30 h-8 w-6 flex items-center justify-center',
          'rounded-r-md border border-l-0 border-white/10 bg-void-900/90 backdrop-blur-sm',
          'text-slate-500 hover:text-quantum-300 transition-all duration-300',
          sidebarOpen ? 'left-64' : 'left-0'
        )}
      >
        <span className={cn('transition-transform duration-300 text-xs', sidebarOpen && 'rotate-180')}>›</span>
      </button>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

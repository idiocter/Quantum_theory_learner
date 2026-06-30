'use client'
import { getSimulation } from '@/components/simulations/registry'

/**
 * Renders the interactive simulation associated with a topic, looked up by its
 * `related_simulation` key. Returns nothing when the topic has no simulation
 * (stub topics), so callers can drop it in unconditionally.
 */
export default function AnimationSlot({ simulationKey }: { simulationKey?: string | null }) {
  const Sim = getSimulation(simulationKey)
  if (!Sim) return null

  return (
    <div className="mb-6">
      <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">
        Interactive simulation
      </h2>
      <div className="card-quantum p-5">
        <Sim />
      </div>
    </div>
  )
}

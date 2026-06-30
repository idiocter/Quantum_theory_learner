'use client'
import { useState } from 'react'

// The 17 fundamental particles of the Standard Model, grouped by family.
type Kind = 'quark' | 'lepton' | 'gauge' | 'higgs'
interface Particle {
  sym: string; name: string; kind: Kind; mass: string; charge: string; spin: string
  year: string; by: string; note: string
}

const COLORS: Record<Kind, string> = {
  quark: '#a259ff', lepton: '#38c6e8', gauge: '#f59e0b', higgs: '#ff5ec4',
}

const PARTICLES: Particle[] = [
  // quarks (col, row positions implied by array order within group)
  { sym: 'u', name: 'up', kind: 'quark', mass: '2.2 MeV', charge: '+⅔', spin: '½', year: '1968', by: 'SLAC (deep inelastic)', note: 'Lightest quark; protons are uud.' },
  { sym: 'c', name: 'charm', kind: 'quark', mass: '1.27 GeV', charge: '+⅔', spin: '½', year: '1974', by: 'Richter & Ting (J/ψ)', note: 'Second-generation up-type quark.' },
  { sym: 't', name: 'top', kind: 'quark', mass: '173 GeV', charge: '+⅔', spin: '½', year: '1995', by: 'Fermilab (CDF/DØ)', note: 'Heaviest known particle.' },
  { sym: 'd', name: 'down', kind: 'quark', mass: '4.7 MeV', charge: '−⅓', spin: '½', year: '1968', by: 'SLAC (deep inelastic)', note: 'Protons are uud, neutrons udd.' },
  { sym: 's', name: 'strange', kind: 'quark', mass: '95 MeV', charge: '−⅓', spin: '½', year: '1947', by: 'Rochester & Butler', note: 'Carries strangeness quantum number.' },
  { sym: 'b', name: 'bottom', kind: 'quark', mass: '4.18 GeV', charge: '−⅓', spin: '½', year: '1977', by: 'Fermilab (Υ)', note: 'Third-generation down-type quark.' },
  // leptons
  { sym: 'e', name: 'electron', kind: 'lepton', mass: '0.511 MeV', charge: '−1', spin: '½', year: '1897', by: 'J. J. Thomson', note: 'First elementary particle found.' },
  { sym: 'μ', name: 'muon', kind: 'lepton', mass: '105.7 MeV', charge: '−1', spin: '½', year: '1936', by: 'Anderson & Neddermeyer', note: 'A heavy, unstable electron.' },
  { sym: 'τ', name: 'tau', kind: 'lepton', mass: '1.777 GeV', charge: '−1', spin: '½', year: '1975', by: 'Perl (SLAC)', note: 'Heaviest lepton.' },
  { sym: 'νe', name: 'e-neutrino', kind: 'lepton', mass: '<2 eV', charge: '0', spin: '½', year: '1956', by: 'Cowan & Reines', note: 'Nearly massless, weakly interacting.' },
  { sym: 'νμ', name: 'μ-neutrino', kind: 'lepton', mass: '<2 eV', charge: '0', spin: '½', year: '1962', by: 'Lederman et al.', note: 'Distinct from the electron neutrino.' },
  { sym: 'ντ', name: 'τ-neutrino', kind: 'lepton', mass: '<2 eV', charge: '0', spin: '½', year: '2000', by: 'DONUT (Fermilab)', note: 'Last neutrino confirmed.' },
  // gauge bosons
  { sym: 'g', name: 'gluon', kind: 'gauge', mass: '0', charge: '0', spin: '1', year: '1979', by: 'PETRA (3-jet)', note: 'Mediates the strong force; carries colour.' },
  { sym: 'γ', name: 'photon', kind: 'gauge', mass: '0', charge: '0', spin: '1', year: '1905', by: 'Einstein (quantum)', note: 'Mediates electromagnetism.' },
  { sym: 'Z', name: 'Z boson', kind: 'gauge', mass: '91.2 GeV', charge: '0', spin: '1', year: '1983', by: 'CERN (UA1/UA2)', note: 'Neutral weak-force carrier.' },
  { sym: 'W', name: 'W boson', kind: 'gauge', mass: '80.4 GeV', charge: '±1', spin: '1', year: '1983', by: 'CERN (UA1/UA2)', note: 'Charged weak-force carrier; drives beta decay.' },
  // higgs
  { sym: 'H', name: 'Higgs', kind: 'higgs', mass: '125 GeV', charge: '0', spin: '0', year: '2012', by: 'ATLAS & CMS (LHC)', note: 'Excitation of the field that gives mass.' },
]

type Filter = 'all' | 'fermions' | 'bosons'
const inFilter = (p: Particle, f: Filter) =>
  f === 'all' || (f === 'fermions' ? p.kind === 'quark' || p.kind === 'lepton' : p.kind === 'gauge' || p.kind === 'higgs')

export default function StandardModelTable() {
  const [selected, setSelected] = useState<Particle>(PARTICLES[6]) // electron
  const [filter, setFilter] = useState<Filter>('all')

  const groups: { key: Kind; label: string }[] = [
    { key: 'quark', label: 'Quarks' },
    { key: 'lepton', label: 'Leptons' },
    { key: 'gauge', label: 'Gauge bosons' },
    { key: 'higgs', label: 'Higgs' },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mr-1">Show</span>
        {(['all', 'fermions', 'bosons'] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded text-xs font-mono capitalize transition-all border ${
              filter === f ? 'border-quantum-500/60 bg-quantum-500/15 text-quantum-200' : 'border-white/10 text-slate-400 hover:border-white/20'
            }`}>
            {f}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div className="flex flex-wrap gap-3 content-start">
          {groups.map((g) => {
            const items = PARTICLES.filter((p) => p.kind === g.key && inFilter(p, filter))
            if (!items.length) return null
            return (
              <div key={g.key} className="rounded-lg border border-white/5 p-2.5" style={{ borderColor: `${COLORS[g.key]}33` }}>
                <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: COLORS[g.key] }}>{g.label}</div>
                <div className={`grid gap-1.5 ${g.key === 'quark' || g.key === 'lepton' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {items.map((p) => {
                    const active = selected.sym === p.sym
                    return (
                      <button key={p.sym} onClick={() => setSelected(p)}
                        className="w-14 h-14 rounded-md flex flex-col items-center justify-center transition-all border"
                        style={{
                          borderColor: active ? COLORS[p.kind] : 'rgba(255,255,255,0.08)',
                          background: active ? `${COLORS[p.kind]}22` : 'rgba(255,255,255,0.02)',
                        }}>
                        <span className="text-base font-serif" style={{ color: COLORS[p.kind] }}>{p.sym}</span>
                        <span className="text-[8px] text-slate-500 leading-none mt-0.5">{p.charge}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Detail panel */}
        <div className="card-quantum p-4 md:w-56 shrink-0 self-start">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-serif" style={{ color: COLORS[selected.kind] }}>{selected.sym}</span>
            <span className="text-sm font-medium text-white capitalize">{selected.name}</span>
          </div>
          <dl className="mt-3 space-y-1 text-xs">
            {[
              ['mass', selected.mass], ['charge', selected.charge], ['spin', selected.spin],
              ['discovered', selected.year], ['by', selected.by],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-slate-600">{k}</dt>
                <dd className="text-slate-300 font-mono text-right">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-slate-500 leading-relaxed mt-3 border-t border-white/5 pt-2">{selected.note}</p>
        </div>
      </div>
    </div>
  )
}

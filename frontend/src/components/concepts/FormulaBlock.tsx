'use client'
import { useState } from 'react'
import { Tex, TexProse } from '@/components/ui/Tex'
import type { Formula } from '@/types'

export default function FormulaBlock({ formula }: { formula: Formula }) {
  const [showDerivation, setShowDerivation] = useState(false)
  const symbols = Object.entries(formula.symbols ?? {})
  const steps = formula.derivation_steps ?? []

  return (
    <div className="rounded-xl border border-quantum-500/20 bg-void-900/50 p-5">
      {/* The rendered equation, centered and large. */}
      <Tex block className="text-quantum-100 overflow-x-auto py-1">
        {formula.latex}
      </Tex>

      {formula.description && (
        <p className="mt-3 text-sm text-slate-400 leading-relaxed">{formula.description}</p>
      )}

      {symbols.length > 0 && (
        <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {symbols.map(([symbol, meaning]) => (
            <div key={symbol} className="flex items-baseline gap-2 text-sm">
              <dt className="font-mono text-quantum-300 shrink-0">
                <Tex>{symbol}</Tex>
              </dt>
              <dd className="text-slate-500">— {meaning}</dd>
            </div>
          ))}
        </dl>
      )}

      {steps.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowDerivation((v) => !v)}
            className="text-xs font-mono uppercase tracking-widest text-slate-500 hover:text-quantum-300 transition-colors inline-flex items-center gap-1.5"
          >
            <span className={`transition-transform ${showDerivation ? 'rotate-90' : ''}`}>›</span>
            {showDerivation ? 'Hide' : 'Show'} derivation ({steps.length} steps)
          </button>

          {showDerivation && (
            <ol className="mt-3 space-y-2 border-l border-quantum-500/20 pl-4">
              {steps.map((step, i) => (
                <li key={i} className="text-sm text-slate-400 flex gap-2">
                  <span className="font-mono text-xs text-slate-600 shrink-0">{i + 1}.</span>
                  {/* Steps are prose; authors embed math with inline `$...$`. */}
                  <TexProse content={step} className="prose-quantum" />
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}

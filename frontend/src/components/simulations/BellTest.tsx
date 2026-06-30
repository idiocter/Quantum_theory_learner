'use client'
import { useState } from 'react'

// The CHSH form of Bell's theorem. Quantum mechanics predicts the correlation
// E(a,b) = -cos(a-b) between spin measurements at angles a and b. The combined
// quantity S can reach 2√2 ≈ 2.83, violating the classical local-hidden-variable
// bound |S| ≤ 2 — a violation confirmed in loophole-free experiments.
const TSIRELSON = 2 * Math.SQRT2
const rad = (deg: number) => (deg * Math.PI) / 180
const E = (a: number, b: number) => -Math.cos(rad(a - b))

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span className="font-mono">{label}</span>
        <span className="font-mono text-quantum-400">{value}°</span>
      </div>
      <input type="range" min={0} max={180} step={1} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-quantum-500 h-1" />
    </div>
  )
}

export default function BellTest() {
  const [a, setA] = useState(0)
  const [ap, setAp] = useState(90)
  const [b, setB] = useState(45)
  const [bp, setBp] = useState(135)
  const [measured, setMeasured] = useState<number | null>(null)

  const S = E(a, b) - E(a, bp) + E(ap, b) + E(ap, bp)
  const absS = Math.abs(S)
  const violates = absS > 2

  // Monte Carlo: sample N entangled pairs, randomly choosing one setting per side,
  // generating ±1 outcomes whose correlation matches the QM prediction E.
  const runTrials = () => {
    const N = 500
    const sums: Record<string, { sum: number; n: number }> = {}
    const pairs: [number, number, string][] = [
      [a, b, 'ab'], [a, bp, 'abp'], [ap, b, 'apb'], [ap, bp, 'apbp'],
    ]
    for (let i = 0; i < N; i++) {
      const [ax, bx, key] = pairs[Math.floor(Math.random() * 4)]
      const corr = E(ax, bx)
      const A = Math.random() < 0.5 ? 1 : -1
      // P(same sign) = (1 + corr) / 2
      const B = Math.random() < (1 + corr) / 2 ? A : -A
      const s = sums[key] ?? (sums[key] = { sum: 0, n: 0 })
      s.sum += A * B
      s.n++
    }
    const Em = (k: string) => (sums[k]?.n ? sums[k].sum / sums[k].n : 0)
    setMeasured(Em('ab') - Em('abp') + Em('apb') + Em('apbp'))
  }

  const optimal = () => { setA(0); setAp(90); setB(45); setBp(135); setMeasured(null) }

  // Gauge: |S| on a 0 → 3 scale with markers at 2 and 2√2.
  const pct = (v: number) => `${Math.min(v / 3, 1) * 100}%`

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <Slider label="Alice  a" value={a} onChange={(v) => { setA(v); setMeasured(null) }} />
        <Slider label="Bob    b" value={b} onChange={(v) => { setB(v); setMeasured(null) }} />
        <Slider label="Alice  a'" value={ap} onChange={(v) => { setAp(v); setMeasured(null) }} />
        <Slider label="Bob    b'" value={bp} onChange={(v) => { setBp(v); setMeasured(null) }} />
      </div>

      {/* CHSH gauge */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">CHSH parameter |S|</span>
          <span className={`font-mono ${violates ? 'text-plasma-300' : 'text-slate-400'}`}>{absS.toFixed(3)}</span>
        </div>
        <div className="relative h-3 rounded bg-void-800 overflow-hidden">
          <div className="h-full rounded transition-all duration-300"
            style={{ width: pct(absS), background: violates ? '#ff5ec4' : '#a259ff' }} />
          {/* classical bound at S=2 */}
          <div className="absolute top-0 h-full border-l border-dashed border-red-400" style={{ left: pct(2) }} />
          {/* Tsirelson bound at 2√2 */}
          <div className="absolute top-0 h-full border-l border-dashed border-amber-400" style={{ left: pct(TSIRELSON) }} />
        </div>
        <div className="flex justify-between text-[10px] text-slate-600 font-mono">
          <span className="text-red-400/80">classical limit 2</span>
          <span className="text-amber-400/80">quantum max 2√2 ≈ {TSIRELSON.toFixed(3)}</span>
        </div>
      </div>

      <div className="text-xs">
        {violates ? (
          <span className="text-plasma-300">✗ |S| &gt; 2 — no local hidden-variable theory can explain this.</span>
        ) : (
          <span className="text-slate-500">|S| ≤ 2 — compatible with classical local realism at these angles.</span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={optimal}
          className="px-3 py-1.5 rounded-lg border border-quantum-500/30 text-quantum-300 hover:border-quantum-500/60 text-xs font-mono transition-all">
          Optimal angles
        </button>
        <button onClick={runTrials}
          className="px-3 py-1.5 rounded-lg border border-wave-500/30 text-wave-300 hover:border-wave-500/60 text-xs font-mono transition-all">
          Run 500 pairs
        </button>
        {measured !== null && (
          <span className="text-xs font-mono text-slate-500">
            measured S = <span className="text-wave-300">{measured.toFixed(3)}</span> · theory {S.toFixed(3)}
          </span>
        )}
      </div>
    </div>
  )
}

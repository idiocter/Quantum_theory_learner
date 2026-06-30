'use client'
import { useMemo, useState } from 'react'

// BB84 quantum key distribution. Alice sends qubits encoded in a random basis;
// Bob measures in his own random basis. They keep only the bits where their
// bases matched (sifting). An eavesdropper (Eve) who measures in transit
// disturbs those bits ~25% of the time — a detectable error spike.
const N = 14
const rand = () => (Math.random() < 0.5 ? 0 : 1)
const basisSym = (b: number) => (b === 0 ? '+' : '×')

interface Run {
  aliceBits: number[]
  aliceBases: number[]
  eveBases: (number | null)[]
  bobBases: number[]
  bobBits: number[]
}

function generate(eavesdrop: boolean): Run {
  const aliceBits: number[] = []
  const aliceBases: number[] = []
  const eveBases: (number | null)[] = []
  const bobBases: number[] = []
  const bobBits: number[] = []

  for (let i = 0; i < N; i++) {
    const ab = rand()
    const abasis = rand()
    let carried = ab // the bit value currently encoded on the qubit
    let carriedBasis = abasis

    let eBasis: number | null = null
    if (eavesdrop) {
      eBasis = rand()
      // Eve measures: correct read if her basis matches, else random; she
      // resends in her own basis, corrupting the encoding for Bob.
      carried = eBasis === carriedBasis ? carried : rand()
      carriedBasis = eBasis
    }

    const bb = rand()
    // Bob reads correctly only if his basis matches the qubit's current basis.
    const bobBit = bb === carriedBasis ? carried : rand()

    aliceBits.push(ab)
    aliceBases.push(abasis)
    eveBases.push(eBasis)
    bobBases.push(bb)
    bobBits.push(bobBit)
  }
  return { aliceBits, aliceBases, eveBases, bobBases, bobBits }
}

export default function BB84Protocol() {
  const [eavesdrop, setEavesdrop] = useState(false)
  const [stage, setStage] = useState(0) // 0 transmit · 1 compare bases · 2 sift
  const [seed, setSeed] = useState(0)

  const run = useMemo(() => generate(eavesdrop), [eavesdrop, seed])

  const sifted = run.aliceBases.map((b, i) => b === run.bobBases[i])
  const siftedIdx = sifted.map((m, i) => (m ? i : -1)).filter((i) => i >= 0)
  const errors = siftedIdx.filter((i) => run.aliceBits[i] !== run.bobBits[i])
  const qber = siftedIdx.length ? (errors.length / siftedIdx.length) * 100 : 0

  const regenerate = () => { setSeed((s) => s + 1); setStage(0) }

  const Cell = ({ children, hl }: { children: React.ReactNode; hl?: string }) => (
    <td className={`text-center font-mono text-xs py-1 w-7 ${hl ?? ''}`}>{children}</td>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
          <input type="checkbox" checked={eavesdrop} onChange={(e) => { setEavesdrop(e.target.checked); setStage(0) }}
            className="accent-plasma-500" />
          Eavesdropper (Eve) present
        </label>
        <button onClick={regenerate}
          className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:border-white/20 text-xs font-mono transition-all">
          ↺ New run
        </button>
        <button
          onClick={() => setStage((s) => Math.min(2, s + 1))}
          disabled={stage >= 2}
          className="px-3 py-1.5 rounded-lg border border-quantum-500/30 text-quantum-300 hover:border-quantum-500/60 disabled:opacity-40 text-xs font-mono transition-all">
          {stage === 0 ? 'Compare bases →' : stage === 1 ? 'Sift key →' : 'Done'}
        </button>
      </div>

      <div className="rounded-lg bg-void-950/60 border border-white/5 p-3 overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className="text-[10px] text-slate-500 pr-3 whitespace-nowrap">Alice bit</td>
              {run.aliceBits.map((b, i) => <Cell key={i} hl="text-wave-300">{b}</Cell>)}
            </tr>
            <tr>
              <td className="text-[10px] text-slate-500 pr-3 whitespace-nowrap">Alice basis</td>
              {run.aliceBases.map((b, i) => <Cell key={i} hl="text-slate-400">{basisSym(b)}</Cell>)}
            </tr>
            {eavesdrop && (
              <tr>
                <td className="text-[10px] text-plasma-400 pr-3 whitespace-nowrap">Eve basis</td>
                {run.eveBases.map((b, i) => <Cell key={i} hl="text-plasma-300">{b === null ? '' : basisSym(b)}</Cell>)}
              </tr>
            )}
            <tr>
              <td className="text-[10px] text-slate-500 pr-3 whitespace-nowrap">Bob basis</td>
              {run.bobBases.map((b, i) => <Cell key={i} hl="text-slate-400">{basisSym(b)}</Cell>)}
            </tr>
            <tr>
              <td className="text-[10px] text-slate-500 pr-3 whitespace-nowrap">Bob bit</td>
              {run.bobBits.map((b, i) => <Cell key={i} hl="text-wave-300">{b}</Cell>)}
            </tr>
            {stage >= 1 && (
              <tr>
                <td className="text-[10px] text-slate-500 pr-3 whitespace-nowrap">Bases match</td>
                {sifted.map((m, i) => (
                  <Cell key={i} hl={m ? 'text-quantum-300' : 'text-slate-700'}>{m ? '✓' : '·'}</Cell>
                ))}
              </tr>
            )}
            {stage >= 2 && (
              <tr>
                <td className="text-[10px] text-slate-500 pr-3 whitespace-nowrap">Sifted key</td>
                {sifted.map((m, i) => {
                  const err = m && run.aliceBits[i] !== run.bobBits[i]
                  return (
                    <Cell key={i} hl={!m ? 'text-slate-800' : err ? 'text-plasma-400 font-bold' : 'text-quantum-200'}>
                      {m ? (err ? '✗' : run.aliceBits[i]) : ''}
                    </Cell>
                  )
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {stage >= 2 && (
        <div className="flex items-center gap-4 text-xs flex-wrap">
          <span className="text-slate-500">Sifted bits: <span className="font-mono text-quantum-300">{siftedIdx.length}</span></span>
          <span className="text-slate-500">
            Error rate (QBER):{' '}
            <span className={`font-mono ${qber > 11 ? 'text-plasma-400' : 'text-quantum-300'}`}>{qber.toFixed(0)}%</span>
          </span>
          <span className={`font-mono ${qber > 11 ? 'text-plasma-400' : 'text-emerald-400'}`}>
            {qber > 11 ? '⚠ eavesdropper detected — discard key' : '✓ low error — key is secure'}
          </span>
        </div>
      )}
    </div>
  )
}

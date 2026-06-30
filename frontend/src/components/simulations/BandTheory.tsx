'use client'
import { useRef, useState } from 'react'
import QuantumCanvas, { type CanvasFrame } from './QuantumCanvas'

// Electronic band structure: a filled valence band and an empty conduction band
// separated by a gap. Whether a solid conducts depends on the gap size and where
// the Fermi level sits — metals have states at E_F, insulators have a wide gap.
type Material = 'metal' | 'semiconductor' | 'insulator'
const GAPS: Record<Material, number> = { metal: -0.25, semiconductor: 0.18, insulator: 0.5 }
const LABELS: Record<Material, string> = {
  metal: 'Metal — bands overlap, conducts freely',
  semiconductor: 'Semiconductor — small gap, conducts when excited',
  insulator: 'Insulator — wide gap, no conduction',
}

export default function BandTheory() {
  const [material, setMaterial] = useState<Material>('semiconductor')
  const [fermi, setFermi] = useState(0)
  const matRef = useRef(material)
  const fermiRef = useRef(fermi)
  matRef.current = material
  fermiRef.current = fermi

  const draw = (ctx: CanvasRenderingContext2D, { t, width: W, height: H }: CanvasFrame) => {
    ctx.fillStyle = '#060414'
    ctx.fillRect(0, 0, W, H)

    const pad = 26
    const plotW = W - pad * 2
    const plotH = H - pad * 2
    const cx = pad + plotW / 2
    // Energy axis: E in [-1, 1] mapped to y.
    const eToY = (e: number) => pad + plotH * (0.5 - e / 2)
    const gap = GAPS[matRef.current]
    const ef = fermiRef.current

    // Two bands as parabolas in k (x), offset by ±gap/2.
    const band = (sign: number, color: string, fillBelowEf: boolean) => {
      ctx.beginPath()
      for (let i = 0; i <= plotW; i++) {
        const k = (i / plotW) * 2 - 1
        const e = sign * (Math.abs(gap) / 2 + 0.35 * k * k * (gap < 0 ? -1 : 1)) + sign * 0.15
        const x = pad + i
        const y = eToY(e)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.strokeStyle = color
      ctx.lineWidth = 2.5
      ctx.stroke()

      // Shade occupied states (electrons fill up to E_F).
      if (fillBelowEf) {
        ctx.save()
        ctx.globalAlpha = 0.18
        ctx.lineTo(pad + plotW, eToY(-1))
        ctx.lineTo(pad, eToY(-1))
        ctx.closePath()
        ctx.fillStyle = color
        ctx.fill()
        ctx.restore()
      }
    }

    band(-1, '#38c6e8', true) // valence band (filled)
    band(1, '#a259ff', false) // conduction band

    // Fermi level line.
    const yF = eToY(ef)
    ctx.strokeStyle = '#facc15'
    ctx.setLineDash([5, 4])
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(pad, yF)
    ctx.lineTo(W - pad, yF)
    ctx.stroke()
    ctx.setLineDash([])

    // Conduction electrons (only if the conduction band reaches below E_F).
    const condBottom = Math.abs(gap) / 2 + 0.15
    if (ef > condBottom - 0.02) {
      for (let n = 0; n < 8; n++) {
        const x = cx + Math.sin(t * 1.5 + n) * (plotW * 0.32) * ((n % 2) - 0.5) * 2
        ctx.beginPath()
        ctx.arc(x, eToY(condBottom + 0.05), 3, 0, Math.PI * 2)
        ctx.fillStyle = '#a259ff'
        ctx.fill()
      }
    }

    ctx.font = '11px monospace'
    ctx.fillStyle = 'rgba(56,198,232,0.9)'
    ctx.fillText('valence band', pad + 2, eToY(-0.85))
    ctx.fillStyle = 'rgba(162,89,255,0.9)'
    ctx.fillText('conduction band', pad + 2, pad + 8)
    ctx.fillStyle = '#facc15'
    ctx.textAlign = 'right'
    ctx.fillText(`E_F`, W - pad - 2, yF - 4)
    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText('k →', W - pad - 30, H - pad + 14)
  }

  return (
    <div className="space-y-3">
      <QuantumCanvas draw={draw} height={300} speeds={[1]}>
        <span className="text-[10px] text-slate-600 ml-auto truncate max-w-[55%]">{LABELS[material]}</span>
      </QuantumCanvas>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mr-1">Material</span>
        {(['metal', 'semiconductor', 'insulator'] as Material[]).map((m) => (
          <button key={m} onClick={() => setMaterial(m)}
            className={`px-2.5 py-1 rounded text-xs font-mono capitalize transition-all border ${
              material === m ? 'border-quantum-500/60 bg-quantum-500/15 text-quantum-200' : 'border-white/10 text-slate-400 hover:border-white/20'
            }`}>
            {m}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Fermi level E_F</span>
          <span className="font-mono text-quantum-400">{fermi.toFixed(2)}</span>
        </div>
        <input type="range" min={-0.6} max={0.6} step={0.01} value={fermi}
          onChange={(e) => setFermi(Number(e.target.value))}
          className="w-full accent-quantum-500 h-1" />
      </div>
    </div>
  )
}

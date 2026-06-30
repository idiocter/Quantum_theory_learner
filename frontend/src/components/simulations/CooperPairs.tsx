'use client'
import { useRef, useState } from 'react'
import QuantumCanvas, { type CanvasFrame } from './QuantumCanvas'

// Below the critical temperature Tc, an electron distorts the positive-ion
// lattice as it passes, and a second electron is attracted to that wake — they
// bind into a Cooper pair. Above Tc, thermal motion shakes the pairs apart.
const TC = 0.4 // critical temperature on the 0–1 slider scale

export default function CooperPairs() {
  const [temp, setTemp] = useState(0.2)
  const tempRef = useRef(temp)
  tempRef.current = temp

  const draw = (ctx: CanvasRenderingContext2D, { t, width: W, height: H }: CanvasFrame) => {
    ctx.fillStyle = '#060414'
    ctx.fillRect(0, 0, W, H)

    const T = tempRef.current
    const paired = T < TC
    const cols = 9, rows = 5
    const dx = W / cols, dy = H / rows

    // Ion lattice — jitter grows with temperature; ions near the electrons pull inward.
    const e1x = W / 2 + Math.cos(t * (paired ? 0.8 : 2.2)) * W * 0.28
    const e2x = W / 2 - Math.cos(t * (paired ? 0.8 : 2.2)) * W * 0.28
    const ey = H / 2 + (paired ? Math.sin(t * 0.8) * 12 : 0)

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let x = dx * (c + 0.5)
        let y = dy * (r + 0.5)
        const jit = T * 6
        x += Math.sin(t * 3 + c * 1.3 + r) * jit
        y += Math.cos(t * 3 + r * 1.7 + c) * jit
        // Lattice distortion toward the passing electrons (the phonon wake).
        if (paired) {
          for (const ex of [e1x, e2x]) {
            const d = Math.hypot(x - ex, y - ey)
            if (d < 70) { x += (ex - x) * 0.12 * (1 - d / 70); y += (ey - y) * 0.12 * (1 - d / 70) }
          }
        }
        ctx.beginPath()
        ctx.arc(x, y, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.18)'
        ctx.fill()
        ctx.fillStyle = 'rgba(255,120,120,0.5)'
        ctx.font = '9px monospace'
        ctx.fillText('+', x - 2.5, y + 3)
      }
    }

    // The pair bond.
    if (paired) {
      ctx.beginPath()
      ctx.moveTo(e1x, ey)
      ctx.lineTo(e2x, ey)
      ctx.strokeStyle = 'rgba(162,89,255,0.5)'
      ctx.setLineDash([4, 3])
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.setLineDash([])
    }

    // The two electrons.
    for (const [ex, ey2] of [[e1x, ey], [e2x, paired ? ey : H / 2 + Math.sin(t * 4) * H * 0.3]]) {
      ctx.beginPath()
      ctx.arc(ex, ey2, 6, 0, Math.PI * 2)
      ctx.fillStyle = paired ? '#a259ff' : '#38c6e8'
      ctx.shadowColor = paired ? 'rgba(162,89,255,0.8)' : 'rgba(56,198,232,0.6)'
      ctx.shadowBlur = 10
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = '#fff'
      ctx.font = '9px monospace'
      ctx.fillText('e⁻', ex - 6, ey2 + 3)
    }

    ctx.font = '12px monospace'
    ctx.fillStyle = paired ? '#a259ff' : '#38c6e8'
    ctx.fillText(paired ? 'T < Tc — Cooper pair bound (superconducting)' : 'T > Tc — pair broken (normal metal)', 10, 18)
  }

  return (
    <div className="space-y-3">
      <QuantumCanvas draw={draw} height={280} speeds={[0.5, 1, 2]} />
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Temperature</span>
          <span className="font-mono text-quantum-400">{temp < TC ? 'below Tc' : 'above Tc'} ({temp.toFixed(2)})</span>
        </div>
        <input type="range" min={0} max={1} step={0.01} value={temp}
          onChange={(e) => setTemp(Number(e.target.value))}
          className="w-full accent-quantum-500 h-1" />
      </div>
    </div>
  )
}

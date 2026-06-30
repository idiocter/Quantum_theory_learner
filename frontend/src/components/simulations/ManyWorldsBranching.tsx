'use client'
import QuantumCanvas, { type CanvasFrame } from './QuantumCanvas'

// In the many-worlds interpretation, every measurement splits the universe: each
// possible outcome is realised on its own branch, with no collapse. The tree
// grows a new generation of branches at each measurement.
const MAX_GEN = 5
const GEN_TIME = 1.2 // seconds per measurement (branching) event

export default function ManyWorldsBranching() {
  const draw = (ctx: CanvasRenderingContext2D, { t, width: W, height: H }: CanvasFrame) => {
    ctx.fillStyle = '#060414'
    ctx.fillRect(0, 0, W, H)

    const pad = 30
    const seg = (W - pad * 2) / MAX_GEN
    const grown = Math.min(t / GEN_TIME, MAX_GEN)
    const fullGens = Math.floor(grown)
    const frac = grown - fullGens

    const drawNode = (gen: number, x: number, y: number, spread: number) => {
      if (gen >= MAX_GEN) {
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fillStyle = '#a259ff'
        ctx.fill()
        return
      }
      // How far this generation's branches have grown (1 if past, frac if current).
      const grow = gen < fullGens ? 1 : gen === fullGens ? frac : 0
      if (grow <= 0) {
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fillStyle = '#38c6e8'; ctx.fill()
        return
      }
      const childSpread = spread / 2
      const hue = gen / MAX_GEN
      ctx.strokeStyle = `rgba(${120 + hue * 100}, ${100 + hue * 80}, 255, ${0.4 + 0.5 * grow})`
      ctx.lineWidth = 2
      for (const dir of [-1, 1]) {
        const cx = x + seg * grow
        const cy = y + dir * childSpread * grow
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(cx, cy)
        ctx.stroke()
        if (grow >= 1) drawNode(gen + 1, cx, cy, childSpread)
      }
    }

    drawNode(0, pad, H / 2, H * 0.42)

    ctx.font = '11px monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillText(`measurements: ${fullGens}`, pad, 18)
    ctx.textAlign = 'right'
    ctx.fillStyle = 'rgba(162,89,255,0.9)'
    ctx.fillText(`worlds: ${2 ** fullGens}`, W - pad, 18)
    ctx.textAlign = 'left'
  }

  return <QuantumCanvas draw={draw} height={300} speeds={[0.5, 1, 2]} />
}

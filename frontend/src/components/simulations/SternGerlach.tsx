'use client'
import { useRef, useEffect, useState } from 'react'

interface Atom {
  x: number
  y: number
  spin: 1 | -1
  deflected: boolean
}

// Stern–Gerlach: silver atoms through an inhomogeneous magnetic field split
// into exactly two beams, revealing that spin is quantised, not continuous.
export default function SternGerlach() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const atomsRef = useRef<Atom[]>([])
  const runningRef = useRef(true)
  const upRef = useRef(0)
  const downRef = useRef(0)

  const [isRunning, setIsRunning] = useState(true)
  const [up, setUp] = useState(0)
  const [down, setDown] = useState(0)

  useEffect(() => {
    runningRef.current = isRunning
  }, [isRunning])

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    canvas.width = canvas.parentElement?.clientWidth ?? 700
    canvas.height = 320
    const W = canvas.width
    const H = canvas.height
    const mid = H / 2
    const magnetX0 = W * 0.34
    const magnetX1 = W * 0.6
    const screenX = W * 0.9
    const split = H * 0.18

    const hitsUp: number[] = []
    const hitsDown: number[] = []
    let frame = 0

    const render = () => {
      if (!runningRef.current) {
        animRef.current = requestAnimationFrame(render)
        return
      }
      ctx.fillStyle = 'rgba(6,4,20,0.25)'
      ctx.fillRect(0, 0, W, H)

      // Source oven
      ctx.fillStyle = 'rgba(255,200,61,0.15)'
      ctx.fillRect(4, mid - 18, 22, 36)
      ctx.strokeStyle = 'rgba(255,200,61,0.5)'
      ctx.strokeRect(4, mid - 18, 22, 36)

      // Magnet poles (N top, S bottom)
      ctx.fillStyle = 'rgba(162,89,255,0.10)'
      ctx.fillRect(magnetX0, mid - 70, magnetX1 - magnetX0, 36)
      ctx.fillRect(magnetX0, mid + 34, magnetX1 - magnetX0, 36)
      ctx.font = '12px monospace'
      ctx.fillStyle = 'rgba(162,89,255,0.8)'
      ctx.fillText('N', (magnetX0 + magnetX1) / 2 - 4, mid - 48)
      ctx.fillStyle = 'rgba(56,198,232,0.8)'
      ctx.fillText('S', (magnetX0 + magnetX1) / 2 - 4, mid + 60)

      // Detection screen
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.beginPath()
      ctx.moveTo(screenX, 30)
      ctx.lineTo(screenX, H - 30)
      ctx.stroke()

      // Spawn atoms
      if (frame % 6 === 0) {
        atomsRef.current.push({
          x: 26,
          y: mid + (Math.random() - 0.5) * 8,
          spin: Math.random() < 0.5 ? 1 : -1,
          deflected: false,
        })
      }

      atomsRef.current = atomsRef.current.filter((a) => {
        a.x += 2.4
        // Deflect within the magnet region
        if (a.x > magnetX0 && a.x < screenX) {
          const through = Math.min(1, (a.x - magnetX0) / (screenX - magnetX0))
          a.y = mid - a.spin * split * through
        }
        if (a.x >= screenX) {
          if (a.spin === 1) {
            hitsUp.push(a.y)
            upRef.current++
            setUp(upRef.current)
          } else {
            hitsDown.push(a.y)
            downRef.current++
            setDown(downRef.current)
          }
          return false
        }
        ctx.beginPath()
        ctx.arc(a.x, a.y, 2.2, 0, Math.PI * 2)
        ctx.fillStyle = a.spin === 1 ? 'rgba(56,198,232,0.9)' : 'rgba(255,94,196,0.9)'
        ctx.fill()
        return true
      })

      // Accumulated spots on screen
      for (const y of hitsUp) {
        ctx.beginPath()
        ctx.arc(screenX + 4, y + (Math.random() - 0.5) * 3, 1.6, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(56,198,232,0.06)'
        ctx.fill()
      }
      for (const y of hitsDown) {
        ctx.beginPath()
        ctx.arc(screenX + 4, y + (Math.random() - 0.5) * 3, 1.6, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,94,196,0.06)'
        ctx.fill()
      }

      // Labels
      ctx.font = '10px monospace'
      ctx.fillStyle = 'rgba(56,198,232,0.9)'
      ctx.fillText('spin ↑', screenX + 12, mid - split)
      ctx.fillStyle = 'rgba(255,94,196,0.9)'
      ctx.fillText('spin ↓', screenX + 12, mid + split + 4)
      ctx.fillStyle = 'rgba(100,116,139,0.8)'
      ctx.fillText('OVEN', 4, mid - 26)

      // Classical-expectation ghost (continuous smear) annotation
      ctx.fillStyle = 'rgba(100,116,139,0.5)'
      ctx.fillText('(classical: one blurred band)', screenX - 180, H - 14)

      frame++
      animRef.current = requestAnimationFrame(render)
    }
    ctx.fillStyle = '#060414'
    ctx.fillRect(0, 0, W, H)
    render()
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  const total = up + down

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="w-full rounded-lg" style={{ background: '#060414' }} />

      <div className="flex items-center justify-between text-xs text-slate-600 flex-wrap gap-3">
        <span className="font-mono">
          ↑ <span className="text-wave-400">{up}</span> &nbsp;·&nbsp; ↓{' '}
          <span className="text-plasma-400">{down}</span> &nbsp;·&nbsp; split{' '}
          <span className="text-quantum-400">
            {total ? `${Math.round((up / total) * 100)} / ${Math.round((down / total) * 100)}` : '0 / 0'}
          </span>
        </span>
        <button
          onClick={() => setIsRunning((r) => !r)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
            isRunning
              ? 'border-particle-500/30 text-particle-400 hover:border-particle-500/60'
              : 'border-wave-500/30 text-wave-400 hover:border-wave-500/60'
          }`}
        >
          {isRunning ? '⏸ Pause' : '▶ Resume'}
        </button>
      </div>
    </div>
  )
}

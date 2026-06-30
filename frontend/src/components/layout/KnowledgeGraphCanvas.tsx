'use client'
import { useEffect, useRef, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { KnowledgeGraph } from '@/types'

interface Props {
  graph: KnowledgeGraph
  /** Branch slugs to hide (and their edges). */
  hiddenBranches?: Set<string>
}

interface NodeState {
  id: string
  title: string
  branch: string
  color: string
  x: number
  y: number
  vx: number
  vy: number
  r: number
}

export default function KnowledgeGraphCanvas({ graph, hiddenBranches }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<NodeState[]>([])
  const animRef = useRef<number>(0)
  const draggingRef = useRef<{ node: NodeState; offsetX: number; offsetY: number } | null>(null)
  const panRef = useRef<{ x: number; y: number } | null>(null)
  const viewRef = useRef({ scale: 1, ox: 0, oy: 0 })
  const hiddenRef = useRef<Set<string>>(hiddenBranches ?? new Set())
  hiddenRef.current = hiddenBranches ?? new Set()
  const router = useRouter()
  const [tooltip, setTooltip] = useState<{ x: number; y: number; title: string; branch: string } | null>(null)

  const initNodes = useCallback(() => {
    const canvas = canvasRef.current!
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const PHI = 1.618033988749895
    // Size by connection count (degree); bigger hubs read as more central.
    nodesRef.current = graph.nodes.map((n, i) => {
      const angle = i * PHI * Math.PI * 2
      const radius = Math.sqrt(i) * 60
      return {
        id: n.id,
        title: n.title,
        branch: n.branch_slug,
        color: n.category_color || '#a259ff',
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
        r: 16 + Math.min(n.connection_count, 10) * 2.2,
      }
    })
  }, [graph])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth ?? 900
      canvas.height = 580
      initNodes()
    }
    resize()
    window.addEventListener('resize', resize)

    const isHidden = (id: string) => {
      const n = nodesRef.current.find((m) => m.id === id)
      return n ? hiddenRef.current.has(n.branch) : false
    }

    const simulate = () => {
      const nodes = nodesRef.current
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      nodes.forEach((a) => {
        a.vx += (cx - a.x) * 0.002
        a.vy += (cy - a.y) * 0.002
        nodes.forEach((b) => {
          if (a === b) return
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = 1200 / (dist * dist)
          a.vx += (dx / dist) * force * 0.1
          a.vy += (dy / dist) * force * 0.1
        })
      })
      graph.edges.forEach(({ source, target }) => {
        const s = nodes.find((n) => n.id === source)
        const t = nodes.find((n) => n.id === target)
        if (!s || !t) return
        const dx = t.x - s.x
        const dy = t.y - s.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = (dist - 120) * 0.003
        s.vx += (dx / dist) * force
        s.vy += (dy / dist) * force
        t.vx -= (dx / dist) * force
        t.vy -= (dy / dist) * force
      })
      nodes.forEach((n) => {
        if (draggingRef.current?.node === n) return
        n.vx *= 0.85
        n.vy *= 0.85
        n.x += n.vx
        n.y += n.vy
      })
    }

    const draw = () => {
      const { scale, ox, oy } = viewRef.current
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(scale, 0, 0, scale, ox, oy)
      const nodes = nodesRef.current

      graph.edges.forEach(({ source, target }) => {
        if (isHidden(source) || isHidden(target)) return
        const s = nodes.find((n) => n.id === source)
        const t = nodes.find((n) => n.id === target)
        if (!s || !t) return
        const dx = t.x - s.x
        const dy = t.y - s.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const ux = dx / dist
        const uy = dy / dist
        const endX = t.x - ux * (t.r + 4)
        const endY = t.y - uy * (t.r + 4)
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(endX, endY)
        ctx.strokeStyle = 'rgba(162, 89, 255, 0.18)'
        ctx.lineWidth = 1
        ctx.stroke()
        const angle = Math.atan2(dy, dx)
        ctx.save()
        ctx.translate(endX, endY)
        ctx.rotate(angle)
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(-9, -3.5)
        ctx.lineTo(-9, 3.5)
        ctx.closePath()
        ctx.fillStyle = 'rgba(162, 89, 255, 0.3)'
        ctx.fill()
        ctx.restore()
      })

      nodes.forEach((n) => {
        if (hiddenRef.current.has(n.branch)) return
        const color = n.color
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 2)
        grad.addColorStop(0, `${color}33`)
        grad.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r * 2, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = '#15102f'
        ctx.fill()
        ctx.strokeStyle = color
        ctx.lineWidth = 1.6
        ctx.stroke()
        ctx.fillStyle = '#e2e8f0'
        ctx.font = '10px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const maxW = n.r * 2 - 4
        let label = n.title
        if (ctx.measureText(label).width > maxW) {
          while (ctx.measureText(label + '…').width > maxW && label.length > 0) label = label.slice(0, -1)
          label += '…'
        }
        ctx.fillText(label, n.x, n.y)
      })
    }

    const loop = () => {
      simulate()
      draw()
      animRef.current = requestAnimationFrame(loop)
    }
    loop()

    // Screen → world coordinates (undo pan/zoom) for hit testing.
    const toWorld = (sx: number, sy: number) => {
      const { scale, ox, oy } = viewRef.current
      return { x: (sx - ox) / scale, y: (sy - oy) / scale }
    }
    const getHit = (sx: number, sy: number) => {
      const { x, y } = toWorld(sx, sy)
      return nodesRef.current.find(
        (n) => !hiddenRef.current.has(n.branch) && Math.hypot(n.x - x, n.y - y) <= n.r
      )
    }
    const local = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const onMouseDown = (e: MouseEvent) => {
      const { x, y } = local(e)
      const hit = getHit(x, y)
      if (hit) {
        const w = toWorld(x, y)
        draggingRef.current = { node: hit, offsetX: w.x - hit.x, offsetY: w.y - hit.y }
      } else {
        panRef.current = { x, y }
      }
    }
    const onMouseMove = (e: MouseEvent) => {
      const { x, y } = local(e)
      const hit = getHit(x, y)
      canvas.style.cursor = hit ? 'pointer' : panRef.current ? 'grabbing' : 'grab'
      if (draggingRef.current) {
        const w = toWorld(x, y)
        draggingRef.current.node.x = w.x - draggingRef.current.offsetX
        draggingRef.current.node.y = w.y - draggingRef.current.offsetY
        draggingRef.current.node.vx = 0
        draggingRef.current.node.vy = 0
        setTooltip(null)
      } else if (panRef.current) {
        viewRef.current.ox += x - panRef.current.x
        viewRef.current.oy += y - panRef.current.y
        panRef.current = { x, y }
        setTooltip(null)
      } else if (hit) {
        setTooltip({ x, y, title: hit.title, branch: hit.branch })
      } else {
        setTooltip(null)
      }
    }
    const onMouseUp = (e: MouseEvent) => {
      const { x, y } = local(e)
      if (draggingRef.current) {
        const w = toWorld(x, y)
        const moved = Math.hypot(
          w.x - draggingRef.current.node.x - draggingRef.current.offsetX,
          w.y - draggingRef.current.node.y - draggingRef.current.offsetY
        ) > 4
        const nodeId = draggingRef.current.node.id
        draggingRef.current = null
        if (!moved) router.push(`/concepts/${nodeId}`)
      }
      panRef.current = null
    }
    const onLeave = () => { setTooltip(null); panRef.current = null }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const { x, y } = local(e)
      const v = viewRef.current
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      const ns = Math.max(0.4, Math.min(2.5, v.scale * factor))
      // Zoom toward the cursor.
      v.ox = x - ((x - v.ox) / v.scale) * ns
      v.oy = y - ((y - v.oy) / v.scale) * ns
      v.scale = ns
    }

    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('mouseleave', onLeave)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('mouseleave', onLeave)
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [graph, initNodes, router])

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="w-full" />
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 px-2.5 py-1.5 rounded-lg bg-void-950/95 border border-white/10 text-xs shadow-lg"
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
        >
          <div className="text-white font-medium">{tooltip.title}</div>
          <div className="text-slate-500 text-[10px] capitalize">{tooltip.branch.replace(/-/g, ' ')}</div>
        </div>
      )}
      <div className="absolute bottom-2 right-3 text-[10px] text-slate-600 font-mono pointer-events-none">
        scroll to zoom · drag background to pan
      </div>
    </div>
  )
}

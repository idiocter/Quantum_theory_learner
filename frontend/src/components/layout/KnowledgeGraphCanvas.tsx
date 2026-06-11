'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { KnowledgeGraph } from '@/types'

interface Props {
  graph: KnowledgeGraph
}

const DIFF_COLORS: Record<string, string> = {
  beginner: '#38c6e8',
  intermediate: '#ffc83d',
  advanced: '#f7416c',
}

interface NodeState {
  id: string
  title: string
  difficulty: string
  x: number
  y: number
  vx: number
  vy: number
  r: number
}

export default function KnowledgeGraphCanvas({ graph }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<NodeState[]>([])
  const animRef = useRef<number>(0)
  const draggingRef = useRef<{ node: NodeState; offsetX: number; offsetY: number } | null>(null)
  const router = useRouter()

  const initNodes = useCallback(() => {
    const canvas = canvasRef.current!
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const PHI = 1.618033988749895

    nodesRef.current = graph.nodes.map((n, i) => {
      // Arrange in Fibonacci spiral pattern
      const angle = i * PHI * Math.PI * 2
      const radius = Math.sqrt(i) * 60
      return {
        id: n.id,
        title: n.title,
        difficulty: n.difficulty,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
        r: 28,
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

    const edgeMap = new Map<string, string[]>()
    graph.edges.forEach(({ source, target }) => {
      if (!edgeMap.has(source)) edgeMap.set(source, [])
      edgeMap.get(source)!.push(target)
    })

    const simulate = () => {
      const nodes = nodesRef.current
      const cx = canvas.width / 2
      const cy = canvas.height / 2

      nodes.forEach((a) => {
        // Center gravity
        a.vx += (cx - a.x) * 0.002
        a.vy += (cy - a.y) * 0.002

        // Repulsion
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

      // Attraction along edges
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
        n.x = Math.max(n.r + 8, Math.min(canvas.width - n.r - 8, n.x))
        n.y = Math.max(n.r + 8, Math.min(canvas.height - n.r - 8, n.y))
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const nodes = nodesRef.current

      // Draw edges
      graph.edges.forEach(({ source, target }) => {
        const s = nodes.find((n) => n.id === source)
        const t = nodes.find((n) => n.id === target)
        if (!s || !t) return

        ctx.beginPath()
        ctx.moveTo(s.x, s.y)

        // Arrow direction indicator
        const dx = t.x - s.x
        const dy = t.y - s.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const ux = dx / dist
        const uy = dy / dist
        const endX = t.x - ux * (t.r + 4)
        const endY = t.y - uy * (t.r + 4)

        ctx.lineTo(endX, endY)
        ctx.strokeStyle = 'rgba(162, 89, 255, 0.2)'
        ctx.lineWidth = 1
        ctx.stroke()

        // Arrowhead
        const angle = Math.atan2(dy, dx)
        ctx.save()
        ctx.translate(endX, endY)
        ctx.rotate(angle)
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(-10, -4)
        ctx.lineTo(-10, 4)
        ctx.closePath()
        ctx.fillStyle = 'rgba(162, 89, 255, 0.3)'
        ctx.fill()
        ctx.restore()
      })

      // Draw nodes
      nodes.forEach((n) => {
        const color = DIFF_COLORS[n.difficulty] ?? '#a259ff'

        // Glow
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 2)
        grad.addColorStop(0, `${color}22`)
        grad.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r * 2, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        // Circle
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = '#15102f'
        ctx.fill()
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.stroke()

        // Label
        ctx.fillStyle = '#e2e8f0'
        ctx.font = '11px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        const maxW = n.r * 2 - 4
        let label = n.title
        if (ctx.measureText(label).width > maxW) {
          while (ctx.measureText(label + '…').width > maxW && label.length > 0) {
            label = label.slice(0, -1)
          }
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

    // Mouse interactions
    const getHit = (x: number, y: number) =>
      nodesRef.current.find((n) => Math.hypot(n.x - x, n.y - y) <= n.r)

    const onMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const hit = getHit(x, y)
      if (hit) draggingRef.current = { node: hit, offsetX: x - hit.x, offsetY: y - hit.y }
    }

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      canvas.style.cursor = getHit(x, y) ? 'pointer' : 'default'
      if (draggingRef.current) {
        draggingRef.current.node.x = x - draggingRef.current.offsetX
        draggingRef.current.node.y = y - draggingRef.current.offsetY
        draggingRef.current.node.vx = 0
        draggingRef.current.node.vy = 0
      }
    }

    const onMouseUp = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      if (!draggingRef.current) return
      const wasDrag = Math.hypot(
        x - draggingRef.current.node.x - draggingRef.current.offsetX,
        y - draggingRef.current.node.y - draggingRef.current.offsetY
      ) > 4
      const nodeId = draggingRef.current.node.id
      draggingRef.current = null
      if (!wasDrag) router.push(`/concepts/${nodeId}`)
    }

    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)
    }
  }, [graph, initNodes, router])

  return <canvas ref={canvasRef} className="w-full" />
}

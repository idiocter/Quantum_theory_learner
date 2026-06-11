'use client'
import { useEffect, useRef } from 'react'

const PHI = 1.618033988749895

export default function FibonacciBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animFrame: number
    let t = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const drawFibonacciSpiral = (cx: number, cy: number, size: number, alpha: number) => {
      let a = size / (PHI ** 8)
      let b = a * PHI
      let x = cx
      let y = cy
      const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]

      ctx.save()
      ctx.globalAlpha = alpha
      ctx.strokeStyle = `rgba(0, 102, 255, ${alpha})`
      ctx.lineWidth = 0.5

      for (let i = 0; i < 8; i++) {
        const angle = angles[i % 4]
        ctx.beginPath()
        ctx.arc(x, y, a, angle, angle + Math.PI / 2)
        ctx.stroke()

        const nextA = a * PHI
        switch (i % 4) {
          case 0: x += a; y -= a; break
          case 1: x += a; y += nextA - a; break
          case 2: x -= nextA - a; y += nextA - a; break
          case 3: x -= nextA - a; y -= nextA; break
        }
        a = nextA
        b = b * PHI
      }
      ctx.restore()
    }

    const drawQuantumWave = (offsetY: number, amplitude: number, frequency: number, color: string, phase: number) => {
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.12

      for (let x = 0; x < canvas.width; x += 2) {
        const y = offsetY + amplitude * Math.sin((x / canvas.width) * frequency * Math.PI * 2 + phase)
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    const drawParticles = () => {
      const particles = [
        { x: canvas.width * 0.382, y: canvas.height * 0.236 },
        { x: canvas.width * 0.618, y: canvas.height * 0.764 },
        { x: canvas.width * 0.146, y: canvas.height * 0.5 },
        { x: canvas.width * 0.854, y: canvas.height * 0.5 },
      ]
      particles.forEach(({ x, y }, i) => {
        const drift = Math.sin(t * 0.5 + i * 1.618) * 8
        const r = 2 + Math.sin(t * 0.8 + i) * 1
        const alpha = 0.3 + Math.sin(t * 0.6 + i * PHI) * 0.2
        ctx.beginPath()
        ctx.arc(x + drift, y + drift * 0.618, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0, 102, 255, ${alpha})`
        ctx.fill()

        // Probability cloud ring
        ctx.beginPath()
        ctx.arc(x + drift, y + drift * 0.618, r * 4, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(0, 102, 255, ${alpha * 0.3})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      })
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Fibonacci spirals at golden-ratio positions
      const spiralPositions = [
        { x: canvas.width * 0.382, y: canvas.height * 0.382, size: canvas.height * 0.38 },
        { x: canvas.width * 0.854, y: canvas.height * 0.146, size: canvas.height * 0.12 },
        { x: canvas.width * 0.146, y: canvas.height * 0.854, size: canvas.height * 0.08 },
      ]
      spiralPositions.forEach(({ x, y, size }) => {
        drawFibonacciSpiral(x, y, size, 0.06)
      })

      // Quantum wave interference patterns
      drawQuantumWave(canvas.height * 0.3, 40, 3, 'rgba(0, 102, 255, 1)', t * 0.5)
      drawQuantumWave(canvas.height * 0.3, 40, 5, 'rgba(139, 92, 246, 1)', t * 0.5 + 1)
      drawQuantumWave(canvas.height * 0.7, 30, 4, 'rgba(16, 185, 129, 1)', t * 0.4)
      drawQuantumWave(canvas.height * 0.5, 20, 7, 'rgba(0, 102, 255, 1)', t * 0.3 + PHI)

      // Quantum particles
      drawParticles()

      t += 0.02
      animFrame = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animFrame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  )
}

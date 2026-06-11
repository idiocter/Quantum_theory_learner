'use client'
import { useEffect, useRef } from 'react'

// Golden angle (Fibonacci phyllotaxis) — the same spiral that structures
// sunflower seeds and the arms of disk galaxies.
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)) // ≈ 137.5°

interface GalaxyStar {
  radius: number
  angle: number
  speed: number
  size: number
  color: string
  twinklePhase: number
  twinkleSpeed: number
}

interface BgStar {
  x: number
  y: number
  size: number
  baseAlpha: number
  twinklePhase: number
  twinkleSpeed: number
}

interface Dust {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  size: number
}

interface Shooting {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
}

// Quartz/cosmos colour bands by normalised galactic radius (core → rim)
function starColor(t: number): string {
  if (t < 0.12) return '#fff4d6'        // citrine-white core
  if (t < 0.3) return '#ffe6a8'         // golden bulge
  if (t < 0.5) return '#c098ff'         // amethyst inner arm
  if (t < 0.72) return '#a259ff'        // amethyst
  if (t < 0.88) return '#ff8fd4'        // rose-quartz nebula
  return '#6ee7e0'                       // stardust cyan rim
}

export default function FibonacciBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let frame = 0
    let t = 0

    let galaxy: GalaxyStar[] = []
    let bgStars: BgStar[] = []
    let dust: Dust[] = []
    let shooting: Shooting[] = []

    // Disk tilt — squash the y-axis so the galaxy reads as an inclined disk
    const TILT = 0.58

    const build = () => {
      const W = (canvas.width = window.innerWidth)
      const H = (canvas.height = window.innerHeight)

      const maxR = Math.min(W, H) * 0.46
      const N = Math.round((W * H) / 1700) // density scales with viewport
      const arms = 2

      galaxy = Array.from({ length: N }, (_, i) => {
        const tNorm = i / N
        const radius = maxR * Math.sqrt(tNorm)
        const arm = i % arms
        // Logarithmic winding + golden-angle scatter for organic arm spread
        const wind = radius * 0.018
        const scatter = (Math.random() - 0.5) * (0.5 * (1 - tNorm * 0.6))
        const angle = arm * ((Math.PI * 2) / arms) + wind + scatter + i * GOLDEN_ANGLE * 0.0008
        return {
          radius,
          angle,
          // Differential rotation — inner stars orbit faster
          speed: 0.00045 + 0.12 / (radius + 60),
          size: tNorm < 0.15 ? Math.random() * 1.6 + 0.6 : Math.random() * 1.1 + 0.3,
          color: starColor(tNorm + (Math.random() - 0.5) * 0.08),
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.5 + Math.random() * 2,
        }
      })

      bgStars = Array.from({ length: Math.round((W * H) / 6000) }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        size: Math.random() * 1.3 + 0.2,
        baseAlpha: Math.random() * 0.5 + 0.2,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.4 + Math.random() * 1.6,
      }))

      dust = Array.from({ length: 36 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        alpha: Math.random() * 0.25 + 0.05,
        size: Math.random() * 2 + 0.5,
      }))
    }

    build()
    window.addEventListener('resize', build)

    // Galaxy centre sits at a golden-ratio point, off the main content column
    const center = () => ({ x: canvas.width * 0.74, y: canvas.height * 0.3 })

    const drawNebula = (cx: number, cy: number) => {
      const blobs = [
        { dx: 0, dy: 0, r: Math.min(canvas.width, canvas.height) * 0.5, c: 'rgba(139, 47, 230, 0.16)' },
        { dx: -60, dy: 40, r: Math.min(canvas.width, canvas.height) * 0.35, c: 'rgba(255, 94, 196, 0.1)' },
        { dx: 80, dy: 70, r: Math.min(canvas.width, canvas.height) * 0.32, c: 'rgba(56, 198, 232, 0.08)' },
      ]
      blobs.forEach(({ dx, dy, r, c }) => {
        const pulse = 1 + Math.sin(t * 0.4 + dx) * 0.06
        const g = ctx.createRadialGradient(cx + dx, cy + dy, 0, cx + dx, cy + dy, r * pulse)
        g.addColorStop(0, c)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      })
    }

    const render = () => {
      const W = canvas.width
      const H = canvas.height
      const { x: cx, y: cy } = center()

      ctx.clearRect(0, 0, W, H)

      // Nebula clouds (normal blend, behind stars)
      drawNebula(cx, cy)

      // Additive blending makes overlapping stars glow like a galactic core
      ctx.globalCompositeOperation = 'lighter'

      // Background starfield
      bgStars.forEach((s) => {
        const tw = 0.6 + Math.sin(t * s.twinkleSpeed + s.twinklePhase) * 0.4
        ctx.globalAlpha = s.baseAlpha * tw
        ctx.fillStyle = '#ece7fb'
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fill()
      })

      // Bright galactic core glow
      const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.12)
      coreGlow.addColorStop(0, 'rgba(255, 244, 214, 0.5)')
      coreGlow.addColorStop(0.4, 'rgba(194, 152, 255, 0.18)')
      coreGlow.addColorStop(1, 'transparent')
      ctx.globalAlpha = 1
      ctx.fillStyle = coreGlow
      ctx.beginPath()
      ctx.arc(cx, cy, Math.min(W, H) * 0.12, 0, Math.PI * 2)
      ctx.fill()

      // Spiral galaxy stars
      galaxy.forEach((star) => {
        star.angle += star.speed
        const x = cx + Math.cos(star.angle) * star.radius
        const y = cy + Math.sin(star.angle) * star.radius * TILT
        const tw = 0.7 + Math.sin(t * star.twinkleSpeed + star.twinklePhase) * 0.3
        ctx.globalAlpha = tw
        ctx.fillStyle = star.color
        ctx.beginPath()
        ctx.arc(x, y, star.size, 0, Math.PI * 2)
        ctx.fill()
      })

      // Drifting cosmic dust
      dust.forEach((d) => {
        d.x += d.vx
        d.y += d.vy
        if (d.x < 0) d.x = W
        if (d.x > W) d.x = 0
        if (d.y < 0) d.y = H
        if (d.y > H) d.y = 0
        ctx.globalAlpha = d.alpha * (0.6 + Math.sin(t + d.x) * 0.4)
        ctx.fillStyle = '#a259ff'
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2)
        ctx.fill()
      })

      // Shooting stars (occasional)
      if (Math.random() < 0.004 && shooting.length < 2) {
        const edge = Math.random() * W
        shooting.push({
          x: edge,
          y: -20,
          vx: (Math.random() - 0.5) * 6 - 2,
          vy: Math.random() * 5 + 4,
          life: 0,
          maxLife: 60 + Math.random() * 30,
        })
      }
      shooting = shooting.filter((sh) => {
        sh.x += sh.vx
        sh.y += sh.vy
        sh.life++
        const lifeRatio = 1 - sh.life / sh.maxLife
        const tailX = sh.x - sh.vx * 6
        const tailY = sh.y - sh.vy * 6
        const grad = ctx.createLinearGradient(sh.x, sh.y, tailX, tailY)
        grad.addColorStop(0, `rgba(255, 244, 214, ${0.9 * lifeRatio})`)
        grad.addColorStop(1, 'transparent')
        ctx.globalAlpha = 1
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.moveTo(sh.x, sh.y)
        ctx.lineTo(tailX, tailY)
        ctx.stroke()
        return sh.life < sh.maxLife && sh.y < H + 40
      })

      // Reset blend state
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1

      t += 0.016
      frame = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', build)
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

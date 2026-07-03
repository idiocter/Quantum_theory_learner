'use client'
import { useEffect, useMemo, useRef, useState } from 'react'

// ── shor ─────────────────────────────────────────────────────────────────────
// Shor's factoring algorithm as an honest end-to-end walk-through. The heart is
// quantum period-finding for f(x) = aˣ mod N. A faithful statevector would need
// t + ⌈log₂N⌉ ≈ 12 qubits for N = 15 — too large to hold exactly — so instead
// we compute the *exact* counting-register distribution the circuit produces.
//
// After modular exponentiation and measuring the function register, the counting
// register collapses to the arithmetic progression {x₀, x₀+r, x₀+2r, …} < 2ᵗ
// (r = multiplicative order of a mod N). The inverse QFT then gives amplitude
//   ⟨y| = (1/√(A·2ᵗ)) Σⱼ e^(−2πi (jr) y / 2ᵗ),   A = #terms,
// so P(y) = (1/(A·2ᵗ)) |Σⱼ e^(−2πi j r y / 2ᵗ)|² — a Dirichlet kernel peaked at
// y ≈ k·2ᵗ/r. |P(y)| is coset-independent, so we take x₀ = 0. Classical
// post-processing recovers r from a peak by continued fractions, then the
// factors are gcd(a^(r/2) ± 1, N).
//
// Verified: N = 15, a = 7 → r = 4, peaks at y ∈ {0,64,128,192} (t = 8), each
// P = 0.25; 64/256 = 1/4 → r = 4 → gcd(7²∓1,15) = {3,5}. N = 21, a = 2 → r = 6.

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

function modpow(base: number, exp: number, mod: number): number {
  let r = 1
  base %= mod
  while (exp > 0) {
    if (exp & 1) r = (r * base) % mod
    base = (base * base) % mod
    exp >>= 1
  }
  return r
}

/** Multiplicative order of a mod N (smallest r>0 with aʳ ≡ 1). 0 if gcd≠1. */
function order(a: number, N: number): number {
  if (gcd(a, N) !== 1) return 0
  let x = a % N
  let r = 1
  while (x !== 1) {
    x = (x * a) % N
    r++
    if (r > N) return 0
  }
  return r
}

/** Convergents [p,q] of the continued fraction of num/den. */
function convergents(num: number, den: number): Array<[number, number]> {
  const out: Array<[number, number]> = []
  let a = num, b = den
  let h0 = 0, h1 = 1, k0 = 1, k1 = 0
  while (b !== 0) {
    const c = Math.floor(a / b)
    ;[a, b] = [b, a - c * b]
    const h = c * h1 + h0
    const k = c * k1 + k0
    out.push([h, k])
    h0 = h1; h1 = h; k0 = k1; k1 = k
  }
  return out
}

/** Exact counting-register distribution P(y) for period r over t qubits. */
function periodDistribution(r: number, t: number): Float64Array {
  const M = 1 << t
  const out = new Float64Array(M)
  if (r <= 0) { out[0] = 1; return out }
  const A = Math.floor((M - 1) / r) + 1 // # multiples of r in [0, M)
  for (let y = 0; y < M; y++) {
    let re = 0, im = 0
    for (let j = 0; j < A; j++) {
      const ang = (-2 * Math.PI * ((j * r) % M) * y) / M
      re += Math.cos(ang)
      im += Math.sin(ang)
    }
    out[y] = (re * re + im * im) / (A * M)
  }
  return out
}

const N_OPTIONS = [15, 21]
const STEP_LABELS = [
  '① pick a, check gcd(a,N)',
  '② superposition + aˣ mod N',
  '③ measure f-register → coset',
  '④ inverse QFT → P(y)',
  '⑤ read peak → factors',
] as const

export default function Shor() {
  const [N, setN] = useState(15)
  const [a, setA] = useState(7)
  const [step, setStep] = useState(4)
  const [measuredY, setMeasuredY] = useState<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const t = useMemo(() => Math.max(3, Math.ceil(2 * Math.log2(N))), [N])
  const M = 1 << t

  // Coprime bases 2..N−2 (1 and N−1 are trivial).
  const coprimes = useMemo(() => {
    const list: number[] = []
    for (let x = 2; x < N - 1; x++) if (gcd(x, N) === 1) list.push(x)
    return list
  }, [N])

  // Keep `a` valid when N changes.
  useEffect(() => {
    if (!coprimes.includes(a)) setA(coprimes[0] ?? 2)
  }, [coprimes, a])

  const g = gcd(a, N)
  const r = useMemo(() => order(a, N), [a, N])
  const dist = useMemo(() => periodDistribution(r, t), [r, t])

  // Peaks: local maxima above a threshold, excluding the useless y = 0.
  const peaks = useMemo(() => {
    const th = 0.5 / r
    const ys: number[] = []
    for (let y = 1; y < M; y++) {
      if (dist[y] > th && dist[y] >= dist[y - 1] && dist[y] >= dist[(y + 1) % M]) ys.push(y)
    }
    return ys
  }, [dist, M, r])

  // Default measured y = the dominant peak whose continued fraction recovers r.
  useEffect(() => {
    setMeasuredY(null)
  }, [a, N])
  const shownY = measuredY ?? (() => {
    for (const y of [...peaks].sort((p, q) => dist[q] - dist[p])) {
      const conv = convergents(y, M)
      if (conv.some(([, q]) => q > 1 && q <= N && modpow(a, q, N) === 1)) return y
    }
    return peaks[0] ?? 0
  })()

  // Classical post-processing of the measured y.
  const post = useMemo(() => {
    const conv = convergents(shownY, M)
    // best convergent denominator that is an order of a
    let rCand = 0
    for (const [, q] of conv) {
      if (q > 1 && q <= N && modpow(a, q, N) === 1) { rCand = q; break }
    }
    const frac = conv.length ? conv[conv.length - 1] : [0, 1]
    if (!rCand) return { rCand: 0, frac, factors: null as null | [number, number], reason: 'convergent gave no valid order — measurement failed, retry' }
    if (rCand % 2 !== 0) return { rCand, frac, factors: null, reason: `recovered r=${rCand} is odd — retry with a different a` }
    const half = modpow(a, rCand / 2, N)
    if (half === N - 1) return { rCand, frac, factors: null, reason: `a^(r/2) ≡ −1 (mod N) — retry with a different a` }
    const f1 = gcd(half - 1, N)
    const f2 = gcd(half + 1, N)
    return { rCand, frac, factors: [f1, f2] as [number, number], reason: '' }
  }, [shownY, M, a, N])

  // Function table x → aˣ mod N for the first window of x, spotlighting period r.
  const table = useMemo(() => {
    const cols = Math.min(2 * r + 1, 16)
    return Array.from({ length: cols }, (_, x) => ({ x, v: modpow(a, x, N) }))
  }, [a, N, r])

  const measure = () => {
    const rnd = Math.random()
    let acc = 0
    for (let y = 0; y < M; y++) { acc += dist[y]; if (rnd <= acc) { setMeasuredY(y); return } }
    setMeasuredY(M - 1)
  }

  // Draw P(y) on canvas.
  useEffect(() => {
    if (step < 3) return
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = cv.clientWidth, h = cv.clientHeight
    cv.width = w * dpr; cv.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    let max = 0
    for (let y = 0; y < M; y++) if (dist[y] > max) max = dist[y]
    if (max <= 0) max = 1
    const pad = 6
    const plotH = h - pad * 2
    for (let y = 0; y < M; y++) {
      const px = pad + (y / (M - 1)) * (w - pad * 2)
      const bh = (dist[y] / max) * plotH
      const isShown = y === shownY
      ctx.strokeStyle = isShown ? '#ff5ec4' : 'rgba(56,198,232,0.55)'
      ctx.lineWidth = isShown ? 2 : 1
      ctx.beginPath()
      ctx.moveTo(px, h - pad)
      ctx.lineTo(px, h - pad - bh)
      ctx.stroke()
    }
  }, [dist, M, shownY, step, t])

  const badge = (ok: boolean) => (ok ? 'text-wave-400' : 'text-plasma-300')

  return (
    <div className="space-y-4">
      {/* controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">N</span>
          {N_OPTIONS.map((n) => (
            <button key={n} onClick={() => setN(n)}
              className={`px-2.5 py-1 rounded font-mono text-xs border transition-all ${
                N === n ? 'border-quantum-500/60 bg-quantum-500/15 text-quantum-200' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
              {n}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">base a</span>
          {coprimes.map((c) => (
            <button key={c} onClick={() => setA(c)}
              className={`px-2.5 py-1 rounded font-mono text-xs border transition-all ${
                a === c ? 'border-wave-500/60 bg-wave-500/15 text-wave-400' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
              {c}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-slate-600 font-mono">counting qubits t = {t} · 2ᵗ = {M}</span>
      </div>

      {/* steps */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:border-white/20 text-xs font-mono transition-all">◂ Prev</button>
        <button onClick={() => setStep((s) => Math.min(4, s + 1))}
          className="px-3 py-1.5 rounded-lg border border-plasma-500/30 text-plasma-300 hover:border-plasma-500/60 text-xs font-mono transition-all">Next ▸</button>
        <span className="text-xs font-mono text-quantum-200">{STEP_LABELS[step]}</span>
      </div>
      <div className="flex gap-1">
        {STEP_LABELS.map((_, i) => <div key={i} className={`h-1 flex-1 rounded ${i <= step ? 'bg-quantum-500/70' : 'bg-void-800'}`} />)}
      </div>

      {/* ① classical setup */}
      <div className="rounded-lg border border-white/5 bg-void-900/40 p-3 text-xs font-mono grid sm:grid-cols-2 gap-x-6 gap-y-1">
        <span className="text-slate-400">gcd(a, N) = gcd({a}, {N}) = <span className={badge(g === 1)}>{g}</span></span>
        {g === 1
          ? <span className="text-slate-500">coprime → period-finding needed</span>
          : <span className="text-wave-400">lucky! {g} is already a factor of {N}</span>}
      </div>

      {/* ② function table */}
      {step >= 1 && (
        <div>
          <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mb-2">
            f(x) = {a}ˣ mod {N} — evaluated over all x in superposition
          </div>
          <div className="flex flex-wrap gap-1">
            {table.map(({ x, v }) => {
              const periodic = step >= 2 && r > 0 && x % r === 0
              return (
                <div key={x} className={`px-2 py-1 rounded text-[10px] font-mono border ${
                  periodic ? 'border-plasma-500/50 bg-plasma-500/10 text-plasma-300' : 'border-white/5 text-slate-400'}`}>
                  <span className="text-slate-600">{x}</span>→{v}
                </div>
              )
            })}
          </div>
          {step >= 2 && r > 0 && (
            <div className="text-[10px] text-slate-500 font-mono mt-2">
              the sequence repeats every <span className="text-plasma-300">r = {r}</span> — the period the quantum register encodes as phases
            </div>
          )}
        </div>
      )}

      {/* ④ distribution */}
      {step >= 3 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">counting register P(y), peaks at y ≈ k·2ᵗ/r</span>
            <button onClick={measure}
              className="px-2.5 py-1 rounded font-mono text-[10px] border border-quantum-500/30 text-quantum-300 hover:border-quantum-500/60 transition-all">
              ⟳ measure
            </button>
          </div>
          <canvas ref={canvasRef} className="w-full h-28 rounded-lg bg-void-950/60 border border-white/5"
            role="img" aria-label={`Counting register distribution, dominant peak at y=${shownY}.`} />
        </div>
      )}

      {/* ⑤ post-processing */}
      {step >= 4 && (
        <div className="rounded-lg border border-white/5 bg-void-900/40 p-3 text-xs font-mono grid sm:grid-cols-2 gap-x-6 gap-y-1">
          <span className="text-slate-400">measured y = <span className="text-plasma-300">{shownY}</span> → y/2ᵗ = {shownY}/{M}</span>
          <span className="text-slate-400">continued fraction ≈ <span className="text-quantum-300">{post.frac[0]}/{post.frac[1]}</span></span>
          <span className="text-slate-400">recovered r = <span className={badge(!!post.factors)}>{post.rCand || '—'}</span></span>
          {post.factors
            ? <span className="text-slate-400">a^(r/2) mod N = {modpow(a, post.rCand / 2, N)}</span>
            : <span className="text-plasma-300 sm:col-span-1">✗ {post.reason}</span>}
          {post.factors && (
            <span className="text-slate-400 sm:col-span-2">
              factors = gcd(a^(r/2) ∓ 1, N) = <span className="text-wave-400">{post.factors[0]} × {post.factors[1]}</span>
              {post.factors[0] * post.factors[1] === N && post.factors[0] > 1 && post.factors[1] > 1
                ? <span className="text-wave-400"> ✓ = {N}</span>
                : <span className="text-slate-500"> (trivial — retry)</span>}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

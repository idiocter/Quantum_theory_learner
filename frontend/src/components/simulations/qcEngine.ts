// ── Shared exact statevector engine for the Quantum-Computing sims ───────────
// Extends the approach in QuantumCircuit.tsx / BellState.tsx to an arbitrary
// (small) qubit count. A state is 2^n complex amplitudes held in parallel
// Float64Array re/im. Qubit 0 is the MOST-significant bit, so a basis index i
// reads |q0 q1 … q_{n-1}⟩ with q0 = bit (n-1). Everything here is real complex
// arithmetic — no faked visuals. Verified cases live in the component headers.

export interface State {
  n: number
  re: Float64Array
  im: Float64Array
}

/** Flat row-major 2×2 complex matrix: [r00,i00, r01,i01, r10,i10, r11,i11]. */
export type Mat1 = Float64Array | number[]

export const SQRT1_2 = Math.SQRT1_2

export function zeroState(n: number): State {
  const re = new Float64Array(1 << n)
  const im = new Float64Array(1 << n)
  re[0] = 1
  return { n, re, im }
}

export function basisState(n: number, index: number): State {
  const re = new Float64Array(1 << n)
  const im = new Float64Array(1 << n)
  re[index] = 1
  return { n, re, im }
}

export function cloneState(s: State): State {
  return { n: s.n, re: Float64Array.from(s.re), im: Float64Array.from(s.im) }
}

/** Bitmask for qubit q under the q0 = MSB convention. */
export const maskOf = (n: number, q: number) => 1 << (n - 1 - q)

// ── Gate constructors (flat 2×2 complex) ────────────────────────────────────
const S = Math.SQRT1_2
export const GATE = {
  I: (): number[] => [1, 0, 0, 0, 0, 0, 1, 0],
  X: (): number[] => [0, 0, 1, 0, 1, 0, 0, 0],
  Y: (): number[] => [0, 0, 0, -1, 0, 1, 0, 0],
  Z: (): number[] => [1, 0, 0, 0, 0, 0, -1, 0],
  H: (): number[] => [S, 0, S, 0, S, 0, -S, 0],
  S: (): number[] => [1, 0, 0, 0, 0, 0, 0, 1],
  Sdg: (): number[] => [1, 0, 0, 0, 0, 0, 0, -1],
  T: (): number[] => [1, 0, 0, 0, 0, 0, Math.cos(Math.PI / 4), Math.sin(Math.PI / 4)],
  Tdg: (): number[] => [1, 0, 0, 0, 0, 0, Math.cos(Math.PI / 4), -Math.sin(Math.PI / 4)],
  // Phase gate P(λ) = diag(1, e^{iλ}).
  P: (lam: number): number[] => [1, 0, 0, 0, 0, 0, Math.cos(lam), Math.sin(lam)],
  // Rotations Rσ(θ) = exp(-i θ σ / 2).
  Rx: (t: number): number[] => {
    const c = Math.cos(t / 2), s = Math.sin(t / 2)
    return [c, 0, 0, -s, 0, -s, c, 0]
  },
  Ry: (t: number): number[] => {
    const c = Math.cos(t / 2), s = Math.sin(t / 2)
    return [c, 0, -s, 0, s, 0, c, 0]
  },
  Rz: (t: number): number[] => {
    const c = Math.cos(t / 2), s = Math.sin(t / 2)
    return [c, -s, 0, 0, 0, 0, c, s]
  },
}

/** Compose two flat 2×2 complex matrices: returns a·b. */
export function mul2(a: Mat1, b: Mat1): number[] {
  const out = new Array(8).fill(0)
  // indices: 00=(0,1) 01=(2,3) 10=(4,5) 11=(6,7)
  const idx = [
    [0, 1], // (r,c)=(0,0)
    [2, 3], // (0,1)
    [4, 5], // (1,0)
    [6, 7], // (1,1)
  ]
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      let re = 0, im = 0
      for (let k = 0; k < 2; k++) {
        const [ar, ai] = idx[r * 2 + k].map((p) => a[p]) as [number, number]
        const [br, bi] = idx[k * 2 + c].map((p) => b[p]) as [number, number]
        re += ar * br - ai * bi
        im += ar * bi + ai * br
      }
      const o = idx[r * 2 + c]
      out[o[0]] = re
      out[o[1]] = im
    }
  }
  return out
}

// ── Gate application (in place) ─────────────────────────────────────────────
/** Apply a single-qubit gate g to qubit q. */
export function applyMat1(s: State, q: number, g: Mat1): void {
  const b = maskOf(s.n, q)
  const { re, im } = s
  const dim = 1 << s.n
  for (let i = 0; i < dim; i++) {
    if (i & b) continue
    const j = i | b
    const a0r = re[i], a0i = im[i], a1r = re[j], a1i = im[j]
    re[i] = g[0] * a0r - g[1] * a0i + g[2] * a1r - g[3] * a1i
    im[i] = g[0] * a0i + g[1] * a0r + g[2] * a1i + g[3] * a1r
    re[j] = g[4] * a0r - g[5] * a0i + g[6] * a1r - g[7] * a1i
    im[j] = g[4] * a0i + g[5] * a0r + g[6] * a1i + g[7] * a1r
  }
}

/** Apply g to `target` only when `control` qubit is |1⟩ (controlled-U). */
export function applyControlledMat1(s: State, control: number, target: number, g: Mat1): void {
  const cb = maskOf(s.n, control)
  const tb = maskOf(s.n, target)
  const { re, im } = s
  const dim = 1 << s.n
  for (let i = 0; i < dim; i++) {
    if (!(i & cb) || (i & tb)) continue
    const j = i | tb
    const a0r = re[i], a0i = im[i], a1r = re[j], a1i = im[j]
    re[i] = g[0] * a0r - g[1] * a0i + g[2] * a1r - g[3] * a1i
    im[i] = g[0] * a0i + g[1] * a0r + g[2] * a1i + g[3] * a1r
    re[j] = g[4] * a0r - g[5] * a0i + g[6] * a1r - g[7] * a1i
    im[j] = g[4] * a0i + g[5] * a0r + g[6] * a1i + g[7] * a1r
  }
}

export function applyCNOT(s: State, control: number, target: number): void {
  const cb = maskOf(s.n, control)
  const tb = maskOf(s.n, target)
  const { re, im } = s
  const dim = 1 << s.n
  for (let i = 0; i < dim; i++) {
    if (!(i & cb) || (i & tb)) continue
    const j = i | tb
    ;[re[i], re[j]] = [re[j], re[i]]
    ;[im[i], im[j]] = [im[j], im[i]]
  }
}

export function applyCZ(s: State, control: number, target: number): void {
  const cb = maskOf(s.n, control)
  const tb = maskOf(s.n, target)
  const { re, im } = s
  const dim = 1 << s.n
  for (let i = 0; i < dim; i++) {
    if ((i & cb) && (i & tb)) { re[i] = -re[i]; im[i] = -im[i] }
  }
}

export function applySWAP(s: State, a: number, b: number): void {
  const ab = maskOf(s.n, a)
  const bb = maskOf(s.n, b)
  const { re, im } = s
  const dim = 1 << s.n
  for (let i = 0; i < dim; i++) {
    const av = (i & ab) !== 0
    const bv = (i & bb) !== 0
    if (av === bv) continue
    // Swap only once per pair: act when qubit a is 1 and b is 0.
    if (av && !bv) {
      const j = (i & ~ab) | bb
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
}

/** Toffoli (CCX): flip target when both controls are |1⟩. */
export function applyToffoli(s: State, c1: number, c2: number, target: number): void {
  const b1 = maskOf(s.n, c1)
  const b2 = maskOf(s.n, c2)
  const tb = maskOf(s.n, target)
  const { re, im } = s
  const dim = 1 << s.n
  for (let i = 0; i < dim; i++) {
    if (!(i & b1) || !(i & b2) || (i & tb)) continue
    const j = i | tb
    ;[re[i], re[j]] = [re[j], re[i]]
    ;[im[i], im[j]] = [im[j], im[i]]
  }
}

// ── Readouts ────────────────────────────────────────────────────────────────
export function probabilities(s: State): Float64Array {
  const dim = 1 << s.n
  const p = new Float64Array(dim)
  for (let i = 0; i < dim; i++) p[i] = s.re[i] * s.re[i] + s.im[i] * s.im[i]
  return p
}

export function sample(s: State): number {
  const p = probabilities(s)
  const r = Math.random()
  let acc = 0
  for (let i = 0; i < p.length; i++) {
    acc += p[i]
    if (r <= acc) return i
  }
  return p.length - 1
}

/**
 * Bloch vector (x,y,z) of qubit q from the reduced 1-qubit density matrix.
 * ρ01 = Σ_{i: bit q = 0} ψ_i · conj(ψ_{i|b});  x=2Re(ρ01), y=−2Im(ρ01),
 * z = ρ00 − ρ11. Returns |r|<1 for a mixed reduced state (i.e. entanglement).
 */
export function blochVector(s: State, q: number): { x: number; y: number; z: number; r: number } {
  const b = maskOf(s.n, q)
  const dim = 1 << s.n
  let p0 = 0, p1 = 0, r01 = 0, i01 = 0
  for (let i = 0; i < dim; i++) {
    const pr = s.re[i] * s.re[i] + s.im[i] * s.im[i]
    if (i & b) { p1 += pr; continue }
    p0 += pr
    const j = i | b
    // ψ_i · conj(ψ_j)
    r01 += s.re[i] * s.re[j] + s.im[i] * s.im[j]
    i01 += s.im[i] * s.re[j] - s.re[i] * s.im[j]
  }
  const x = 2 * r01
  const y = -2 * i01
  const z = p0 - p1
  return { x, y, z, r: Math.hypot(x, y, z) }
}

/** Purity Tr(ρ²) of qubit q's reduced state: ½(1+|r|²). 1 = pure, ½ = mixed. */
export function reducedPurity(s: State, q: number): number {
  const { r } = blochVector(s, q)
  return 0.5 * (1 + r * r)
}

/** Format a complex amplitude compactly (a+bi), hiding ~zero parts. */
export function fmtComplex(re: number, im: number, eps = 5e-4): string {
  const rz = Math.abs(re) < eps
  const iz = Math.abs(im) < eps
  if (rz && iz) return '0'
  const r = re.toFixed(3)
  if (iz) return r
  const iAbs = Math.abs(im).toFixed(3)
  if (rz) return `${im < 0 ? '−' : ''}${iAbs}i`
  return `${r} ${im < 0 ? '−' : '+'} ${iAbs}i`
}

export const labelOf = (i: number, n: number) => i.toString(2).padStart(n, '0')

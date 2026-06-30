"""Populate the Foundations branch with full content: overviews, history,
structured formulas (symbols + derivation steps), and prerequisite links.

Idempotent — re-running updates rows in place. Run after `seed_concepts`.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from ._content import run

TOPICS = [
    {
        "slug": "wave_particle_duality",
        "related_simulation": "double_slit",
        "overview": [
            "Quantum objects are neither little billiard balls nor classical waves: they are something new that shows particle-like or wave-like behaviour depending on what you measure. Light, long thought a wave, delivers its energy in discrete lumps (photons); electrons, long thought particles, diffract and interfere like waves.",
            "Louis de Broglie's bold 1924 hypothesis made the symmetry exact: every particle has a wavelength inversely proportional to its momentum. The more momentum a particle carries, the shorter its wavelength — which is why duality is invisible for baseballs (wavelengths ~10⁻³⁴ m) but decisive for electrons.",
            "Duality is not a contradiction but a limitation of classical language. The full description is a quantum state whose wave aspect governs the probability of particle-like detection events. Which face you see is fixed by the experiment, a point Bohr elevated to the principle of complementarity.",
        ],
        "history": (
            "Einstein reintroduced light quanta in 1905 to explain the photoelectric effect, reviving a corpuscular view of light that had been buried by Young and Maxwell. In 1924 Louis de Broglie, in his doctoral thesis, proposed that matter is symmetric to light and assigned a wavelength to the electron. "
            "Davisson and Germer confirmed it in 1927 by diffracting electrons off a nickel crystal, and de Broglie received the 1929 Nobel Prize."
        ),
        "formulas": [
            {
                "latex": r"\lambda = \frac{h}{p}",
                "description": "The de Broglie wavelength of any particle with momentum p.",
                "symbols": {
                    r"\lambda": "de Broglie wavelength",
                    "h": "Planck constant, 6.626×10⁻³⁴ J·s",
                    "p": "momentum, p = mv (or h/λ)",
                },
                "derivation_steps": [
                    "For a photon, combine the energy quantum $E = hf$ with the relativistic energy–momentum relation $E = pc$.",
                    "Equate them: $pc = hf$, so $p = hf/c = h/\\lambda$ since $c = f\\lambda$.",
                    "De Broglie's leap was to assume the same relation $p = h/\\lambda$ holds for matter, giving $\\lambda = h/p$.",
                ],
            },
        ],
    },
    {
        "slug": "double_slit",
        "related_simulation": "double_slit",
        "prerequisites": ["wave_particle_duality"],
        "overview": [
            "Fire particles one at a time at a barrier with two narrow openings. Classically you would expect two bright bands lined up behind the slits. Instead a pattern of many evenly spaced fringes builds up — even though the particles arrive one by one and never meet.",
            "Each particle travels as a probability amplitude that passes through both slits at once. The two paths add as complex amplitudes, and the squared magnitude of their sum sets the odds of where the particle lands. Where the amplitudes are in phase you get a bright fringe; where they cancel, darkness.",
            "Place a detector to learn which slit the particle used and the interference vanishes — you recover two plain bands. Acquiring which-path information destroys the superposition. Richard Feynman called this 'the only mystery' of quantum mechanics.",
        ],
        "history": (
            "Thomas Young's 1801 double-slit demonstration established the wave nature of light against Newton's corpuscles. The quantum twist came much later: G. I. Taylor showed interference at very low light levels in 1909, and from the 1960s onward electron versions were realised — most famously Tonomura's 1989 single-electron build-up movie, voted 'the most beautiful experiment in physics'."
        ),
        "formulas": [
            {
                "latex": r"P(y) = |\psi_1 + \psi_2|^2",
                "description": "Probability of detection at position y is the squared modulus of the summed amplitudes from each slit.",
                "symbols": {
                    "P(y)": "probability density at screen position y",
                    r"\psi_1, \psi_2": "complex amplitudes for the paths through slit 1 and slit 2",
                },
                "derivation_steps": [
                    "Each path contributes an amplitude; the total is $\\psi = \\psi_1 + \\psi_2$.",
                    "The Born rule gives the probability as $P = |\\psi|^2 = |\\psi_1|^2 + |\\psi_2|^2 + 2\\,\\mathrm{Re}(\\psi_1^{*}\\psi_2)$.",
                    "The cross term $2\\,\\mathrm{Re}(\\psi_1^{*}\\psi_2)$ is the interference; it oscillates with the path difference and is absent for classical probabilities.",
                ],
            },
            {
                "latex": r"d\sin\theta = m\lambda",
                "description": "Bright-fringe condition: integer multiples of the wavelength fit the path difference.",
                "symbols": {
                    "d": "separation between the slits",
                    r"\theta": "angle to the fringe",
                    "m": "fringe order (0, ±1, ±2, …)",
                    r"\lambda": "de Broglie wavelength",
                },
                "derivation_steps": [
                    "The path-length difference between the two slits to a point at angle $\\theta$ is $d\\sin\\theta$.",
                    "Constructive interference requires this to equal a whole number of wavelengths: $d\\sin\\theta = m\\lambda$.",
                ],
            },
        ],
    },
    {
        "slug": "schrodinger_equation",
        "related_simulation": "wavefunction",
        "prerequisites": ["wave_particle_duality"],
        "overview": [
            "The Schrödinger equation is the equation of motion for quantum mechanics — the quantum analogue of Newton's F = ma. Given a system's energy operator (the Hamiltonian) it tells the wavefunction how to evolve smoothly and deterministically in time.",
            "Its time-dependent form drives the state forward; separating variables for a fixed energy yields the time-independent form, an eigenvalue problem whose solutions are the stationary states and their quantised energies. Boundary conditions — that the wavefunction be finite, single-valued, and continuous — are what carve a continuum of possibilities into a discrete spectrum.",
            "Crucially the evolution is unitary: probability is conserved and information is never lost, in stark contrast to the abrupt, probabilistic jump of measurement. All of atomic structure, chemical bonding, and solid-state physics follows from solving this one equation for different potentials.",
        ],
        "history": (
            "Erwin Schrödinger wrote his wave equation over the winter of 1925–26, inspired by de Broglie's matter waves. It reproduced the hydrogen spectrum and was soon shown equivalent to Heisenberg's matrix mechanics. Max Born supplied the probabilistic reading of $|\\psi|^2$ months later, which Schrödinger himself never fully accepted."
        ),
        "formulas": [
            {
                "latex": r"i\hbar\,\frac{\partial}{\partial t}\,\Psi = \hat{H}\,\Psi",
                "description": "The time-dependent Schrödinger equation governing how a state evolves.",
                "symbols": {
                    "i": "imaginary unit",
                    r"\hbar": "reduced Planck constant, h/2π",
                    r"\Psi": "the wavefunction (state)",
                    r"\hat{H}": "Hamiltonian (total-energy) operator",
                },
                "derivation_steps": [
                    "Start from a plane matter wave $\\Psi \\sim e^{i(kx - \\omega t)}$ with de Broglie $p = \\hbar k$ and Planck $E = \\hbar\\omega$.",
                    "Differentiating in time pulls down a factor of energy: $i\\hbar\\,\\partial_t \\Psi = E\\Psi$.",
                    "Differentiating twice in space pulls down momentum-squared: $-\\hbar^2 \\partial_x^2 \\Psi = p^2 \\Psi$.",
                    "Insert these into the energy relation $E = p^2/2m + V$ to get $i\\hbar\\,\\partial_t\\Psi = \\hat{H}\\Psi$ with $\\hat{H} = -\\tfrac{\\hbar^2}{2m}\\partial_x^2 + V$.",
                ],
            },
            {
                "latex": r"\hat{H}\,\psi = E\,\psi",
                "description": "The time-independent (stationary-state) Schrödinger equation: an eigenvalue problem for the allowed energies.",
                "symbols": {
                    r"\hat{H}": "Hamiltonian operator",
                    r"\psi": "stationary spatial wavefunction",
                    "E": "energy eigenvalue",
                },
                "derivation_steps": [
                    "Seek separable solutions $\\Psi(x,t) = \\psi(x)\\,T(t)$.",
                    "Substituting and dividing by $\\psi T$ separates the equation; the time part gives $T(t) = e^{-iEt/\\hbar}$.",
                    "The spatial part is the eigenvalue equation $\\hat{H}\\psi = E\\psi$, whose boundary conditions quantise E.",
                ],
            },
        ],
    },
    {
        "slug": "wavefunction",
        "related_simulation": "wavefunction",
        "prerequisites": ["schrodinger_equation", "double_slit"],
        "overview": [
            "A free particle is described by a wave packet — a localised bump of probability amplitude built by superposing many momentum components. The Schrödinger equation tells that packet how to move, and a free packet inevitably spreads as time passes.",
            "Spreading is the price of localisation. Pinning a particle to a narrow region requires a wide spread of momenta (an uncertainty trade-off), and those components travel at different phase velocities, so the packet broadens and its peak height falls while the total area stays fixed at one.",
            "Only |Ψ|² — the probability density — is observable; the complex phase of Ψ rotates as it travels and is invisible to a single measurement, yet it is exactly what makes interference possible.",
        ],
        "history": (
            "Born proposed the probabilistic interpretation of the wavefunction in 1926, earning the 1954 Nobel Prize for it. The spreading Gaussian packet became the textbook illustration of free evolution, while Ehrenfest's theorem (1927) showed the packet's centre obeys Newton's laws on average."
        ),
        "formulas": [
            {
                "latex": r"P(x,t) = |\Psi(x,t)|^2,\qquad \int_{-\infty}^{\infty} |\Psi|^2\,dx = 1",
                "description": "Born rule plus normalisation: |Ψ|² is a probability density that integrates to one.",
                "symbols": {
                    r"\Psi(x,t)": "complex wavefunction",
                    "P(x,t)": "probability density of finding the particle at x",
                },
                "derivation_steps": [
                    "Born's postulate: the probability of detection in $[x, x+dx]$ is $|\\Psi(x,t)|^2\\,dx$.",
                    "Because the particle must be found somewhere, the density integrates to one: $\\int |\\Psi|^2\\,dx = 1$.",
                    "The Schrödinger equation guarantees this normalisation is preserved for all time (unitarity).",
                ],
            },
        ],
    },
    {
        "slug": "particle_in_box",
        "related_simulation": "particle_in_box",
        "prerequisites": ["schrodinger_equation"],
        "overview": [
            "Trap a particle between two infinitely high walls. The wavefunction must vanish at both walls, so only standing waves with a whole number of half-wavelengths fit in the box — exactly like the harmonics of a guitar string.",
            "Because only certain wavelengths fit, only certain energies are allowed, and they grow as n². Energy quantisation here is not mysterious: it is the direct consequence of confining a wave, the simplest place to see discreteness emerge.",
            "Squaring each standing wave gives the probability of finding the particle along the box — note the ground state is most likely found in the middle, never at the walls. This toy model underlies quantum dots, conjugated dye molecules, and nanoscale electronics.",
        ],
        "history": (
            "The infinite square well appeared in the earliest wave-mechanics texts of the late 1920s as the cleanest solvable example of the Schrödinger equation. It remains the first quantum system every student solves, and a working model for quantum dots engineered since the 1980s."
        ),
        "formulas": [
            {
                "latex": r"E_n = \frac{n^2 h^2}{8 m L^2},\qquad n = 1, 2, 3, \dots",
                "description": "Quantised energy levels of a particle confined to a 1-D box of width L.",
                "symbols": {
                    "E_n": "energy of the n-th level",
                    "n": "quantum number (1, 2, 3, …)",
                    "h": "Planck constant",
                    "m": "particle mass",
                    "L": "width of the box",
                },
                "derivation_steps": [
                    "Inside the box $V = 0$, so the stationary equation is $-\\tfrac{\\hbar^2}{2m}\\psi'' = E\\psi$, solved by $\\psi = \\sin(kx)$.",
                    "The walls force $\\psi(0) = \\psi(L) = 0$, so only $kL = n\\pi$ fits: $k = n\\pi/L$.",
                    "Then $E = \\tfrac{\\hbar^2 k^2}{2m} = \\tfrac{\\hbar^2 \\pi^2 n^2}{2mL^2}$, which is $E_n = \\tfrac{n^2 h^2}{8mL^2}$.",
                ],
            },
        ],
    },
    {
        "slug": "uncertainty",
        "related_simulation": "uncertainty",
        "prerequisites": ["wavefunction"],
        "overview": [
            "Heisenberg's uncertainty principle says certain pairs of properties — position and momentum chief among them — can never both be pinned down at once. The more sharply you fix one, the more the other must blur. It is a statement about the system, not about clumsy measurement.",
            "The reason is Fourier: a wavefunction sharply peaked in position is a sum of many momentum waves, so its momentum is spread wide, and vice versa. Position and momentum descriptions are Fourier transforms of each other, and no function can be narrow in both.",
            "The floor is ℏ/2, so the trade-off is utterly negligible for baseballs but dominant for electrons. It is why atoms don't collapse: squeezing an electron onto the nucleus would cost enormous kinetic energy.",
        ],
        "history": (
            "Werner Heisenberg formulated the principle in 1927 with his γ-ray microscope thought experiment; Earle Kennard and Hermann Weyl gave it the rigorous variance form the same year. Heisenberg received the 1932 Nobel Prize for the creation of quantum mechanics."
        ),
        "formulas": [
            {
                "latex": r"\Delta x\,\Delta p \;\ge\; \frac{\hbar}{2}",
                "description": "The position–momentum uncertainty relation.",
                "symbols": {
                    r"\Delta x": "standard deviation of position",
                    r"\Delta p": "standard deviation of momentum",
                    r"\hbar": "reduced Planck constant",
                },
                "derivation_steps": [
                    "For any two observables the Cauchy–Schwarz inequality gives $\\Delta A\\,\\Delta B \\ge \\tfrac{1}{2}|\\langle[\\hat{A},\\hat{B}]\\rangle|$.",
                    "Position and momentum obey the canonical commutator $[\\hat{x},\\hat{p}] = i\\hbar$.",
                    "Substituting yields $\\Delta x\\,\\Delta p \\ge \\hbar/2$, with equality for a Gaussian (minimum-uncertainty) wave packet.",
                ],
            },
        ],
    },
    {
        "slug": "spin",
        "related_simulation": "spin",
        "prerequisites": ["uncertainty"],
        "overview": [
            "Spin is an intrinsic angular momentum carried by particles like the electron — not a literal spinning ball, but a genuine quantum degree of freedom with no classical analogue. For a spin-½ particle, measuring spin along any axis yields only two values, +½ℏ or −½ℏ.",
            "The 1922 Stern–Gerlach experiment sent silver atoms through a non-uniform magnetic field and the beam split cleanly into two spots — direct proof that the projection of angular momentum is quantised rather than continuous.",
            "Chain two analysers and the quantum strangeness shows: measuring spin along x scrambles a previously definite z-spin, because the spin components are incompatible observables that do not commute. Spin states live on the same Bloch sphere as a qubit.",
        ],
        "history": (
            "Otto Stern and Walther Gerlach ran their experiment in 1922, before spin was even named. Goudsmit and Uhlenbeck proposed electron spin in 1925, and Pauli formalised it with his spin matrices in 1927. Stern won the 1943 Nobel Prize."
        ),
        "formulas": [
            {
                "latex": r"S_z = m_s \hbar,\qquad m_s = \pm\tfrac{1}{2}",
                "description": "The quantised projection of spin angular momentum for a spin-½ particle.",
                "symbols": {
                    "S_z": "spin projection on the measurement axis",
                    "m_s": "spin magnetic quantum number (±½)",
                    r"\hbar": "reduced Planck constant",
                },
                "derivation_steps": [
                    "Spin obeys the same algebra as orbital angular momentum: $\\hat{S}^2$ has eigenvalue $s(s+1)\\hbar^2$ and $\\hat{S}_z$ has eigenvalues $m_s\\hbar$.",
                    "For the electron $s = \\tfrac{1}{2}$, so $m_s$ takes the $2s+1 = 2$ values $\\pm\\tfrac{1}{2}$.",
                    "Hence a Stern–Gerlach magnet splits the beam into exactly two — the experimental signature of spin-½.",
                ],
            },
            {
                "latex": r"\sigma_x = \begin{pmatrix} 0 & 1 \\ 1 & 0 \end{pmatrix},\;\; \sigma_y = \begin{pmatrix} 0 & -i \\ i & 0 \end{pmatrix},\;\; \sigma_z = \begin{pmatrix} 1 & 0 \\ 0 & -1 \end{pmatrix}",
                "description": "The Pauli matrices, which represent the spin-½ operators as Ŝ = (ℏ/2)σ.",
                "symbols": {
                    r"\sigma_x, \sigma_y, \sigma_z": "Pauli matrices for the three axes",
                },
                "derivation_steps": [
                    "The spin operators are $\\hat{S}_i = \\tfrac{\\hbar}{2}\\sigma_i$.",
                    "They satisfy $[\\hat{S}_x,\\hat{S}_y] = i\\hbar \\hat{S}_z$ — the non-commutation that makes the components incompatible.",
                ],
            },
        ],
    },
    {
        "slug": "harmonic_oscillator",
        "related_simulation": "harmonic_oscillator",
        "prerequisites": ["particle_in_box", "schrodinger_equation"],
        "overview": [
            "Put a particle in a parabolic potential and quantum mechanics delivers a perfectly even ladder of energy levels spaced by ℏω. This single model describes vibrating molecules, lattice phonons, and the modes of the electromagnetic field itself.",
            "The eigenstates are Hermite polynomials multiplied by a Gaussian envelope. The lowest rung sits at ½ℏω, the zero-point energy — the oscillator can never be fully at rest, a direct consequence of the uncertainty principle.",
            "Because every smooth potential looks parabolic near its minimum, the harmonic oscillator is the universal first approximation for any bound system. Its ladder (creation/annihilation) operators are the template for quantum field theory.",
        ],
        "history": (
            "Solved exactly in Schrödinger's original 1926 papers, the quantum harmonic oscillator gained even deeper importance when Dirac introduced ladder operators in 1927. Quantising the electromagnetic field as a collection of oscillators launched quantum electrodynamics."
        ),
        "formulas": [
            {
                "latex": r"E_n = \left(n + \tfrac{1}{2}\right)\hbar\omega,\qquad n = 0, 1, 2, \dots",
                "description": "Evenly spaced energy ladder of the quantum harmonic oscillator.",
                "symbols": {
                    "E_n": "energy of level n",
                    "n": "quantum number (0, 1, 2, …)",
                    r"\hbar": "reduced Planck constant",
                    r"\omega": "angular frequency, √(k/m)",
                },
                "derivation_steps": [
                    "Define ladder operators $\\hat{a} = \\sqrt{\\tfrac{m\\omega}{2\\hbar}}(\\hat{x} + \\tfrac{i}{m\\omega}\\hat{p})$ and its adjoint $\\hat{a}^\\dagger$.",
                    "The Hamiltonian becomes $\\hat{H} = \\hbar\\omega(\\hat{a}^\\dagger\\hat{a} + \\tfrac{1}{2})$.",
                    "The number operator $\\hat{a}^\\dagger\\hat{a}$ has eigenvalues $n = 0,1,2,\\dots$, giving $E_n = (n+\\tfrac12)\\hbar\\omega$.",
                    "Even at $n=0$ the energy is $\\tfrac{1}{2}\\hbar\\omega \\neq 0$ — the zero-point energy.",
                ],
            },
        ],
    },
    {
        "slug": "quantum_tunneling",
        "related_simulation": "quantum_tunneling",
        "prerequisites": ["wavefunction", "particle_in_box"],
        "overview": [
            "Send a particle at a potential barrier taller than its energy. Classically it must bounce back every time. Quantum mechanically the wavefunction does not stop dead at the wall — it decays exponentially inside the barrier rather than vanishing.",
            "If the barrier is thin enough, a small but non-zero amplitude survives to the far side, so there is a real probability of finding the particle beyond a wall it could never climb. Transmission falls off exponentially with both the width and the height of the barrier.",
            "Tunneling is not exotic — it powers radioactive alpha decay, the scanning tunneling microscope, flash memory, and the proton fusion that lets the Sun shine. Josephson-junction qubits are built directly on it.",
        ],
        "history": (
            "George Gamow, and independently Gurney and Condon, explained alpha decay by tunneling in 1928 — one of the first triumphs of the new quantum mechanics. Esaki, Giaever, and Josephson shared the 1973 Nobel Prize for tunneling phenomena in solids and superconductors."
        ),
        "formulas": [
            {
                "latex": r"T \approx e^{-2\kappa L},\qquad \kappa = \frac{\sqrt{2m(V_0 - E)}}{\hbar}",
                "description": "Transmission probability through a wide, tall rectangular barrier.",
                "symbols": {
                    "T": "transmission probability",
                    r"\kappa": "decay rate of the wavefunction inside the barrier",
                    "L": "barrier width",
                    "V_0": "barrier height",
                    "E": "particle energy (E < V₀)",
                    "m": "particle mass",
                },
                "derivation_steps": [
                    "Inside the barrier $E < V_0$, so the Schrödinger equation gives a real exponential $\\psi \\sim e^{-\\kappa x}$ with $\\kappa = \\sqrt{2m(V_0 - E)}/\\hbar$.",
                    "The amplitude on the far side is suppressed by $e^{-\\kappa L}$ across a barrier of width L.",
                    "The probability is the amplitude squared: $T \\approx e^{-2\\kappa L}$ — exponentially sensitive to width and height.",
                ],
            },
        ],
    },
    {
        "slug": "measurement",
        "related_simulation": "measurement",
        "prerequisites": ["wavefunction", "uncertainty"],
        "overview": [
            "Between observations a quantum system evolves smoothly and reversibly through the Schrödinger equation. Measurement is the abrupt exception: the wavefunction appears to collapse to a single eigenstate of whatever you measured, and the spread of possibility becomes one definite fact.",
            "The Born rule fixes the odds — the probability of an outcome is the squared magnitude of its amplitude. Collapse is irreversible and probabilistic, in sharp contrast to the deterministic unitary flow that precedes it.",
            "Why and how this happens is the measurement problem, the deepest open question in the foundations of physics. Decoherence explains why superpositions become unobservable once a system entangles with its environment, but interpretations still disagree on whether collapse is physically real.",
        ],
        "history": (
            "Born stated the probability rule in 1926; von Neumann formalised measurement as a distinct 'process 1' in his 1932 axioms. The tension with smooth evolution drove Schrödinger's 1935 cat paradox and, decades later, the decoherence programme of Zeh (1970) and Zurek."
        ),
        "formulas": [
            {
                "latex": r"P(a_i) = |\langle a_i | \psi \rangle|^2",
                "description": "Born rule: the probability of outcome aᵢ is the squared overlap of the state with that eigenstate.",
                "symbols": {
                    "P(a_i)": "probability of measuring eigenvalue aᵢ",
                    r"|a_i\rangle": "eigenstate of the measured observable",
                    r"|\psi\rangle": "state before measurement",
                },
                "derivation_steps": [
                    "Expand the state in the observable's eigenbasis: $|\\psi\\rangle = \\sum_i c_i |a_i\\rangle$ with $c_i = \\langle a_i|\\psi\\rangle$.",
                    "The Born rule assigns probability $P(a_i) = |c_i|^2$ to outcome $a_i$.",
                    "On measurement the state collapses to $|a_i\\rangle$; normalisation $\\sum_i |c_i|^2 = 1$ guarantees the probabilities sum to one.",
                ],
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Populate Foundations-branch topics with full content (run after seed_concepts)."

    @transaction.atomic
    def handle(self, *args, **options):
        run(self, TOPICS, "Foundations")

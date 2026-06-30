"""Populate the Quantum Information branch with full content: overviews,
history, structured formulas (symbols + derivation steps), prerequisite links,
and simulation keys (circuit builder, Grover, BB84, teleportation).

Idempotent — re-running updates rows in place. Run after `seed_concepts`.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from ._content import run

TOPICS = [
    {
        "slug": "superposition",
        "related_simulation": "superposition",
        "prerequisites": ["wave_particle_duality"],
        "overview": [
            "A quantum system need not be in just one state. It can occupy a weighted sum — a superposition — of several at once. A single qubit lives as α|0⟩ + β|1⟩, simultaneously both basis states until it is measured.",
            "The complex weights α and β are amplitudes, not probabilities. They can interfere, adding and cancelling like waves; only on measurement does the state collapse to one outcome, with probability |α|² for 0 and |β|² for 1.",
            "Superposition is not mere ignorance about a hidden true value — it is a physical resource. It lets a quantum computer hold and process an exponential number of basis states in a single coherent register.",
        ],
        "history": (
            "Superposition is built into Schrödinger's 1926 wave mechanics through the linearity of his equation. Dirac's 1930 textbook elevated it to a founding principle, and Schrödinger's 1935 cat dramatised how strange a macroscopic superposition would be."
        ),
        "formulas": [
            {
                "latex": r"|\psi\rangle = \alpha|0\rangle + \beta|1\rangle,\qquad |\alpha|^2 + |\beta|^2 = 1",
                "description": "A single-qubit pure state as a normalised superposition of the computational basis.",
                "symbols": {
                    r"|\psi\rangle": "the qubit state",
                    r"\alpha, \beta": "complex probability amplitudes",
                    r"|0\rangle, |1\rangle": "computational basis states",
                },
                "derivation_steps": [
                    "Linearity of the Schrödinger equation means any sum of valid states is itself valid: $|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$.",
                    "The Born rule assigns measurement probabilities $|\\alpha|^2$ and $|\\beta|^2$.",
                    "Since some outcome must occur, the amplitudes are normalised: $|\\alpha|^2 + |\\beta|^2 = 1$.",
                ],
            },
        ],
    },
    {
        "slug": "entanglement",
        "related_simulation": "entanglement",
        "prerequisites": ["superposition"],
        "overview": [
            "Two particles can share a single joint state that cannot be factored into separate descriptions of each. In the singlet state neither qubit has a definite spin alone, yet they are guaranteed to be opposite when measured along the same axis.",
            "Measure one and you instantly know the other — even light-years away. But no usable signal travels: each side on its own sees only random outcomes, so entanglement cannot be used for faster-than-light communication.",
            "Bell's theorem turns this into a testable inequality. Real experiments violate it, ruling out any local hidden-variable explanation. Entanglement is the key resource behind teleportation, dense coding, and quantum cryptography.",
        ],
        "history": (
            "Einstein, Podolsky, and Rosen posed entanglement as a paradox in 1935, the same year Schrödinger named it 'the characteristic trait of quantum mechanics'. John Bell made it experimentally decidable in 1964; Aspect's 1982 experiments and the 2022 Nobel-winning work of Aspect, Clauser, and Zeilinger confirmed the quantum predictions."
        ),
        "formulas": [
            {
                "latex": r"|\Phi^{+}\rangle = \frac{1}{\sqrt{2}}\big(|00\rangle + |11\rangle\big)",
                "description": "A maximally entangled Bell state of two qubits.",
                "symbols": {
                    r"|\Phi^{+}\rangle": "one of the four Bell states",
                    r"|00\rangle, |11\rangle": "two-qubit basis states",
                },
                "derivation_steps": [
                    "Prepare $|00\\rangle$, apply a Hadamard to the first qubit: $\\tfrac{1}{\\sqrt2}(|0\\rangle+|1\\rangle)|0\\rangle$.",
                    "Apply CNOT (first qubit controls the second): the $|1\\rangle$ branch flips the target to give $\\tfrac{1}{\\sqrt2}(|00\\rangle+|11\\rangle)$.",
                    "This state cannot be written as a product $(a|0\\rangle+b|1\\rangle)\\otimes(c|0\\rangle+d|1\\rangle)$ — that is the definition of entanglement.",
                ],
            },
        ],
    },
    {
        "slug": "qubit",
        "related_simulation": "qubit",
        "prerequisites": ["superposition", "spin"],
        "overview": [
            "A classical bit is 0 or 1. A qubit's pure states form a continuous surface — the Bloch sphere. The north pole is |0⟩, the south pole |1⟩, and every other point is a specific superposition with its own phase.",
            "Two angles parametrise it: a polar angle θ sets the |0⟩/|1⟩ balance, and an azimuthal phase φ sets the relative phase. φ is invisible to a single measurement but absolutely real — it controls interference, and quantum logic gates are simply rotations of the sphere.",
            "Mixed or noisy states sit inside the ball rather than on its surface, and the distance from the centre measures how much quantum coherence the state retains. The qubit is the fundamental unit of quantum information.",
        ],
        "history": (
            "The Bloch sphere comes from Felix Bloch's 1946 work on nuclear magnetic resonance. The word 'qubit' was coined by Benjamin Schumacher in 1995, formalising the unit of quantum information that David Deutsch's 1985 universal quantum computer had implicitly used."
        ),
        "formulas": [
            {
                "latex": r"|\psi\rangle = \cos\tfrac{\theta}{2}\,|0\rangle + e^{i\varphi}\sin\tfrac{\theta}{2}\,|1\rangle",
                "description": "Any pure qubit state as a point (θ, φ) on the Bloch sphere.",
                "symbols": {
                    r"\theta": "polar angle (0 at |0⟩, π at |1⟩)",
                    r"\varphi": "azimuthal phase angle",
                    r"|\psi\rangle": "the pure qubit state",
                },
                "derivation_steps": [
                    "A general state $\\alpha|0\\rangle + \\beta|1\\rangle$ has four real parameters, reduced to two by normalisation and by discarding the unobservable global phase.",
                    "Write $\\alpha = \\cos(\\theta/2)$ and $\\beta = e^{i\\varphi}\\sin(\\theta/2)$.",
                    "Then $(\\theta, \\varphi)$ are spherical coordinates of a point on the unit (Bloch) sphere.",
                ],
            },
        ],
    },
    {
        "slug": "quantum_gates",
        "related_simulation": "quantum_circuit",
        "prerequisites": ["qubit"],
        "overview": [
            "Quantum gates are the logic operations of a quantum computer. Unlike classical gates they must be reversible and are represented by unitary matrices, which rotate the statevector without destroying its norm.",
            "Single-qubit gates include the Pauli X (a bit flip), Z (a phase flip), and the Hadamard H, which creates an equal superposition and is the workhorse of quantum algorithms. The two-qubit CNOT flips a target qubit conditioned on a control, and is what generates entanglement.",
            "A small set — for example {H, T, CNOT} — is universal: any quantum computation can be approximated to arbitrary accuracy by stringing these together. The interactive circuit lets you apply gates and watch the 16-amplitude statevector respond.",
        ],
        "history": (
            "David Deutsch framed quantum computation in terms of gates and circuits in 1985–89. Barenco and colleagues proved in 1995 that single-qubit gates plus CNOT are universal, and the Solovay–Kitaev theorem made the approximation efficient."
        ),
        "formulas": [
            {
                "latex": r"H = \frac{1}{\sqrt{2}}\begin{pmatrix} 1 & 1 \\ 1 & -1 \end{pmatrix},\qquad U^{\dagger}U = I",
                "description": "The Hadamard gate, and the unitarity condition every gate must satisfy.",
                "symbols": {
                    "H": "Hadamard gate",
                    "U": "any quantum gate (unitary matrix)",
                    "U^{\\dagger}": "conjugate transpose of U",
                    "I": "identity matrix",
                },
                "derivation_steps": [
                    "Quantum evolution preserves the norm $\\langle\\psi|\\psi\\rangle$, which forces every gate to be unitary: $U^\\dagger U = I$ (hence reversible).",
                    "Acting on the basis: $H|0\\rangle = \\tfrac{1}{\\sqrt2}(|0\\rangle+|1\\rangle)$ and $H|1\\rangle = \\tfrac{1}{\\sqrt2}(|0\\rangle-|1\\rangle)$.",
                    "Applying H twice returns the original state, since $H^2 = I$.",
                ],
            },
            {
                "latex": r"\text{CNOT} = \begin{pmatrix} 1&0&0&0 \\ 0&1&0&0 \\ 0&0&0&1 \\ 0&0&1&0 \end{pmatrix}",
                "description": "The controlled-NOT gate: it flips the target qubit when the control is |1⟩.",
                "symbols": {
                    "CNOT": "controlled-NOT, a two-qubit entangling gate",
                },
                "derivation_steps": [
                    "On basis states $|c, t\\rangle$ it maps $|c, t\\rangle \\to |c,\\, t \\oplus c\\rangle$.",
                    "It leaves $|00\\rangle, |01\\rangle$ alone and swaps $|10\\rangle \\leftrightarrow |11\\rangle$ — the lower-right $2\\times2$ block is an X.",
                ],
            },
        ],
    },
    {
        "slug": "quantum_circuits",
        "related_simulation": "quantum_circuit",
        "prerequisites": ["quantum_gates"],
        "overview": [
            "A quantum circuit is a sequence of gates applied to a register of qubits, read left to right. Wires carry qubits (not currents), gate columns mark the order of operations, and measurements at the end convert quantum amplitudes into classical bits.",
            "The simplest non-trivial circuit — a Hadamard followed by a CNOT — turns |00⟩ into a Bell pair, the canonical entangling routine that opens teleportation and superdense coding. Composing such blocks builds up full algorithms.",
            "Because the statevector grows as 2ⁿ, simulating circuits classically becomes intractable around 50 qubits — the regime where real quantum hardware can outpace any classical computer. Try building a Bell pair in the simulator: H on q0, then CNOT from q0 to q1.",
        ],
        "history": (
            "The quantum-circuit model was formalised by Deutsch (1989) and Yao (1993), who showed it is equivalent in power to the quantum Turing machine. It is now the standard language of quantum programming frameworks like Qiskit and Cirq."
        ),
        "formulas": [
            {
                "latex": r"|00\rangle \xrightarrow{H_0} \tfrac{1}{\sqrt2}(|0\rangle+|1\rangle)|0\rangle \xrightarrow{\text{CNOT}} \tfrac{1}{\sqrt2}(|00\rangle+|11\rangle)",
                "description": "The two-gate Bell-state preparation circuit.",
                "symbols": {
                    "H_0": "Hadamard on qubit 0",
                    "CNOT": "controlled-NOT with qubit 0 as control",
                },
                "derivation_steps": [
                    "Start in $|00\\rangle$; the Hadamard puts qubit 0 into an equal superposition.",
                    "CNOT entangles them: the $|1\\rangle$ branch flips qubit 1, producing $\\tfrac{1}{\\sqrt2}(|00\\rangle+|11\\rangle)$.",
                    "The qubits are now correlated — measuring one fixes the other.",
                ],
            },
        ],
    },
    {
        "slug": "grover_algorithm",
        "related_simulation": "grover",
        "prerequisites": ["quantum_circuits"],
        "overview": [
            "Grover's algorithm searches an unstructured database of N items for a marked entry in about √N steps, a quadratic speedup over the N/2 a classical search needs on average. It is provably optimal for unstructured search.",
            "Start in an equal superposition of all N items. Each Grover iteration applies an oracle that flips the sign of the marked item's amplitude, then a diffusion operator that reflects all amplitudes about their mean. Together they rotate the state steadily toward the marked item.",
            "Crucially you must stop near the optimal number of iterations — keep going and the success probability falls again, because the rotation overshoots. The simulation shows the marked amplitude growing then receding as you step past the peak.",
        ],
        "history": (
            "Lov Grover published the algorithm at Bell Labs in 1996, two years after Shor's. Bennett, Bernstein, Brassard, and Vazirani had already proved that no quantum search of an unstructured space can beat O(√N), making Grover's algorithm optimal."
        ),
        "formulas": [
            {
                "latex": r"k_{\text{opt}} \approx \frac{\pi}{4}\sqrt{N}",
                "description": "Optimal number of Grover iterations to maximise the probability of finding the marked item.",
                "symbols": {
                    "k_{\\text{opt}}": "optimal iteration count",
                    "N": "number of items in the search space",
                },
                "derivation_steps": [
                    "Each iteration is a rotation by angle $\\theta$ in the 2-D plane spanned by the marked state $|w\\rangle$ and the rest, with $\\sin\\theta = 2\\sqrt{N-1}/N \\approx 2/\\sqrt{N}$.",
                    "To rotate from the initial state (near the 'rest' axis) to $|w\\rangle$ takes about $\\pi/(2\\theta)$ iterations.",
                    "With $\\theta \\approx 2/\\sqrt N$ this gives $k_{\\text{opt}} \\approx \\tfrac{\\pi}{4}\\sqrt{N}$ — quadratically fewer than the classical $\\sim N/2$.",
                ],
            },
        ],
    },
    {
        "slug": "shor_algorithm",
        "prerequisites": ["quantum_circuits", "grover_algorithm"],
        "overview": [
            "Shor's algorithm factors large integers in time polynomial in the number of digits — an exponential speedup over the best known classical methods. Because the security of RSA encryption rests on factoring being hard, Shor's algorithm is the headline threat that drives post-quantum cryptography.",
            "The trick is to reduce factoring to finding the period of the function f(x) = aˣ mod N. Period-finding is exactly what a quantum computer excels at: prepare a superposition over many x, apply the function, and use the quantum Fourier transform to read off the period from interference.",
            "Once the period r is known, classical number theory recovers a factor of N with high probability. The quantum Fourier transform at the heart of the algorithm runs in O((log N)²) gates, versus the exponential cost of classical factoring.",
        ],
        "history": (
            "Peter Shor discovered the algorithm at Bell Labs in 1994 — the result that turned quantum computing from a curiosity into a strategic priority. In 2001 IBM factored 15 = 3×5 on a 7-qubit NMR device, the first experimental demonstration."
        ),
        "formulas": [
            {
                "latex": r"a^{r} \equiv 1 \pmod{N},\qquad \gcd\!\left(a^{r/2} \pm 1,\, N\right)",
                "description": "Order-finding: r is the period of a mod N; if r is even, the gcds yield factors of N.",
                "symbols": {
                    "a": "a random base coprime to N",
                    "r": "the order (period) of a modulo N",
                    "N": "the integer being factored",
                    r"\gcd": "greatest common divisor (computed classically)",
                },
                "derivation_steps": [
                    "Pick a random $a < N$ with $\\gcd(a, N) = 1$ and find the period $r$ of $a^x \\bmod N$ using the quantum Fourier transform.",
                    "If $r$ is even and $a^{r/2} \\not\\equiv -1 \\pmod N$, then $a^r - 1 = (a^{r/2}-1)(a^{r/2}+1) \\equiv 0 \\pmod N$.",
                    "So $\\gcd(a^{r/2} \\pm 1, N)$ shares a non-trivial factor with $N$ — and the gcd is fast to compute.",
                ],
            },
        ],
    },
    {
        "slug": "quantum_teleportation",
        "related_simulation": "teleportation",
        "prerequisites": ["entanglement", "quantum_gates"],
        "overview": [
            "Teleportation transfers an unknown qubit state from Alice to Bob without sending the qubit itself. It consumes one shared entangled pair (an 'ebit') and two classical bits of communication.",
            "Alice entangles the unknown state with her half of the Bell pair, measures her two qubits, and sends the two-bit outcome to Bob. Bob applies one of four corrections (I, X, Z, or XZ) determined by those bits, and his qubit becomes the original state exactly.",
            "Nothing travels faster than light: without the classical bits Bob's qubit is useless, and the original is destroyed by Alice's measurement — fully consistent with the no-cloning theorem. The step-through shows each stage of the protocol.",
        ],
        "history": (
            "Bennett, Brassard, Crépeau, Jozsa, Peres, and Wootters proposed teleportation in 1993. It was demonstrated with photons by Bouwmeester and Zeilinger's group in 1997, and has since been achieved over 100+ km and via satellite (Micius, 2017)."
        ),
        "formulas": [
            {
                "latex": r"|\psi\rangle \otimes |\Phi^{+}\rangle \;\longrightarrow\; \text{2 classical bits} + |\psi\rangle_{\text{Bob}}",
                "description": "Resource accounting: one unknown qubit plus one ebit plus two classical bits reconstruct the state at Bob.",
                "symbols": {
                    r"|\psi\rangle": "the unknown state to be teleported",
                    r"|\Phi^{+}\rangle": "the shared Bell pair (one ebit)",
                },
                "derivation_steps": [
                    "Expand the three-qubit state in Alice's Bell basis: it becomes a sum of four terms, each pairing one Bell outcome with a transformed copy of $|\\psi\\rangle$ on Bob's qubit.",
                    "Alice's measurement collapses to one term, giving two classical bits $(m_1, m_0)$.",
                    "Bob applies $X^{m_1} Z^{m_0}$ to undo the transformation, recovering $|\\psi\\rangle$ exactly.",
                ],
            },
        ],
    },
    {
        "slug": "quantum_cryptography",
        "related_simulation": "bb84",
        "prerequisites": ["superposition", "measurement"],
        "overview": [
            "Quantum key distribution lets two parties share a secret key whose security rests on physics, not on the difficulty of a computation. The BB84 protocol is the original and most-used scheme.",
            "Alice sends qubits each prepared in one of two randomly chosen bases; Bob measures each in a randomly chosen basis. They publicly compare bases and keep only the bits where they matched — the 'sifted' key — discarding the rest. On average half the bits survive.",
            "Any eavesdropper must measure the qubits, but measuring in the wrong basis disturbs them. Comparing a sample of the sifted bits reveals the resulting error rate: above roughly 11% they abort, knowing the line was tapped. No-cloning guarantees Eve cannot copy the qubits to avoid detection.",
        ],
        "history": (
            "Charles Bennett and Gilles Brassard published BB84 in 1984, building on Stephen Wiesner's 1970s idea of quantum money. The first working prototype ran over 32 cm of free space in 1989; commercial QKD systems and the Micius satellite (2017) now operate over continental distances."
        ),
        "formulas": [
            {
                "latex": r"R_{\text{sift}} = \tfrac{1}{2},\qquad \text{QBER}_{\text{Eve}} \approx 25\%",
                "description": "Half the raw bits survive sifting; an intercept-resend eavesdropper injects about a 25% error on the sifted key.",
                "symbols": {
                    r"R_{\text{sift}}": "fraction of raw bits kept after basis comparison",
                    r"\text{QBER}": "quantum bit error rate on the sifted key",
                },
                "derivation_steps": [
                    "Alice and Bob choose bases independently, so they agree half the time: $R_{\\text{sift}} = 1/2$.",
                    "Eve guesses the basis correctly half the time; when wrong she resends a wrong state, and Bob then errs half of those times: $\\tfrac{1}{2}\\times\\tfrac{1}{2} = 25\\%$ error.",
                    "A measured QBER well above the no-eavesdropper baseline signals interception, and the key is discarded.",
                ],
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Populate Quantum Information-branch topics with full content (run after seed_concepts)."

    @transaction.atomic
    def handle(self, *args, **options):
        run(self, TOPICS, "Quantum Information")

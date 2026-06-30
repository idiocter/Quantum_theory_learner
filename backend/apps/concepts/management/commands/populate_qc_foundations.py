"""Populate the Quantum Computing track, Phase 1 (Modules 0-1).

Creates the two QC Category branches (`qc-prerequisites`, `qc-foundations`)
ordered after the existing 8 physics branches, seeds the 11 lesson Concept
rows from `docs/quantum-computing/prerequisites.json`, and authors their full
content (overview, history, structured formulas with symbol legends +
derivation steps, key equations, citations, prerequisite edges) via the shared
`_content.run` contract.

Idempotent: branches/concepts via `update_or_create` (matched by slug); content
via `_content.apply_topic`. Re-running updates rows in place and never
duplicates. Run standalone — it seeds its own Concept rows before filling
content, so it does not depend on `seed_concepts` for the qc- slugs.

LaTeX: `Formula.latex` and `key_equations[].latex` are BARE expressions (no `$`,
rendered by `Tex`); prose / `derivation_steps` use `$...$` / `$$...$$` (rendered
by `TexProse`). Glossary first-use terms are marked `[[term-slug]]` in prose
only, never inside math.

physics-accuracy-reviewer: every line tagged `# VERIFY:` flags a citation
detail (usually an exact Nielsen & Chuang section/box number) I could not
confirm from memory. The physics in the prose/formulas is asserted as correct.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.concepts.models import Category, Concept
from ._content import run

# ── Category branches (Module -> Category). Ordered after the existing 8. ──
# (slug, name, description, color, order)
BRANCHES = [
    (
        "qc-prerequisites",
        "QC: Prerequisites Diagnostic",
        "Diagnostic refreshers — linear algebra, complex numbers, probability, "
        "and classical computing — that the rest of the quantum-computing track "
        "assumes.",
        "#6366F1",
        9,
    ),
    (
        "qc-foundations",
        "QC: Foundations of Quantum Mechanics for Computing",
        "The state-vector formalism for quantum computing: qubits, superposition, "
        "the Bloch sphere, tensor products, measurement, entanglement, and "
        "no-cloning.",
        "#0EA5E9",
        10,
    ),
]

# ── Concept rows (Lesson -> Concept). `order` follows topological_order within
# each branch. (slug, title, category_slug, difficulty, order, summary) ──
CONCEPTS = [
    # Module 0 — qc-prerequisites
    (
        "qc-prereq-classical-computing",
        "Classical Computing Foundations",
        "qc-prerequisites",
        "beginner",
        1,
        "Bits, logic gates and their truth tables, the 2^n state count of an "
        "n-bit register, asymptotic (big-O) scaling, and reversible computation — "
        "the classical baseline against which quantum computing is measured.",
    ),
    (
        "qc-prereq-complex-numbers",
        "Complex Numbers and Amplitudes",
        "qc-prerequisites",
        "intermediate",
        2,
        "Cartesian and polar forms, modulus and argument, complex conjugation, "
        "the modulus squared as a real non-negative probability weight, Euler's "
        "formula, and the unobservable global phase factor.",
    ),
    (
        "qc-prereq-linear-algebra",
        "Linear Algebra for Quantum Computing",
        "qc-prerequisites",
        "intermediate",
        3,
        "Complex vector spaces and inner products, norms and normalization, the "
        "conjugate transpose, unitary and Hermitian matrices, eigenvalues and "
        "eigenvectors, the Kronecker (tensor) product, and basis expansions.",
    ),
    (
        "qc-prereq-probability",
        "Probability for Quantum Computing",
        "qc-prerequisites",
        "intermediate",
        4,
        "Discrete distributions, expectation and variance, valid normalization, "
        "marginal and conditional probabilities, and statistical independence — "
        "the classical probability the Born rule reduces to on measurement.",
    ),
    # Module 1 — qc-foundations
    (
        "qc-qubit-state-vector",
        "Qubits and State Vectors",
        "qc-foundations",
        "intermediate",
        1,
        "A qubit is a unit vector in the two-dimensional complex Hilbert space "
        "C^2. We define the computational basis, the general pure state "
        "alpha|0> + beta|1>, the normalization constraint, and the column-vector "
        "form of |0>, |1>, |+>, |->.",
    ),
    (
        "qc-multi-qubit-tensor",
        "Multi-Qubit Systems and Tensor Products",
        "qc-foundations",
        "advanced",
        2,
        "An n-qubit register lives in a 2^n-dimensional Hilbert space built as a "
        "tensor product of single-qubit spaces. We compute joint states, expand "
        "them in the computational basis, and test whether a two-qubit state "
        "factorizes into a product state.",
    ),
    (
        "qc-superposition",
        "Superposition",
        "qc-foundations",
        "intermediate",
        3,
        "Superposition is a normalized linear combination of basis states. We "
        "build the equal-superposition state |+>, separate global from relative "
        "phase, and contrast a coherent superposition with a classical "
        "probabilistic mixture having the same basis probabilities.",
    ),
    (
        "qc-bloch-sphere",
        "The Bloch Sphere",
        "qc-foundations",
        "intermediate",
        4,
        "Every pure single-qubit state maps to a point on the unit sphere via "
        "cos(theta/2)|0> + e^{i phi} sin(theta/2)|1>. We convert between Bloch "
        "angles, the Cartesian Bloch vector, and the state, and show orthogonal "
        "states sit at antipodal points.",
    ),
    (
        "qc-measurement-born-rule",
        "Measurement and the Born Rule",
        "qc-foundations",
        "intermediate",
        5,
        "The Born rule gives the probability of a projective-measurement outcome "
        "as |<i|psi>|^2. We compute outcome statistics in different bases, find "
        "the collapsed post-measurement state, compute expectation values, and "
        "contrast irreversible measurement with reversible unitary evolution.",
    ),
    (
        "qc-no-cloning",
        "The No-Cloning Theorem",
        "qc-foundations",
        "advanced",
        6,
        "No unitary can copy an arbitrary unknown quantum state onto a blank "
        "register. We prove it from linearity and from inner-product "
        "preservation, show why orthogonal states are copyable but non-orthogonal "
        "ones are not, and diagnose flawed copying schemes.",
    ),
    (
        "qc-entanglement-bell-states",
        "Entanglement and Bell States",
        "qc-foundations",
        "advanced",
        7,
        "An entangled state cannot be written as a tensor product of "
        "single-subsystem states. We define the four orthonormal Bell states, "
        "prove a Bell state is entangled, compute the perfectly correlated local "
        "measurement statistics, and explain no-signaling.",
    ),
]


# ── Reusable citation entries ──
NC = {  # Nielsen & Chuang, Quantum Computation and Quantum Information (10th anniv. ed., 2010)
    "1.2": {"title": "Nielsen & Chuang, Sec 1.2 (Qubits)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    "1.3.6": {"title": "Nielsen & Chuang, Sec 1.3.6 (Application: superdense coding / Bell states)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    "2.1": {"title": "Nielsen & Chuang, Sec 2.1 (Linear algebra)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    "2.1.7": {"title": "Nielsen & Chuang, Sec 2.1.7 (Tensor products)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    "2.2": {"title": "Nielsen & Chuang, Sec 2.2 (The postulates of quantum mechanics)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    "2.2.3": {"title": "Nielsen & Chuang, Sec 2.2.3 (Quantum measurement / the Born rule)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    "2.2.5": {"title": "Nielsen & Chuang, Sec 2.2.5 (Projective measurements)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    "2.2.7": {"title": "Nielsen & Chuang, Sec 2.2.7 (Global and relative phase)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    "2.2.8": {"title": "Nielsen & Chuang, Sec 2.2.8 (Composite systems / entanglement)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    "2.4.3": {"title": "Nielsen & Chuang, Sec 2.4.3 (The reduced density operator)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    "3.2.5": {"title": "Nielsen & Chuang, Sec 3.2.5 (Reversible Turing machines)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    # VERIFY: N&C states the no-cloning theorem in Box 12.1 (Ch. 12, Quantum
    # information theory). Confirm the exact box/section number in the printed
    # 10th-anniversary edition.
    "no-cloning": {"title": "Nielsen & Chuang, Box 12.1 (The no-cloning theorem)", "url": "https://doi.org/10.1017/CBO9780511976667"},
}


TOPICS = [
    # ─────────────────────────── MODULE 0 ───────────────────────────
    {
        "slug": "qc-prereq-classical-computing",
        "related_simulation": "",
        "overview": [
            "Classical computation manipulates [[bits|bits]] — variables taking the value $0$ or $1$ — through logic gates. The single-input NOT gate flips its input; the two-input AND, OR, NAND, and XOR gates are defined exhaustively by their truth tables. AND outputs $1$ only when both inputs are $1$; OR outputs $1$ when at least one input is $1$; XOR (exclusive-or) outputs $1$ when exactly one input is $1$, i.e. the parity of the inputs; and NAND is the negation of AND. NAND is universal: every Boolean function can be built from NAND gates alone, which is why it anchors the classical baseline a quantum computer must eventually beat.",
            "A register of $n$ bits encodes one of $N = 2^n$ distinct states at any instant, written as a bit string such as $1011$ for a 4-bit register. This is the crucial point of contrast with quantum computing: a classical $n$-bit register holds exactly one of those $2^n$ strings, whereas an $n$-qubit register holds a normalized superposition over all $2^n$ basis strings at once. The exponential $2^n$ is the same in both settings; what differs is whether the machine occupies one configuration or a coherent combination of all of them.",
            "Algorithmic cost is measured by how the step count grows with input size $n$, classified with big-O notation: an algorithm is $O(g(n))$ if its running time is bounded above by a constant multiple of $g(n)$ for large $n$. The decisive dividing line is polynomial scaling such as $O(n^2)$ — considered efficient — versus exponential scaling such as $O(2^n)$, which becomes intractable as $n$ grows. Quantum speed-ups are interesting precisely when they move a problem across this line, for example Shor's algorithm taking integer factoring from super-polynomial to polynomial.",
            "Finally, a computation is reversible when its output uniquely determines its input — equivalently, when its truth table is injective (a bijection on the input space). NOT and XOR-with-control (the CNOT gate) are reversible; AND and OR are not, because they map two distinct input combinations to the same output and so destroy information. Reversibility matters for quantum computing because every quantum gate is [[unitary|unitary]], hence invertible: quantum circuits are inherently reversible, so the classical primitives they emulate must be recast in reversible form (e.g. the Toffoli gate).",
        ],
        "history": (
            "Claude Shannon's 1937 master's thesis recast Boolean algebra as the analysis of switching circuits, founding digital logic. Rolf Landauer argued in 1961 that logically irreversible operations such as erasing a bit must dissipate at least $kT\\ln 2$ of energy, and Charles Bennett showed in 1973 that any computation can be made logically reversible, removing that floor — the conceptual bridge to the unitary, reversible gates of quantum computing."
        ),
        "math_derivation": (
            "A gate $g:\\{0,1\\}^k \\to \\{0,1\\}^m$ is reversible iff it is injective, which for $k=m$ means it is a bijection (a permutation of the $2^k$ inputs). "
            "Consider AND: its truth table sends $00,01,10 \\mapsto 0$ and $11 \\mapsto 1$. Three distinct inputs share the output $0$, so AND is not injective and cannot be inverted — given output $0$ you cannot recover the input. "
            "Contrast the controlled-NOT (CNOT) on two bits, $(\\,a,b\\,)\\mapsto(\\,a,\\;a\\oplus b\\,)$. Its truth table is "
            "$$00\\mapsto00,\\quad 01\\mapsto01,\\quad 10\\mapsto11,\\quad 11\\mapsto10,$$ "
            "a permutation of the four inputs, so CNOT is reversible and is its own inverse. This injectivity test — read the truth table, check whether any output repeats — is exactly the criterion objective o4 asks you to apply."
        ),
        "key_equations": [
            {"label": "States of an n-bit register", "latex": r"N = 2^{n}"},
            {"label": "XOR as parity", "latex": r"a \oplus b = (a + b) \bmod 2"},
            {"label": "Reversible (injective) gate", "latex": r"g(x_1) = g(x_2) \implies x_1 = x_2"},
            {"label": "Polynomial vs exponential", "latex": r"O(n^k) \ll O(2^{n}) \quad (n \to \infty)"},
        ],
        "further_reading": [
            NC["3.2.5"],
            {"title": "Landauer, Irreversibility and heat generation in the computing process, IBM J. Res. Dev. 5, 183 (1961)", "url": "https://doi.org/10.1147/rd.53.0183"},
            {"title": "Bennett, Logical reversibility of computation, IBM J. Res. Dev. 17, 525 (1973)", "url": "https://doi.org/10.1147/rd.176.0525"},
        ],
        "formulas": [
            {
                "latex": r"N = 2^{n}",
                "description": "An n-bit register has exactly 2^n distinct states; one is occupied at a time classically.",
                "symbols": {
                    "N": "number of distinct register states",
                    "n": "number of bits in the register",
                },
                "derivation_steps": [
                    "Each bit independently takes one of $2$ values, $0$ or $1$.",
                    "For $n$ bits the choices multiply: $2 \\times 2 \\times \\cdots \\times 2 = 2^{n}$.",
                    "A classical register occupies one of these $2^{n}$ strings; an $n$-qubit register can be a superposition over all $2^{n}$, which is the resource quantum computing exploits.",
                ],
            },
            {
                "latex": r"\text{reversible} \iff g \text{ injective: } g(x_1)=g(x_2)\Rightarrow x_1=x_2",
                "description": "A classical gate is reversible exactly when distinct inputs never collide to the same output.",
                "symbols": {
                    "g": "the gate viewed as a function on bit strings",
                    "x_1, x_2": "candidate input bit strings",
                },
                "derivation_steps": [
                    "Reversibility means the input can be recovered from the output, i.e. $g$ has a left inverse.",
                    "A function has an inverse on its image iff it is injective: no two inputs map to the same output.",
                    "AND fails this ($00,01,10$ all map to $0$); NOT and CNOT pass, since their truth tables permute the inputs.",
                ],
            },
        ],
    },
    {
        "slug": "qc-prereq-complex-numbers",
        "related_simulation": "",
        "overview": [
            "A complex number $z = a + b\\,i$ has real part $a$ and imaginary part $b$, with $i^2 = -1$. Geometrically it is a point in the plane, and its polar form $z = r\\,e^{i\\theta}$ encodes the same number by its modulus $r = |z| = \\sqrt{a^2 + b^2}$ and its argument $\\theta = \\arg z = \\operatorname{atan2}(b,a)$. Converting between the two forms — $a = r\\cos\\theta$, $b = r\\sin\\theta$ and back — is the everyday arithmetic of quantum [[amplitude|amplitudes]], which are complex numbers attached to each basis outcome.",
            "The complex conjugate $z^{*} = a - b\\,i$ reflects $z$ across the real axis. Its central role is that $z^{*}z = a^2 + b^2 = |z|^2$ is always real and non-negative, regardless of $z$. This is exactly why the Born rule can read a probability off an amplitude: $|z|^2$ is guaranteed to be a legitimate (real, non-negative) weight, and summing $|z|^2$ over a normalized state's outcomes gives $1$. An amplitude itself is not a probability — it can be negative or complex — but its modulus squared is.",
            "Euler's formula $e^{i\\theta} = \\cos\\theta + i\\sin\\theta$ ties the exponential to rotation: $e^{i\\theta}$ is the unit-modulus complex number at angle $\\theta$, so multiplying by it rotates a point about the origin without changing its length. A factor of unit modulus, $e^{i\\gamma}$, is called a [[global-phase|global phase]] when it multiplies an entire state. Because $|e^{i\\gamma}z|^2 = |z|^2$, a global phase leaves every measurement probability untouched and is therefore physically unobservable — $|\\psi\\rangle$ and $e^{i\\gamma}|\\psi\\rangle$ are the same physical state. A [[relative-phase|relative phase]], a phase difference between two amplitudes within a superposition, does change interference and is observable; that distinction is developed in the superposition lesson.",
        ],
        "history": (
            "Leonhard Euler published the identity $e^{i\\theta} = \\cos\\theta + i\\sin\\theta$ in 1748, and Caspar Wessel (1799) and Jean-Robert Argand (1806) gave complex numbers their geometric reading as points in the plane. Quantum mechanics made the complex field not a convenience but a necessity: Schrödinger's 1926 wave equation is intrinsically complex, and Born's rule turns the squared modulus of a complex amplitude into a probability."
        ),
        "math_derivation": (
            "Why is $|z|^2$ guaranteed real and non-negative? Write $z = a + b\\,i$. Then "
            "$$z^{*}z = (a - b\\,i)(a + b\\,i) = a^2 - (b\\,i)^2 = a^2 + b^2,$$ "
            "since $i^2 = -1$. The imaginary parts cancel exactly, leaving a sum of two real squares, which is $\\ge 0$. "
            "In polar form the same statement is immediate: with $z = r\\,e^{i\\theta}$ we have $z^{*} = r\\,e^{-i\\theta}$, so $z^{*}z = r^2 e^{0} = r^2 = |z|^2$. "
            "A global phase multiplies $z \\mapsto e^{i\\gamma} z$, giving modulus $|e^{i\\gamma}z| = |e^{i\\gamma}|\\,|z| = |z|$ because $|e^{i\\gamma}|^2 = e^{i\\gamma}e^{-i\\gamma} = 1$. The probability $|z|^2$ is unchanged — the formal statement that global phase is unobservable."
        ),
        "key_equations": [
            {"label": "Polar form", "latex": r"z = r e^{i\theta} = r(\cos\theta + i\sin\theta)"},
            {"label": "Modulus squared", "latex": r"|z|^{2} = z^{*}z = a^{2} + b^{2}"},
            {"label": "Euler's formula", "latex": r"e^{i\theta} = \cos\theta + i\sin\theta"},
            {"label": "Global phase invariance", "latex": r"\big|e^{i\gamma} z\big|^{2} = |z|^{2}"},
        ],
        "further_reading": [
            NC["2.1"],
            {"title": "Born, Zur Quantenmechanik der Stoßvorgänge, Z. Phys. 37, 863 (1926)", "url": "https://doi.org/10.1007/BF01397477"},
        ],
        "formulas": [
            {
                "latex": r"e^{i\theta} = \cos\theta + i\sin\theta",
                "description": "Euler's formula: the unit-modulus complex number at angle theta.",
                "symbols": {
                    r"\theta": "argument (angle) in radians",
                    "i": "imaginary unit, i^2 = -1",
                },
                "derivation_steps": [
                    "Compare the Maclaurin series of $e^{i\\theta}$, $\\cos\\theta$, and $\\sin\\theta$.",
                    "Splitting $e^{i\\theta} = \\sum_n (i\\theta)^n/n!$ into even and odd powers gives the cosine series plus $i$ times the sine series.",
                    "Hence $e^{i\\theta} = \\cos\\theta + i\\sin\\theta$, a point of modulus $1$ at angle $\\theta$; setting $\\theta = \\pi$ yields $e^{i\\pi} + 1 = 0$.",
                ],
            },
            {
                "latex": r"|z|^{2} = z^{*}z = a^{2} + b^{2} \ge 0",
                "description": "The modulus squared of an amplitude is always real and non-negative — a valid probability weight.",
                "symbols": {
                    "z": "complex amplitude, z = a + bi",
                    "z^{*}": "complex conjugate, z* = a - bi",
                    "a, b": "real and imaginary parts of z",
                },
                "derivation_steps": [
                    "Multiply: $z^{*}z = (a - b i)(a + b i) = a^2 - b^2 i^2 = a^2 + b^2$.",
                    "Both terms are squares of reals, so the sum is real and $\\ge 0$.",
                    "This is what lets the Born rule read $|z|^2$ as a probability, while $z$ itself need not be.",
                ],
            },
        ],
    },
    {
        "slug": "qc-prereq-linear-algebra",
        "related_simulation": "",
        "overview": [
            "Quantum states live in a complex [[hilbert-space|Hilbert space]] $\\mathbb{C}^n$ — a complex vector space equipped with an inner product. For column vectors $|u\\rangle, |v\\rangle \\in \\mathbb{C}^n$ the inner product is $\\langle u|v\\rangle = \\sum_k u_k^{*} v_k$, conjugate-linear in the first slot and linear in the second. The induced norm is $\\||v\\rangle\\| = \\sqrt{\\langle v|v\\rangle}$, and the normalized unit vector is $|v\\rangle/\\||v\\rangle\\|$. Normalization is not cosmetic here: a physical state must satisfy $\\langle\\psi|\\psi\\rangle = 1$ so that the Born probabilities sum to one.",
            "Operators act on these vectors as matrices, and the key operation is the conjugate transpose (adjoint) $A^{\\dagger} = (A^{*})^{\\mathsf{T}}$. A matrix is [[hermitian|Hermitian]] when $A = A^{\\dagger}$; its eigenvalues are real, which is why every measurable [[observable|observable]] is represented by a Hermitian operator. A matrix is [[unitary|unitary]] when $U^{\\dagger}U = U U^{\\dagger} = I$; unitaries preserve inner products and norms, which is why every closed-system quantum evolution and every quantum gate is unitary. A matrix can be both (e.g. the Pauli matrices $\\sigma_x,\\sigma_y,\\sigma_z$, which are Hermitian and unitary), one, or neither — testable directly by computing $A^{\\dagger}$ and comparing to $A$ and to $A^{-1}$.",
            "The eigenvalue equation $A|v\\rangle = \\lambda|v\\rangle$ identifies directions an operator merely rescales. For a $2\\times2$ matrix the eigenvalues solve the characteristic equation $\\det(A - \\lambda I) = 0$, a quadratic; back-substitution yields the eigenvectors. A foundational fact for measurement: eigenvectors of a Hermitian matrix belonging to distinct eigenvalues are orthogonal, so an observable's eigenstates form an [[orthonormal-basis|orthonormal basis]] — the basis you measure in. Any vector then expands as $|v\\rangle = \\sum_k \\langle e_k|v\\rangle\\,|e_k\\rangle$, with the expansion coefficients computed as inner products against the basis vectors.",
            "Composite systems are built with the [[tensor-product|tensor (Kronecker) product]] $\\otimes$. Combining $|u\\rangle \\in \\mathbb{C}^m$ with $|v\\rangle \\in \\mathbb{C}^n$ gives $|u\\rangle\\otimes|v\\rangle \\in \\mathbb{C}^{mn}$; dimensions multiply rather than add. The Kronecker product of an $m\\times m$ matrix with an $n\\times n$ matrix is $mn\\times mn$. This multiplicative growth is the engine of the $2^n$-dimensional state space of $n$ qubits, developed in the multi-qubit lesson.",
        ],
        "history": (
            "The bra-ket notation $\\langle\\cdot|\\cdot\\rangle$ was introduced by Paul Dirac in 1939, building on the Hilbert-space formalism David Hilbert, Erhard Schmidt, and John von Neumann developed for quantum mechanics in the 1920s-30s. Von Neumann's 1932 Mathematische Grundlagen der Quantenmechanik fixed the spectral-theory backbone — Hermitian observables, orthonormal eigenbases, unitary evolution — that this lesson summarizes."
        ),
        "math_derivation": (
            "Eigenvectors of a Hermitian $A=A^{\\dagger}$ with distinct eigenvalues are orthogonal. Let $A|u\\rangle = a|u\\rangle$ and $A|v\\rangle = b|v\\rangle$ with $a \\ne b$, both real (Hermitian eigenvalues are real). "
            "Compute $\\langle u|A|v\\rangle$ two ways. Acting right: $\\langle u|A|v\\rangle = b\\,\\langle u|v\\rangle$. Acting left, using $A^{\\dagger}=A$ and $a$ real: $\\langle u|A|v\\rangle = \\langle A u|v\\rangle = a\\,\\langle u|v\\rangle$. "
            "Subtracting, $(a - b)\\,\\langle u|v\\rangle = 0$. Since $a \\ne b$, we must have $\\langle u|v\\rangle = 0$. "
            "Hence the eigenstates of an observable form an orthonormal basis, and the expansion $|v\\rangle = \\sum_k \\langle e_k|v\\rangle\\,|e_k\\rangle$ recovers each coefficient by a single inner product — the linear-algebra fact the Born rule turns into measurement probabilities."
        ),
        "key_equations": [
            {"label": "Inner product on C^n", "latex": r"\langle u|v\rangle = \sum_{k} u_k^{*}\, v_k"},
            {"label": "Norm and normalization", "latex": r"\big\||v\rangle\big\| = \sqrt{\langle v|v\rangle},\qquad |\hat v\rangle = \frac{|v\rangle}{\sqrt{\langle v|v\rangle}}"},
            {"label": "Unitary / Hermitian", "latex": r"U^{\dagger}U = I,\qquad A = A^{\dagger}"},
            {"label": "Eigenvalue problem", "latex": r"A|v\rangle = \lambda|v\rangle,\qquad \det(A - \lambda I) = 0"},
            {"label": "Basis expansion", "latex": r"|v\rangle = \sum_{k} \langle e_k|v\rangle\, |e_k\rangle"},
            {"label": "Tensor (Kronecker) product dimension", "latex": r"\mathbb{C}^{m} \otimes \mathbb{C}^{n} = \mathbb{C}^{mn}"},
        ],
        "further_reading": [
            NC["2.1"],
            NC["2.1.7"],
        ],
        "formulas": [
            {
                "latex": r"\langle u|v\rangle = \sum_{k} u_k^{*}\, v_k",
                "description": "Hermitian inner product on C^n: conjugate the first vector, then sum component products.",
                "symbols": {
                    r"\langle u|v\rangle": "inner product of |u> and |v>",
                    "u_k^{*}": "complex conjugate of the k-th component of |u>",
                    "v_k": "k-th component of |v>",
                },
                "derivation_steps": [
                    "The norm follows as $\\||v\\rangle\\| = \\sqrt{\\langle v|v\\rangle} = \\sqrt{\\sum_k |v_k|^2}$.",
                    "Normalize by dividing: $|\\hat v\\rangle = |v\\rangle / \\||v\\rangle\\|$ has unit norm.",
                    "Conjugation in the first slot makes $\\langle v|v\\rangle = \\sum_k |v_k|^2$ real and non-negative, so a physical state can be scaled to $\\langle\\psi|\\psi\\rangle = 1$.",
                ],
            },
            {
                "latex": r"U^{\dagger}U = U U^{\dagger} = I",
                "description": "Unitarity: the adjoint is the inverse, so U preserves inner products and norms.",
                "symbols": {
                    "U": "square complex matrix",
                    r"U^{\dagger}": "conjugate transpose (adjoint) of U",
                    "I": "identity matrix",
                },
                "derivation_steps": [
                    "For any $|u\\rangle,|v\\rangle$, $\\langle Uu|Uv\\rangle = \\langle u|U^{\\dagger}U|v\\rangle = \\langle u|v\\rangle$ exactly when $U^{\\dagger}U = I$.",
                    "Preserving the inner product preserves the norm, so unit states stay unit states — required of any quantum evolution.",
                    "A Hermitian $A=A^{\\dagger}$ is a different condition; the Pauli matrices satisfy both $A=A^{\\dagger}$ and $A^{\\dagger}A=I$, so they are simultaneously Hermitian and unitary.",
                ],
            },
            {
                "latex": r"(A \otimes B)_{(i,k),(j,l)} = A_{ij} B_{kl}",
                "description": "Kronecker (tensor) product: dimensions multiply, giving the mn x mn joint operator.",
                "symbols": {
                    r"A \otimes B": "tensor product of A (m x m) and B (n x n)",
                    "A_{ij}, B_{kl}": "matrix entries of A and B",
                },
                "derivation_steps": [
                    "For vectors, $(|u\\rangle\\otimes|v\\rangle)_{(i,k)} = u_i v_k$, a vector in $\\mathbb{C}^{mn}$.",
                    "For operators the entries multiply blockwise as above, producing an $mn \\times mn$ matrix.",
                    "Two qubits ($m=n=2$) give a $4$-dimensional space; $n$ qubits give $2^n$ dimensions.",
                ],
            },
        ],
    },
    {
        "slug": "qc-prereq-probability",
        "related_simulation": "",
        "overview": [
            "A discrete random variable $X$ takes values $x_i$ with probabilities $p_i = P(X = x_i)$ forming a valid distribution: each $p_i \\ge 0$ and $\\sum_i p_i = 1$. Checking validity is the first diagnostic skill — a set of candidate weights is a distribution only if it is non-negative and sums to one (renormalize by dividing by the total if it does not). This is the classical structure the Born rule reproduces: measurement outcome probabilities $P(i) = |\\langle i|\\psi\\rangle|^2$ are non-negative and, for a normalized state, sum to one.",
            "The expectation value $\\mathbb{E}[X] = \\sum_i p_i\\, x_i$ is the probability-weighted mean, and the variance $\\operatorname{Var}(X) = \\mathbb{E}[X^2] - \\mathbb{E}[X]^2$ measures spread. These have a direct quantum echo: the quantum [[expectation-value|expectation value]] $\\langle\\psi|\\hat A|\\psi\\rangle$ of an observable is exactly $\\sum_i a_i P(a_i)$, the classical mean of its eigenvalue outcomes weighted by Born probabilities — the bridge developed in the measurement lesson.",
            "For two variables a joint distribution $P(X{=}x, Y{=}y)$ specifies the probability of each pair. A marginal recovers one variable by summing out the other, $P(X{=}x) = \\sum_y P(x,y)$, and a conditional reweights by what is known, $P(X{=}x \\mid Y{=}y) = P(x,y)/P(y)$. Two variables are statistically independent when the joint factorizes into the product of its marginals, $P(x,y) = P(x)\\,P(y)$ for all $x,y$; equivalently $P(x\\mid y) = P(x)$. Testing independence is exactly comparing the joint table to the outer product of its margins.",
            "This factorization test is the classical shadow of [[entanglement|entanglement]]. A two-qubit [[product-state|product state]] yields independent local measurement outcomes — its joint distribution factorizes — whereas an entangled state produces correlated outcomes whose joint distribution does not factor into independent marginals. Spotting non-factorizability in a probability table is the same move, one rung down, as spotting that a state cannot be written as a tensor product.",
        ],
        "history": (
            "Andrey Kolmogorov gave probability its modern measure-theoretic axioms in 1933. Max Born grafted this framework onto quantum mechanics in 1926, proposing that $|\\psi|^2$ be read as a probability density — the interpretive step that makes the Born rule a statement about ordinary probabilities computed from complex amplitudes."
        ),
        "math_derivation": (
            "Independence versus correlation, concretely. Suppose two bits have the joint distribution "
            "$$P(0,0) = P(1,1) = \\tfrac{1}{2},\\qquad P(0,1) = P(1,0) = 0.$$ "
            "The marginals are $P(X{=}0) = P(X{=}1) = \\tfrac{1}{2}$ and likewise for $Y$. The product of marginals gives $P(X{=}0)P(Y{=}0) = \\tfrac{1}{4}$, but the joint is $P(0,0) = \\tfrac{1}{2} \\ne \\tfrac{1}{4}$. "
            "The joint does not factor, so $X$ and $Y$ are dependent — in fact perfectly correlated. This is precisely the classical outcome table produced by measuring the Bell state $|\\Phi^{+}\\rangle$ in the computational basis. By contrast a product state such as $P(x,y) = \\tfrac14$ for all four pairs does factor, giving independent (uncorrelated) outcomes."
        ),
        "key_equations": [
            {"label": "Valid distribution", "latex": r"p_i \ge 0,\qquad \sum_i p_i = 1"},
            {"label": "Expectation", "latex": r"\mathbb{E}[X] = \sum_i p_i\, x_i"},
            {"label": "Variance", "latex": r"\operatorname{Var}(X) = \mathbb{E}[X^2] - \mathbb{E}[X]^2"},
            {"label": "Marginal / conditional", "latex": r"P(x) = \sum_y P(x,y),\qquad P(x\mid y) = \frac{P(x,y)}{P(y)}"},
            {"label": "Independence", "latex": r"P(x,y) = P(x)\,P(y)"},
        ],
        "further_reading": [
            NC["2.2.3"],
            {"title": "Born, Zur Quantenmechanik der Stoßvorgänge, Z. Phys. 37, 863 (1926)", "url": "https://doi.org/10.1007/BF01397477"},
        ],
        "formulas": [
            {
                "latex": r"\mathbb{E}[X] = \sum_i p_i\, x_i,\qquad \operatorname{Var}(X) = \sum_i p_i\, x_i^2 - \Big(\sum_i p_i\, x_i\Big)^2",
                "description": "Expectation (probability-weighted mean) and variance (spread) of a discrete random variable.",
                "symbols": {
                    "p_i": "probability of outcome x_i",
                    "x_i": "value of the i-th outcome",
                    r"\mathbb{E}[X]": "expectation value of X",
                },
                "derivation_steps": [
                    "The mean weights each value by its probability: $\\mathbb{E}[X] = \\sum_i p_i x_i$.",
                    "Variance is the mean squared deviation, $\\operatorname{Var}(X) = \\mathbb{E}[(X-\\mathbb{E}[X])^2]$.",
                    "Expanding the square gives the computational form $\\mathbb{E}[X^2] - \\mathbb{E}[X]^2$.",
                    "The quantum expectation $\\langle\\psi|\\hat A|\\psi\\rangle = \\sum_i a_i P(a_i)$ is this same weighted mean over Born probabilities.",
                ],
            },
            {
                "latex": r"P(x,y) = P(x)\,P(y)\ \ \forall x,y \iff X \perp Y",
                "description": "Independence: the joint distribution factorizes into the product of its marginals.",
                "symbols": {
                    "P(x,y)": "joint probability of X=x and Y=y",
                    "P(x), P(y)": "marginal distributions",
                    r"X \perp Y": "X and Y are statistically independent",
                },
                "derivation_steps": [
                    "Compute the marginals $P(x) = \\sum_y P(x,y)$ and $P(y) = \\sum_x P(x,y)$.",
                    "Form the product table $P(x)P(y)$ and compare entrywise to the joint $P(x,y)$.",
                    "If they agree everywhere the variables are independent; any disagreement signals correlation — the classical analogue of entanglement.",
                ],
            },
        ],
    },
    # ─────────────────────────── MODULE 1 ───────────────────────────
    {
        "slug": "qc-qubit-state-vector",
        "related_simulation": "bloch_sphere",
        "prerequisites": ["qc-prereq-linear-algebra", "qc-prereq-complex-numbers", "qc-prereq-classical-computing"],
        "overview": [
            "A [[qubit|qubit]] is the quantum analogue of a bit: formally, a unit [[state-vector|state vector]] in the two-dimensional complex Hilbert space $\\mathbb{C}^2$. We fix an orthonormal [[computational-basis|computational basis]] $\\{|0\\rangle, |1\\rangle\\}$, the quantum counterparts of the classical $0$ and $1$. A general pure state is the superposition $|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$, where the [[amplitude|amplitudes]] $\\alpha,\\beta \\in \\mathbb{C}$ obey the normalization constraint $|\\alpha|^2 + |\\beta|^2 = 1$. Normalization is the requirement $\\langle\\psi|\\psi\\rangle = 1$ that makes the Born probabilities sum to one.",
            "In the computational basis the basis kets are the standard column vectors $|0\\rangle = \\binom{1}{0}$ and $|1\\rangle = \\binom{0}{1}$, so the Dirac form and the column-vector form are two notations for the same object: $|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle = \\binom{\\alpha}{\\beta}$. Converting between them is mechanical — read the amplitudes off the column, or assemble the column from the amplitudes — and verifying normalization is just checking $|\\alpha|^2 + |\\beta|^2 = 1$. The two most important superpositions are the equal-weight states $|+\\rangle = \\tfrac{1}{\\sqrt2}(|0\\rangle + |1\\rangle)$ and $|-\\rangle = \\tfrac{1}{\\sqrt2}(|0\\rangle - |1\\rangle)$, with column forms $\\tfrac{1}{\\sqrt2}\\binom{1}{1}$ and $\\tfrac{1}{\\sqrt2}\\binom{1}{-1}$; they form the orthonormal $X$-basis.",
            "The decisive contrast with a classical bit is the structure of the state space. A bit occupies one of two discrete values, $0$ or $1$. A qubit's pure-state space is continuous: any $(\\alpha,\\beta)$ on the unit sphere in $\\mathbb{C}^2$ is allowed, an uncountable continuum of states, not two points. The continuity is genuine and physical — amplitudes vary smoothly under quantum gates — yet it does not give free storage, because measurement (next lessons) collapses the qubit to one of two basis outcomes and returns only a single classical bit. The continuum is a resource for computation and interference, not for unbounded readout.",
            "One subtlety completes the picture: a [[global-phase|global phase]] carries no physical meaning. The states $|\\psi\\rangle$ and $e^{i\\gamma}|\\psi\\rangle$ give identical measurement statistics in every basis, so the truly distinct pure states are fewer than the raw four real parameters of $(\\alpha,\\beta)$ suggest. Removing the normalization constraint and the global phase leaves exactly two real parameters — the angles that place the state on the Bloch sphere, the subject of a later lesson.",
        ],
        "history": (
            "The two-state quantum system is as old as quantum mechanics (electron spin, 1925; the ammonia maser two-level system, 1950s), but the word 'qubit' was coined by Benjamin Schumacher in his 1995 paper on quantum coding, crystallizing the idea that a normalized vector in $\\mathbb{C}^2$ is the natural unit of quantum information — the direct generalization of Shannon's classical bit."
        ),
        "math_derivation": (
            "Start from the abstract state $|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$ and impose normalization. Using orthonormality $\\langle 0|0\\rangle = \\langle 1|1\\rangle = 1$ and $\\langle 0|1\\rangle = 0$, "
            "$$\\langle\\psi|\\psi\\rangle = (\\alpha^{*}\\langle 0| + \\beta^{*}\\langle 1|)(\\alpha|0\\rangle + \\beta|1\\rangle) = |\\alpha|^2 + |\\beta|^2 = 1.$$ "
            "Choosing the matrix representation $|0\\rangle = \\binom{1}{0}$, $|1\\rangle = \\binom{0}{1}$ turns the abstract sum into the column vector $|\\psi\\rangle = \\binom{\\alpha}{\\beta}$. "
            "As a worked example take $|+\\rangle = \\tfrac{1}{\\sqrt2}(|0\\rangle + |1\\rangle)$: then $\\alpha = \\beta = 1/\\sqrt2$, so $|\\alpha|^2 + |\\beta|^2 = \\tfrac12 + \\tfrac12 = 1$ (normalized), and the column form is $\\tfrac{1}{\\sqrt2}\\binom{1}{1}$. Likewise $|-\\rangle = \\tfrac{1}{\\sqrt2}\\binom{1}{-1}$, and $\\langle +|-\\rangle = \\tfrac12(1 - 1) = 0$ confirms the X-basis is orthonormal."
        ),
        "key_equations": [
            {"label": "General qubit state", "latex": r"|\psi\rangle = \alpha|0\rangle + \beta|1\rangle"},
            {"label": "Normalization", "latex": r"|\alpha|^{2} + |\beta|^{2} = 1"},
            {"label": "Computational basis", "latex": r"|0\rangle = \begin{pmatrix} 1 \\ 0 \end{pmatrix},\qquad |1\rangle = \begin{pmatrix} 0 \\ 1 \end{pmatrix}"},
            {"label": "X-basis states", "latex": r"|+\rangle = \tfrac{1}{\sqrt{2}}\begin{pmatrix} 1 \\ 1 \end{pmatrix},\qquad |-\rangle = \tfrac{1}{\sqrt{2}}\begin{pmatrix} 1 \\ -1 \end{pmatrix}"},
        ],
        "further_reading": [
            NC["1.2"],
            {"title": "Schumacher, Quantum coding, Phys. Rev. A 51, 2738 (1995)", "url": "https://doi.org/10.1103/PhysRevA.51.2738"},
        ],
        "formulas": [
            {
                "latex": r"|\psi\rangle = \alpha|0\rangle + \beta|1\rangle = \begin{pmatrix} \alpha \\ \beta \end{pmatrix},\qquad |\alpha|^{2} + |\beta|^{2} = 1",
                "description": "A qubit pure state: a normalized superposition of the computational basis, equivalently a unit column vector in C^2.",
                "symbols": {
                    r"|\psi\rangle": "the qubit state vector",
                    r"\alpha": "complex amplitude of |0>",
                    r"\beta": "complex amplitude of |1>",
                    r"|0\rangle, |1\rangle": "computational basis kets",
                },
                "derivation_steps": [
                    "A qubit is a unit vector in $\\mathbb{C}^2$; expand it in the orthonormal basis $\\{|0\\rangle,|1\\rangle\\}$ as $\\alpha|0\\rangle + \\beta|1\\rangle$.",
                    "Unit norm requires $\\langle\\psi|\\psi\\rangle = |\\alpha|^2 + |\\beta|^2 = 1$.",
                    "In the basis representation $|0\\rangle = \\binom{1}{0}$, $|1\\rangle = \\binom{0}{1}$, the state is the column $\\binom{\\alpha}{\\beta}$.",
                    "By the Born rule a computational-basis measurement yields $0$ with probability $|\\alpha|^2$ and $1$ with probability $|\\beta|^2$.",
                ],
            },
        ],
    },
    {
        "slug": "qc-multi-qubit-tensor",
        "related_simulation": "",
        "prerequisites": ["qc-qubit-state-vector", "qc-prereq-linear-algebra"],
        "overview": [
            "Combining quantum systems uses the [[tensor-product|tensor product]] of their Hilbert spaces. Two qubits live in $\\mathbb{C}^2 \\otimes \\mathbb{C}^2 = \\mathbb{C}^4$, and an $n$-qubit register lives in a $2^n$-dimensional [[hilbert-space|Hilbert space]] $(\\mathbb{C}^2)^{\\otimes n}$. Its computational basis is the set of $2^n$ bit-string states $|x_1 x_2 \\cdots x_n\\rangle$ with each $x_k \\in \\{0,1\\}$ — for two qubits, $\\{|00\\rangle, |01\\rangle, |10\\rangle, |11\\rangle\\}$. The exponential dimension is the structural reason a quantum computer's state space dwarfs a classical register of the same width: dimensions multiply under $\\otimes$, they do not add.",
            "To build a joint state from single-qubit states you take the tensor (Kronecker) product of their amplitude vectors. For $|a\\rangle = \\binom{a_0}{a_1}$ and $|b\\rangle = \\binom{b_0}{b_1}$, the product $|a\\rangle\\otimes|b\\rangle$ has the four components $(a_0 b_0,\\, a_0 b_1,\\, a_1 b_0,\\, a_1 b_1)^{\\mathsf T}$ ordered as $|00\\rangle,|01\\rangle,|10\\rangle,|11\\rangle$. Equivalently, expand by bilinearity: $(a_0|0\\rangle + a_1|1\\rangle)\\otimes(b_0|0\\rangle + b_1|1\\rangle) = a_0 b_0|00\\rangle + a_0 b_1|01\\rangle + a_1 b_0|10\\rangle + a_1 b_1|11\\rangle$. A general two-qubit state $\\sum_{x} c_x |x\\rangle$ then has each amplitude $c_x$ read directly off the basis string $x$.",
            "The reverse question — given a joint state, does it come from independent single-qubit states? — defines a [[product-state|product state]]. A two-qubit state $c_{00}|00\\rangle + c_{01}|01\\rangle + c_{10}|10\\rangle + c_{11}|11\\rangle$ factors as $|a\\rangle\\otimes|b\\rangle$ if and only if its amplitudes satisfy $c_{00}c_{11} = c_{01}c_{10}$. When this product condition holds you can solve for the single-qubit amplitudes and report the factorization; when it fails, no factorization exists and the state is entangled — the subject of the Bell-states lesson. This determinant-style test is the practical tool objective o4 asks you to apply.",
            "Two conventions prevent errors. First, ordering: $|a\\rangle\\otimes|b\\rangle$ puts the first qubit in the high-order position, so $|10\\rangle$ means qubit 1 is $1$ and qubit 2 is $0$, matching the binary reading of the index. Second, $\\otimes$ is not commutative as a labelling — $|0\\rangle\\otimes|1\\rangle = |01\\rangle \\ne |10\\rangle = |1\\rangle\\otimes|0\\rangle$ — even though the two factors describe independent subsystems. Keeping the qubit order fixed is essential when you expand, measure, or factor.",
        ],
        "history": (
            "The tensor-product rule for composite systems is one of von Neumann's 1932 postulates, but its computational weight was made explicit by Richard Feynman in 1982, who observed that simulating $n$ interacting quantum particles costs classical resources exponential in $n$ — the $2^n$ amplitudes of this lesson — and proposed using quantum hardware to escape that cost, launching quantum computing."
        ),
        "math_derivation": (
            "Why is the product-state condition $c_{00}c_{11} = c_{01}c_{10}$? Suppose the two-qubit state factors as $(a_0|0\\rangle + a_1|1\\rangle)\\otimes(b_0|0\\rangle + b_1|1\\rangle)$. Matching amplitudes gives "
            "$$c_{00} = a_0 b_0,\\quad c_{01} = a_0 b_1,\\quad c_{10} = a_1 b_0,\\quad c_{11} = a_1 b_1.$$ "
            "Then $c_{00}c_{11} = a_0 b_0 a_1 b_1 = c_{01}c_{10}$, so the condition is necessary. It is also sufficient: if $c_{00}c_{11} = c_{01}c_{10}$ one can solve the four equations for $(a_0,a_1,b_0,b_1)$ up to the irrelevant global phase. "
            "Test it on $|\\Phi^{+}\\rangle = \\tfrac{1}{\\sqrt2}(|00\\rangle + |11\\rangle)$: here $c_{00} = c_{11} = 1/\\sqrt2$ and $c_{01} = c_{10} = 0$, so $c_{00}c_{11} = \\tfrac12 \\ne 0 = c_{01}c_{10}$. The condition fails, so $|\\Phi^{+}\\rangle$ is not a product state — it is entangled."
        ),
        "key_equations": [
            {"label": "n-qubit Hilbert space", "latex": r"(\mathbb{C}^2)^{\otimes n} = \mathbb{C}^{2^{n}}"},
            {"label": "Two-qubit tensor product", "latex": r"|a\rangle\otimes|b\rangle = \begin{pmatrix} a_0 b_0 \\ a_0 b_1 \\ a_1 b_0 \\ a_1 b_1 \end{pmatrix}"},
            {"label": "Computational-basis expansion", "latex": r"|\Psi\rangle = \sum_{x \in \{0,1\}^{n}} c_x\, |x\rangle"},
            {"label": "Product-state condition (2 qubits)", "latex": r"c_{00}\,c_{11} = c_{01}\,c_{10}"},
        ],
        "further_reading": [
            NC["2.2.8"],
            {"title": "Feynman, Simulating physics with computers, Int. J. Theor. Phys. 21, 467 (1982)", "url": "https://doi.org/10.1007/BF02650179"},
        ],
        "formulas": [
            {
                "latex": r"|a\rangle\otimes|b\rangle = (a_0|0\rangle + a_1|1\rangle)\otimes(b_0|0\rangle + b_1|1\rangle) = a_0 b_0|00\rangle + a_0 b_1|01\rangle + a_1 b_0|10\rangle + a_1 b_1|11\rangle",
                "description": "Tensor product of two single-qubit states, expanded in the four-dimensional computational basis.",
                "symbols": {
                    r"|a\rangle, |b\rangle": "single-qubit states of qubit 1 and qubit 2",
                    "a_0, a_1": "amplitudes of qubit 1 in |0>, |1>",
                    "b_0, b_1": "amplitudes of qubit 2 in |0>, |1>",
                    r"\otimes": "tensor (Kronecker) product",
                },
                "derivation_steps": [
                    "Expand the product by bilinearity, distributing each term of $|a\\rangle$ over each term of $|b\\rangle$.",
                    "Write the basis products as bit strings: $|0\\rangle|0\\rangle = |00\\rangle$, $|0\\rangle|1\\rangle = |01\\rangle$, and so on.",
                    "Equivalently stack the Kronecker components $(a_0 b_0, a_0 b_1, a_1 b_0, a_1 b_1)$ as a column in $\\mathbb{C}^4$.",
                ],
            },
            {
                "latex": r"c_{00}\,c_{11} = c_{01}\,c_{10}",
                "description": "Product-state test: a two-qubit state factors into single-qubit states iff its amplitudes satisfy this condition.",
                "symbols": {
                    "c_{00}, c_{01}, c_{10}, c_{11}": "amplitudes of the two-qubit state in the computational basis",
                },
                "derivation_steps": [
                    "If the state factors as $|a\\rangle\\otimes|b\\rangle$ then $c_{ij} = a_i b_j$.",
                    "Hence $c_{00}c_{11} = a_0 b_0 a_1 b_1 = c_{01}c_{10}$: the condition is necessary.",
                    "Conversely the condition lets you solve for $a_i,b_j$, so it is also sufficient; a Bell state violates it and is therefore entangled.",
                ],
            },
        ],
    },
    {
        "slug": "qc-superposition",
        "related_simulation": "superposition",
        "prerequisites": ["qc-qubit-state-vector", "qc-prereq-probability"],
        "overview": [
            "[[superposition|Superposition]] is the principle that any normalized linear combination of basis states is itself a legitimate quantum state. For a qubit, $|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$ with $|\\alpha|^2 + |\\beta|^2 = 1$ is a superposition of $|0\\rangle$ and $|1\\rangle$, and the [[amplitude|amplitudes]] $\\alpha,\\beta$ are read directly off the combination. The canonical example is the equal superposition $|+\\rangle = \\tfrac{1}{\\sqrt2}(|0\\rangle + |1\\rangle)$, produced from $|0\\rangle$ by the Hadamard gate; for a target state given in a specified basis you obtain its amplitudes by projecting, $\\alpha = \\langle 0|\\psi\\rangle$, $\\beta = \\langle 1|\\psi\\rangle$.",
            "Every amplitude is complex, so it carries a magnitude and a phase. Two kinds of phase must be distinguished. A [[global-phase|global phase]] multiplies the whole state, $|\\psi\\rangle \\mapsto e^{i\\gamma}|\\psi\\rangle$; it cancels in every Born probability and is physically unobservable. A [[relative-phase|relative phase]] is the phase difference between amplitudes within the superposition — for instance the $\\varphi$ in $\\tfrac{1}{\\sqrt2}(|0\\rangle + e^{i\\varphi}|1\\rangle)$. Any single-qubit state can be written, up to global phase, as $\\cos\\tfrac{\\theta}{2}|0\\rangle + e^{i\\varphi}\\sin\\tfrac{\\theta}{2}|1\\rangle$, isolating the one physically meaningful (relative) phase. The relative phase is observable: it controls interference and shifts the measurement statistics in any basis other than the one the phase is written in.",
            "This is what separates a coherent superposition from a classical probabilistic mixture. The state $|+\\rangle = \\tfrac{1}{\\sqrt2}(|0\\rangle + |1\\rangle)$ and the state $|-\\rangle = \\tfrac{1}{\\sqrt2}(|0\\rangle - |1\\rangle)$ both give 50/50 outcomes in the computational basis — identical to a classical coin that is $0$ or $1$ with equal probability. Yet $|+\\rangle$ and $|-\\rangle$ differ only by a relative phase, and they are perfectly distinguishable: measured in the $X$-basis $\\{|+\\rangle, |-\\rangle\\}$, $|+\\rangle$ gives outcome $+$ with certainty while $|-\\rangle$ gives $-$ with certainty. The classical mixture, by contrast, gives 50/50 in every basis. Relative phase, invisible in one basis, is decisive in another.",
            "The operational test that distinguishes coherence from mixture is therefore a change of measurement basis. A coherent superposition is described by a single state vector with definite relative phases (a pure state); a classical mixture is an incoherent ensemble described by a diagonal density matrix with no phase information. Measuring in the computational basis cannot tell them apart, but measuring in the $X$- (or $Y$-) basis reveals the interference fringe that only the coherent superposition carries — the single-qubit version of the double-slit which-path lesson.",
        ],
        "history": (
            "Dirac elevated the superposition principle to the first postulate of his 1930 Principles of Quantum Mechanics, stressing that quantum superposition has no classical analogue. Schrödinger's 1935 cat thought experiment dramatized the puzzle of macroscopic superposition, and the modern phase-coherence reading — superposition as the carrier of relative phase and interference — underlies every quantum algorithm."
        ),
        "math_derivation": (
            "Take the two states $|\\pm\\rangle = \\tfrac{1}{\\sqrt2}(|0\\rangle \\pm |1\\rangle)$, which share computational-basis probabilities $|\\langle 0|\\pm\\rangle|^2 = |\\langle 1|\\pm\\rangle|^2 = \\tfrac12$. They differ only by the relative phase between $|0\\rangle$ and $|1\\rangle$ ($+1$ versus $-1$). "
            "Now measure in the $X$-basis. The overlap is "
            "$$\\langle +|-\\rangle = \\tfrac12\\big(\\langle 0| + \\langle 1|\\big)\\big(|0\\rangle - |1\\rangle\\big) = \\tfrac12(1 - 1) = 0,$$ "
            "so $|+\\rangle$ and $|-\\rangle$ are orthogonal and perfectly distinguishable: $P(+\\,|\\,|+\\rangle) = |\\langle +|+\\rangle|^2 = 1$ while $P(+\\,|\\,|-\\rangle) = 0$. "
            "A classical 50/50 mixture of $|0\\rangle$ and $|1\\rangle$ instead gives $P(+) = \\tfrac12\\,|\\langle +|0\\rangle|^2 + \\tfrac12\\,|\\langle +|1\\rangle|^2 = \\tfrac12$, independent of basis. The relative phase, undetectable in the $Z$-basis, becomes a certain outcome in the $X$-basis — the operational signature of coherence."
        ),
        "key_equations": [
            {"label": "Equal superposition", "latex": r"|+\rangle = \tfrac{1}{\sqrt{2}}\big(|0\rangle + |1\rangle\big)"},
            {"label": "Relative-phase form", "latex": r"|\psi\rangle = \cos\tfrac{\theta}{2}\,|0\rangle + e^{i\varphi}\sin\tfrac{\theta}{2}\,|1\rangle"},
            {"label": "Global phase unobservable", "latex": r"e^{i\gamma}|\psi\rangle \equiv |\psi\rangle"},
            {"label": "Amplitudes by projection", "latex": r"\alpha = \langle 0|\psi\rangle,\qquad \beta = \langle 1|\psi\rangle"},
        ],
        "further_reading": [
            NC["1.2"],
            NC["2.2.7"],
        ],
        "formulas": [
            {
                "latex": r"|\psi\rangle = \cos\tfrac{\theta}{2}\,|0\rangle + e^{i\varphi}\sin\tfrac{\theta}{2}\,|1\rangle",
                "description": "Canonical single-qubit superposition: global phase removed, leaving the one observable relative phase phi.",
                "symbols": {
                    r"\theta": "polar angle setting the |0>/|1> amplitude magnitudes",
                    r"\varphi": "relative phase between the |0> and |1> amplitudes",
                    r"e^{i\varphi}": "relative-phase factor (observable)",
                },
                "derivation_steps": [
                    "Write $\\alpha = |\\alpha|e^{i\\gamma_0}$ and $\\beta = |\\beta|e^{i\\gamma_1}$.",
                    "Factor out the global phase $e^{i\\gamma_0}$, which is unobservable; only $\\varphi = \\gamma_1 - \\gamma_0$ survives.",
                    "Parametrize the magnitudes by $|\\alpha| = \\cos\\tfrac{\\theta}{2}$, $|\\beta| = \\sin\\tfrac{\\theta}{2}$ to satisfy normalization, giving the canonical form.",
                ],
            },
            {
                "latex": r"e^{i\gamma}|\psi\rangle \ \equiv\ |\psi\rangle, \qquad \big|\langle i|\,e^{i\gamma}\psi\rangle\big|^{2} = \big|\langle i|\psi\rangle\big|^{2}",
                "description": "A global phase leaves every measurement probability unchanged, so it carries no physical meaning.",
                "symbols": {
                    r"e^{i\gamma}": "global phase factor of unit modulus",
                    r"|\psi\rangle": "qubit state",
                    r"\langle i|\psi\rangle": "amplitude for basis outcome i",
                },
                "derivation_steps": [
                    "Multiplying the whole state by $e^{i\\gamma}$ multiplies every amplitude $\\langle i|\\psi\\rangle$ by the same factor.",
                    "The Born probability $|e^{i\\gamma}\\langle i|\\psi\\rangle|^2 = |e^{i\\gamma}|^2|\\langle i|\\psi\\rangle|^2 = |\\langle i|\\psi\\rangle|^2$ is untouched, in any basis.",
                    "Relative phase differs: it shifts the amplitude of one basis ket relative to another, changing interference and the statistics in a rotated basis.",
                ],
            },
        ],
    },
    {
        "slug": "qc-bloch-sphere",
        "related_simulation": "bloch_sphere",
        "prerequisites": ["qc-qubit-state-vector", "qc-superposition"],
        "overview": [
            "The [[bloch-sphere|Bloch sphere]] is the geometric picture of a single-qubit pure state. Having removed the unobservable global phase, every pure state is written $|\\psi\\rangle = \\cos\\tfrac{\\theta}{2}|0\\rangle + e^{i\\phi}\\sin\\tfrac{\\theta}{2}|1\\rangle$ with the polar angle $\\theta \\in [0,\\pi]$ and the azimuthal angle $\\phi \\in [0, 2\\pi)$. These two real parameters place the state on the surface of a unit sphere, so the continuum of single-qubit states is exactly the points of a sphere — the visual that makes superposition and phase tangible.",
            "The Bloch (Cartesian) vector $\\hat n = (x,y,z)$ of a state is $x = \\sin\\theta\\cos\\phi$, $y = \\sin\\theta\\sin\\phi$, $z = \\cos\\theta$, equal to the expectation values of the Pauli operators, $(\\langle\\sigma_x\\rangle, \\langle\\sigma_y\\rangle, \\langle\\sigma_z\\rangle)$. The mapping is invertible: $\\theta = \\arccos z$ and $\\phi = \\operatorname{atan2}(y,x)$ recover the angles from the vector, and the angles rebuild the state. Computing a state's $(\\theta,\\phi)$ and $(x,y,z)$, and going back, is the core skill objective o2 asks for.",
            "The six cardinal states sit at the axis intersections. $|0\\rangle$ is the north pole $(\\theta=0,\\ +z)$ and $|1\\rangle$ the south pole $(\\theta=\\pi,\\ -z)$; the equator carries the equal superpositions, with $|+\\rangle$ at $+x$ $(\\theta=\\tfrac{\\pi}{2},\\phi=0)$, $|-\\rangle$ at $-x$ $(\\phi=\\pi)$, $|{+}i\\rangle = \\tfrac{1}{\\sqrt2}(|0\\rangle + i|1\\rangle)$ at $+y$ $(\\phi=\\tfrac{\\pi}{2})$, and $|{-}i\\rangle$ at $-y$ $(\\phi=\\tfrac{3\\pi}{2})$. Quantum gates act as rotations of this sphere, which is why the picture is the working diagram of single-qubit logic.",
            "The geometry encodes physics. Two states are orthogonal in $\\mathbb{C}^2$ exactly when their Bloch vectors are antipodal (point in opposite directions): $|0\\rangle$ and $|1\\rangle$, $|+\\rangle$ and $|-\\rangle$, $|{+}i\\rangle$ and $|{-}i\\rangle$ are the antipodal pairs. The precise link is $|\\langle\\psi|\\psi'\\rangle|^2 = \\cos^2(\\Theta/2)$, where $\\Theta$ is the angle between the two Bloch vectors — so the Hilbert-space angle is half the Bloch-sphere angle. Orthogonality $\\langle\\psi|\\psi'\\rangle = 0$ thus corresponds to $\\Theta = \\pi$, the antipode. This factor-of-two between the $\\mathbb{C}^2$ overlap and the geometric angle is the defining feature of the Bloch representation.",
        ],
        "history": (
            "Felix Bloch introduced the vector that bears his name in his 1946 paper on nuclear induction, describing the magnetization of a spin ensemble; the sphere is its single-spin, pure-state specialization. Henri Poincaré had used the same mathematical sphere decades earlier for the polarization of light (the Poincaré sphere), the optical twin of the qubit Bloch sphere."
        ),
        "math_derivation": (
            "Why does orthogonality mean antipodal? Take $|\\psi\\rangle$ with Bloch angles $(\\theta,\\phi)$ and a second state $|\\psi'\\rangle$ with angles $(\\theta',\\phi')$. A direct computation of the overlap gives "
            "$$|\\langle\\psi|\\psi'\\rangle|^2 = \\cos^2\\!\\frac{\\Theta}{2}, \\qquad \\cos\\Theta = \\hat n \\cdot \\hat n',$$ "
            "where $\\Theta$ is the angle between the Bloch vectors $\\hat n,\\hat n'$. "
            "Orthogonality requires $|\\langle\\psi|\\psi'\\rangle|^2 = 0$, i.e. $\\cos^2(\\Theta/2) = 0$, i.e. $\\Theta = \\pi$ — the vectors are antipodal. "
            "Check the simplest case directly: $|0\\rangle$ sits at $+z$ and $|1\\rangle$ at $-z$, which are antipodal, and indeed $\\langle 0|1\\rangle = 0$. The same holds for $|\\pm\\rangle$ ($\\pm x$) and $|{\\pm}i\\rangle$ ($\\pm y$). The factor $\\tfrac{\\Theta}{2}$ is exactly the $\\tfrac{\\theta}{2}$ appearing in the state parametrization."
        ),
        "key_equations": [
            {"label": "Bloch parametrization", "latex": r"|\psi\rangle = \cos\tfrac{\theta}{2}\,|0\rangle + e^{i\phi}\sin\tfrac{\theta}{2}\,|1\rangle"},
            {"label": "Bloch vector", "latex": r"(x,y,z) = (\sin\theta\cos\phi,\ \sin\theta\sin\phi,\ \cos\theta)"},
            {"label": "Inverse mapping", "latex": r"\theta = \arccos z,\qquad \phi = \operatorname{atan2}(y,x)"},
            {"label": "Overlap vs Bloch angle", "latex": r"|\langle\psi|\psi'\rangle|^{2} = \cos^{2}\!\tfrac{\Theta}{2},\qquad \cos\Theta = \hat n \cdot \hat n'"},
        ],
        "further_reading": [
            NC["1.2"],
            {"title": "Bloch, Nuclear induction, Phys. Rev. 70, 460 (1946)", "url": "https://doi.org/10.1103/PhysRev.70.460"},
        ],
        "formulas": [
            {
                "latex": r"|\psi\rangle = \cos\tfrac{\theta}{2}\,|0\rangle + e^{i\phi}\sin\tfrac{\theta}{2}\,|1\rangle,\qquad \theta \in [0,\pi],\ \phi \in [0,2\pi)",
                "description": "Bloch-sphere parametrization of a single-qubit pure state by two angles.",
                "symbols": {
                    r"\theta": "polar angle from the +z (|0>) axis, in [0, pi]",
                    r"\phi": "azimuthal angle in the x-y plane, in [0, 2pi)",
                    r"|\psi\rangle": "single-qubit pure state",
                },
                "derivation_steps": [
                    "Start from $\\alpha|0\\rangle + \\beta|1\\rangle$ and discard the global phase, making $\\alpha$ real and non-negative.",
                    "Normalization $|\\alpha|^2 + |\\beta|^2 = 1$ lets us set $\\alpha = \\cos\\tfrac{\\theta}{2}$, $|\\beta| = \\sin\\tfrac{\\theta}{2}$.",
                    "The remaining freedom is the relative phase $\\phi$ on $\\beta$, giving $e^{i\\phi}\\sin\\tfrac{\\theta}{2}$; $\\theta$ ranges over $[0,\\pi]$ so the half-angle covers $[0,\\tfrac{\\pi}{2}]$ and every amplitude pair once.",
                ],
            },
            {
                "latex": r"(x,y,z) = (\sin\theta\cos\phi,\ \sin\theta\sin\phi,\ \cos\theta) = (\langle\sigma_x\rangle, \langle\sigma_y\rangle, \langle\sigma_z\rangle)",
                "description": "Cartesian Bloch vector: its components are the Pauli expectation values of the state.",
                "symbols": {
                    "(x,y,z)": "Cartesian coordinates of the Bloch vector on the unit sphere",
                    r"\langle\sigma_x\rangle, \langle\sigma_y\rangle, \langle\sigma_z\rangle": "expectation values of the Pauli operators",
                },
                "derivation_steps": [
                    "Compute $\\langle\\sigma_z\\rangle = |\\alpha|^2 - |\\beta|^2 = \\cos^2\\tfrac{\\theta}{2} - \\sin^2\\tfrac{\\theta}{2} = \\cos\\theta = z$.",
                    "Compute $\\langle\\sigma_x\\rangle = 2\\,\\mathrm{Re}(\\alpha^{*}\\beta) = \\sin\\theta\\cos\\phi = x$ and $\\langle\\sigma_y\\rangle = 2\\,\\mathrm{Im}(\\alpha^{*}\\beta) = \\sin\\theta\\sin\\phi = y$.",
                    "Invert with $\\theta = \\arccos z$ and $\\phi = \\operatorname{atan2}(y,x)$; orthogonal states have antipodal vectors ($\\Theta=\\pi$).",
                ],
            },
        ],
    },
    {
        "slug": "qc-measurement-born-rule",
        "related_simulation": "born_rule",
        "prerequisites": ["qc-superposition", "qc-prereq-probability"],
        "overview": [
            "Measurement is the bridge from the complex amplitudes of a quantum state to the classical statistics you actually record. The [[born-rule|Born rule]] states that a [[projective-measurement|projective measurement]] of $|\\psi\\rangle$ in an orthonormal basis $\\{|i\\rangle\\}$ yields outcome $i$ with probability $P(i) = |\\langle i|\\psi\\rangle|^2$, the squared modulus of the amplitude on $|i\\rangle$. For a qubit $|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$ measured in the computational basis, $P(0) = |\\alpha|^2$ and $P(1) = |\\beta|^2$; normalization $|\\alpha|^2 + |\\beta|^2 = 1$ guarantees these are a valid probability distribution.",
            "The measurement basis is a choice, and it changes the statistics. To measure in an arbitrary orthonormal basis $\\{|u_0\\rangle, |u_1\\rangle\\}$ you compute the overlaps with that basis: $P(u_k) = |\\langle u_k|\\psi\\rangle|^2$. The state $|0\\rangle$ is certain ($P=1$) in the computational basis but gives 50/50 in the $X$-basis $\\{|+\\rangle,|-\\rangle\\}$, because $|\\langle +|0\\rangle|^2 = \\tfrac12$. The same state therefore produces different outcome statistics depending on what you choose to measure — there is no single pre-existing list of values the qubit 'has'.",
            "Projective measurement does more than sample: it updates the state. On obtaining outcome $i$ the state undergoes [[wavefunction-collapse|collapse]] to the corresponding eigenstate, renormalized — for a non-degenerate outcome simply $|\\psi\\rangle \\mapsto |i\\rangle$. Immediately re-measuring in the same basis then returns $i$ with certainty. This collapse is the irreversible, probabilistic process that contrasts sharply with the deterministic, reversible [[unitary|unitary]] evolution between measurements: a unitary $U$ can always be undone by $U^{\\dagger}$, but collapse discards the amplitudes that were not selected and cannot be inverted.",
            "Beyond individual outcomes, the [[expectation-value|expectation value]] of an [[observable|observable]] $\\hat A$ — a [[hermitian|Hermitian]] operator with eigenvalues $a_i$ — is $\\langle\\hat A\\rangle = \\langle\\psi|\\hat A|\\psi\\rangle = \\sum_i a_i P(a_i)$, the Born-weighted average of its eigenvalues. This recovers the classical mean of the prerequisites lesson, now with probabilities supplied by squared amplitudes. Computing $\\langle\\psi|\\hat A|\\psi\\rangle$ for a given state and observable (objective o4) is the standard way experiments report a qubit's measured value, for instance $\\langle\\sigma_z\\rangle = P(0) - P(1)$.",
        ],
        "history": (
            "Max Born proposed the probabilistic interpretation of the wavefunction in 1926 — initially in a footnote correcting $|\\psi|$ to $|\\psi|^2$ — and received the 1954 Nobel Prize for it. John von Neumann formalized projective measurement and state collapse as a distinct postulate ('process 1') in his 1932 axiomatization, separating it from the unitary 'process 2' of Schrödinger evolution."
        ),
        "math_derivation": (
            "Expand the state in the measurement basis and apply the rule. For $|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$, the computational-basis probabilities are $P(0) = |\\langle 0|\\psi\\rangle|^2 = |\\alpha|^2$ and $P(1) = |\\beta|^2$, summing to $1$. "
            "To measure in the $X$-basis, project onto $|\\pm\\rangle$: $\\langle +|\\psi\\rangle = \\tfrac{1}{\\sqrt2}(\\alpha + \\beta)$, so $P(+) = \\tfrac12|\\alpha + \\beta|^2$, and similarly $P(-) = \\tfrac12|\\alpha - \\beta|^2$. The cross term $2\\,\\mathrm{Re}(\\alpha^{*}\\beta)$ — the relative-phase interference — distinguishes these from the $Z$-basis statistics. "
            "The expectation value follows from the spectral form $\\hat A = \\sum_i a_i|a_i\\rangle\\langle a_i|$: "
            "$$\\langle\\psi|\\hat A|\\psi\\rangle = \\sum_i a_i \\langle\\psi|a_i\\rangle\\langle a_i|\\psi\\rangle = \\sum_i a_i |\\langle a_i|\\psi\\rangle|^2 = \\sum_i a_i P(a_i).$$ "
            "For $\\hat A = \\sigma_z$ with eigenvalues $\\pm 1$ this is $\\langle\\sigma_z\\rangle = (+1)|\\alpha|^2 + (-1)|\\beta|^2 = P(0) - P(1)$."
        ),
        "key_equations": [
            {"label": "Born rule", "latex": r"P(i) = |\langle i|\psi\rangle|^{2}"},
            {"label": "Post-measurement collapse", "latex": r"|\psi\rangle \xrightarrow{\text{outcome } i} \frac{\hat P_i|\psi\rangle}{\sqrt{\langle\psi|\hat P_i|\psi\rangle}}"},
            {"label": "Expectation value", "latex": r"\langle\hat A\rangle = \langle\psi|\hat A|\psi\rangle = \sum_i a_i\, P(a_i)"},
            {"label": "Qubit Z-expectation", "latex": r"\langle\sigma_z\rangle = P(0) - P(1)"},
        ],
        "further_reading": [
            NC["2.2.3"],
            NC["2.2.5"],
            {"title": "Born, Zur Quantenmechanik der Stoßvorgänge, Z. Phys. 37, 863 (1926)", "url": "https://doi.org/10.1007/BF01397477"},
        ],
        "formulas": [
            {
                "latex": r"P(i) = |\langle i|\psi\rangle|^{2}",
                "description": "Born rule: the probability of projective-measurement outcome i is the squared overlap of the state with |i>.",
                "symbols": {
                    "P(i)": "probability of obtaining outcome i",
                    r"|i\rangle": "i-th basis state of the measurement basis",
                    r"\langle i|\psi\rangle": "amplitude of the state on |i>",
                },
                "derivation_steps": [
                    "Expand $|\\psi\\rangle = \\sum_i \\langle i|\\psi\\rangle\\,|i\\rangle$ in the measurement's orthonormal basis.",
                    "Born's postulate assigns probability $P(i) = |\\langle i|\\psi\\rangle|^2$ to outcome $i$.",
                    "Normalization $\\sum_i |\\langle i|\\psi\\rangle|^2 = \\langle\\psi|\\psi\\rangle = 1$ makes these a valid distribution; the same state in a different basis gives different $P(i)$.",
                ],
            },
            {
                "latex": r"\langle\hat A\rangle = \langle\psi|\hat A|\psi\rangle = \sum_i a_i\, P(a_i)",
                "description": "Expectation value of a Hermitian observable: the Born-weighted average of its eigenvalues.",
                "symbols": {
                    r"\hat A": "Hermitian observable operator",
                    "a_i": "eigenvalue (possible measured value) of A",
                    "P(a_i)": "Born probability of outcome a_i",
                    r"\langle\psi|\hat A|\psi\rangle": "expectation value in state |psi>",
                },
                "derivation_steps": [
                    "Use the spectral decomposition $\\hat A = \\sum_i a_i|a_i\\rangle\\langle a_i|$.",
                    "Sandwich: $\\langle\\psi|\\hat A|\\psi\\rangle = \\sum_i a_i\\,\\langle\\psi|a_i\\rangle\\langle a_i|\\psi\\rangle = \\sum_i a_i|\\langle a_i|\\psi\\rangle|^2$.",
                    "Recognize $|\\langle a_i|\\psi\\rangle|^2 = P(a_i)$, so the expectation is $\\sum_i a_i P(a_i)$ — the classical mean over Born probabilities.",
                ],
            },
        ],
    },
    {
        "slug": "qc-no-cloning",
        "related_simulation": "",
        "prerequisites": ["qc-superposition", "qc-multi-qubit-tensor"],
        "overview": [
            "The [[no-cloning|no-cloning theorem]] states that there is no [[unitary|unitary]] operation that copies an arbitrary unknown quantum state onto a blank register. Concretely, no fixed $U$ can satisfy $U(|\\psi\\rangle\\otimes|0\\rangle) = |\\psi\\rangle\\otimes|\\psi\\rangle$ for every input $|\\psi\\rangle$. Classical information can be copied freely; quantum information cannot. This single constraint shapes quantum computing and communication — it forbids deterministic amplification of an unknown qubit, blocks a naive route around the uncertainty principle, and is precisely what makes quantum key distribution secure against eavesdropping.",
            "There are two clean proofs, and objective o2 asks you to reproduce one. The linearity proof: suppose $U$ clones both $|0\\rangle$ and $|1\\rangle$, so $U|0\\rangle|0\\rangle = |0\\rangle|0\\rangle$ and $U|1\\rangle|0\\rangle = |1\\rangle|1\\rangle$. By linearity, acting on the [[superposition|superposition]] $|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$ gives $U|\\psi\\rangle|0\\rangle = \\alpha|0\\rangle|0\\rangle + \\beta|1\\rangle|1\\rangle$. But genuine cloning would require $|\\psi\\rangle|\\psi\\rangle = \\alpha^2|00\\rangle + \\alpha\\beta|01\\rangle + \\alpha\\beta|10\\rangle + \\beta^2|11\\rangle$. These disagree unless $\\alpha\\beta = 0$, i.e. unless the input was a basis state. A linear map simply cannot produce the nonlinear $|\\psi\\rangle|\\psi\\rangle$.",
            "The inner-product proof is sharper and explains exactly which states are copyable. Suppose a cloner exists for two states $|\\psi\\rangle$ and $|\\phi\\rangle$. Since $U$ is unitary it preserves inner products: comparing $\\langle\\psi|\\phi\\rangle\\langle 0|0\\rangle$ before and $\\langle\\psi|\\phi\\rangle^2$ after cloning forces $\\langle\\psi|\\phi\\rangle = \\langle\\psi|\\phi\\rangle^2$. The only solutions are $\\langle\\psi|\\phi\\rangle = 0$ or $\\langle\\psi|\\phi\\rangle = 1$ — the states are either orthogonal or identical. Hence a fixed set of mutually [[orthonormal-basis|orthogonal]] states can be copied (a measurement in that basis followed by re-preparation does it), but any two non-orthogonal states cannot both be cloned by the same device.",
            "This dissolves apparent paradoxes. Several proposed schemes seem to copy a qubit: amplifying it, measuring it and re-preparing, or using entanglement plus a classical channel (teleportation). Each respects no-cloning on inspection. Measurement returns one bit and collapses the superposition, so it cannot reconstruct an unknown $|\\psi\\rangle$. Stimulated emission amplifies but adds noise exactly sufficient to forbid perfect copies. Teleportation moves a state but destroys the original, so no second copy exists. The diagnostic skill (objective o4) is to locate the step where a candidate scheme either invokes a nonlinear/non-unitary operation or quietly assumes the input is drawn from a known orthogonal set.",
        ],
        "history": (
            "The no-cloning theorem was published in 1982 by William Wootters and Wojciech Zurek in Nature, and independently by Dennis Dieks in Physics Letters A the same year, prompted by Nick Herbert's FLASH proposal to use cloning for faster-than-light signalling. James Park had noted the essential argument as early as 1970. The theorem became a cornerstone of quantum information, underpinning the security of the BB84 key-distribution protocol."
        ),
        "math_derivation": (
            "Inner-product proof. Assume a unitary $U$ and a fixed blank $|0\\rangle$ clone two states: "
            "$$U|\\psi\\rangle|0\\rangle = |\\psi\\rangle|\\psi\\rangle, \\qquad U|\\phi\\rangle|0\\rangle = |\\phi\\rangle|\\phi\\rangle.$$ "
            "Take the inner product of the two left-hand sides. Because $U$ is unitary it preserves inner products, and $\\langle 0|0\\rangle = 1$, so the left side equals "
            "$$\\langle\\psi|\\phi\\rangle\\,\\langle 0|0\\rangle = \\langle\\psi|\\phi\\rangle.$$ "
            "The inner product of the two right-hand sides is "
            "$$\\langle\\psi|\\phi\\rangle\\,\\langle\\psi|\\phi\\rangle = \\langle\\psi|\\phi\\rangle^2.$$ "
            "Equating, $\\langle\\psi|\\phi\\rangle = \\langle\\psi|\\phi\\rangle^2$, whose only solutions are $\\langle\\psi|\\phi\\rangle \\in \\{0, 1\\}$. So a common cloner exists only for orthogonal ($0$) or identical ($1$) states; an arbitrary unknown qubit, generally non-orthogonal to the others, cannot be cloned. Equivalently the linearity argument shows $U|\\psi\\rangle|0\\rangle = \\alpha|00\\rangle + \\beta|11\\rangle \\ne |\\psi\\rangle|\\psi\\rangle$ unless $\\alpha\\beta = 0$."
        ),
        "key_equations": [
            {"label": "Cloning requirement", "latex": r"U\big(|\psi\rangle \otimes |0\rangle\big) = |\psi\rangle \otimes |\psi\rangle \quad \forall\, |\psi\rangle"},
            {"label": "Linearity obstruction", "latex": r"U\big(|\psi\rangle|0\rangle\big) = \alpha|00\rangle + \beta|11\rangle \ne |\psi\rangle|\psi\rangle"},
            {"label": "Inner-product condition", "latex": r"\langle\psi|\phi\rangle = \langle\psi|\phi\rangle^{2} \implies \langle\psi|\phi\rangle \in \{0, 1\}"},
        ],
        "further_reading": [
            NC["no-cloning"],
            {"title": "Wootters & Zurek, A single quantum cannot be cloned, Nature 299, 802 (1982)", "url": "https://doi.org/10.1038/299802a0"},
            {"title": "Dieks, Communication by EPR devices, Phys. Lett. A 92, 271 (1982)", "url": "https://doi.org/10.1016/0375-9601(82)90084-6"},
        ],
        "formulas": [
            {
                "latex": r"\langle\psi|\phi\rangle = \langle\psi|\phi\rangle^{2} \ \implies\ \langle\psi|\phi\rangle \in \{0, 1\}",
                "description": "Inner-product no-cloning condition: a common cloner can exist only for orthogonal or identical states.",
                "symbols": {
                    r"\langle\psi|\phi\rangle": "inner product (overlap) of the two states to be cloned",
                    r"|\psi\rangle, |\phi\rangle": "the two candidate input states",
                },
                "derivation_steps": [
                    "Assume $U|\\psi\\rangle|0\\rangle = |\\psi\\rangle|\\psi\\rangle$ and $U|\\phi\\rangle|0\\rangle = |\\phi\\rangle|\\phi\\rangle$ for a single unitary $U$.",
                    "Unitaries preserve inner products: the overlap of the inputs equals the overlap of the outputs.",
                    "Inputs give $\\langle\\psi|\\phi\\rangle\\langle 0|0\\rangle = \\langle\\psi|\\phi\\rangle$; outputs give $\\langle\\psi|\\phi\\rangle^2$.",
                    "Setting them equal forces $\\langle\\psi|\\phi\\rangle \\in \\{0,1\\}$ — orthogonal or identical, never an arbitrary non-orthogonal pair.",
                ],
            },
            {
                "latex": r"U\big(\alpha|0\rangle + \beta|1\rangle\big)|0\rangle = \alpha|00\rangle + \beta|11\rangle \ne (\alpha|0\rangle+\beta|1\rangle)\otimes(\alpha|0\rangle+\beta|1\rangle)",
                "description": "Linearity obstruction: a linear map produces alpha|00>+beta|11>, not the nonlinear product state cloning demands.",
                "symbols": {
                    "U": "hypothetical cloning unitary",
                    r"\alpha, \beta": "amplitudes of the unknown input state",
                },
                "derivation_steps": [
                    "Fix $U$ by its action on the basis: $U|0\\rangle|0\\rangle = |00\\rangle$, $U|1\\rangle|0\\rangle = |11\\rangle$.",
                    "Linearity forces $U(\\alpha|0\\rangle + \\beta|1\\rangle)|0\\rangle = \\alpha|00\\rangle + \\beta|11\\rangle$.",
                    "True cloning needs $\\alpha^2|00\\rangle + \\alpha\\beta|01\\rangle + \\alpha\\beta|10\\rangle + \\beta^2|11\\rangle$; the two agree only when $\\alpha\\beta = 0$ (a basis state).",
                ],
            },
        ],
    },
    {
        "slug": "qc-entanglement-bell-states",
        "related_simulation": "bell_state",
        "prerequisites": ["qc-multi-qubit-tensor", "qc-measurement-born-rule"],
        "overview": [
            "[[entanglement|Entanglement]] is the defining quantum correlation: a joint state of two or more subsystems that cannot be written as a [[tensor-product|tensor product]] of single-subsystem states. A two-qubit state is a [[product-state|product state]] if $|\\Psi\\rangle = |a\\rangle\\otimes|b\\rangle$ for some single-qubit $|a\\rangle,|b\\rangle$; if no such factorization exists, the state is entangled. Entanglement is not a stronger version of classical correlation — it produces measurement statistics that no shared classical variable can reproduce, the content of Bell's theorem.",
            "The maximally entangled two-qubit states are the four [[bell-state|Bell states]]: $|\\Phi^{\\pm}\\rangle = \\tfrac{1}{\\sqrt2}(|00\\rangle \\pm |11\\rangle)$ and $|\\Psi^{\\pm}\\rangle = \\tfrac{1}{\\sqrt2}(|01\\rangle \\pm |10\\rangle)$. They form an orthonormal basis of $\\mathbb{C}^4$ — each is normalized and any two are orthogonal, as you verify by taking inner products (e.g. $\\langle\\Phi^{+}|\\Phi^{-}\\rangle = \\tfrac12(1 - 1) = 0$). The Bell basis is the natural readout basis for entanglement-based protocols such as superdense coding and teleportation.",
            "That a Bell state is entangled is proved by the product-state test from the tensor lesson. For $|\\Phi^{+}\\rangle$ the amplitudes are $c_{00} = c_{11} = 1/\\sqrt2$, $c_{01} = c_{10} = 0$, so $c_{00}c_{11} = \\tfrac12 \\ne 0 = c_{01}c_{10}$: the factorization condition fails, hence no $\\alpha|a\\rangle\\otimes|b\\rangle$ reproduces it. Operationally, measuring both qubits of $|\\Phi^{+}\\rangle$ in the computational basis gives outcomes $00$ and $11$ each with probability $\\tfrac12$ and never $01$ or $10$ — perfect correlation. Yet each qubit alone is maximally random: the local marginal is $P(0) = P(1) = \\tfrac12$ for either qubit, independent of the other. The correlation lives in the joint state, not in either part.",
            "This combination — perfect joint correlation, completely random local marginals — is exactly why measuring one half of an entangled pair sends no signal to the other (objective o5). The claim that 'measuring my qubit instantly changes what the distant party sees' fails at the marginal: the distant party's local statistics are $\\tfrac12/\\tfrac12$ whether or not, and in whatever basis, you measure. Only by comparing both records over a classical channel does the correlation become visible. This is the [[no-signaling|no-signaling]] principle, and it is why entanglement does not permit faster-than-light communication despite the instantaneous correlation, regardless of how far apart the qubits are.",
        ],
        "history": (
            "Einstein, Podolsky, and Rosen used a perfectly correlated two-particle state in 1935 to argue quantum mechanics was incomplete; Schrödinger named the phenomenon 'entanglement' (Verschränkung) the same year. John Bell turned the debate into experiment in 1964, deriving an inequality that local hidden-variable theories must obey but entangled states violate. Aspect's 1982 experiments and the loophole-free tests of 2015 confirmed the violation, recognized by the 2022 Nobel Prize to Aspect, Clauser, and Zeilinger."
        ),
        "math_derivation": (
            "Take $|\\Phi^{+}\\rangle = \\tfrac{1}{\\sqrt2}(|00\\rangle + |11\\rangle)$ and measure both qubits in the computational basis. The joint Born probabilities are "
            "$$P(00) = |\\langle 00|\\Phi^{+}\\rangle|^2 = \\tfrac12,\\quad P(11) = \\tfrac12,\\quad P(01) = P(10) = 0,$$ "
            "so the outcomes are always equal — perfectly correlated. Now compute qubit 1's local marginal by summing over qubit 2: "
            "$$P_1(0) = P(00) + P(01) = \\tfrac12, \\qquad P_1(1) = P(10) + P(11) = \\tfrac12.$$ "
            "The marginal is uniform and identical whether or not qubit 2 is measured, and a short calculation shows it stays $\\tfrac12/\\tfrac12$ in any measurement basis (the reduced density operator of either qubit is $\\tfrac12 I$). "
            "Hence no choice of measurement on one side alters the other side's local statistics: the joint table is correlated, but the marginals carry no message — the no-signaling theorem. The correlation only appears when the two outcome records are brought together and compared."
        ),
        "key_equations": [
            {"label": "Entangled (non-product) state", "latex": r"|\Psi\rangle \ne |a\rangle \otimes |b\rangle \quad \text{for any } |a\rangle, |b\rangle"},
            {"label": "Bell states", "latex": r"|\Phi^{\pm}\rangle = \tfrac{1}{\sqrt{2}}\big(|00\rangle \pm |11\rangle\big),\qquad |\Psi^{\pm}\rangle = \tfrac{1}{\sqrt{2}}\big(|01\rangle \pm |10\rangle\big)"},
            {"label": "Perfect correlation", "latex": r"P(00) = P(11) = \tfrac{1}{2},\qquad P(01) = P(10) = 0"},
            {"label": "Local marginal (no-signaling)", "latex": r"P_1(0) = P_1(1) = \tfrac{1}{2}"},
        ],
        "further_reading": [
            NC["1.3.6"],
            NC["2.2.8"],
            NC["2.4.3"],
            {"title": "Bell, On the Einstein Podolsky Rosen paradox, Physics 1, 195 (1964)", "url": "https://doi.org/10.1103/PhysicsPhysiqueFizika.1.195"},
            {"title": "Einstein, Podolsky & Rosen, Can quantum-mechanical description of physical reality be considered complete?, Phys. Rev. 47, 777 (1935)", "url": "https://doi.org/10.1103/PhysRev.47.777"},
        ],
        "formulas": [
            {
                "latex": r"|\Phi^{\pm}\rangle = \tfrac{1}{\sqrt{2}}\big(|00\rangle \pm |11\rangle\big),\qquad |\Psi^{\pm}\rangle = \tfrac{1}{\sqrt{2}}\big(|01\rangle \pm |10\rangle\big)",
                "description": "The four Bell states: a maximally entangled orthonormal basis of the two-qubit space.",
                "symbols": {
                    r"|\Phi^{\pm}\rangle": "Bell states with correlated bits (00, 11)",
                    r"|\Psi^{\pm}\rangle": "Bell states with anti-correlated bits (01, 10)",
                },
                "derivation_steps": [
                    "Each state is normalized: the two amplitudes $1/\\sqrt2$ give $|1/\\sqrt2|^2 + |1/\\sqrt2|^2 = 1$.",
                    "Any two are orthogonal, e.g. $\\langle\\Phi^{+}|\\Phi^{-}\\rangle = \\tfrac12(1-1) = 0$ and $\\langle\\Phi^{+}|\\Psi^{+}\\rangle = 0$ (no shared basis kets).",
                    "Applying the product-state test, $c_{00}c_{11} \\ne c_{01}c_{10}$ for each, so all four are entangled.",
                ],
            },
            {
                "latex": r"P(00) = P(11) = \tfrac{1}{2},\quad P(01)=P(10)=0; \qquad P_1(0) = P_1(1) = \tfrac{1}{2}",
                "description": "Measuring |Phi+> in the computational basis: perfectly correlated joint outcomes, but uniform random local marginals (no-signaling).",
                "symbols": {
                    "P(00), P(11)": "joint probabilities of correlated outcomes",
                    "P(01), P(10)": "joint probabilities of anti-correlated outcomes (zero)",
                    "P_1(0), P_1(1)": "local marginal probabilities for qubit 1",
                },
                "derivation_steps": [
                    "Apply the Born rule to $|\\Phi^{+}\\rangle$: only $|00\\rangle$ and $|11\\rangle$ have nonzero amplitude $1/\\sqrt2$, so $P(00)=P(11)=\\tfrac12$.",
                    "Sum over qubit 2 to get qubit 1's marginal: $P_1(0) = P(00)+P(01) = \\tfrac12$, $P_1(1) = \\tfrac12$.",
                    "The marginal is uniform in every basis (reduced state $\\tfrac12 I$), so a local measurement reveals nothing about, and signals nothing to, the other qubit.",
                ],
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Populate the Quantum Computing track Modules 0-1 (branches, lesson concepts, full content)."

    @transaction.atomic
    def handle(self, *args, **options):
        # 1. Categories — ordered after the existing 8 physics branches.
        self.stdout.write(self.style.MIGRATE_HEADING("Ensuring QC category branches"))
        branches = {}
        for slug, name, desc, color, order in BRANCHES:
            branches[slug], _ = Category.objects.update_or_create(
                slug=slug,
                defaults={"name": name, "description": desc, "color": color, "order": order},
            )
            self.stdout.write(f"  ✓ {slug}")

        # 2. Concept rows (title/category/difficulty/order/summary). Content fields
        #    (history, related_simulation, prerequisites, formulas) are filled by
        #    _content.run below; this just guarantees the rows exist so apply_topic
        #    can fetch them.
        self.stdout.write(self.style.MIGRATE_HEADING("Seeding QC lesson concepts"))
        for slug, title, cat_slug, difficulty, order, summary in CONCEPTS:
            Concept.objects.update_or_create(
                slug=slug,
                defaults={
                    "title": title,
                    "category": branches[cat_slug],
                    "difficulty": difficulty,
                    "order": order,
                    "summary": summary,
                    "is_published": True,
                },
            )
            self.stdout.write(f"  ✓ {slug}")

        # 3. Full content + formulas + prerequisite edges.
        run(self, TOPICS, "Quantum Computing Modules 0-1")

        # 4. Refresh the FTS vectors so the new lessons are searchable / RAG-visible.
        for slug, *_ in CONCEPTS:
            Concept.objects.get(slug=slug).update_search_vector()
        self.stdout.write(self.style.SUCCESS("Refreshed search vectors for QC lessons."))

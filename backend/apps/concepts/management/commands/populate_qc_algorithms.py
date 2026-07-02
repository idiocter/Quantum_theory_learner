"""Populate the Quantum Computing track, Phase 2 (Modules 2-3).

Creates the two QC Category branches `qc-gates-circuits` (order 11) and
`qc-algorithms` (order 12) after the Phase-1 branches, seeds the 10 lesson
Concept rows from `docs/quantum-computing/prerequisites.json`, and authors their
full content (overview, history, structured formulas with symbol legends +
derivation steps, key equations, citations, prerequisite edges) via the shared
`_content.run` contract.

Idempotent: branches/concepts via `update_or_create` (matched by slug); content
via `_content.apply_topic`. Re-running updates rows in place and never
duplicates. Run standalone — it seeds its own Concept rows before filling
content, so it does not depend on `seed_concepts` for the qc- slugs. Prerequisite
edges to Phase-1 slugs (e.g. qc-bloch-sphere) resolve only if Phase 1 has been
populated first; `apply_topic` warns on any unknown prereq rather than failing.

LaTeX: `Formula.latex` and `key_equations[].latex` are BARE expressions (no `$`,
rendered by `Tex`); prose / `derivation_steps` use `$...$` / `$$...$$` (rendered
by `TexProse`). Glossary first-use terms are marked `[[term-slug]]` in prose
only, never inside math.

physics-accuracy-reviewer: every line tagged `# VERIFY:` flags a citation detail
(an exact Nielsen & Chuang section/appendix number) I could not fully confirm
from memory. The physics in the prose/formulas is asserted as correct.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.concepts.models import Category, Concept
from ._content import run

# ── Category branches (Module -> Category). Ordered after the Phase-1 branches. ──
# (slug, name, description, color, order)
BRANCHES = [
    (
        "qc-gates-circuits",
        "QC: Quantum Gates & Circuits",
        "The unitary gate model: single-qubit Pauli/Hadamard/phase gates and "
        "rotations, multi-qubit controlled gates, the circuit model and circuit "
        "identities, universal gate sets, and density matrices for mixed states.",
        "#8B5CF6",
        11,
    ),
    (
        "qc-algorithms",
        "QC: Core Quantum Algorithms",
        "The foundational quantum algorithms: Deutsch-Jozsa, the quantum Fourier "
        "transform, Grover search, quantum phase estimation, and Shor's factoring "
        "algorithm — where quantum advantage first appears.",
        "#EC4899",
        12,
    ),
]

# ── Concept rows (Lesson -> Concept). `order` follows topological_order within
# each branch. (slug, title, category_slug, difficulty, order, summary) ──
CONCEPTS = [
    # Module 2 — qc-gates-circuits
    (
        "qc-single-qubit-gates",
        "Single-Qubit Gates",
        "qc-gates-circuits",
        "intermediate",
        1,
        "The single-qubit unitary gates: the Pauli matrices X, Y, Z, the Hadamard "
        "H, the phase gates S and T, and the axis rotations R_x, R_y, R_z as "
        "matrix exponentials. We compute their action, read them as Bloch-sphere "
        "rotations, verify unitarity, and test commutation.",
    ),
    (
        "qc-multi-qubit-gates",
        "Multi-Qubit Gates",
        "qc-gates-circuits",
        "intermediate",
        2,
        "Controlled and permutation gates on two and three qubits: CNOT, CZ, SWAP "
        "and the Toffoli gate. We compute their matrices and action, build a Bell "
        "state with H then CNOT, explain phase kickback, and decompose SWAP into "
        "three CNOTs.",
    ),
    (
        "qc-circuit-model",
        "The Circuit Model and Circuit Identities",
        "qc-gates-circuits",
        "intermediate",
        3,
        "The quantum circuit model: wires as qubits, gates left-to-right in time, "
        "and the composed unitary as the reverse-order matrix product. We tensor "
        "parallel gates, prove circuit identities such as HXH = Z, and compare "
        "circuits up to global phase.",
    ),
    (
        "qc-universal-gate-sets",
        "Universal Gate Sets",
        "qc-gates-circuits",
        "advanced",
        4,
        "What it means for a finite gate set such as {H, T, CNOT} to be universal, "
        "the distinction between exact and approximate universality, the "
        "Solovay-Kitaev theorem's polylogarithmic gate scaling, and why the "
        "Clifford group alone is efficiently classically simulable (Gottesman-Knill).",
    ),
    (
        "qc-density-matrices-mixed-states",
        "Density Matrices and Mixed States",
        "qc-gates-circuits",
        "advanced",
        5,
        "The density-matrix formalism for pure and mixed states: rho = sum_i p_i "
        "|psi_i><psi_i|, its Hermitian/unit-trace/positive-semidefinite properties, "
        "the purity Tr(rho^2), the partial trace and reduced states, and the "
        "Bloch-ball picture rho = (I + r.sigma)/2.",
    ),
    # Module 3 — qc-algorithms
    (
        "qc-deutsch-jozsa",
        "The Deutsch-Jozsa Algorithm",
        "qc-algorithms",
        "advanced",
        1,
        "The first exact quantum advantage: decide whether a promised function is "
        "constant or balanced in a single query. We build the phase oracle, trace "
        "the H^n - oracle - H^n circuit, and show the all-zeros outcome is certain "
        "iff f is constant.",
    ),
    (
        "qc-quantum-fourier-transform",
        "The Quantum Fourier Transform",
        "qc-algorithms",
        "advanced",
        2,
        "The QFT maps |x> to a Fourier superposition (1/sqrt(N)) sum_k e^{2 pi i x "
        "k / N} |k>. We show the N=2 QFT is H, derive the product form and its "
        "Hadamard + controlled-phase circuit, count its O(n^2) gates, and explain "
        "the terminal swaps.",
    ),
    (
        "qc-grover-search",
        "Grover's Search Algorithm",
        "qc-algorithms",
        "advanced",
        3,
        "Unstructured search in O(sqrt(N)) queries. We build the Grover iterate "
        "from the phase oracle and the diffusion operator, read it as a rotation "
        "toward the marked state, compute the optimal iteration count "
        "floor((pi/4) sqrt(N/M)), and explain over-rotation.",
    ),
    (
        "qc-phase-estimation",
        "Quantum Phase Estimation",
        "qc-algorithms",
        "advanced",
        4,
        "Estimating the eigenphase phi of a unitary U with eigenstate |u>. We build "
        "the counting register, apply controlled-U^{2^j} gates whose phase kickback "
        "encodes phi, invert the QFT to read phi's bits, and size the register for "
        "a target accuracy and success probability.",
    ),
    (
        "qc-shor-factoring",
        "Shor's Factoring Algorithm",
        "qc-algorithms",
        "advanced",
        5,
        "Polynomial-time factoring by reduction to order-finding. We define the "
        "order r of a mod N, use phase estimation on U|y> = |ay mod N> to get s/r, "
        "recover r by continued fractions, and take gcd(a^{r/2} +/- 1, N) as "
        "factors, worked on N = 15, a = 7.",
    ),
]


# ── Reusable citation entries ──
# Nielsen & Chuang, Quantum Computation and Quantum Information (10th anniv. ed., 2010).
NC = {
    "1.3.1": {"title": "Nielsen & Chuang, Sec 1.3.1 (Single qubit gates)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    "1.3.2": {"title": "Nielsen & Chuang, Sec 1.3.2 (Multiple qubit gates)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    "1.3.4": {"title": "Nielsen & Chuang, Sec 1.3.4 (Quantum circuits)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    # VERIFY: Deutsch-Jozsa is Sec 1.4.4 in the 10th-anniv. edition (1.4.3 is Deutsch's algorithm).
    "1.4.4": {"title": "Nielsen & Chuang, Sec 1.4.4 (The Deutsch-Jozsa algorithm)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    "2.4": {"title": "Nielsen & Chuang, Sec 2.4 (The density operator)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    "2.4.2": {"title": "Nielsen & Chuang, Sec 2.4.2 (General properties of the density operator)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    "2.4.3": {"title": "Nielsen & Chuang, Sec 2.4.3 (The reduced density operator)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    "4.2": {"title": "Nielsen & Chuang, Sec 4.2 (Single qubit operations)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    "4.3": {"title": "Nielsen & Chuang, Sec 4.3 (Controlled operations)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    "4.5": {"title": "Nielsen & Chuang, Sec 4.5 (Universal quantum gates)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    # VERIFY: the discrete {H, S, CNOT, T} universal set + Solovay-Kitaev discussion is Sec 4.5.3.
    "4.5.3": {"title": "Nielsen & Chuang, Sec 4.5.3 (A discrete set of universal operations)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    "5.1": {"title": "Nielsen & Chuang, Sec 5.1 (The quantum Fourier transform)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    "5.2": {"title": "Nielsen & Chuang, Sec 5.2 (Phase estimation)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    "5.3": {"title": "Nielsen & Chuang, Sec 5.3 (Applications: order-finding and factoring)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    "5.3.1": {"title": "Nielsen & Chuang, Sec 5.3.1 (Application: order-finding)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    "6.1": {"title": "Nielsen & Chuang, Sec 6.1 (The quantum search algorithm)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    # VERIFY: Gottesman-Knill theorem / stabilizer simulability is Sec 10.5.4 in the 10th-anniv. edition.
    "10.5.4": {"title": "Nielsen & Chuang, Sec 10.5.4 (The Gottesman-Knill theorem)", "url": "https://doi.org/10.1017/CBO9780511976667"},
    # VERIFY: the Solovay-Kitaev theorem statement/proof is Appendix 3 of the 10th-anniv. edition.
    "A3": {"title": "Nielsen & Chuang, Appendix 3 (The Solovay-Kitaev theorem)", "url": "https://doi.org/10.1017/CBO9780511976667"},
}


TOPICS = [
    # ─────────────────────────── MODULE 2 ───────────────────────────
    {
        "slug": "qc-single-qubit-gates",
        "related_simulation": "single_qubit_gate",
        "prerequisites": ["qc-qubit-state-vector", "qc-bloch-sphere"],
        "overview": [
            "A single-qubit [[quantum-gate|quantum gate]] is a $2\\times2$ [[unitary|unitary]] matrix acting on the state vector $|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$. Unitarity, $U^{\\dagger}U = I$, is exactly what preserves normalization, so a gate maps unit vectors to unit vectors and is always invertible. The core [[pauli-gate|Pauli gates]] are $X = \\left(\\begin{smallmatrix}0&1\\\\1&0\\end{smallmatrix}\\right)$ (the bit-flip, $X|0\\rangle=|1\\rangle$), $Y = \\left(\\begin{smallmatrix}0&-i\\\\i&0\\end{smallmatrix}\\right)$, and $Z = \\left(\\begin{smallmatrix}1&0\\\\0&-1\\end{smallmatrix}\\right)$ (the phase-flip, $Z|1\\rangle=-|1\\rangle$). Throughout this lesson we use the letters $X,Y,Z$ for the Pauli operators rather than $\\sigma_x,\\sigma_y,\\sigma_z$.",
            "Three more gates complete the everyday single-qubit toolkit. The [[hadamard-gate|Hadamard gate]] $H = \\tfrac{1}{\\sqrt2}\\left(\\begin{smallmatrix}1&1\\\\1&-1\\end{smallmatrix}\\right)$ creates and destroys equal superpositions, sending $|0\\rangle\\mapsto|+\\rangle$ and $|1\\rangle\\mapsto|-\\rangle$; it is the hinge of nearly every quantum algorithm. The [[phase-gate|phase gate]] $S = \\left(\\begin{smallmatrix}1&0\\\\0&i\\end{smallmatrix}\\right)$ and the [[t-gate|$T$ gate]] $T = \\left(\\begin{smallmatrix}1&0\\\\0&e^{i\\pi/4}\\end{smallmatrix}\\right)$ apply relative phases to $|1\\rangle$. These satisfy the tower $S^2 = Z$ and $T^2 = S$ (hence $T^4 = Z$, $T^8 = I$), verified directly by multiplying the diagonal matrices — a fact objective o5 asks you to establish. Applying any gate to a state is a matrix-vector product: $X\\left(\\begin{smallmatrix}\\alpha\\\\\\beta\\end{smallmatrix}\\right) = \\left(\\begin{smallmatrix}\\beta\\\\\\alpha\\end{smallmatrix}\\right)$, and so on.",
            "Every single-qubit unitary is a rotation of the [[bloch-sphere|Bloch sphere]]. The [[rotation-gate|rotation gates]] make this explicit as matrix exponentials of the Pauli operators, $R_{\\hat n}(\\theta) = \\exp(-i\\theta\\,\\hat n\\!\\cdot\\!\\vec\\sigma/2)$, which rotate the Bloch vector by angle $\\theta$ about the axis $\\hat n$. Because each Pauli squares to the identity, the exponential collapses to $R_j(\\theta) = \\cos(\\theta/2)\\,I - i\\sin(\\theta/2)\\,\\sigma_j$ — a closed $2\\times2$ form you can evaluate for any axis and angle. In this language $X,Y,Z$ are $\\pi$-rotations about the $x,y,z$ axes (up to global phase), and $H$ is a $\\pi$-rotation about the diagonal axis $(\\hat x + \\hat z)/\\sqrt2$, which is why $H$ swaps the $Z$ and $X$ bases.",
            "Two gates commute when the order of application is irrelevant, measured by the commutator $[A,B] = AB - BA$. The Pauli operators famously do not commute: $[X,Y] = 2iZ$ and cyclic permutations, so $XY \\ne YX$. Non-commutativity is not a technicality — it is the source of the uncertainty relations and the reason the order of gates in a circuit matters. Diagonal gates, by contrast, always commute with one another ($Z, S, T$ are mutually commuting), and a gate commutes with any function of itself. Computing $[A,B]$ entry by entry, as objective o6 requires, is the direct test of whether two operations can be freely reordered.",
        ],
        "history": (
            "The three $2\\times2$ matrices now called Pauli gates were introduced by Wolfgang Pauli in 1927 to describe electron spin; Hadamard and Sylvester matrices date to nineteenth-century combinatorics. Their reinterpretation as elementary logic gates on a qubit belongs to the quantum-computing era: David Deutsch's 1989 'Quantum computational networks' cast computation as sequences of such unitaries, and Barenco et al. (1995) fixed the standard single-qubit gate library — Pauli, Hadamard, phase, and $\\pi/8$ ($T$) gates — used ever since."
        ),
        "math_derivation": (
            "Start from the rotation generator. For any unit axis $\\hat n$ the operator $\\hat n\\!\\cdot\\!\\vec\\sigma = n_x X + n_y Y + n_z Z$ satisfies $(\\hat n\\!\\cdot\\!\\vec\\sigma)^2 = I$, because the Pauli matrices obey $\\sigma_j^2 = I$ and $\\sigma_j\\sigma_k = -\\sigma_k\\sigma_j$ for $j\\ne k$ (the cross terms cancel in pairs). "
            "Expanding the exponential and splitting even and odd powers, exactly as for Euler's formula, "
            "$$R_{\\hat n}(\\theta) = e^{-i\\theta(\\hat n\\cdot\\vec\\sigma)/2} = \\cos\\!\\tfrac{\\theta}{2}\\,I - i\\sin\\!\\tfrac{\\theta}{2}\\,(\\hat n\\cdot\\vec\\sigma).$$ "
            "Taking $\\hat n = \\hat z$ gives $R_z(\\theta) = \\mathrm{diag}(e^{-i\\theta/2}, e^{+i\\theta/2})$, which up to the global phase $e^{i\\theta/2}$ equals $\\mathrm{diag}(1, e^{i\\theta})$; setting $\\theta = \\pi/2$ recovers $S$ and $\\theta = \\pi/4$ recovers $T$. "
            "Finally verify the phase tower by squaring the diagonals: $S^2 = \\mathrm{diag}(1, i)^2 = \\mathrm{diag}(1, -1) = Z$, and $T^2 = \\mathrm{diag}(1, e^{i\\pi/4})^2 = \\mathrm{diag}(1, i) = S$. Each gate is unitary with inverse equal to its conjugate transpose, e.g. $S^{-1} = S^{\\dagger} = \\mathrm{diag}(1, -i)$ and $H^{-1} = H$."
        ),
        "key_equations": [
            {"label": "Pauli gates", "latex": r"X = \begin{pmatrix} 0 & 1 \\ 1 & 0 \end{pmatrix},\quad Y = \begin{pmatrix} 0 & -i \\ i & 0 \end{pmatrix},\quad Z = \begin{pmatrix} 1 & 0 \\ 0 & -1 \end{pmatrix}"},
            {"label": "Hadamard", "latex": r"H = \tfrac{1}{\sqrt{2}}\begin{pmatrix} 1 & 1 \\ 1 & -1 \end{pmatrix}"},
            {"label": "Phase and T gates", "latex": r"S = \begin{pmatrix} 1 & 0 \\ 0 & i \end{pmatrix},\qquad T = \begin{pmatrix} 1 & 0 \\ 0 & e^{i\pi/4} \end{pmatrix},\qquad S^2 = Z,\ \ T^2 = S"},
            {"label": "Axis rotation", "latex": r"R_{\hat n}(\theta) = e^{-i\theta(\hat n\cdot\vec\sigma)/2} = \cos\tfrac{\theta}{2}\,I - i\sin\tfrac{\theta}{2}\,(\hat n\cdot\vec\sigma)"},
            {"label": "Pauli commutator", "latex": r"[X, Y] = 2iZ,\qquad [Y, Z] = 2iX,\qquad [Z, X] = 2iY"},
        ],
        "further_reading": [
            NC["1.3.1"],
            NC["4.2"],
            {"title": "Barenco et al., Elementary gates for quantum computation, Phys. Rev. A 52, 3457 (1995)", "url": "https://doi.org/10.1103/PhysRevA.52.3457"},
        ],
        "formulas": [
            {
                "latex": r"R_j(\theta) = e^{-i\theta\sigma_j/2} = \cos\tfrac{\theta}{2}\,I - i\sin\tfrac{\theta}{2}\,\sigma_j",
                "description": "The single-axis rotation gate as a matrix exponential of a Pauli operator; a rotation of the Bloch vector by angle theta about axis j.",
                "symbols": {
                    r"R_j(\theta)": "rotation by angle theta about the j-axis (j = x, y, z)",
                    r"\sigma_j": "Pauli operator X, Y, or Z",
                    r"\theta": "rotation angle on the Bloch sphere",
                    "I": "2x2 identity matrix",
                },
                "derivation_steps": [
                    "Each Pauli squares to the identity, $\\sigma_j^2 = I$, so even powers of $\\sigma_j$ are $I$ and odd powers are $\\sigma_j$.",
                    "Expand $e^{-i\\theta\\sigma_j/2} = \\sum_k \\frac{1}{k!}(-i\\theta\\sigma_j/2)^k$ and split into even/odd $k$.",
                    "The even terms sum to $\\cos(\\theta/2)\\,I$ and the odd terms to $-i\\sin(\\theta/2)\\,\\sigma_j$.",
                    "Bloch reading: $R_z(\\theta)$ rotates $(\\theta,\\phi)$ by $\\Delta\\phi = \\theta$ about $\\hat z$; $X = iR_x(\\pi)$ is a $\\pi$-flip about $\\hat x$.",
                ],
            },
            {
                "latex": r"S^2 = Z,\qquad T^2 = S,\qquad T^4 = Z,\qquad T^8 = I",
                "description": "The diagonal phase-gate tower: T generates S generates Z by repeated squaring.",
                "symbols": {
                    "S": "phase gate, diag(1, i)",
                    "T": "pi/8 gate, diag(1, e^{i pi/4})",
                    "Z": "Pauli-Z phase flip, diag(1, -1)",
                },
                "derivation_steps": [
                    "Multiply diagonals entrywise: $T^2 = \\mathrm{diag}(1, e^{i\\pi/4})^2 = \\mathrm{diag}(1, e^{i\\pi/2}) = \\mathrm{diag}(1, i) = S$.",
                    "Square again: $S^2 = \\mathrm{diag}(1, i)^2 = \\mathrm{diag}(1, -1) = Z$.",
                    "So $T^4 = Z$ and $T^8 = \\mathrm{diag}(1, e^{2\\pi i}) = I$; each is unitary with inverse its conjugate transpose.",
                ],
            },
        ],
    },
    {
        "slug": "qc-multi-qubit-gates",
        "related_simulation": "multi_qubit_gate",
        "prerequisites": ["qc-single-qubit-gates", "qc-multi-qubit-tensor"],
        "overview": [
            "Multi-qubit gates act on the $2^n$-dimensional [[tensor-product|tensor-product]] space of several qubits; the workhorses are [[controlled-gate|controlled gates]], which apply a single-qubit unitary to a target conditioned on a control. The [[cnot-gate|controlled-NOT (CNOT)]] flips the target when the control is $|1\\rangle$: on the ordered basis $\\{|00\\rangle,|01\\rangle,|10\\rangle,|11\\rangle\\}$ it is the $4\\times4$ permutation that swaps the last two rows, $\\mathrm{CNOT}: |10\\rangle\\leftrightarrow|11\\rangle$. The [[cz-gate|controlled-$Z$ (CZ)]] gate is diagonal, $\\mathrm{diag}(1,1,1,-1)$, placing a $-1$ only on $|11\\rangle$; it is symmetric between control and target. The [[swap-gate|SWAP]] gate exchanges the two qubits, $|ab\\rangle\\mapsto|ba\\rangle$.",
            "On three qubits the [[toffoli-gate|Toffoli gate (CCNOT)]] flips its target only when both controls are $|1\\rangle$ — the reversible analogue of the classical AND/NAND, and the reason universal reversible (hence quantum) computation subsumes Boolean logic. Its $8\\times8$ matrix is the identity except on the block $\\{|110\\rangle,|111\\rangle\\}$, where it swaps the two amplitudes; its truth table sends $(a,b,c)\\mapsto(a,b,\\,c\\oplus ab)$. Applying any of these gates to an input is again matrix-vector multiplication in the computational basis, which objective o2 exercises on CNOT, CZ, and SWAP.",
            "Controlled gates are the source of [[entanglement|entanglement]]. Feeding a product input $|{+}\\rangle\\otimes|0\\rangle = \\tfrac{1}{\\sqrt2}(|00\\rangle + |10\\rangle)$ into CNOT yields $\\tfrac{1}{\\sqrt2}(|00\\rangle + |11\\rangle) = |\\Phi^{+}\\rangle$, a [[bell-state|Bell state]] that cannot be factored — so the standard circuit $H$ on qubit 1 then CNOT builds a Bell pair from $|00\\rangle$. The general rule (objective o4): a controlled-$U$ acting on a control in superposition $\\alpha|0\\rangle + \\beta|1\\rangle$ entangles the qubits precisely when both $\\alpha$ and $\\beta$ are nonzero and $U$ moves the target — a definite control $|0\\rangle$ or $|1\\rangle$ leaves the state a product.",
            "A subtler effect is [[phase-kickback|phase kickback]]: if the target is prepared in an eigenstate $|u\\rangle$ of $U$ with $U|u\\rangle = e^{i\\varphi}|u\\rangle$, then controlled-$U$ leaves $|u\\rangle$ untouched but imprints the eigenphase onto the control's $|1\\rangle$ amplitude, $\\alpha|0\\rangle|u\\rangle + \\beta|1\\rangle|u\\rangle \\mapsto (\\alpha|0\\rangle + e^{i\\varphi}\\beta|1\\rangle)|u\\rangle$. The phase 'kicks back' from target to control. This single mechanism drives Deutsch-Jozsa, phase estimation, and Shor's algorithm. Finally, gate identities let you rewrite circuits: SWAP equals three alternating CNOTs, $\\mathrm{SWAP} = \\mathrm{CNOT}_{12}\\,\\mathrm{CNOT}_{21}\\,\\mathrm{CNOT}_{12}$, which objective o6 asks you to verify on all four basis states.",
        ],
        "history": (
            "Controlled quantum operations grew out of reversible classical logic: Tommaso Toffoli's 1980 universal reversible gate and the Fredkin-Toffoli 'Conservative logic' (1982) supplied the CCNOT and controlled-SWAP, and Richard Feynman's 1985-86 lectures on computation recast them for quantum machines. Barenco et al. (1995) proved that CNOT together with arbitrary single-qubit gates is universal, making CNOT the canonical entangling primitive of the circuit model."
        ),
        "math_derivation": (
            "Trace the Bell-state circuit and then verify SWAP. Begin in $|00\\rangle$ and apply $H$ to qubit 1: "
            "$$(H\\otimes I)|00\\rangle = \\tfrac{1}{\\sqrt2}(|0\\rangle + |1\\rangle)\\otimes|0\\rangle = \\tfrac{1}{\\sqrt2}(|00\\rangle + |10\\rangle).$$ "
            "Now apply CNOT (control 1, target 2). It fixes $|00\\rangle$ and sends $|10\\rangle\\mapsto|11\\rangle$, so "
            "$$\\mathrm{CNOT}\\,\\tfrac{1}{\\sqrt2}(|00\\rangle + |10\\rangle) = \\tfrac{1}{\\sqrt2}(|00\\rangle + |11\\rangle) = |\\Phi^{+}\\rangle,$$ "
            "an entangled state (the product test $c_{00}c_{11} = \\tfrac12 \\ne 0 = c_{01}c_{10}$ fails). "
            "For SWAP, act with $\\mathrm{CNOT}_{12}\\mathrm{CNOT}_{21}\\mathrm{CNOT}_{12}$ on $|10\\rangle$: the first CNOT gives $|11\\rangle$, the second (control 2, target 1) gives $|01\\rangle$, the third leaves it $|01\\rangle$ — i.e. $|10\\rangle\\mapsto|01\\rangle$. Checking all four basis states shows the net map is $|ab\\rangle\\mapsto|ba\\rangle$, so the three-CNOT product equals SWAP. "
            "Phase kickback follows by linearity: $\\text{c-}U(\\alpha|0\\rangle+\\beta|1\\rangle)\\otimes|u\\rangle = \\alpha|0\\rangle|u\\rangle + \\beta|1\\rangle U|u\\rangle = (\\alpha|0\\rangle + e^{i\\varphi}\\beta|1\\rangle)\\otimes|u\\rangle$."
        ),
        "key_equations": [
            {"label": "CNOT", "latex": r"\mathrm{CNOT} = \begin{pmatrix} 1&0&0&0 \\ 0&1&0&0 \\ 0&0&0&1 \\ 0&0&1&0 \end{pmatrix}"},
            {"label": "CZ", "latex": r"\mathrm{CZ} = \mathrm{diag}(1, 1, 1, -1)"},
            {"label": "SWAP as three CNOTs", "latex": r"\mathrm{SWAP} = \mathrm{CNOT}_{12}\,\mathrm{CNOT}_{21}\,\mathrm{CNOT}_{12}"},
            {"label": "Toffoli (CCNOT)", "latex": r"\mathrm{CCNOT}: |a,b,c\rangle \mapsto |a,\, b,\, c \oplus ab\rangle"},
            {"label": "Phase kickback", "latex": r"(\alpha|0\rangle + \beta|1\rangle)\otimes|u\rangle \mapsto (\alpha|0\rangle + e^{i\varphi}\beta|1\rangle)\otimes|u\rangle"},
        ],
        "further_reading": [
            NC["1.3.2"],
            NC["4.3"],
            {"title": "Barenco et al., Elementary gates for quantum computation, Phys. Rev. A 52, 3457 (1995)", "url": "https://doi.org/10.1103/PhysRevA.52.3457"},
            {"title": "Fredkin & Toffoli, Conservative logic, Int. J. Theor. Phys. 21, 219 (1982)", "url": "https://doi.org/10.1007/BF01857727"},
        ],
        "formulas": [
            {
                "latex": r"\mathrm{CNOT}\,|c\rangle|t\rangle = |c\rangle\,|t \oplus c\rangle",
                "description": "The controlled-NOT gate: flip the target bit t iff the control bit c is 1.",
                "symbols": {
                    r"|c\rangle": "control qubit",
                    r"|t\rangle": "target qubit",
                    r"\oplus": "addition modulo 2 (XOR)",
                },
                "derivation_steps": [
                    "On basis states CNOT acts as the permutation $|00\\rangle,|01\\rangle$ fixed and $|10\\rangle\\leftrightarrow|11\\rangle$.",
                    "Feeding a superposed control $\\tfrac{1}{\\sqrt2}(|0\\rangle+|1\\rangle)|0\\rangle$ gives $\\tfrac{1}{\\sqrt2}(|00\\rangle+|11\\rangle) = |\\Phi^{+}\\rangle$, an entangled Bell state.",
                    "Entanglement arises iff the control amplitudes are both nonzero; a definite control leaves a product state.",
                ],
            },
            {
                "latex": r"\text{c-}U\,(\alpha|0\rangle + \beta|1\rangle)|u\rangle = (\alpha|0\rangle + e^{i\varphi}\beta|1\rangle)|u\rangle,\quad U|u\rangle = e^{i\varphi}|u\rangle",
                "description": "Phase kickback: a controlled-U with the target in an eigenstate of U writes U's eigenphase onto the control amplitude.",
                "symbols": {
                    r"\text{c-}U": "controlled-U gate",
                    r"|u\rangle": "eigenstate of U",
                    r"e^{i\varphi}": "eigenvalue (eigenphase) of U on |u>",
                    r"\alpha, \beta": "control-qubit amplitudes",
                },
                "derivation_steps": [
                    "By linearity c-$U$ acts term by term: it leaves $|0\\rangle|u\\rangle$ alone and sends $|1\\rangle|u\\rangle\\to|1\\rangle U|u\\rangle$.",
                    "Since $U|u\\rangle = e^{i\\varphi}|u\\rangle$, the target factor $|u\\rangle$ is unchanged and the phase $e^{i\\varphi}$ multiplies the $|1\\rangle$ branch.",
                    "The result factorizes as $(\\alpha|0\\rangle + e^{i\\varphi}\\beta|1\\rangle)\\otimes|u\\rangle$: the phase has moved onto the control.",
                    "This is the engine of Deutsch-Jozsa, phase estimation, and Shor's algorithm.",
                ],
            },
        ],
    },
    {
        "slug": "qc-circuit-model",
        "related_simulation": "quantum_circuit",
        "prerequisites": ["qc-single-qubit-gates", "qc-multi-qubit-gates"],
        "overview": [
            "The [[quantum-circuit-model|quantum circuit model]] is the standard language for quantum computation: horizontal wires carry qubits, boxes on the wires are unitary gates applied left-to-right in time, and measurements sit at the end. A circuit acting on $n$ qubits is read as a composition of unitaries. A crucial bookkeeping point is order: if the gates in drawn (time) order are $U_1, U_2, \\dots, U_m$, the equivalent single unitary is the matrix product in the reverse of the drawn order, $U = U_m \\cdots U_2 U_1$, because the first-applied gate sits nearest the input ket on the right. Objective o1 is exactly this convention; objectives o2 and o3 apply it to compute output states.",
            "Gates on different wires at the same time step combine by [[tensor-product|tensor product]]. A Hadamard on qubit 1 while qubit 2 is idle is $H\\otimes I$, and applying it to a two-qubit state is a single $4\\times4$ matrix-vector product. More generally a layer of parallel gates is the tensor product of the per-wire operators (identity on any untouched wire), and the whole circuit is the ordered product of its layers. This factorization — tensor within a layer, compose across layers — is what makes circuits both drawable and computable.",
            "[[circuit-identity|Circuit identities]] are provable equalities between circuits, established by multiplying out the matrices. Canonical examples include $HXH = Z$ and $HZH = X$ (Hadamard conjugation swaps the $X$ and $Z$ bases), $HYH = -Y$, and $\\mathrm{CNOT}^2 = I$ (two identical CNOTs cancel). A particularly useful one: conjugating a CNOT by Hadamards on both wires exchanges control and target, $(H\\otimes H)\\,\\mathrm{CNOT}\\,(H\\otimes H) = \\mathrm{CNOT}_{\\text{reversed}}$, equivalently turning a CNOT into a CZ up to Hadamards. Objective o4 asks you to prove or refute such identities by direct computation.",
            "Because a [[global-phase|global phase]] is physically unobservable, two circuits implement 'the same' computation when their unitaries agree up to an overall phase: $U' = e^{i\\gamma}U$. Comparing circuits (objective o5) therefore means checking $U'U^{\\dagger} = e^{i\\gamma}I$, not literal matrix equality — a distinction that matters when one decomposition carries an extra phase that a real device could never detect. This equivalence-up-to-phase is also what lets compilers freely resynthesize a circuit into a hardware-native gate set without changing its action.",
        ],
        "history": (
            "David Deutsch introduced quantum computational networks — the circuit model — in 'Quantum computational networks' (Proc. R. Soc. Lond. A 425, 73, 1989), generalizing the classical logic-network picture to unitary gates. Andrew Yao's 1993 result that the circuit model is polynomially equivalent to the quantum Turing machine established circuits as the standard complexity-theoretic model, the framework in which essentially all quantum algorithms are now expressed."
        ),
        "math_derivation": (
            "Take the two-gate circuit 'apply $H$ to a qubit, then $Z$, then $H$'. In drawn order the gates are $H, Z, H$, so the composed unitary is the reverse-order product "
            "$$U = H\\,Z\\,H.$$ "
            "Multiply: $ZH = \\tfrac{1}{\\sqrt2}\\left(\\begin{smallmatrix}1&1\\\\-1&1\\end{smallmatrix}\\right)$, then "
            "$$H(ZH) = \\tfrac12\\begin{pmatrix}1&1\\\\1&-1\\end{pmatrix}\\begin{pmatrix}1&1\\\\-1&1\\end{pmatrix} = \\tfrac12\\begin{pmatrix}0&2\\\\2&0\\end{pmatrix} = \\begin{pmatrix}0&1\\\\1&0\\end{pmatrix} = X.$$ "
            "So $HZH = X$; the mirror computation gives $HXH = Z$. To compare two circuits up to phase, form $U'U^{\\dagger}$: if it equals $e^{i\\gamma}I$ the circuits are physically identical. For instance $S$ and $R_z(\\pi/2) = \\mathrm{diag}(e^{-i\\pi/4}, e^{i\\pi/4})$ differ only by the global phase $e^{-i\\pi/4}$, since $S = e^{i\\pi/4}R_z(\\pi/2)$, so a circuit may use either interchangeably."
        ),
        "key_equations": [
            {"label": "Composed unitary (reverse of drawn order)", "latex": r"U = U_m\, U_{m-1} \cdots U_2\, U_1"},
            {"label": "Parallel gates tensor", "latex": r"(A \otimes B)(|u\rangle \otimes |v\rangle) = A|u\rangle \otimes B|v\rangle"},
            {"label": "Hadamard conjugation", "latex": r"HXH = Z,\qquad HZH = X"},
            {"label": "CNOT is an involution", "latex": r"\mathrm{CNOT}^2 = I"},
            {"label": "Equivalence up to global phase", "latex": r"U' = e^{i\gamma}U \iff U'U^{\dagger} = e^{i\gamma} I"},
        ],
        "further_reading": [
            NC["1.3.4"],
            NC["4.2"],
            {"title": "Deutsch, Quantum computational networks, Proc. R. Soc. Lond. A 425, 73 (1989)", "url": "https://doi.org/10.1098/rspa.1989.0099"},
        ],
        "formulas": [
            {
                "latex": r"U = U_m\, U_{m-1} \cdots U_1",
                "description": "The unitary of a circuit is the product of its gates in the reverse of the drawn (time) order.",
                "symbols": {
                    "U": "overall circuit unitary",
                    "U_1": "first gate applied (drawn leftmost, nearest the input)",
                    "U_m": "last gate applied (drawn rightmost)",
                },
                "derivation_steps": [
                    "The input ket sits on the right: $U_1|\\psi\\rangle$ is applied first.",
                    "Applying $U_2$ next gives $U_2 U_1|\\psi\\rangle$, and so on, so time order runs right-to-left in the product.",
                    "Hence $U = U_m\\cdots U_1$; parallel gates within one time step combine as a tensor product before entering the product.",
                ],
            },
            {
                "latex": r"HXH = Z,\qquad HZH = X,\qquad \mathrm{CNOT}^2 = I",
                "description": "Representative circuit identities proved by matrix multiplication; Hadamard conjugation swaps the X and Z bases.",
                "symbols": {
                    "H": "Hadamard gate",
                    "X, Z": "Pauli gates",
                    r"\mathrm{CNOT}^2": "two identical CNOTs in series",
                },
                "derivation_steps": [
                    "Compute $HZH$ directly: $ZH = \\tfrac{1}{\\sqrt2}\\left(\\begin{smallmatrix}1&1\\\\-1&1\\end{smallmatrix}\\right)$, then $H(ZH) = X$.",
                    "By symmetry $HXH = Z$; both follow since $H$ is its own inverse and maps the $Z$-axis to the $X$-axis on the Bloch sphere.",
                    "$\\mathrm{CNOT}^2 = I$ because CNOT is a permutation of order two ($|10\\rangle\\leftrightarrow|11\\rangle$ applied twice returns the input).",
                    "Circuits are equal when their products agree up to a global phase, $U' = e^{i\\gamma}U$.",
                ],
            },
        ],
    },
    {
        "slug": "qc-universal-gate-sets",
        "related_simulation": "gate_decomposition",
        "prerequisites": ["qc-single-qubit-gates", "qc-multi-qubit-gates"],
        "overview": [
            "A [[universal-gate-set|universal gate set]] is a finite collection of gates whose circuits can implement — or approximate to any desired accuracy — every unitary on any number of qubits. The standard example is $\\{H, T, \\mathrm{CNOT}\\}$: CNOT supplies entanglement across qubits, while $H$ and $T$ generate a dense subgroup of single-qubit unitaries $SU(2)$. This is the quantum counterpart of NAND-universality for Boolean circuits, and it is what lets a physical device with only a handful of native gates run arbitrary algorithms. (An alternative common set adds the phase gate, $\\{H, S, \\mathrm{CNOT}, T\\}$; $S = T^2$ is redundant for universality but convenient.)",
            "There is a sharp distinction between exact and approximate universality. A finite gate set generates only a countable set of unitaries, whereas the unitary group $U(2^n)$ is an uncountable continuum, so no finite set can produce every unitary exactly — the best achievable is approximation. Approximate universality means: for any target $U$ and any $\\varepsilon > 0$ there is a circuit from the set implementing a $V$ with $\\lVert U - V \\rVert < \\varepsilon$. This is not a weakness; a computation only needs to reach its output state within tolerance, and error-correction handles the residual. Objective o2 is precisely recognizing why 'finite set, continuum of targets' forces approximation rather than exact reachability.",
            "The efficiency of that approximation is governed by the [[solovay-kitaev-theorem|Solovay-Kitaev theorem]]: if a single-qubit gate set is closed under inverses and generates a dense subgroup of $SU(2)$, then any single-qubit unitary can be approximated to accuracy $\\varepsilon$ using only $O(\\log^{c}(1/\\varepsilon))$ gates, with $c \\approx 2$ (and a matching-length classical algorithm to find the sequence). The payoff is that the overhead of compiling to a discrete gate set is merely polylogarithmic in the precision — you buy an extra factor of $\\log^{c}(1/\\varepsilon)$, not a polynomial or exponential blow-up. Objective o4 applies this by expressing a target such as a small-angle $R_z$ as a sequence of $H$ and $T$.",
            "Finally, universality has a subtle boundary revealed by the [[gottesman-knill-theorem|Gottesman-Knill theorem]]. The [[clifford-group|Clifford group]] generated by $\\{H, S, \\mathrm{CNOT}\\}$ — which normalizes the Pauli group — is decidedly not universal: any circuit built solely from Clifford gates (with computational-basis input and measurement) can be simulated efficiently on a classical computer via the stabilizer formalism. Clifford circuits create entanglement and superposition yet capture no quantum computational advantage on their own. Adding a single non-Clifford gate, the $T$ gate, is exactly what lifts $\\{H, S, \\mathrm{CNOT}\\}$ to universality and puts the model beyond efficient classical simulation — the practical reason $T$ gates are the costly, carefully counted resource in fault-tolerant architectures (objective o5).",
        ],
        "history": (
            "Deutsch (1989) showed a three-qubit gate is universal; DiVincenzo (1995) and Barenco et al. (1995) reduced universality to two-qubit gates, proving CNOT plus single-qubit gates suffices. The discrete set $\\{H, S, \\mathrm{CNOT}, T\\}$ and its efficient compilation rest on the Solovay-Kitaev theorem (Robert Solovay, 1995, unpublished; Alexei Kitaev, 1997; algorithmic form by Dawson & Nielsen, 2006). Daniel Gottesman's stabilizer 'Heisenberg representation' (1998) formalized the Gottesman-Knill theorem, delimiting the classically simulable Clifford fragment."
        ),
        "math_derivation": (
            "Why must a finite set only approximate? A gate set $\\mathcal G$ with $k$ elements produces at most $k^{\\ell}$ distinct unitaries with circuits of length $\\ell$, hence a countable union over all $\\ell$. But $SU(2)$ is a $3$-real-parameter continuous manifold with uncountably many points, so the reachable set has measure zero — exact coverage is impossible, and the relevant question becomes how densely and how efficiently $\\mathcal G$ fills $SU(2)$. "
            "Density plus closure under inverse is the hypothesis of Solovay-Kitaev, which then bounds the cost: to reach any target within $\\varepsilon$, "
            "$$N_{\\text{gates}} = O\\!\\big(\\log^{c}(1/\\varepsilon)\\big),\\qquad c \\approx 2.$$ "
            "For the Clifford boundary, note the Clifford group is defined by conjugating Paulis to Paulis, $C P C^{\\dagger} \\in \\{\\pm,\\pm i\\}\\times\\text{Paulis}$. A stabilizer state is tracked by its $n$ Pauli stabilizers ($O(n^2)$ bits), and each Clifford gate updates them in polynomial time — the Gottesman-Knill simulation. The $T$ gate sends $T X T^{\\dagger} = (X+Y)/\\sqrt2 \\notin$ Pauli group, breaking the stabilizer bookkeeping and restoring universality."
        ),
        "key_equations": [
            {"label": "Universal set", "latex": r"\{H,\ T,\ \mathrm{CNOT}\} \ \text{is universal for quantum computation}"},
            {"label": "Approximate universality", "latex": r"\forall\, U,\ \varepsilon>0\ \ \exists\, V \in \langle \mathcal{G}\rangle:\ \lVert U - V\rVert < \varepsilon"},
            {"label": "Solovay-Kitaev scaling", "latex": r"N_{\text{gates}} = O\!\big(\log^{c}(1/\varepsilon)\big),\quad c \approx 2"},
            {"label": "Clifford normalizes Pauli", "latex": r"C\, P\, C^{\dagger} \in \mathcal{P}_n \quad \forall\, P \in \mathcal{P}_n"},
            {"label": "T breaks Clifford", "latex": r"T X T^{\dagger} = \tfrac{1}{\sqrt{2}}(X + Y) \notin \mathcal{P}_1"},
        ],
        "further_reading": [
            NC["4.5"],
            NC["4.5.3"],
            NC["10.5.4"],
            NC["A3"],
            {"title": "Dawson & Nielsen, The Solovay-Kitaev algorithm, Quantum Inf. Comput. 6, 81 (2006)", "url": "https://arxiv.org/abs/quant-ph/0505030"},
            {"title": "Gottesman, The Heisenberg representation of quantum computers (1998)", "url": "https://arxiv.org/abs/quant-ph/9807006"},
        ],
        "formulas": [
            {
                "latex": r"N_{\text{gates}}(\varepsilon) = O\!\big(\log^{c}(1/\varepsilon)\big),\qquad c \approx 2",
                "description": "Solovay-Kitaev: approximating a single-qubit unitary to accuracy epsilon costs only polylogarithmically many gates from any dense, inverse-closed set.",
                "symbols": {
                    r"\varepsilon": "target operator-norm accuracy",
                    "c": "Solovay-Kitaev exponent, approximately 2",
                    r"N_{\text{gates}}": "number of gates in the approximating sequence",
                },
                "derivation_steps": [
                    "A finite gate set reaches only a countable, measure-zero subset of the continuous group $SU(2)$, so exact universality is impossible.",
                    "If the set is dense and closed under inverses, Solovay-Kitaev recursively refines an $\\varepsilon_0$-net to accuracy $\\varepsilon$.",
                    "Each recursion level multiplies the sequence length by a constant while squaring the accuracy, giving $O(\\log^{c}(1/\\varepsilon))$ gates.",
                    "The overhead of compiling to a discrete set is therefore only polylogarithmic in the precision.",
                ],
            },
            {
                "latex": r"\{H, S, \mathrm{CNOT}\}\ \text{(Clifford): classically simulable};\quad +\,T \Rightarrow \text{universal}",
                "description": "Gottesman-Knill: Clifford circuits are efficiently classically simulable; adding the non-Clifford T gate yields universality.",
                "symbols": {
                    "H, S, \\mathrm{CNOT}": "generators of the Clifford group",
                    "T": "the non-Clifford pi/8 gate",
                    r"\mathcal{P}_n": "the n-qubit Pauli group",
                },
                "derivation_steps": [
                    "A Clifford gate conjugates every Pauli to a Pauli, so a stabilizer state's $n$ generators update in polynomial time.",
                    "Hence any Clifford circuit on a computational-basis input is efficiently simulable classically (Gottesman-Knill).",
                    "$T X T^{\\dagger} = (X + Y)/\\sqrt2$ is not a Pauli, so $T$ escapes the stabilizer formalism.",
                    "Adding $T$ to the Clifford generators makes the set universal and the model classically hard to simulate.",
                ],
            },
        ],
    },
    {
        "slug": "qc-density-matrices-mixed-states",
        "related_simulation": "density_matrix",
        "prerequisites": ["qc-measurement-born-rule", "qc-entanglement-bell-states", "qc-multi-qubit-tensor"],
        "overview": [
            "The state-vector picture describes systems in a definite [[pure-state|pure state]] $|\\psi\\rangle$, but real systems are often in a statistical ensemble or entangled with an inaccessible environment. The [[density-matrix|density matrix]] $\\rho = \\sum_i p_i\\,|\\psi_i\\rangle\\langle\\psi_i|$ handles both: it describes a system prepared in $|\\psi_i\\rangle$ with classical probability $p_i$. Every density matrix has three defining properties — it is [[hermitian|Hermitian]] ($\\rho = \\rho^{\\dagger}$), has unit trace ($\\operatorname{Tr}\\rho = 1$, encoding $\\sum_i p_i = 1$), and is positive semidefinite ($\\rho \\ge 0$, so all outcome probabilities are non-negative). Conversely any operator with these three properties is a valid state. A pure state corresponds to the rank-one projector $\\rho = |\\psi\\rangle\\langle\\psi|$.",
            "The purity $\\operatorname{Tr}(\\rho^2)$ diagnoses pure versus [[mixed-state|mixed]]. A [[pure-state|pure state]] satisfies $\\rho^2 = \\rho$ (it is a projector), so $\\operatorname{Tr}(\\rho^2) = 1$; any [[mixed-state|mixed state]] has $\\operatorname{Tr}(\\rho^2) < 1$, bottoming out at $1/d$ for the [[maximally-mixed-state|maximally mixed state]] $\\rho = I/d$ in dimension $d$. So the single number [[purity|$\\operatorname{Tr}(\\rho^2)$]] tells you whether a state carries coherence ($=1$) or is a classical-looking mixture ($<1$) — objective o3. For a given pure state you compute $\\rho = |\\psi\\rangle\\langle\\psi|$ and verify $\\rho^2 = \\rho$ directly; for an ensemble you sum the weighted projectors (objective o2).",
            "The density matrix is essential precisely because of entanglement. Given a joint state $\\rho_{AB}$, the state of subsystem $A$ alone is the [[reduced-density-matrix|reduced density matrix]] obtained by the [[partial-trace|partial trace]] over $B$, $\\rho_A = \\operatorname{Tr}_B(\\rho_{AB})$ — the unique operator reproducing all local measurement statistics on $A$. The striking result (objective o4): each qubit of a [[bell-state|Bell state]] such as $|\\Phi^{+}\\rangle$ has reduced state $\\rho_A = I/2$, the maximally mixed single-qubit state, even though the global state is pure. Maximal local mixedness with a pure global state is the operational signature of maximal entanglement, and it is why the marginals of a Bell pair are perfectly random (the no-signaling statistics of the entanglement lesson).",
            "All measurement predictions carry over: an outcome probability is $P(m) = \\operatorname{Tr}(\\Pi_m\\rho)$ for projector $\\Pi_m$, and the [[expectation-value|expectation value]] of an [[observable|observable]] $A$ is $\\langle A\\rangle = \\operatorname{Tr}(\\rho A)$ — reducing to $\\langle\\psi|A|\\psi\\rangle$ for a pure state (objective o5). For a single qubit there is a vivid geometric picture: every state is $\\rho = \\tfrac12(I + \\vec r\\!\\cdot\\!\\vec\\sigma)$ for a Bloch vector $\\vec r$ with $|\\vec r| \\le 1$, placing states inside the [[bloch-ball|Bloch ball]]. Pure states ($|\\vec r| = 1$) sit on the surface — the Bloch sphere — while mixed states ($|\\vec r| < 1$) sit strictly inside, with the center $\\vec r = 0$ being $I/2$. Purity and $|\\vec r|$ are directly linked by $\\operatorname{Tr}(\\rho^2) = \\tfrac12(1 + |\\vec r|^2)$ (objective o6).",
        ],
        "history": (
            "The density operator was introduced independently by John von Neumann and by Lev Landau in 1927 — Landau to describe a subsystem of a larger quantum whole, von Neumann to unify quantum statistics and measurement in his operator formalism. The Bloch-ball parametrization of the qubit density matrix descends from Felix Bloch's 1946 vector description of a two-level system, extended from the sphere (pure states) to the ball (mixed states)."
        ),
        "math_derivation": (
            "Compute the reduced state of one qubit of $|\\Phi^{+}\\rangle = \\tfrac{1}{\\sqrt2}(|00\\rangle + |11\\rangle)$. The global density matrix is "
            "$$\\rho_{AB} = |\\Phi^{+}\\rangle\\langle\\Phi^{+}| = \\tfrac12\\big(|00\\rangle\\langle00| + |00\\rangle\\langle11| + |11\\rangle\\langle00| + |11\\rangle\\langle11|\\big).$$ "
            "Trace out qubit $B$ using $\\operatorname{Tr}_B(|a_A b_B\\rangle\\langle c_A d_B|) = \\langle d|b\\rangle\\,|a\\rangle\\langle c|$. The cross terms $|00\\rangle\\langle11|$ and $|11\\rangle\\langle00|$ vanish because $\\langle1|0\\rangle = 0$, leaving "
            "$$\\rho_A = \\tfrac12\\big(|0\\rangle\\langle0| + |1\\rangle\\langle1|\\big) = \\tfrac12 I.$$ "
            "Its purity is $\\operatorname{Tr}(\\rho_A^2) = \\operatorname{Tr}(\\tfrac14 I) = \\tfrac12 < 1$: maximally mixed, despite the global state being pure ($\\operatorname{Tr}(\\rho_{AB}^2) = 1$). In Bloch form $\\rho_A = \\tfrac12(I + \\vec r\\cdot\\vec\\sigma)$ with $\\vec r = 0$, sitting at the center of the Bloch ball, and indeed $\\operatorname{Tr}(\\rho_A^2) = \\tfrac12(1 + |\\vec r|^2) = \\tfrac12$."
        ),
        "key_equations": [
            {"label": "Density matrix", "latex": r"\rho = \sum_i p_i\, |\psi_i\rangle\langle\psi_i|,\qquad \rho = \rho^{\dagger},\ \operatorname{Tr}\rho = 1,\ \rho \ge 0"},
            {"label": "Purity", "latex": r"\operatorname{Tr}(\rho^2) \le 1,\qquad \operatorname{Tr}(\rho^2) = 1 \iff \text{pure}"},
            {"label": "Partial trace / reduced state", "latex": r"\rho_A = \operatorname{Tr}_B(\rho_{AB})"},
            {"label": "Expectation value", "latex": r"\langle A\rangle = \operatorname{Tr}(\rho A)"},
            {"label": "Bloch ball", "latex": r"\rho = \tfrac{1}{2}(I + \vec r\cdot\vec\sigma),\quad |\vec r| \le 1,\qquad \operatorname{Tr}(\rho^2) = \tfrac{1}{2}(1 + |\vec r|^2)"},
        ],
        "further_reading": [
            NC["2.4"],
            NC["2.4.2"],
            NC["2.4.3"],
            {"title": "Landau, Das Daempfungsproblem in der Wellenmechanik, Z. Phys. 45, 430 (1927)", "url": "https://doi.org/10.1007/BF01343064"},
        ],
        "formulas": [
            {
                "latex": r"\rho = \sum_i p_i\, |\psi_i\rangle\langle\psi_i|,\qquad \operatorname{Tr}(\rho^2) = 1 \iff \text{pure}",
                "description": "The density matrix of an ensemble and the purity criterion distinguishing pure from mixed states.",
                "symbols": {
                    r"\rho": "density matrix (state operator)",
                    "p_i": "classical probability of preparing |psi_i>",
                    r"|\psi_i\rangle": "pure states in the ensemble",
                    r"\operatorname{Tr}(\rho^2)": "purity",
                },
                "derivation_steps": [
                    "A pure state has $\\rho = |\\psi\\rangle\\langle\\psi|$, a rank-one projector, so $\\rho^2 = \\rho$ and $\\operatorname{Tr}(\\rho^2)=1$.",
                    "A nontrivial mixture has eigenvalues $\\lambda_k \\in [0,1)$ summing to 1, so $\\operatorname{Tr}(\\rho^2) = \\sum_k \\lambda_k^2 < 1$.",
                    "The minimum $1/d$ is reached by the maximally mixed state $\\rho = I/d$.",
                    "Hermiticity, unit trace, and positivity make $\\rho$ a valid state; the Born rule reads $P(m) = \\operatorname{Tr}(\\Pi_m \\rho)$.",
                ],
            },
            {
                "latex": r"\rho_A = \operatorname{Tr}_B(\rho_{AB}),\qquad \rho_A\big(|\Phi^{+}\rangle\big) = \tfrac{1}{2} I",
                "description": "The partial trace gives a subsystem's reduced state; each qubit of a Bell state is maximally mixed.",
                "symbols": {
                    r"\rho_{AB}": "joint two-qubit density matrix",
                    r"\rho_A": "reduced density matrix of qubit A",
                    r"\operatorname{Tr}_B": "partial trace over subsystem B",
                },
                "derivation_steps": [
                    "Write $\\rho_{AB} = |\\Phi^{+}\\rangle\\langle\\Phi^{+}|$ and expand into four outer-product terms.",
                    "Partial trace over B kills the cross terms ($\\langle1|0\\rangle = 0$), leaving $\\tfrac12(|0\\rangle\\langle0| + |1\\rangle\\langle1|) = \\tfrac12 I$.",
                    "So $\\rho_A = I/2$ has purity $\\tfrac12$ and Bloch vector $\\vec r = 0$ — maximally mixed although the global state is pure.",
                    "Maximal local mixedness with a pure global state is the signature of maximal entanglement.",
                ],
            },
        ],
    },
    # ─────────────────────────── MODULE 3 ───────────────────────────
    {
        "slug": "qc-deutsch-jozsa",
        "related_simulation": "deutsch_jozsa",
        "prerequisites": ["qc-circuit-model", "qc-single-qubit-gates", "qc-multi-qubit-gates", "qc-measurement-born-rule"],
        "overview": [
            "The [[deutsch-jozsa-algorithm|Deutsch-Jozsa algorithm]] solves an artificial but decisive problem: given a black-box function $f:\\{0,1\\}^n \\to \\{0,1\\}$ promised to be either constant (same output on all inputs) or balanced (output $0$ on exactly half the inputs and $1$ on the other half), decide which. Classically, in the worst case you must query $f$ on $2^{n-1}+1$ inputs to be certain — just over half the domain — because $2^{n-1}$ agreeing answers are still consistent with both a constant and a balanced function. The quantum algorithm decides with a single evaluation of $f$, the first clean demonstration that quantum queries can beat classical ones deterministically.",
            "The mechanism is a [[phase-oracle|phase oracle]] plus interference. The reversible oracle $U_f|x\\rangle|y\\rangle = |x\\rangle|y\\oplus f(x)\\rangle$ becomes a phase oracle when the target qubit is prepared in $|-\\rangle = \\tfrac{1}{\\sqrt2}(|0\\rangle - |1\\rangle)$: by [[phase-kickback|phase kickback]], $U_f|x\\rangle|-\\rangle = (-1)^{f(x)}|x\\rangle|-\\rangle$, so the value $f(x)$ is written as a sign on each amplitude $|x\\rangle$ rather than into a separate register (objective o2). Because a single oracle call acts on the full superposition $\\tfrac{1}{\\sqrt{2^n}}\\sum_x |x\\rangle$, it evaluates $f$ on all $2^n$ inputs 'at once' — [[quantum-parallelism|quantum parallelism]] — although a naive measurement would reveal only one random value; the algorithm's cleverness is in reading a global property instead.",
            "The full circuit is three layers: $H^{\\otimes n}$ on the query register (making the uniform superposition), the phase oracle, and a second $H^{\\otimes n}$ (interfering the signed amplitudes back together), followed by measurement. Tracing it (objective o3) yields the amplitude of the all-zeros outcome $|0\\rangle^{\\otimes n}$ equal to $\\tfrac{1}{2^n}\\sum_x (-1)^{f(x)}$. If $f$ is constant this sum is $\\pm 1$, so $|0\\rangle^{\\otimes n}$ occurs with certainty; if $f$ is balanced the $+1$ and $-1$ terms cancel exactly, so the amplitude of $|0\\rangle^{\\otimes n}$ is zero and the measured string is never all zeros. Thus 'measure all zeros $\\Leftrightarrow$ $f$ is constant', a deterministic single-query decision (objective o4).",
            "How impressive is this really? The exact/deterministic separation is genuine and exponential: one quantum query versus $\\Theta(2^n)$ worst-case classical queries. But if one allows a small probability of error, a classical randomized algorithm can decide constant-vs-balanced with just a few random queries (sampling a handful of inputs and checking for disagreement fails only with exponentially small probability). So the celebrated exponential gap is in the exact/deterministic query model, not the bounded-error model — an important caveat when evaluating claims of 'exponential quantum advantage' (objective o5). Deutsch-Jozsa's lasting importance is pedagogical and structural: phase kickback and the Hadamard-oracle-Hadamard sandwich reappear in Bernstein-Vazirani, Simon, and ultimately the Fourier-based algorithms.",
        ],
        "history": (
            "David Deutsch posed the $n=1$ version in 1985 (Proc. R. Soc. Lond. A 400, 97), giving a probabilistic quantum edge; Deutsch and Richard Jozsa generalized it to $n$ bits with a deterministic advantage in 1992 (Proc. R. Soc. Lond. A 439, 553). The clean single-query form used today, built on phase kickback and Hadamard interference, is due to the 1998 refinement by Cleve, Ekert, Macchiavello, and Mosca."
        ),
        "math_derivation": (
            "Start from $|0\\rangle^{\\otimes n}|1\\rangle$ and apply Hadamards to every qubit. The query register becomes the uniform superposition and the target becomes $|-\\rangle$: "
            "$$H^{\\otimes n}|0\\rangle^{\\otimes n}\\otimes H|1\\rangle = \\frac{1}{\\sqrt{2^n}}\\sum_{x} |x\\rangle \\otimes |-\\rangle.$$ "
            "Apply the phase oracle; kickback puts the sign $(-1)^{f(x)}$ on each term: "
            "$$\\frac{1}{\\sqrt{2^n}}\\sum_{x} (-1)^{f(x)}|x\\rangle \\otimes |-\\rangle.$$ "
            "Now apply $H^{\\otimes n}$ again. Using $H^{\\otimes n}|x\\rangle = \\tfrac{1}{\\sqrt{2^n}}\\sum_z (-1)^{x\\cdot z}|z\\rangle$, the amplitude of a fixed output $|z\\rangle$ is $\\tfrac{1}{2^n}\\sum_x (-1)^{f(x)}(-1)^{x\\cdot z}$. Setting $z = 0^n$ gives the all-zeros amplitude "
            "$$a_{0} = \\frac{1}{2^n}\\sum_{x} (-1)^{f(x)}.$$ "
            "If $f$ is constant, every term is the same sign, so $a_0 = \\pm 1$ and $|a_0|^2 = 1$. If $f$ is balanced, exactly half the terms are $+1$ and half $-1$, so they cancel and $a_0 = 0$. Measuring the query register therefore returns $0^n$ with certainty iff $f$ is constant."
        ),
        "key_equations": [
            {"label": "Deutsch-Jozsa promise", "latex": r"f:\{0,1\}^n \to \{0,1\}\ \text{is constant or balanced}"},
            {"label": "Phase oracle via kickback", "latex": r"U_f\,|x\rangle|-\rangle = (-1)^{f(x)}\,|x\rangle|-\rangle"},
            {"label": "Hadamard transform", "latex": r"H^{\otimes n}|x\rangle = \frac{1}{\sqrt{2^n}}\sum_{z} (-1)^{x\cdot z}|z\rangle"},
            {"label": "All-zeros amplitude", "latex": r"a_{0\ldots0} = \frac{1}{2^n}\sum_{x} (-1)^{f(x)}"},
            {"label": "Decision rule", "latex": r"|a_{0\ldots0}|^2 = 1\ (\text{constant}),\qquad a_{0\ldots0} = 0\ (\text{balanced})"},
        ],
        "further_reading": [
            NC["1.4.4"],
            {"title": "Deutsch & Jozsa, Rapid solution of problems by quantum computation, Proc. R. Soc. Lond. A 439, 553 (1992)", "url": "https://doi.org/10.1098/rspa.1992.0167"},
            {"title": "Cleve, Ekert, Macchiavello & Mosca, Quantum algorithms revisited, Proc. R. Soc. Lond. A 454, 339 (1998)", "url": "https://arxiv.org/abs/quant-ph/9708016"},
        ],
        "formulas": [
            {
                "latex": r"a_{0\ldots0} = \frac{1}{2^n}\sum_{x \in \{0,1\}^n} (-1)^{f(x)}",
                "description": "Amplitude of the all-zeros outcome after the Deutsch-Jozsa circuit: +/-1 for constant f, 0 for balanced f.",
                "symbols": {
                    r"a_{0\ldots0}": "amplitude of the |0...0> measurement outcome",
                    "f(x)": "the promised constant-or-balanced Boolean function",
                    "n": "number of query qubits",
                },
                "derivation_steps": [
                    "After $H^{\\otimes n}$, the oracle, and $H^{\\otimes n}$, the $|z\\rangle$ amplitude is $\\tfrac{1}{2^n}\\sum_x (-1)^{f(x)}(-1)^{x\\cdot z}$.",
                    "Set $z = 0^n$: the phase $(-1)^{x\\cdot z}$ becomes 1, leaving $a_0 = \\tfrac{1}{2^n}\\sum_x (-1)^{f(x)}$.",
                    "Constant $f$: all terms share a sign, so $a_0 = \\pm1$ and the outcome is certainly $0^n$.",
                    "Balanced $f$: equal numbers of $+1$ and $-1$ cancel, so $a_0 = 0$ and $0^n$ never appears.",
                ],
            },
        ],
    },
    {
        "slug": "qc-quantum-fourier-transform",
        "related_simulation": "qft",
        "prerequisites": ["qc-circuit-model", "qc-single-qubit-gates", "qc-multi-qubit-gates", "qc-multi-qubit-tensor", "qc-prereq-complex-numbers"],
        "overview": [
            "The [[quantum-fourier-transform|quantum Fourier transform (QFT)]] is the discrete Fourier transform realized as a unitary on amplitudes. On a computational-basis state of $n$ qubits (dimension $N = 2^n$) it acts as $|x\\rangle \\mapsto \\tfrac{1}{\\sqrt N}\\sum_{k=0}^{N-1} e^{2\\pi i x k / N}|k\\rangle$, and by linearity it maps a general state's amplitude vector to its DFT. Because it is unitary it is invertible (unlike a classical DFT applied to a probability vector), and it is the shared engine of phase estimation, order-finding, and Shor's algorithm. Note the DFT here acts on the $2^n$ amplitudes of an $n$-qubit register, not on $n$ numbers — the exponential compression is exactly what makes the quantum version cheap.",
            "The smallest case makes the identity concrete: for $N = 2$ ($n=1$), the QFT is $|x\\rangle \\mapsto \\tfrac{1}{\\sqrt2}\\sum_{k} e^{\\pi i x k}|k\\rangle = \\tfrac{1}{\\sqrt2}(|0\\rangle + (-1)^x|1\\rangle)$, which is precisely the [[hadamard-gate|Hadamard gate]] $H$. For $N = 4$ the transform mixes the two-qubit basis with fourth roots of unity $i^{xk}$, and one can compute the QFT of any basis state directly (objective o2). This grounding in small cases shows the QFT is 'just' a change to the Fourier basis — but implemented in superposition across all $N$ amplitudes simultaneously.",
            "The key to an efficient circuit is the product (tensor-factored) form of the output. Writing the input integer in binary $x = x_1 x_2 \\cdots x_n$ and using binary fractions $0.x_\\ell\\cdots x_n = \\sum_{j} x_{\\ell+j-1}/2^{j}$, the QFT output factorizes into a tensor product of single-qubit states, $\\bigotimes_{\\ell=1}^{n} \\tfrac{1}{\\sqrt2}(|0\\rangle + e^{2\\pi i\\, 0.x_\\ell x_{\\ell+1}\\cdots x_n}|1\\rangle)$. Each factor is a $|+\\rangle$-like state whose relative phase is a binary fraction of the input bits — no entanglement in the output basis. Reading this off (objective o3) gives the circuit: a [[hadamard-gate|Hadamard]] on each qubit to create the leading phase, followed by [[controlled-phase-gate|controlled-phase gates]] $R_k = \\mathrm{diag}(1, e^{2\\pi i/2^{k}})$ that add the finer bits $x_{\\ell+1},\\dots,x_n$ conditioned on the lower qubits.",
            "Counting gates (objective o4): qubit $\\ell$ needs one Hadamard and $n-\\ell$ controlled-phase gates, for a total of $n + (n-1) + \\cdots + 1 = n(n+1)/2 = O(n^2)$ gates. Contrast the classical fast Fourier transform, which needs $O(N\\log N) = O(n\\,2^n)$ operations to transform $2^n$ amplitudes: the QFT is exponentially faster in gate count (though it produces the transform encoded in amplitudes you cannot read out directly — the advantage is realized only when a later step, like phase estimation, extracts a global feature). Finally, the product-form circuit outputs the qubits in reversed bit order, so a layer of terminal [[swap-gate|SWAP]] gates restores the natural ordering (objective o5); these swaps are pure bookkeeping and are often absorbed into the surrounding classical relabeling.",
        ],
        "history": (
            "The classical fast Fourier transform of Cooley and Tukey (1965) inspired the quantum version: Don Coppersmith formulated an approximate quantum Fourier transform for factoring in a 1994 IBM report, and Peter Shor made the QFT the centerpiece of his 1994 factoring algorithm. The recursive Hadamard-plus-controlled-phase circuit with $O(n^2)$ gates is the form now standard in every treatment."
        ),
        "math_derivation": (
            "Derive the product form. Write $k = \\sum_{\\ell=1}^{n} k_\\ell 2^{n-\\ell}$ so that $k/N = \\sum_\\ell k_\\ell 2^{-\\ell}$, and factor the QFT sum: "
            "$$\\mathrm{QFT}|x\\rangle = \\frac{1}{\\sqrt{2^n}}\\sum_{k=0}^{2^n-1} e^{2\\pi i x k / 2^n}|k\\rangle = \\frac{1}{\\sqrt{2^n}}\\bigotimes_{\\ell=1}^{n}\\Big(|0\\rangle + e^{2\\pi i x / 2^{\\ell}}|1\\rangle\\Big).$$ "
            "The exponent $x/2^{\\ell}$ modulo 1 keeps only the trailing bits of $x$, giving the binary-fraction phase $0.x_{\\ell}x_{\\ell+1}\\cdots x_n$ on qubit $\\ell$. Each factor is produced by a Hadamard (which supplies the bit $x_\\ell$ as the $\\pm$ phase $0.x_\\ell$) followed by controlled-phase gates $R_k$ contributing $0.0\\cdots0 x_{\\ell+j}$ from the lower qubits. "
            "Counting: qubit $\\ell$ uses $1 + (n-\\ell)$ gates, so the total is $\\sum_{\\ell=1}^{n}(n-\\ell+1) = \\tfrac{n(n+1)}{2} = O(n^2)$. The tensor factors emerge in reversed order, so $n/2$ terminal SWAPs restore the qubit ordering. The inverse QFT (used in phase estimation) is the same circuit run backwards with conjugated phases $R_k^{\\dagger}$."
        ),
        "key_equations": [
            {"label": "QFT action", "latex": r"|x\rangle \mapsto \frac{1}{\sqrt{N}}\sum_{k=0}^{N-1} e^{2\pi i x k / N}\,|k\rangle,\quad N = 2^n"},
            {"label": "N = 2 QFT is Hadamard", "latex": r"\mathrm{QFT}_{2} = H"},
            {"label": "Product form", "latex": r"\mathrm{QFT}|x\rangle = \frac{1}{\sqrt{2^n}}\bigotimes_{\ell=1}^{n}\Big(|0\rangle + e^{2\pi i\, 0.x_{\ell}\cdots x_{n}}|1\rangle\Big)"},
            {"label": "Controlled-phase gate", "latex": r"R_k = \begin{pmatrix} 1 & 0 \\ 0 & e^{2\pi i / 2^{k}} \end{pmatrix}"},
            {"label": "Gate count", "latex": r"\tfrac{n(n+1)}{2} = O(n^2) \ \ll\ O(n\,2^n)\ \text{(classical FFT)}"},
        ],
        "further_reading": [
            NC["5.1"],
            {"title": "Coppersmith, An approximate Fourier transform useful in quantum factoring, IBM RC19642 (1994)", "url": "https://arxiv.org/abs/quant-ph/0201067"},
            {"title": "Shor, Polynomial-time algorithms for prime factorization and discrete logarithms, SIAM J. Comput. 26, 1484 (1997)", "url": "https://arxiv.org/abs/quant-ph/9508027"},
        ],
        "formulas": [
            {
                "latex": r"\mathrm{QFT}\,|x\rangle = \frac{1}{\sqrt{N}}\sum_{k=0}^{N-1} e^{2\pi i x k / N}\,|k\rangle,\qquad N = 2^n",
                "description": "The quantum Fourier transform: the unitary discrete Fourier transform on the 2^n amplitudes of an n-qubit register.",
                "symbols": {
                    "x": "input basis-state integer, 0 to N-1",
                    "k": "output basis-state index",
                    "N": "dimension, 2^n",
                    r"e^{2\pi i x k / N}": "N-th root-of-unity Fourier kernel",
                },
                "derivation_steps": [
                    "For $n=1$ ($N=2$) the kernel is $(-1)^{xk}$, giving $\\tfrac{1}{\\sqrt2}(|0\\rangle + (-1)^x|1\\rangle) = H|x\\rangle$.",
                    "Writing $k$ in binary factorizes the sum into a tensor product of single-qubit phase states.",
                    "Each qubit gets a Hadamard plus controlled-phase gates $R_k$, totaling $n(n+1)/2 = O(n^2)$ gates.",
                    "Terminal SWAPs reverse the output qubit order produced by the product form.",
                ],
            },
        ],
    },
    {
        "slug": "qc-grover-search",
        "related_simulation": "grover",
        "prerequisites": ["qc-circuit-model", "qc-single-qubit-gates", "qc-multi-qubit-gates", "qc-measurement-born-rule", "qc-superposition"],
        "overview": [
            "[[grovers-algorithm|Grover's algorithm]] searches an unstructured space of $N$ items for one (or several) marked entries. Classically, with no structure to exploit, finding a marked item among $N$ takes $O(N)$ queries to a checking oracle in the worst case — you may have to test nearly everything. Grover finds it with only $O(\\sqrt N)$ oracle queries, a quadratic speedup. The speedup is provable and optimal (no quantum algorithm does unstructured search faster), and unlike Shor's exponential advantage it applies to an enormously broad class of brute-force search and NP-style problems, making it one of the most widely applicable quantum primitives.",
            "The algorithm builds on two reflections applied to the uniform superposition $|s\\rangle = \\tfrac{1}{\\sqrt N}\\sum_x |x\\rangle$. First the [[phase-oracle|phase oracle]] $O_f$ marks the solution by a sign flip, $O_f|x\\rangle = (-1)^{f(x)}|x\\rangle$, reflecting the state about the unmarked subspace. Then the [[grover-diffusion-operator|diffusion operator]] $D = 2|s\\rangle\\langle s| - I$ reflects about the average amplitude ('inversion about the mean'), amplifying the marked amplitude the oracle just singled out. Their composition is the Grover iterate $G = D\\,O_f = (2|s\\rangle\\langle s| - I)\\,O_f$, whose repeated application is [[amplitude-amplification|amplitude amplification]] (objective o2).",
            "The dynamics are transparent in the two-dimensional plane spanned by the marked state $|w\\rangle$ and the normalized uniform superposition over unmarked states $|w^\\perp\\rangle$ (objective o3). The initial state $|s\\rangle$ makes a small angle $\\theta/2$ with $|w^\\perp\\rangle$, where $\\sin(\\theta/2) = \\sqrt{M/N}$ for $M$ marked items. Each Grover iterate is a rotation by the fixed angle $\\theta$ toward $|w\\rangle$: two reflections compose to a rotation of twice the angle between their axes. So the state marches toward the solution in equal angular steps, and the success probability is $\\sin^2\\!\\big((2k+1)\\theta/2\\big)$ after $k$ iterations.",
            "To maximize success you rotate as close to $|w\\rangle$ (angle $\\pi/2$) as possible, giving the optimal iteration count $k_{\\text{opt}} \\approx \\tfrac{\\pi}{4}\\sqrt{N/M}$ — for a single marked item among $N$, about $\\tfrac{\\pi}{4}\\sqrt N$ steps (objective o4), the source of the quadratic speedup. Rounding to the nearest integer leaves a success probability very close to 1. Crucially, more is not better: because each step is a fixed rotation, continuing past $k_{\\text{opt}}$ over-rotates past $|w\\rangle$ and the success probability falls again, oscillating periodically (objective o5). The claim 'run Grover until you are certain' is therefore wrong — you must stop at the computed optimum; running longer actively degrades the answer.",
        ],
        "history": (
            "Lov Grover introduced the algorithm in 1996 ('A fast quantum mechanical algorithm for database search', STOC 1996). Its optimality — that unstructured search cannot be done in fewer than $\\Omega(\\sqrt N)$ quantum queries — was established by Bennett, Bernstein, Brassard, and Vazirani (1997), and the exact rotation analysis and multi-solution/over-rotation behavior by Boyer, Brassard, Hoyer, and Tapp (1998)."
        ),
        "math_derivation": (
            "Work in the plane spanned by the marked state $|w\\rangle$ and the unmarked superposition $|w^\\perp\\rangle$. Write the start as "
            "$$|s\\rangle = \\cos\\tfrac{\\theta}{2}\\,|w^\\perp\\rangle + \\sin\\tfrac{\\theta}{2}\\,|w\\rangle,\\qquad \\sin\\tfrac{\\theta}{2} = \\sqrt{\\tfrac{M}{N}}.$$ "
            "The oracle $O_f$ reflects about $|w^\\perp\\rangle$ (flips the sign of the $|w\\rangle$ component); the diffusion $D = 2|s\\rangle\\langle s| - I$ reflects about $|s\\rangle$. The product of two reflections whose axes differ by angle $\\theta/2$ is a rotation by $\\theta$, so "
            "$$G^k|s\\rangle = \\cos\\!\\Big(\\tfrac{(2k+1)\\theta}{2}\\Big)|w^\\perp\\rangle + \\sin\\!\\Big(\\tfrac{(2k+1)\\theta}{2}\\Big)|w\\rangle.$$ "
            "Success probability (measuring $|w\\rangle$) is $p(k) = \\sin^2\\!\\big((2k+1)\\theta/2\\big)$. To reach $p\\approx 1$ set the angle to $\\pi/2$: $(2k+1)\\theta/2 \\approx \\pi/2$ gives $k \\approx \\tfrac{\\pi}{2\\theta} - \\tfrac12$. For small $\\theta/2 \\approx \\sqrt{M/N}$ this is "
            "$$k_{\\text{opt}} \\approx \\frac{\\pi}{4}\\sqrt{\\frac{N}{M}}.$$ "
            "Because $p(k)$ is periodic in $k$, taking $k > k_{\\text{opt}}$ rotates past $|w\\rangle$ and lowers $p$ — the over-rotation that makes 'more iterations' counterproductive."
        ),
        "key_equations": [
            {"label": "Grover iterate", "latex": r"G = (2|s\rangle\langle s| - I)\, O_f,\qquad |s\rangle = \tfrac{1}{\sqrt{N}}\sum_x |x\rangle"},
            {"label": "Rotation angle", "latex": r"\sin\tfrac{\theta}{2} = \sqrt{\tfrac{M}{N}}"},
            {"label": "Success probability after k steps", "latex": r"p(k) = \sin^2\!\Big(\tfrac{(2k+1)\theta}{2}\Big)"},
            {"label": "Optimal iterations", "latex": r"k_{\text{opt}} = \left\lfloor \tfrac{\pi}{4}\sqrt{\tfrac{N}{M}} \right\rfloor"},
            {"label": "Query complexity", "latex": r"O(\sqrt{N}) \ \text{vs classical}\ O(N)"},
        ],
        "further_reading": [
            NC["6.1"],
            {"title": "Grover, A fast quantum mechanical algorithm for database search, STOC 1996", "url": "https://arxiv.org/abs/quant-ph/9605043"},
            {"title": "Boyer, Brassard, Hoyer & Tapp, Tight bounds on quantum searching, Fortschr. Phys. 46, 493 (1998)", "url": "https://arxiv.org/abs/quant-ph/9605034"},
        ],
        "formulas": [
            {
                "latex": r"k_{\text{opt}} \approx \frac{\pi}{4}\sqrt{\frac{N}{M}},\qquad p(k) = \sin^2\!\Big(\tfrac{(2k+1)\theta}{2}\Big)",
                "description": "Optimal Grover iteration count and the oscillating success probability that peaks there and falls under over-rotation.",
                "symbols": {
                    "N": "size of the search space",
                    "M": "number of marked items",
                    "k": "number of Grover iterations",
                    r"\theta": "rotation angle per iterate, sin(theta/2) = sqrt(M/N)",
                    "p(k)": "probability of measuring a marked state after k iterates",
                },
                "derivation_steps": [
                    "Each iterate is two reflections = a rotation by $\\theta$ toward $|w\\rangle$ in the marked/unmarked plane.",
                    "After $k$ iterates the marked amplitude is $\\sin((2k+1)\\theta/2)$, so $p(k) = \\sin^2((2k+1)\\theta/2)$.",
                    "Maximize by setting the angle to $\\pi/2$: $k \\approx \\pi/(2\\theta) - 1/2 \\approx (\\pi/4)\\sqrt{N/M}$ for small $\\theta$.",
                    "Since $p(k)$ is periodic, iterating past $k_{\\text{opt}}$ over-rotates and reduces the success probability.",
                ],
            },
        ],
    },
    {
        "slug": "qc-phase-estimation",
        "related_simulation": "phase_estimation",
        "prerequisites": ["qc-quantum-fourier-transform", "qc-multi-qubit-gates", "qc-measurement-born-rule"],
        "overview": [
            "[[quantum-phase-estimation|Quantum phase estimation (QPE)]] extracts the eigenvalue phase of a unitary. Given a unitary $U$ and one of its eigenstates $|u\\rangle$ with $U|u\\rangle = e^{2\\pi i\\varphi}|u\\rangle$ for an unknown $\\varphi \\in [0,1)$, QPE outputs an $n$-bit estimate of $\\varphi$. It is the single most important algorithmic primitive after the QFT: it is the eigenvalue-reading subroutine at the heart of Shor's order-finding, of quantum simulation energy estimation, and of the HHL linear-systems algorithm (objective o5). The problem statement (objective o1) presumes you can prepare $|u\\rangle$ and apply controlled powers of $U$; the algorithm turns those into bits of $\\varphi$.",
            "The circuit uses two registers: a $t$-qubit counting register initialized with Hadamards to the uniform superposition, and a target register holding $|u\\rangle$. For each counting qubit $j$ (value $2^j$) one applies a controlled-$U^{2^j}$ with $|u\\rangle$ as target (objective o2). By [[phase-kickback|phase kickback]], since $|u\\rangle$ is an eigenstate, $U^{2^j}$ contributes the phase $e^{2\\pi i\\,2^j\\varphi}$ onto that control qubit's $|1\\rangle$ branch while leaving $|u\\rangle$ untouched. After all controlled operations the counting register holds $\\tfrac{1}{\\sqrt{2^t}}\\sum_{k=0}^{2^t-1} e^{2\\pi i\\varphi k}|k\\rangle$ — exactly the [[quantum-fourier-transform|QFT]] of the basis state $|\\,2^t\\varphi\\,\\rangle$.",
            "Recognizing that Fourier state is the whole trick (objective o3). Applying the inverse QFT to the counting register concentrates the amplitude on the bit string encoding $\\varphi$. If $\\varphi$ is exactly representable in $t$ bits, $\\varphi = 0.\\varphi_1\\varphi_2\\cdots\\varphi_t$, the inverse QFT is exact and measurement returns those bits with certainty. When $\\varphi$ is not exactly $t$-bit, the output is the nearest bit string with high probability and a controlled tail — QPE returns the best $t$-bit approximation, degrading gracefully rather than failing.",
            "Sizing the register trades qubits for accuracy and confidence (objective o4). To obtain $\\varphi$ to $n$ bits of accuracy with success probability at least $1-\\epsilon$, it suffices to use $t = n + \\lceil \\log_2(2 + \\tfrac{1}{2\\epsilon}) \\rceil$ counting qubits: the extra $\\lceil\\log_2(2+1/2\\epsilon)\\rceil$ pad qubits buy the confidence margin against the non-exact tail. The cost is dominated by the controlled-$U^{2^j}$ operations (the largest being $U^{2^{t-1}}$), so efficient QPE requires being able to apply high powers of $U$ efficiently — the condition Shor's algorithm meets via fast modular exponentiation.",
        ],
        "history": (
            "Phase estimation was introduced by Alexei Kitaev in 1995 ('Quantum measurements and the abelian stabilizer problem') as the eigenvalue-estimation core of a general algorithmic framework, and recast in the now-standard controlled-$U$-plus-inverse-QFT circuit by Cleve, Ekert, Macchiavello, and Mosca (1998). It retrospectively unified Shor's algorithm, revealing order-finding as an instance of eigenvalue estimation."
        ),
        "math_derivation": (
            "After the Hadamards and the controlled-$U^{2^j}$ gates, expand the counting register. Qubit $j$ acquires the relative phase $e^{2\\pi i\\,2^j\\varphi}$ on its $|1\\rangle$ branch, so the product over qubits gives "
            "$$\\frac{1}{\\sqrt{2^t}}\\bigotimes_{j=0}^{t-1}\\Big(|0\\rangle + e^{2\\pi i\\, 2^{j}\\varphi}|1\\rangle\\Big) = \\frac{1}{\\sqrt{2^t}}\\sum_{k=0}^{2^t-1} e^{2\\pi i\\varphi k}|k\\rangle \\otimes |u\\rangle.$$ "
            "This is precisely $\\mathrm{QFT}\\,|2^t\\varphi\\rangle$ when $2^t\\varphi$ is an integer. Applying the inverse QFT to the counting register yields "
            "$$\\mathrm{QFT}^{\\dagger}\\Big(\\frac{1}{\\sqrt{2^t}}\\sum_k e^{2\\pi i\\varphi k}|k\\rangle\\Big) = |2^t\\varphi\\rangle$$ "
            "when $\\varphi = 0.\\varphi_1\\cdots\\varphi_t$ is exactly $t$-bit, so measurement returns the bit string $\\varphi_1\\cdots\\varphi_t$ with probability 1. For general $\\varphi$, the amplitude peaks at the nearest integer $b$ to $2^t\\varphi$; a standard bound shows that with "
            "$$t = n + \\Big\\lceil \\log_2\\!\\Big(2 + \\frac{1}{2\\epsilon}\\Big)\\Big\\rceil$$ "
            "counting qubits, the first $n$ bits are correct with probability at least $1-\\epsilon$."
        ),
        "key_equations": [
            {"label": "Eigenvalue relation", "latex": r"U|u\rangle = e^{2\pi i \varphi}|u\rangle,\qquad \varphi \in [0,1)"},
            {"label": "Counting register after controlled-U", "latex": r"\frac{1}{\sqrt{2^t}}\sum_{k=0}^{2^t-1} e^{2\pi i \varphi k}\,|k\rangle"},
            {"label": "Read-out by inverse QFT", "latex": r"\mathrm{QFT}^{\dagger}\!\left(\frac{1}{\sqrt{2^t}}\sum_k e^{2\pi i \varphi k}|k\rangle\right) = |2^t\varphi\rangle \ \ (\varphi\ \text{exact})"},
            {"label": "Counting qubits for n bits, confidence 1 - eps", "latex": r"t = n + \left\lceil \log_2\!\Big(2 + \tfrac{1}{2\epsilon}\Big) \right\rceil"},
        ],
        "further_reading": [
            NC["5.2"],
            {"title": "Kitaev, Quantum measurements and the abelian stabilizer problem (1995)", "url": "https://arxiv.org/abs/quant-ph/9511026"},
            {"title": "Cleve, Ekert, Macchiavello & Mosca, Quantum algorithms revisited, Proc. R. Soc. Lond. A 454, 339 (1998)", "url": "https://arxiv.org/abs/quant-ph/9708016"},
        ],
        "formulas": [
            {
                "latex": r"\frac{1}{\sqrt{2^t}}\sum_{k=0}^{2^t-1} e^{2\pi i \varphi k}\,|k\rangle \ \xrightarrow{\ \mathrm{QFT}^{\dagger}\ }\ |2^t\varphi\rangle",
                "description": "Phase kickback writes the eigenphase into a Fourier state on the counting register; the inverse QFT reads out phi's bits.",
                "symbols": {
                    r"\varphi": "eigenphase to be estimated, U|u> = e^{2 pi i phi}|u>",
                    "t": "number of counting qubits",
                    "k": "counting-register basis index",
                    r"\mathrm{QFT}^{\dagger}": "inverse quantum Fourier transform",
                },
                "derivation_steps": [
                    "Each controlled-$U^{2^j}$ kicks the phase $e^{2\\pi i 2^j\\varphi}$ onto counting qubit $j$'s $|1\\rangle$ branch.",
                    "The product over qubits is $\\tfrac{1}{\\sqrt{2^t}}\\sum_k e^{2\\pi i\\varphi k}|k\\rangle$, the QFT of $|2^t\\varphi\\rangle$.",
                    "Applying $\\mathrm{QFT}^{\\dagger}$ inverts this to $|2^t\\varphi\\rangle$, exact when $\\varphi$ is $t$-bit representable.",
                    "For general $\\varphi$, using $t = n + \\lceil\\log_2(2 + 1/2\\epsilon)\\rceil$ qubits gives $n$ correct bits with probability $\\ge 1-\\epsilon$.",
                ],
            },
        ],
    },
    {
        "slug": "qc-shor-factoring",
        "related_simulation": "shor",
        "prerequisites": ["qc-phase-estimation", "qc-quantum-fourier-transform", "qc-prereq-classical-computing"],
        "overview": [
            "[[shors-algorithm|Shor's algorithm]] factors an $n$-bit integer $N$ in polynomial time, threatening RSA and the discrete-log cryptosystems whose security rests on factoring being hard. Its structure is a hybrid: reduce factoring to [[order-finding|order-finding]] for a random base $a$ coprime to $N$, solve order-finding with [[quantum-phase-estimation|quantum phase estimation]] on the modular-multiplication unitary, and finish with classical post-processing (objective o1). Only the order-finding step is quantum; the reductions before and after are elementary number theory. This modular design is why Shor's algorithm is best understood as 'phase estimation applied to a cleverly chosen unitary'.",
            "The number-theoretic core (objective o2) is the order $r$ of $a$ modulo $N$: the least positive integer with $a^r \\equiv 1 \\pmod N$. If $r$ is even and $a^{r/2} \\not\\equiv -1 \\pmod N$, then $a^{r/2}$ is a nontrivial square root of $1$, so $(a^{r/2}-1)(a^{r/2}+1) \\equiv 0 \\pmod N$ while neither factor is $0$ mod $N$; hence $\\gcd(a^{r/2}\\pm 1, N)$ yields nontrivial factors of $N$, computed classically by Euclid's algorithm. A random $a$ satisfies the 'good' conditions with probability at least $1/2$, so a few tries suffice.",
            "Order-finding becomes eigenvalue estimation via the unitary $U|y\\rangle = |ay \\bmod N\\rangle$ (objective o3). Its eigenstates are Fourier combinations $|u_s\\rangle = \\tfrac{1}{\\sqrt r}\\sum_{k=0}^{r-1} e^{-2\\pi i s k / r}|a^k \\bmod N\\rangle$ with eigenvalues $e^{2\\pi i s/r}$ for $s = 0,\\dots,r-1$. Phase estimation on $U$ therefore returns an estimate of a phase $s/r$ for a random $s$. Because you cannot prepare a single $|u_s\\rangle$, you run QPE on the easily prepared state $|1\\rangle = \\tfrac{1}{\\sqrt r}\\sum_s |u_s\\rangle$, which yields a uniformly random $s$. The measured $t$-bit fraction $\\approx s/r$ is then fed to the [[continued-fraction-expansion|continued-fraction expansion]], which recovers the denominator $r$ exactly whenever $s/r$ is known to sufficient precision (about $2n+1$ bits) and $\\gcd(s,r)=1$.",
            "The payoff is complexity (objective o4). Shor's algorithm runs in $O(n^2 \\log n \\log\\log n)$ to $O(n^3)$ gate operations — polynomial in the number of digits $n$ — dominated by the modular exponentiation feeding the QPE, whose speedup traces directly to the $O(n^2)$ QFT inside phase estimation. The best known classical factoring algorithm, the general number field sieve, runs in sub-exponential $\\exp\\!\\big(O(n^{1/3}\\log^{2/3} n)\\big)$ time: super-polynomial. This exponential-versus-polynomial gap is the headline [[quantum-advantage|quantum advantage]]. As a concrete instance (objective o5), for $N = 15$, $a = 7$ one finds $r = 4$ (since $7^1{=}7,\\,7^2{=}49\\equiv 4,\\,7^3\\equiv 13,\\,7^4\\equiv 1 \\pmod{15}$); then $a^{r/2} = 7^2 = 49 \\equiv 4$, and $\\gcd(4-1,15)=3$, $\\gcd(4+1,15)=5$, recovering $15 = 3\\times 5$.",
        ],
        "history": (
            "Peter Shor announced the polynomial-time quantum factoring and discrete-logarithm algorithms in 1994 (FOCS; journal version SIAM J. Comput. 26, 1484, 1997), the result that transformed quantum computing from curiosity to strategic priority by breaking RSA in principle. The order-finding reduction rests on classical number theory (Euler, Lagrange) and continued fractions; small-scale experimental factorings of $N = 15$ followed with NMR (Vandersypen et al., 2001) and photonic implementations."
        ),
        "math_derivation": (
            "Reduce factoring to order-finding and run the $N=15$, $a=7$ example. Choose $a$ coprime to $N$ and let $r$ be its order. Phase estimation on $U|y\\rangle = |ay \\bmod N\\rangle$ with input $|1\\rangle$ returns a $t$-bit approximation of $s/r$ for random $s$. Apply the continued-fraction algorithm to the measured fraction to obtain $r$. "
            "Then use the factorization of unity: $a^r \\equiv 1$ means $N \\mid (a^{r/2}-1)(a^{r/2}+1)$ when $r$ is even, so provided $a^{r/2} \\not\\equiv -1 \\pmod N$, "
            "$$\\gcd(a^{r/2} - 1,\\, N)\\ \\text{and}\\ \\gcd(a^{r/2} + 1,\\, N)$$ "
            "are nontrivial factors. For $N = 15$, $a = 7$: the powers mod 15 are $7, 4, 13, 1$, so $r = 4$ (even, good). Then $a^{r/2} = 7^2 = 49 \\equiv 4 \\pmod{15}$, and $4 \\not\\equiv -1 \\equiv 14$, so "
            "$$\\gcd(4 - 1, 15) = \\gcd(3,15) = 3,\\qquad \\gcd(4 + 1, 15) = \\gcd(5,15) = 5,$$ "
            "giving $15 = 3\\times 5$. In the quantum run, a measured phase such as $0.01_2 = 1/4$ has continued-fraction convergent $1/4$, exposing the denominator $r = 4$ directly."
        ),
        "key_equations": [
            {"label": "Order of a mod N", "latex": r"r = \min\{\, m > 0 : a^{m} \equiv 1 \pmod{N} \,\}"},
            {"label": "Factors from the order", "latex": r"\gcd(a^{r/2} \pm 1,\, N)\quad (r\ \text{even},\ a^{r/2} \not\equiv -1)"},
            {"label": "Modular-multiplication unitary", "latex": r"U|y\rangle = |a y \bmod N\rangle,\qquad U|u_s\rangle = e^{2\pi i s/r}|u_s\rangle"},
            {"label": "Phase to order (continued fractions)", "latex": r"\text{measured } \tfrac{s}{r} \ \xrightarrow{\ \text{continued fractions}\ }\ r"},
            {"label": "Complexity gap", "latex": r"\text{Shor } O(n^3)\ \ \text{vs GNFS } e^{O(n^{1/3}\log^{2/3} n)}"},
        ],
        "further_reading": [
            NC["5.3"],
            NC["5.3.1"],
            {"title": "Shor, Polynomial-time algorithms for prime factorization and discrete logarithms, SIAM J. Comput. 26, 1484 (1997)", "url": "https://arxiv.org/abs/quant-ph/9508027"},
            {"title": "Vandersypen et al., Experimental realization of Shor's algorithm, Nature 414, 883 (2001)", "url": "https://doi.org/10.1038/414883a"},
        ],
        "formulas": [
            {
                "latex": r"\gcd(a^{r/2} - 1,\, N),\ \ \gcd(a^{r/2} + 1,\, N)\quad\text{with } a^r \equiv 1 \pmod N",
                "description": "Recovering factors of N from an even order r whose half-power is a nontrivial square root of 1 mod N.",
                "symbols": {
                    "N": "integer to factor",
                    "a": "random base coprime to N",
                    "r": "order of a mod N (least m with a^m = 1 mod N)",
                    r"\gcd": "greatest common divisor (Euclid's algorithm)",
                },
                "derivation_steps": [
                    "$a^r \\equiv 1$ factors as $N \\mid (a^{r/2}-1)(a^{r/2}+1)$ when $r$ is even.",
                    "If also $a^{r/2} \\not\\equiv -1 \\pmod N$, neither factor is a multiple of $N$, so both gcds are nontrivial.",
                    "Order-finding supplies $r$ via phase estimation on $U|y\\rangle = |ay \\bmod N\\rangle$ and continued fractions on the measured $s/r$.",
                    "Example $N=15, a=7$: $r=4$, $a^{2}\\equiv 4$, giving $\\gcd(3,15)=3$ and $\\gcd(5,15)=5$.",
                ],
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Populate the Quantum Computing track Modules 2-3 (branches, lesson concepts, full content)."

    @transaction.atomic
    def handle(self, *args, **options):
        # 1. Categories — ordered after the Phase-1 QC branches (9, 10).
        self.stdout.write(self.style.MIGRATE_HEADING("Ensuring QC gates/algorithms category branches"))
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
        self.stdout.write(self.style.MIGRATE_HEADING("Seeding QC Module 2-3 lesson concepts"))
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
        run(self, TOPICS, "Quantum Computing Modules 2-3")

        # 4. Refresh the FTS vectors so the new lessons are searchable / RAG-visible.
        for slug, *_ in CONCEPTS:
            Concept.objects.get(slug=slug).update_search_vector()
        self.stdout.write(self.style.SUCCESS("Refreshed search vectors for QC Module 2-3 lessons."))

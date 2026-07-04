"""Populate the Quantum Computing track, Phase 3 (Modules 4-5).

Creates the two QC Category branches `qc-programming` (order 13) and
`qc-error-correction` (order 14) after the Phase-2 branches, seeds the 10 lesson
Concept rows from `docs/quantum-computing/prerequisites.json`, and authors their
content (overview, key equations, formulas, prerequisite edges) via `_content.run`.

Idempotent: branches/concepts via `update_or_create` (matched by slug); content
via `_content.apply_topic`. Re-running updates rows in place and never
duplicates. Run standalone — it seeds its own Concept rows before filling
content, so it does not depend on `seed_concepts`. Prerequisite edges to earlier
slugs (e.g. qc-circuit-model, qc-bloch-sphere) resolve only if Phases 1-2 have
been populated. Glossary first-use terms are marked `[[term-slug]]` in prose.
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.concepts.models import Category, Concept
from ._content import run

# ── Category branches (Module -> Category), ordered after the Phase-2 branches ──
BRANCHES = [
    (
        "qc-programming",
        "QC: Programming Quantum Computers",
        "The practicum: the circuit-as-program model, building circuits in code, "
        "measurement and shot-based sampling, simulators and transpilation, and "
        "coding the core algorithms. Run circuits live in the in-browser playground.",
        "#0EA5E9",
        13,
    ),
    (
        "qc-error-correction",
        "QC: Error Correction & Noise",
        "Why quantum information decoheres and how to protect it: noise channels, "
        "the 3-qubit repetition codes, the 9-qubit Shor code and error "
        "discretization, stabilizer/CSS and Steane codes, and surface codes with "
        "the threshold theorem.",
        "#F43F5E",
        14,
    ),
]

# ── Concept rows (Lesson -> Concept). `order` follows topological_order. ──
CONCEPTS = [
    # Module 4 — qc-programming
    ("qc-quantum-programming-model", "The Quantum Programming Model", "qc-programming", "intermediate", 1,
     "Circuits as programs: registers, gate instructions, measurement, and the statevector vs sampling views."),
    ("qc-building-circuits-in-code", "Building Circuits in Code", "qc-programming", "intermediate", 2,
     "Preparing Bell and GHZ states, composing subcircuits, and parameterized gates."),
    ("qc-measurement-and-shots", "Measurement, Shots & Sampling", "qc-programming", "intermediate", 3,
     "Shots, statistical error, expectation values from counts, and simulators vs samplers."),
    ("qc-simulators-and-transpilation", "Simulators, Transpilation & Limits", "qc-programming", "advanced", 4,
     "Transpilation to native gates, the 2^n memory wall, and statevector vs stabilizer simulators."),
    ("qc-coding-quantum-algorithms", "Coding Quantum Algorithms", "qc-programming", "advanced", 5,
     "Implementing Deutsch-Jozsa and a Grover iteration, and reading algorithm histograms."),
    # Module 5 — qc-error-correction
    ("qc-decoherence-and-noise", "Decoherence & Noise Channels", "qc-error-correction", "advanced", 1,
     "Decoherence, T1/T2, and the bit-flip, phase-flip, and depolarizing channels on the Bloch ball."),
    ("qc-three-qubit-bit-flip-code", "The 3-Qubit Bit-Flip Code", "qc-error-correction", "advanced", 2,
     "The repetition code, syndrome extraction with ancillas, and majority-vote correction."),
    ("qc-phase-flip-and-shor-code", "Phase-Flip & the 9-Qubit Shor Code", "qc-error-correction", "advanced", 3,
     "Hadamard-conjugated phase-flip code, the [[9,1,3]] Shor code, and error discretization."),
    ("qc-css-and-steane-code", "Stabilizer & Steane CSS Codes", "qc-error-correction", "advanced", 4,
     "Stabilizer formalism, CSS construction from the [7,4,3] Hamming code, and the [[7,1,3]] Steane code."),
    ("qc-surface-codes-threshold", "Surface Codes & the Threshold Theorem", "qc-error-correction", "advanced", 5,
     "The 2D surface code, star/plaquette checks, syndrome matching, and the fault-tolerance threshold."),
]

# ── Full content. See _content.apply_topic for the topic-dict contract. ──
TOPICS = [
    {
        "slug": "qc-quantum-programming-model",
        "related_simulation": "circuit_playground",
        "history": (
            "Running a quantum computer means writing a [[quantum-circuit]] as a short "
            "program — a list of gate instructions applied to named qubits, followed by "
            "measurement. Frameworks such as Qiskit and Cirq expose exactly this: allocate "
            "registers, append gates, then sample. The playground here uses a minimal, safe "
            "circuit language (`h q0`, `cx q0 q1`, `measure`) that runs entirely in your "
            "browser on an exact statevector."
        ),
        "overview": [
            "A quantum program has three ingredients: a *quantum register* of qubits initialised "
            "to $|0\\dots0\\rangle$, a sequence of *gate instructions* (unitaries) applied left to "
            "right in time, and *measurement*, which samples the computational basis and writes "
            "classical bits. Because gates are unitary they are reversible; measurement is the only "
            "irreversible, probabilistic step.",
            "There are two complementary ways to look at a running circuit. The **statevector view** "
            "tracks the full complex amplitude vector $|\\psi\\rangle$ of dimension $2^n$ — everything, "
            "but only available on a simulator. The **sampling view** runs the circuit many times "
            "(*shots*) and records how often each bitstring appears; this is all a real device gives "
            "you. The sampled frequencies approximate the Born-rule probabilities $|\\langle x|\\psi\\rangle|^2$.",
            "For example, `h q0; cx q0 q1` prepares the Bell state $\\tfrac{1}{\\sqrt2}(|00\\rangle+|11\\rangle)$: "
            "the statevector shows two amplitudes of $1/\\sqrt2$, and sampling yields roughly 50% `00` and "
            "50% `11`, never `01` or `10`.",
        ],
        "key_equations": [
            {"label": "Initial register", "latex": r"|\psi_0\rangle = |0\rangle^{\otimes n}"},
            {"label": "Circuit as ordered unitaries", "latex": r"|\psi\rangle = U_m \cdots U_2 U_1 |\psi_0\rangle"},
            {"label": "Sampling (Born rule)", "latex": r"\Pr(x) = |\langle x|\psi\rangle|^2"},
        ],
        "prerequisites": ["qc-circuit-model", "qc-measurement-born-rule"],
    },
    {
        "slug": "qc-building-circuits-in-code",
        "related_simulation": "circuit_playground",
        "history": (
            "Once you can place gates, useful states are a few lines away. Entangling gates turn "
            "product states into correlated ones: the [[bell-state]] and its $n$-qubit cousin, the "
            "GHZ state, are the 'hello world' of quantum programming."
        ),
        "overview": [
            "A Bell state is built by a Hadamard followed by a CNOT: `h q0; cx q0 q1`. The pattern "
            "generalises — a Hadamard on the first qubit then a chain of CNOTs $q_0\\!\\to\\!q_1\\!\\to\\!"
            "\\cdots\\!\\to\\!q_{n-1}$ produces the $n$-qubit GHZ state "
            "$\\tfrac{1}{\\sqrt2}(|0\\dots0\\rangle+|1\\dots1\\rangle)$.",
            "Circuits compose: appending the gates of subcircuit $B$ after subcircuit $A$ realises the "
            "unitary $U_B U_A$. Order matters because gates generally do not commute, so `h q0; z q0` "
            "and `z q0; h q0` are different programs. Building a target unitary is the art of choosing a "
            "gate order that multiplies out to it.",
            "**Parameterized gates** like $R_x(\\theta)$, $R_y(\\theta)$, $R_z(\\theta)$ take a continuous "
            "angle, so a single circuit template with free parameters defines a whole family of states — "
            "the backbone of variational algorithms you will meet in Module 6.",
        ],
        "key_equations": [
            {"label": "Bell state", "latex": r"\text{H}(q_0),\ \text{CX}(q_0,q_1):\ |00\rangle \mapsto \tfrac{1}{\sqrt2}(|00\rangle+|11\rangle)"},
            {"label": "GHZ state", "latex": r"\tfrac{1}{\sqrt2}\big(|0\rangle^{\otimes n}+|1\rangle^{\otimes n}\big)"},
            {"label": "Composition", "latex": r"U_{BA} = U_B\,U_A"},
        ],
        "prerequisites": ["qc-quantum-programming-model", "qc-multi-qubit-gates"],
    },
    {
        "slug": "qc-measurement-and-shots",
        "related_simulation": "circuit_playground",
        "history": (
            "A real device never hands you amplitudes — it hands you samples. Understanding how many "
            "*shots* you need, and how to turn counts into the numbers you care about, is the core "
            "experimental skill of quantum programming."
        ),
        "overview": [
            "Each execution of a circuit is a **shot**: prepare, run, measure, record one bitstring. "
            "Repeating $N$ shots estimates each probability $p_x$ by its frequency $\\hat p_x = n_x/N$. "
            "Like any Monte-Carlo estimate the statistical error scales as $1/\\sqrt N$, so resolving a "
            "probability to $\\pm\\epsilon$ needs $N \\sim 1/\\epsilon^2$ shots — halving the error "
            "quadruples the cost.",
            "Most quantities of interest are **expectation values**. For a single qubit measured in the "
            "$Z$ basis, $\\langle Z\\rangle = p_0 - p_1$, estimated directly from counts as "
            "$(n_0-n_1)/N$. Observables not diagonal in the computational basis (e.g. $\\langle X\\rangle$) "
            "are measured by rotating into their eigenbasis first (apply $H$, then measure $Z$).",
            "An **ideal statevector simulator** returns the exact amplitudes and hence exact probabilities "
            "— no sampling noise — but costs $2^n$ memory. A **shot-based sampler** mimics hardware, "
            "returning a histogram with $1/\\sqrt N$ fluctuations. The playground offers both: read exact "
            "amplitudes, or press *sample* to see the histogram converge.",
        ],
        "key_equations": [
            {"label": "Frequency estimate", "latex": r"\hat p_x = n_x / N"},
            {"label": "Statistical error", "latex": r"\Delta \hat p \sim \frac{\sqrt{p(1-p)}}{\sqrt N} \sim \frac{1}{\sqrt N}"},
            {"label": "Expectation from counts", "latex": r"\langle Z\rangle = p_0 - p_1 = (n_0-n_1)/N"},
        ],
        "prerequisites": ["qc-quantum-programming-model", "qc-density-matrices-mixed-states"],
    },
    {
        "slug": "qc-simulators-and-transpilation",
        "related_simulation": "circuit_playground",
        "history": (
            "Between your abstract circuit and a physical chip sits the *transpiler*, and behind every "
            "simulator sits the exponential wall of $2^n$ amplitudes. Knowing both is what separates a "
            "textbook circuit from one that actually runs."
        ),
        "overview": [
            "Hardware implements only a fixed **native gate set** on a fixed **connectivity** graph. "
            "*Transpilation* rewrites your circuit into that set — decomposing gates via universality "
            "(Module 2) and inserting SWAPs so that two-qubit gates act only on physically adjacent "
            "qubits. Transpilation changes the gate count and depth but not the logical unitary.",
            "Exact **statevector simulation** stores all $2^n$ complex amplitudes. At 8 bytes per real "
            "part, $n=30$ qubits already needs $2^{30}\\times16$ bytes $\\approx 16$ GB, and each extra "
            "qubit doubles it — the reason exact simulation stalls near 30-50 qubits even on "
            "supercomputers. This exponential memory is exactly the resource a quantum computer spends "
            "physically instead of classically.",
            "Not all circuits are hard to simulate. A **stabilizer (Clifford) simulator** runs circuits "
            "built only from $\\{H, S, \\text{CNOT}\\}$ in polynomial time (Gottesman-Knill, Module 2), "
            "which is why error-correction circuits — largely Clifford — can be simulated at thousands of "
            "qubits. Adding non-Clifford $T$ gates is what forces the exponential statevector cost.",
        ],
        "key_equations": [
            {"label": "Statevector size", "latex": r"\dim|\psi\rangle = 2^n \text{ complex amplitudes}"},
            {"label": "Memory estimate", "latex": r"\text{bytes} \approx 2^n \times 16"},
        ],
        "prerequisites": ["qc-building-circuits-in-code", "qc-universal-gate-sets"],
    },
    {
        "slug": "qc-coding-quantum-algorithms",
        "related_simulation": "circuit_playground",
        "history": (
            "The algorithms of Module 3 become a handful of playground lines. Coding them makes the "
            "abstract oracle concrete and shows how interference turns amplitudes into an answer you can "
            "read off a histogram."
        ),
        "overview": [
            "**Deutsch-Jozsa** in code: Hadamard the input register and the $|-\\rangle$ ancilla, apply "
            "the phase oracle $|x\\rangle\\!\\to\\!(-1)^{f(x)}|x\\rangle$, Hadamard again, then measure. A "
            "constant $f$ yields the all-zeros string with certainty; any nonzero outcome means balanced. "
            "The whole quantum program is $O(n)$ gates plus one oracle call.",
            "**One Grover iteration** is the phase oracle $O_f$ followed by the diffusion operator "
            "$D = 2|s\\rangle\\langle s| - I$, itself compiled as $H^{\\otimes n}$, a multi-controlled "
            "phase flip about $|0\\dots0\\rangle$, and $H^{\\otimes n}$ again. Repeating it "
            "$\\approx\\lfloor\\tfrac{\\pi}{4}\\sqrt{N}\\rfloor$ times drives the amplitude onto the marked "
            "item, visible as a dominant histogram peak.",
            "In both cases the **oracle is an abstraction**: on real hardware $O_f$ must be synthesised "
            "from elementary gates, and its cost counts. Reading an algorithm's output means interpreting "
            "the histogram — the tallest bar is the measured answer, and more shots sharpen the signal.",
        ],
        "key_equations": [
            {"label": "Grover iterate", "latex": r"G = D\,O_f,\qquad D = 2|s\rangle\langle s| - I"},
            {"label": "Optimal iterations", "latex": r"k \approx \big\lfloor \tfrac{\pi}{4}\sqrt{N/M} \big\rfloor"},
        ],
        "prerequisites": ["qc-building-circuits-in-code", "qc-grover-search", "qc-deutsch-jozsa"],
    },
    {
        "slug": "qc-decoherence-and-noise",
        "related_simulation": "noise_channel",
        "history": (
            "Real qubits are open systems: they leak information into their environment. This "
            "[[decoherence]] is the central obstacle to quantum computing, and understanding it as a set "
            "of *noise channels* acting on the [[density-matrix]] is the first step toward correcting it."
        ),
        "overview": [
            "**Decoherence** is the loss of quantum coherence as a qubit couples to its environment. Two "
            "timescales quantify it: $T_1$, the *relaxation* time for the excited state $|1\\rangle$ to "
            "decay toward $|0\\rangle$ (energy loss), and $T_2 \\le 2T_1$, the *dephasing* time over which "
            "the relative phase between $|0\\rangle$ and $|1\\rangle$ randomises (loss of off-diagonal "
            "coherence).",
            "Noise is modelled by **quantum channels** — completely-positive trace-preserving maps on "
            "$\\rho$. The **bit-flip** channel applies $X$ with probability $p$; the **phase-flip** applies "
            "$Z$ with probability $p$; the **depolarizing** channel replaces the state with the maximally "
            "mixed $I/2$ with probability $p$. Each is written in Kraus form "
            "$\\rho \\mapsto \\sum_k K_k \\rho K_k^\\dagger$.",
            "Geometrically every noise channel **shrinks the Bloch vector**. Dephasing with probability "
            "$p$ contracts the $x,y$ components by $(1-2p)$, collapsing the vector toward the $z$-axis; "
            "depolarizing shrinks all three components by $(1-p)$ toward the centre. A pure state on the "
            "sphere becomes a mixed state inside the ball — coherence, and with it computational power, is "
            "lost.",
        ],
        "key_equations": [
            {"label": "Bit-flip channel", "latex": r"\rho \mapsto (1-p)\,\rho + p\,X\rho X"},
            {"label": "Phase-flip channel", "latex": r"\rho \mapsto (1-p)\,\rho + p\,Z\rho Z"},
            {"label": "Depolarizing channel", "latex": r"\rho \mapsto (1-p)\,\rho + p\,\tfrac{I}{2}"},
        ],
        "math_derivation": (
            "For a single qubit $\\rho = \\tfrac12(I + \\vec r\\cdot\\vec\\sigma)$, the dephasing channel "
            "$\\rho\\mapsto(1-p)\\rho + pZ\\rho Z$ leaves the diagonal ($z$) untouched but sends the "
            "off-diagonal coherences $\\rho_{01}\\mapsto(1-2p)\\rho_{01}$, so $(r_x,r_y)\\mapsto(1-2p)(r_x,r_y)$. "
            "At $p=\\tfrac12$ the off-diagonals vanish entirely: the qubit is fully dephased."
        ),
        "formulas": [
            {
                "latex": r"\rho' = (1-p)\rho + pZ\rho Z",
                "description": "Dephasing (phase-flip) channel acting on a single-qubit density matrix.",
                "symbols": {"p": "error probability", r"\rho": "input density matrix", "Z": "Pauli-Z"},
                "derivation_steps": [
                    "Write $\\rho=\\begin{pmatrix}\\rho_{00}&\\rho_{01}\\\\ \\rho_{10}&\\rho_{11}\\end{pmatrix}$.",
                    "Compute $Z\\rho Z=\\begin{pmatrix}\\rho_{00}&-\\rho_{01}\\\\ -\\rho_{10}&\\rho_{11}\\end{pmatrix}$.",
                    "Then $(1-p)\\rho+pZ\\rho Z$ keeps the diagonal and scales the off-diagonals by $(1-2p)$.",
                    "Hence coherence $\\rho_{01}\\to(1-2p)\\rho_{01}$; at $p=1/2$ it is destroyed.",
                ],
            }
        ],
        "prerequisites": ["qc-density-matrices-mixed-states", "qc-bloch-sphere"],
    },
    {
        "slug": "qc-three-qubit-bit-flip-code",
        "related_simulation": "bit_flip_code",
        "history": (
            "Quantum error correction begins with a classical idea — redundancy — adapted to obey "
            "no-cloning and to avoid measuring the data. The 3-qubit repetition code is the simplest "
            "example and already shows every essential trick."
        ),
        "overview": [
            "The **3-qubit bit-flip code** encodes one logical qubit into three physical ones: "
            "$|0\\rangle_L=|000\\rangle$, $|1\\rangle_L=|111\\rangle$, so a superposition "
            "$\\alpha|0\\rangle+\\beta|1\\rangle$ becomes $\\alpha|000\\rangle+\\beta|111\\rangle$ (built "
            "with two CNOTs, not by cloning). A single $X$ error on any one qubit moves the state into an "
            "orthogonal subspace that can be detected and undone.",
            "The key is to extract a **syndrome without learning the data**. Measuring the parity "
            "operators $Z_1Z_2$ and $Z_2Z_3$ — via two ancilla qubits — reveals *which* qubits disagree "
            "but nothing about $\\alpha,\\beta$. The two-bit syndrome $(Z_1Z_2, Z_2Z_3)$ points at the "
            "flipped qubit: $00$ = no error, $10$ = qubit 1, $11$ = qubit 2, $01$ = qubit 3. Apply $X$ "
            "there to correct.",
            "Because the parity checks commute with the logical operators and are measured on ancillas, "
            "the encoded **superposition never collapses** — only the error is projected onto a definite "
            "Pauli. The price: this code corrects a bit flip but is blind to a **phase flip** $Z$, which "
            "acts identically on $|000\\rangle$ and $|111\\rangle$ up to a sign and leaves every $ZZ$ "
            "parity unchanged.",
        ],
        "key_equations": [
            {"label": "Encoding", "latex": r"\alpha|0\rangle+\beta|1\rangle \;\mapsto\; \alpha|000\rangle+\beta|111\rangle"},
            {"label": "Syndrome operators", "latex": r"S_1 = Z_1Z_2,\qquad S_2 = Z_2Z_3"},
            {"label": "Syndrome table", "latex": r"(S_1,S_2):\ 00\to I,\ 10\to X_1,\ 11\to X_2,\ 01\to X_3"},
        ],
        "prerequisites": ["qc-decoherence-and-noise", "qc-multi-qubit-gates"],
    },
    {
        "slug": "qc-phase-flip-and-shor-code",
        "related_simulation": "bit_flip_code",
        "history": (
            "A code that catches bit flips but not phase flips is only half a solution. Peter Shor's 1995 "
            "nine-qubit code was the first to correct *any* single-qubit error, by nesting a bit-flip code "
            "inside a phase-flip code."
        ),
        "overview": [
            "A **phase-flip code** is a bit-flip code viewed in the $X$ basis: conjugate everything by "
            "Hadamards. Encoding $|0\\rangle_L=|{+}{+}{+}\\rangle$, $|1\\rangle_L=|{-}{-}{-}\\rangle$ turns "
            "a $Z$ error into a detectable bit flip in the $\\{|+\\rangle,|-\\rangle\\}$ basis, checked by "
            "the $X_1X_2$, $X_2X_3$ parities. It corrects $Z$ but not $X$ — the mirror image of the "
            "repetition code.",
            "The **9-qubit Shor code** concatenates them: first encode against phase flips into three "
            "blocks, then encode each block against bit flips. The logical states are "
            "$|0\\rangle_L=\\tfrac{1}{2\\sqrt2}(|000\\rangle+|111\\rangle)^{\\otimes 3}$ and "
            "$|1\\rangle_L=\\tfrac{1}{2\\sqrt2}(|000\\rangle-|111\\rangle)^{\\otimes 3}$. The inner code "
            "catches any $X$, the outer code any $Z$, and since $Y=iXZ$, both together catch $Y$.",
            "This works because of **error discretization**: an arbitrary single-qubit error is a linear "
            "combination $E = c_0 I + c_x X + c_y Y + c_z Z$, and measuring the syndrome *projects* the "
            "corrupted state onto one discrete Pauli error, which is then corrected. Correcting the finite "
            "set $\\{I,X,Y,Z\\}$ therefore corrects the entire continuum. The Shor code has parameters "
            "$[[9,1,3]]$: $n=9$ physical qubits, $k=1$ logical qubit, distance $d=3$ (any single error "
            "corrected).",
        ],
        "key_equations": [
            {"label": "Phase-flip encoding", "latex": r"|0\rangle_L=|{+}{+}{+}\rangle,\quad |1\rangle_L=|{-}{-}{-}\rangle"},
            {"label": "Error discretization", "latex": r"E = c_0 I + c_x X + c_y Y + c_z Z"},
            {"label": "Shor code parameters", "latex": r"[[9,1,3]]"},
        ],
        "prerequisites": ["qc-three-qubit-bit-flip-code"],
    },
    {
        "slug": "qc-css-and-steane-code",
        "related_simulation": "",
        "history": (
            "The stabilizer formalism unified error correction: a code is defined not by writing out its "
            "states but by listing the operators that leave it fixed. CSS codes then borrow directly from "
            "classical coding theory, and the 7-qubit Steane code is the elegant flagship."
        ),
        "overview": [
            "A **stabilizer code** fixes its code space as the simultaneous $+1$ eigenspace of a set of "
            "commuting Pauli operators, the *stabilizers* $\\{S_i\\}$. An error $E$ anticommuting with some "
            "$S_i$ flips that stabilizer's measured eigenvalue to $-1$, producing a detectable syndrome — "
            "generalising the $Z_1Z_2$, $Z_2Z_3$ checks of the repetition code to $n-k$ generators for an "
            "$[[n,k]]$ code.",
            "**CSS codes** (Calderbank-Shor-Steane) build a quantum code from two classical linear codes, "
            "using one to correct $X$ errors and the other to correct $Z$ errors, so their stabilizers "
            "split into a purely-$X$ set and a purely-$Z$ set. The **7-qubit Steane code** is the CSS code "
            "built from the classical $[7,4,3]$ Hamming code used for both, giving six stabilizer "
            "generators (three $X$-type, three $Z$-type).",
            "A code of **distance $d$** — the weight of the smallest logical (undetectable) error — "
            "corrects up to $\\lfloor (d-1)/2\\rfloor$ arbitrary single-qubit errors. The Steane code has "
            "parameters $[[7,1,3]]$: it protects one logical qubit in seven physical ones with $d=3$, "
            "correcting any single error like Shor's code but with two fewer qubits and a more symmetric, "
            "transversal-friendly structure.",
        ],
        "key_equations": [
            {"label": "Stabilizer condition", "latex": r"S_i|\psi\rangle = +|\psi\rangle \ \ \forall i"},
            {"label": "Correctable errors", "latex": r"t = \big\lfloor (d-1)/2 \big\rfloor"},
            {"label": "Steane parameters", "latex": r"[[7,1,3]]"},
        ],
        "prerequisites": ["qc-phase-flip-and-shor-code", "qc-universal-gate-sets"],
    },
    {
        "slug": "qc-surface-codes-threshold",
        "related_simulation": "surface_code",
        "history": (
            "Surface codes are today's leading route to fault tolerance: they need only local, "
            "nearest-neighbour checks on a 2D grid and tolerate a comparatively high error rate. Their "
            "practicality rests on the threshold theorem — the mathematical guarantee that error "
            "correction can win."
        ),
        "overview": [
            "The **surface code** places physical qubits on a 2D lattice with two kinds of local, "
            "four-qubit stabilizer checks: **star** operators ($X$-type, around a vertex) and "
            "**plaquette** operators ($Z$-type, around a face). Every check involves only neighbouring "
            "qubits, which is what makes it hardware-friendly. A logical qubit is stored non-locally in "
            "the lattice's global topology, so local noise cannot corrupt it undetected.",
            "Errors create pairs of flipped syndromes at the endpoints of an **error chain**; a classical "
            "*matching* decoder pairs up flipped checks and applies a correcting chain between them. Only "
            "an error chain that spans the whole lattice (a logical operator) causes an uncorrectable "
            "logical error, and its probability falls off exponentially with the lattice size, or code "
            "distance $d$.",
            "The **threshold theorem** is the payoff: if the physical error rate $p$ is below a critical "
            "threshold $p_{\\text{th}}$ (a few $\\times 10^{-3}$ for the surface code), then increasing the "
            "code distance drives the logical error rate down as $\\sim (p/p_{\\text{th}})^{d/2}$ — "
            "arbitrarily reliable computation from imperfect parts. The cost is steep **overhead**: "
            "thousands of physical qubits per logical qubit for algorithmically useful error rates, which "
            "is the central engineering challenge of scaling.",
        ],
        "key_equations": [
            {"label": "Star / plaquette checks", "latex": r"A_v = \prod_{i\in v} X_i,\qquad B_p = \prod_{i\in p} Z_i"},
            {"label": "Sub-threshold suppression", "latex": r"p_L \sim \left(\frac{p}{p_{\text{th}}}\right)^{d/2}"},
        ],
        "prerequisites": ["qc-css-and-steane-code"],
    },
]


class Command(BaseCommand):
    help = "Populate the Quantum Computing track Modules 4-5 (branches, lesson concepts, full content)."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("Ensuring QC programming/error-correction category branches"))
        branches = {}
        for slug, name, desc, color, order in BRANCHES:
            branches[slug], _ = Category.objects.update_or_create(
                slug=slug,
                defaults={"name": name, "description": desc, "color": color, "order": order,
                          "track": "quantum-computing"},
            )
            self.stdout.write(f"  ✓ {slug}")

        self.stdout.write(self.style.MIGRATE_HEADING("Seeding QC Module 4-5 lesson concepts"))
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

        run(self, TOPICS, "Quantum Computing Modules 4-5")

        for slug, *_ in CONCEPTS:
            Concept.objects.get(slug=slug).update_search_vector()
        self.stdout.write(self.style.SUCCESS("Refreshed search vectors for QC Module 4-5 lessons."))

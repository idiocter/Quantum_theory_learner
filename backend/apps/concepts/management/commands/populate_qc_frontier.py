"""Populate the Quantum Computing track, Phase 4 (Modules 6-8).

Creates three Category branches — qc-variational (15), qc-communication (16),
qc-hardware (17) — after the Phase-3 branches, seeds the 11 lesson Concept rows
from `docs/quantum-computing/prerequisites.json`, and authors their content via
`_content.run`. Module 7 reuses existing simulations (teleportation, bb84);
Module 8 lessons are content-only (no simulation slot).

Idempotent (update_or_create by slug); re-running updates rows in place. Run
standalone. Prerequisite edges to earlier slugs resolve only if Phases 1-3 have
been populated. Glossary first-use terms are marked `[[term-slug]]`.
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.concepts.models import Category, Concept
from ._content import run

BRANCHES = [
    (
        "qc-variational",
        "QC: Variational & Near-Term Algorithms",
        "The NISQ playbook: the hybrid variational loop, the Variational Quantum "
        "Eigensolver for ground-state energies, QAOA for combinatorial "
        "optimization, quantum machine learning, and the barren-plateau limits.",
        "#22C55E",
        15,
    ),
    (
        "qc-communication",
        "QC: Communication & Cryptography",
        "Moving quantum information: teleportation, superdense coding, BB84 "
        "quantum key distribution, and quantum networks with entanglement "
        "swapping and repeaters.",
        "#06B6D4",
        16,
    ),
    (
        "qc-hardware",
        "QC: Hardware, Advantage & Outlook",
        "The reality check: hardware platforms and the DiVincenzo criteria, an "
        "honest account of quantum advantage, and the outlook for applications, "
        "post-quantum cryptography, and careers.",
        "#F59E0B",
        17,
    ),
]

CONCEPTS = [
    # Module 6 — qc-variational
    ("qc-variational-principle", "The Variational Principle & NISQ", "qc-variational", "advanced", 1,
     "The hybrid quantum-classical loop, parameterized ansätze, and ⟨H⟩ ≥ E₀."),
    ("qc-vqe", "The Variational Quantum Eigensolver", "qc-variational", "advanced", 2,
     "Estimating ground-state energies by minimizing ⟨H⟩ as a sum of Pauli expectations."),
    ("qc-qaoa", "The Quantum Approximate Optimization Algorithm", "qc-variational", "advanced", 3,
     "Alternating cost and mixer unitaries for combinatorial optimization like MaxCut."),
    ("qc-qml-and-barren-plateaus", "Quantum ML & Barren Plateaus", "qc-variational", "advanced", 4,
     "Feature maps, variational classifiers, quantum kernels, and vanishing gradients."),
    # Module 7 — qc-communication
    ("qc-quantum-teleportation", "Quantum Teleportation", "qc-communication", "advanced", 1,
     "Transferring an unknown state with a Bell pair and two classical bits."),
    ("qc-superdense-coding", "Superdense Coding", "qc-communication", "advanced", 2,
     "Two classical bits from one qubit using pre-shared entanglement."),
    ("qc-bb84-qkd", "BB84 & Quantum Key Distribution", "qc-communication", "advanced", 3,
     "Conjugate-basis key exchange with eavesdropping detection from no-cloning."),
    ("qc-quantum-networks-repeaters", "Quantum Networks & Repeaters", "qc-communication", "advanced", 4,
     "Entanglement swapping, purification, and repeaters against photon loss."),
    # Module 8 — qc-hardware
    ("qc-hardware-platforms", "Hardware Platforms", "qc-hardware", "advanced", 1,
     "DiVincenzo criteria and the superconducting/ion/photonic/atom trade-offs."),
    ("qc-quantum-advantage", "Quantum Advantage, Honestly", "qc-hardware", "advanced", 2,
     "Sampling demonstrations, classical pushback, and where real speedups live."),
    ("qc-outlook-and-careers", "Outlook, Cryptography & Careers", "qc-hardware", "advanced", 3,
     "Application timelines, the Shor threat, post-quantum crypto, and the field."),
]

TOPICS = [
    {
        "slug": "qc-variational-principle",
        "related_simulation": "vqe",
        "history": (
            "Today's devices are noisy and small — the [[decoherence]]-limited NISQ (Noisy "
            "Intermediate-Scale Quantum) regime. Variational algorithms are the dominant strategy for "
            "extracting value from them: keep the quantum circuit shallow and let a classical computer do "
            "the optimizing."
        ),
        "overview": [
            "A **variational algorithm** is a hybrid loop. A parameterized quantum circuit — the *ansatz* "
            "$U(\\vec\\theta)$ — prepares a trial state $|\\psi(\\vec\\theta)\\rangle = U(\\vec\\theta)|0\\rangle$. "
            "The device measures a **cost function** (an expectation value); a **classical optimizer** then "
            "proposes better parameters, and the loop repeats until the cost converges.",
            "The engine is the **variational principle**: for any Hamiltonian $H$ with ground-state energy "
            "$E_0$, every state satisfies $\\langle\\psi(\\vec\\theta)|H|\\psi(\\vec\\theta)\\rangle \\ge E_0$, "
            "with equality only at the ground state. Minimizing the measured energy therefore squeezes the "
            "trial state toward the true ground state — you can never overshoot below $E_0$.",
            "The cost of each iteration is many **measurements**: an expectation value must be estimated "
            "from finite shots (Module 4), and the optimizer typically needs gradients too. This shot "
            "overhead, plus device noise, is why variational methods target shallow circuits and small "
            "problems — and why their scaling is hotly debated.",
        ],
        "key_equations": [
            {"label": "Ansatz state", "latex": r"|\psi(\vec\theta)\rangle = U(\vec\theta)\,|0\rangle^{\otimes n}"},
            {"label": "Variational principle", "latex": r"\langle\psi(\vec\theta)|H|\psi(\vec\theta)\rangle \ge E_0"},
        ],
        "prerequisites": ["qc-coding-quantum-algorithms", "qc-density-matrices-mixed-states"],
    },
    {
        "slug": "qc-vqe",
        "related_simulation": "vqe",
        "history": (
            "The **Variational Quantum Eigensolver** (VQE), introduced by Peruzzo et al. in 2014, was the "
            "first flagship NISQ algorithm. Its target — the ground-state energy of a molecule — is a "
            "problem where even modest quantum resources could one day beat classical chemistry."
        ),
        "overview": [
            "VQE estimates the **ground-state energy** of a Hamiltonian $H$ by minimizing "
            "$E(\\vec\\theta)=\\langle\\psi(\\vec\\theta)|H|\\psi(\\vec\\theta)\\rangle$ over the ansatz "
            "parameters. By the variational principle the minimum you find upper-bounds $E_0$.",
            "The trick that makes it measurable: write $H$ as a weighted sum of **Pauli strings**, "
            "$H=\\sum_i w_i P_i$. Then $E(\\vec\\theta)=\\sum_i w_i\\langle P_i\\rangle$, and each "
            "$\\langle P_i\\rangle$ is a simple expectation value. Terms diagonal in $Z$ are read straight "
            "from computational-basis counts; terms with $X$ or $Y$ need a basis rotation "
            "(e.g. a Hadamard before measuring $Z$) first.",
            "For a single qubit with $H = a\\,X + b\\,Z$ and ansatz $R_y(\\theta)|0\\rangle$, the energy is "
            "$E(\\theta)=a\\sin\\theta + b\\cos\\theta$, whose minimum $-\\sqrt{a^2+b^2}$ is the exact ground "
            "energy — the case you can explore in the simulator. VQE's headline application is **quantum "
            "chemistry**: mapping molecular electronic structure onto qubit Hamiltonians.",
        ],
        "key_equations": [
            {"label": "Objective", "latex": r"E(\vec\theta) = \langle\psi(\vec\theta)|H|\psi(\vec\theta)\rangle,\quad \min_{\vec\theta} E(\vec\theta) \ge E_0"},
            {"label": "Pauli decomposition", "latex": r"H = \sum_i w_i P_i \;\Rightarrow\; E = \sum_i w_i \langle P_i\rangle"},
        ],
        "prerequisites": ["qc-variational-principle"],
    },
    {
        "slug": "qc-qaoa",
        "related_simulation": "qaoa",
        "history": (
            "The **Quantum Approximate Optimization Algorithm** (Farhi, Goldstone & Gutmann, 2014) applies "
            "the variational idea to hard combinatorial problems, and is inspired by discretizing adiabatic "
            "evolution into alternating quantum operations."
        ),
        "overview": [
            "QAOA approximately solves problems like **MaxCut** — partition a graph's vertices to cut as "
            "many edges as possible. The objective is encoded in a **cost Hamiltonian** $C$ that is diagonal "
            "in the computational basis, with $C|x\\rangle = c(x)|x\\rangle$ and $c(x)$ the number of edges "
            "cut by the bitstring $x$.",
            "Starting from the uniform superposition $H^{\\otimes n}|0\\rangle$, QAOA applies $p$ alternating "
            "layers of a **cost** unitary $e^{-i\\gamma C}$ and a **mixer** unitary "
            "$e^{-i\\beta B}$ with $B=\\sum_j X_j$. The $2p$ angles $\\{\\gamma_k,\\beta_k\\}$ are optimized "
            "(variationally) to maximize $\\langle C\\rangle=\\sum_x|\\langle x|\\psi\\rangle|^2 c(x)$; "
            "sampling the final state then returns a high-cut bitstring.",
            "More layers help: as $p\\to\\infty$, QAOA can reproduce **adiabatic** evolution and approaches "
            "the optimum, while $p=1$ already gives nontrivial approximation ratios. Whether QAOA beats the "
            "best classical heuristics at finite $p$ remains an open, actively studied question.",
        ],
        "key_equations": [
            {"label": "QAOA state", "latex": r"|\vec\gamma,\vec\beta\rangle = \prod_{k=1}^{p} e^{-i\beta_k B}\,e^{-i\gamma_k C}\; H^{\otimes n}|0\rangle"},
            {"label": "Mixer / objective", "latex": r"B = \sum_j X_j,\qquad \langle C\rangle = \sum_x |\langle x|\psi\rangle|^2\, c(x)"},
        ],
        "prerequisites": ["qc-variational-principle"],
    },
    {
        "slug": "qc-qml-and-barren-plateaus",
        "related_simulation": "",
        "history": (
            "**Quantum machine learning** asks whether quantum circuits can learn patterns classical models "
            "cannot. The excitement is real but so are the obstacles — most sharply, the barren-plateau "
            "phenomenon that can make training impossible."
        ),
        "overview": [
            "A typical QML model uses a **feature map** $|\\phi(x)\\rangle$ that encodes a classical data "
            "point $x$ into a quantum state, followed by a trainable variational circuit that acts as a "
            "**classifier**. Training minimizes a loss over labelled data exactly like a variational "
            "algorithm, with the quantum device evaluating the model output.",
            "A related idea is the **quantum kernel**: the inner product "
            "$|\\langle\\phi(x)|\\phi(x')\\rangle|^2$ defines a similarity measure, and if the feature map "
            "is classically hard to simulate the kernel may capture structure a classical kernel cannot. "
            "This is the main theoretical hope for a QML advantage.",
            "The central caution is the **barren-plateau** problem: for sufficiently random, deep ansätze "
            "the cost-function gradient vanishes *exponentially* in the number of qubits, so the optimizer "
            "sees an almost-flat landscape and cannot train. Combined with shot noise and hardware noise, "
            "this means an honest assessment is that no NISQ variational model has yet shown a clear, "
            "practical quantum advantage — the field is promising but unproven.",
        ],
        "key_equations": [
            {"label": "Quantum kernel", "latex": r"K(x,x') = |\langle\phi(x)|\phi(x')\rangle|^2"},
            {"label": "Barren plateau", "latex": r"\mathrm{Var}\!\left[\partial_\theta E\right] \sim 2^{-n}"},
        ],
        "prerequisites": ["qc-vqe", "qc-qaoa"],
    },
    {
        "slug": "qc-quantum-teleportation",
        "related_simulation": "teleportation",
        "history": (
            "Quantum [[teleportation]] (Bennett et al., 1993) moves an unknown quantum state from one place "
            "to another without transmitting the qubit itself — using only a shared [[bell-state]] and a "
            "classical phone call."
        ),
        "overview": [
            "Alice holds an unknown qubit $|\\psi\\rangle=\\alpha|0\\rangle+\\beta|1\\rangle$ and shares a "
            "Bell pair with Bob. She performs a **Bell-basis measurement** on $|\\psi\\rangle$ together with "
            "her half of the pair, obtaining two classical bits. Those bits tell Bob which of four Pauli "
            "corrections ($I, X, Z, ZX$) to apply to his half — after which his qubit is exactly "
            "$|\\psi\\rangle$.",
            "Two apparent paradoxes dissolve on inspection. **No-cloning** is respected: Alice's measurement "
            "destroys her copy, so only one $|\\psi\\rangle$ ever exists. **No superluminal signaling** "
            "occurs: before receiving the two classical bits, Bob's qubit is maximally mixed and carries no "
            "information — the classical channel, limited by light speed, is essential.",
            "The resource ledger: teleporting one qubit consumes **one ebit** (a shared Bell pair) and "
            "**two classical bits**. Teleportation is the primitive behind quantum repeaters, "
            "measurement-based computing, and gate teleportation.",
        ],
        "key_equations": [
            {"label": "State to teleport", "latex": r"|\psi\rangle = \alpha|0\rangle + \beta|1\rangle"},
            {"label": "Resource cost", "latex": r"1\ \text{qubit} \;=\; 1\ \text{ebit} + 2\ \text{classical bits}"},
        ],
        "prerequisites": ["qc-entanglement-bell-states", "qc-measurement-born-rule"],
    },
    {
        "slug": "qc-superdense-coding",
        "related_simulation": "",
        "history": (
            "Superdense coding (Bennett & Wiesner, 1992) is teleportation's mirror image: instead of using "
            "classical bits to send a qubit, it uses a qubit to send classical bits."
        ),
        "overview": [
            "With a pre-shared Bell pair, Alice can transmit **two classical bits** to Bob by sending just "
            "**one qubit**. She applies one of four operations to her half — $I$, $X$, $Z$, or $ZX$ — which "
            "rotates the shared pair into one of the four orthogonal **Bell states**.",
            "Alice sends her single qubit to Bob, who now holds both halves and performs a Bell measurement. "
            "Because the four Bell states are perfectly distinguishable, he recovers Alice's two-bit message "
            "with certainty. The entanglement is the resource that doubles the channel's classical capacity.",
            "This is precisely the **dual** of teleportation, which spends one ebit and two classical bits "
            "to send one qubit; superdense coding spends one ebit and one qubit to send two classical bits. "
            "Both saturate the fundamental limits set by entanglement-assisted communication.",
        ],
        "key_equations": [
            {"label": "Encoding → Bell states", "latex": r"\{I, X, Z, ZX\}\otimes I\;:\;|\Phi^+\rangle \mapsto \{|\Phi^+\rangle,|\Psi^+\rangle,|\Phi^-\rangle,|\Psi^-\rangle\}"},
            {"label": "Resource cost", "latex": r"2\ \text{classical bits} \;=\; 1\ \text{ebit} + 1\ \text{qubit}"},
        ],
        "prerequisites": ["qc-quantum-teleportation"],
    },
    {
        "slug": "qc-bb84-qkd",
        "related_simulation": "bb84",
        "history": (
            "**BB84** (Bennett & Brassard, 1984) was the first quantum cryptographic protocol. It turns the "
            "[[no-cloning]] theorem into a security guarantee: an eavesdropper cannot copy the key without "
            "leaving traces."
        ),
        "overview": [
            "Alice sends qubits each prepared in a random bit encoded in a randomly chosen **conjugate "
            "basis** — the computational $\\{|0\\rangle,|1\\rangle\\}$ or the diagonal "
            "$\\{|+\\rangle,|-\\rangle\\}$. Bob measures each in a randomly chosen basis. Over a public "
            "channel they announce *bases* (never bit values) and keep only the rounds where the bases "
            "matched — the **sifted key**.",
            "Security rests on **measurement disturbance**. An eavesdropper (Eve) who intercepts and remeasures "
            "must guess the basis; when she guesses wrong she disturbs the state (she cannot clone it to "
            "avoid this). Alice and Bob detect her by comparing a random sample of their sifted bits: any "
            "eavesdropping raises the **quantum bit-error rate (QBER)** above the noise floor, and they "
            "abort.",
            "BB84 is *information-theoretically* secure given its assumptions, but those assumptions matter: "
            "the classical channel must be **authenticated** (to stop man-in-the-middle attacks), and real "
            "devices leak through side channels. QKD provides key exchange, not encryption — the shared key "
            "then feeds a classical cipher such as a one-time pad.",
        ],
        "key_equations": [
            {"label": "Conjugate bases", "latex": r"Z:\{|0\rangle,|1\rangle\}\qquad X:\{|+\rangle,|-\rangle\}"},
            {"label": "Basis overlap", "latex": r"|\langle 0|+\rangle|^2 = \tfrac12"},
        ],
        "prerequisites": ["qc-no-cloning", "qc-measurement-born-rule"],
    },
    {
        "slug": "qc-quantum-networks-repeaters",
        "related_simulation": "",
        "history": (
            "A quantum internet would distribute entanglement across the globe. The obstacle is brutal: "
            "photons are lost in fiber exponentially with distance, and no-cloning forbids simply amplifying "
            "them. Quantum repeaters are the way out."
        ),
        "overview": [
            "In optical fiber the probability a photon survives falls **exponentially** with distance, so "
            "direct transmission of quantum states becomes hopeless beyond a few hundred kilometres — and "
            "the no-cloning theorem rules out classical-style signal amplification.",
            "**Entanglement swapping** is the key primitive: if node A shares a Bell pair with a midpoint M, "
            "and M shares another with node B, then a Bell measurement at M teleports the entanglement so "
            "that A and B become entangled directly — without a photon ever travelling A→B. Chaining this "
            "across many short segments bridges long distances.",
            "A **quantum repeater** combines entanglement swapping with **entanglement purification** "
            "(distilling higher-fidelity pairs from several noisy ones) and **quantum memory** (to "
            "synchronize probabilistic steps). Small networks and metropolitan QKD links exist today; a "
            "full, memory-based quantum internet remains a long-term experimental goal.",
        ],
        "key_equations": [
            {"label": "Fiber transmission", "latex": r"\eta(L) = 10^{-\alpha L/10} \sim e^{-L/L_0}"},
            {"label": "Entanglement swapping", "latex": r"(A\!-\!M)\otimes(M\!-\!B)\ \xrightarrow{\text{Bell meas. at }M}\ (A\!-\!B)"},
        ],
        "prerequisites": ["qc-quantum-teleportation"],
    },
    {
        "slug": "qc-hardware-platforms",
        "related_simulation": "",
        "history": (
            "No single technology has won the race to build a quantum computer. Each platform trades away "
            "something, and the DiVincenzo criteria are the checklist every contender is measured against."
        ),
        "overview": [
            "The **DiVincenzo criteria** (2000) list what a scalable quantum computer needs: well-defined "
            "qubits that scale, the ability to initialize them, coherence times long compared to gate times, "
            "a universal set of gates, and qubit-specific measurement (plus, for communication, faithful "
            "interconversion between stationary and flying qubits).",
            "The leading **platforms** each answer these differently. **Superconducting** circuits (IBM, "
            "Google) give fast gates and lithographic scaling but short coherence and limited connectivity. "
            "**Trapped ions** (IonQ, Quantinuum) offer long coherence, high fidelity, and all-to-all "
            "connectivity but slower gates. **Photonic** systems are naturally suited to communication and "
            "room-temperature operation but struggle with deterministic two-qubit gates. **Neutral atoms** "
            "(QuEra, Pasqal) combine large arrays with reconfigurable connectivity.",
            "The honest state of the art: devices ranging from tens up to over a thousand physical qubits, two-qubit "
            "error rates around $10^{-2}$-$10^{-3}$, and no error correction at useful scale yet. The gap to "
            "the millions of physical qubits a fault-tolerant machine needs is the field's defining "
            "engineering challenge.",
        ],
        "key_equations": [
            {"label": "Gate-to-coherence ratio", "latex": r"N_{\text{gates}} \sim T_2 / t_{\text{gate}}"},
        ],
        "prerequisites": ["qc-decoherence-and-noise"],
    },
    {
        "slug": "qc-quantum-advantage",
        "related_simulation": "",
        "history": (
            "In 2019 Google claimed 'quantum supremacy' with a 53-qubit random-circuit sampling experiment. "
            "The claim — and the classical rebuttals that followed — is a case study in separating genuine "
            "quantum advantage from hype."
        ),
        "overview": [
            "**Quantum advantage** (or the older term *supremacy*) means performing some task infeasible for "
            "any classical computer in reasonable time. The demonstrations to date are **sampling** tasks: "
            "**random circuit sampling** (Google's Sycamore) and **boson sampling** (photonic experiments). "
            "These are strong evidence that quantum devices can outrun classical simulation on *some* task.",
            "The crucial distinction is **contrived vs useful**. Sampling from a random circuit's output "
            "distribution has no known application — it was chosen precisely because it is hard to simulate, "
            "not because anyone wants the answer. A *practical* advantage on a problem people care about "
            "(chemistry, optimization) has **not** yet been demonstrated.",
            "The story is also a moving target: improved **classical algorithms** and better use of "
            "supercomputers have repeatedly narrowed or overturned specific advantage claims. The defensible "
            "position is that provable asymptotic speedups exist for particular problems — **Shor** "
            "(exponential for factoring), **Grover** (quadratic for search), and **quantum simulation** — "
            "while broad claims of universal exponential speedups are overstated.",
        ],
        "key_equations": [
            {"label": "Speedups (proven)", "latex": r"\text{Shor: exp.}\quad \text{Grover: } O(\sqrt N)\quad \text{simulation: exp.}"},
        ],
        "prerequisites": ["qc-simulators-and-transpilation", "qc-shor-factoring"],
    },
    {
        "slug": "qc-outlook-and-careers",
        "related_simulation": "",
        "history": (
            "Where does this leave us? A clear-eyed outlook separates the near-term from the transformative, "
            "and takes the cryptographic threat seriously enough to be acting on it already."
        ),
        "overview": [
            "**Realistic timelines** differ sharply by application. Near-term (NISQ) devices may find niche "
            "uses in quantum simulation and chemistry heuristics; genuinely transformative applications — "
            "large-scale chemistry, cryptanalysis — require **fault tolerance** and are years to decades "
            "away. The bottleneck is the surface-code **overhead** (thousands of physical qubits per logical "
            "qubit, Module 5).",
            "The **cryptographic threat** is concrete: a large fault-tolerant machine running Shor's "
            "algorithm would break RSA and elliptic-curve cryptography. Even though such a machine does not "
            "exist, 'harvest now, decrypt later' attacks make the risk present-tense, which is why "
            "**post-quantum cryptography** — classical schemes believed hard even for quantum computers — is "
            "already being standardized and deployed.",
            "For anyone entering the field, the **landscape** spans hardware engineering, error correction, "
            "algorithms, software/compilers, and applications, across national labs, startups, and "
            "established companies. The most valuable skill is exactly what this course has built: the "
            "ability to tell a real quantum speedup from a marketing slide.",
        ],
        "key_equations": [
            {"label": "Fault-tolerance overhead", "latex": r"n_{\text{physical}} \sim 10^3 \times n_{\text{logical}}"},
        ],
        "prerequisites": ["qc-quantum-advantage", "qc-surface-codes-threshold"],
    },
]


class Command(BaseCommand):
    help = "Populate the Quantum Computing track Modules 6-8 (branches, lesson concepts, full content)."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("Ensuring QC variational/communication/hardware branches"))
        branches = {}
        for slug, name, desc, color, order in BRANCHES:
            branches[slug], _ = Category.objects.update_or_create(
                slug=slug,
                defaults={"name": name, "description": desc, "color": color, "order": order,
                          "track": "quantum-computing"},
            )
            self.stdout.write(f"  ✓ {slug}")

        self.stdout.write(self.style.MIGRATE_HEADING("Seeding QC Module 6-8 lesson concepts"))
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

        run(self, TOPICS, "Quantum Computing Modules 6-8")

        for slug, *_ in CONCEPTS:
            Concept.objects.get(slug=slug).update_search_vector()
        self.stdout.write(self.style.SUCCESS("Refreshed search vectors for QC Module 6-8 lessons."))

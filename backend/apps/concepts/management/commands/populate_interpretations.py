"""Populate the Interpretations branch with full content: overviews, history,
structured formulas (symbols + derivation steps), prerequisite links, and
simulation keys (Bell test, many-worlds branching, decoherence).

Idempotent — re-running updates rows in place. Run after `seed_concepts`.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from ._content import run

TOPICS = [
    {
        "slug": "copenhagen",
        "prerequisites": ["measurement"],
        "overview": [
            "The Copenhagen interpretation, the oldest and most taught, treats the wavefunction as a complete description of what can be known, not a literal object. Between measurements it evolves by the Schrödinger equation; on measurement it collapses to a definite outcome, with probabilities given by the Born rule.",
            "It draws a line between the quantum system and the classical measuring apparatus, and insists that questions about a particle's properties before measurement are meaningless. Bohr's complementarity — that wave and particle descriptions are mutually exclusive but jointly necessary — sits at its core.",
            "Pragmatic and minimal, Copenhagen makes no attempt to explain how or why collapse happens. That silence is its strength to working physicists and its weakness to those seeking a deeper account.",
        ],
        "history": (
            "Forged by Niels Bohr and Werner Heisenberg in Copenhagen around 1925–27, with Born's probability rule and Heisenberg's uncertainty principle. It dominated 20th-century physics teaching, though 'the Copenhagen interpretation' was only named as such decades later and covers a range of related views."
        ),
        "formulas": [
            {
                "latex": r"|\psi\rangle \xrightarrow{\text{measure}} |a_i\rangle \quad \text{with } P(a_i) = |\langle a_i|\psi\rangle|^2",
                "description": "The measurement (collapse) postulate with the Born rule.",
                "symbols": {
                    r"|\psi\rangle": "state before measurement",
                    r"|a_i\rangle": "eigenstate corresponding to outcome aᵢ",
                    "P(a_i)": "probability of that outcome",
                },
                "derivation_steps": [
                    "Smooth unitary evolution applies between observations.",
                    "Measurement is a separate, irreversible postulate: the state jumps to an eigenstate of the measured observable.",
                    "The Born rule fixes the jump probabilities as the squared overlaps $|\\langle a_i|\\psi\\rangle|^2$.",
                ],
            },
        ],
    },
    {
        "slug": "many_worlds",
        "related_simulation": "many_worlds",
        "prerequisites": ["measurement", "decoherence"],
        "overview": [
            "The many-worlds interpretation takes the Schrödinger equation at face value and discards collapse entirely. The wavefunction always evolves unitarily; what looks like collapse is the observer becoming entangled with the system and splitting into branches, one for each outcome.",
            "Every quantum measurement therefore realises all its possible results — each in its own branch of an ever-growing universal wavefunction. The Born rule re-emerges as the weight an observer should assign to finding themselves on a given branch.",
            "Many-worlds is deterministic and has no special measurement axiom, which many find elegant. The cost is a literal multiplicity of unobservable worlds and a lingering puzzle about why probabilities follow the Born weights.",
        ],
        "history": (
            "Hugh Everett III proposed his 'relative state' formulation in his 1957 Princeton thesis, against Bohr's resistance. Bryce DeWitt popularised and renamed it 'many-worlds' in the 1970s; David Deutsch and others later tied it closely to quantum computation and decoherence."
        ),
        "formulas": [
            {
                "latex": r"|\psi\rangle|R_0\rangle \to \sum_i c_i\,|a_i\rangle|R_i\rangle",
                "description": "Measurement as entanglement: the apparatus (and observer) branches into a record state for each outcome.",
                "symbols": {
                    r"|a_i\rangle": "system outcome state",
                    r"|R_i\rangle": "apparatus/observer state recording outcome i",
                    "c_i": "amplitude of branch i",
                },
                "derivation_steps": [
                    "Apply ordinary unitary evolution to the joint system-plus-apparatus, with no collapse.",
                    "The interaction correlates each system outcome $|a_i\\rangle$ with a distinct apparatus record $|R_i\\rangle$.",
                    "Decoherence makes the branches effectively independent; each $|c_i|^2$ is the Born weight of that world.",
                ],
            },
        ],
    },
    {
        "slug": "pilot_wave",
        "prerequisites": ["measurement", "wavefunction"],
        "overview": [
            "Pilot-wave (de Broglie–Bohm) theory restores definite particle positions at all times. Particles always have real trajectories; a 'pilot wave' — the usual wavefunction — guides them via a deterministic guidance equation derived from the Schrödinger equation.",
            "There is no collapse and no fundamental randomness: apparent quantum probabilities arise from our ignorance of the exact initial positions, which are distributed according to |ψ|² (quantum equilibrium). The theory reproduces every prediction of standard quantum mechanics.",
            "The price is explicit non-locality: the velocity of one particle can depend instantaneously on the positions of distant entangled partners. Bohmian mechanics shows a deterministic, realist quantum theory is possible — at the cost of locality.",
        ],
        "history": (
            "Louis de Broglie presented a pilot-wave picture at the 1927 Solvay conference but abandoned it under criticism. David Bohm revived and completed it in 1952, and John Bell — inspired by Bohm — went on to prove his famous theorem."
        ),
        "formulas": [
            {
                "latex": r"\frac{dx}{dt} = \frac{\hbar}{m}\,\mathrm{Im}\,\frac{\nabla\psi}{\psi}",
                "description": "The guidance equation: the particle velocity is set by the phase gradient of the pilot wave.",
                "symbols": {
                    "x": "actual particle position",
                    r"\psi": "the guiding wavefunction",
                    "m": "particle mass",
                    r"\hbar": "reduced Planck constant",
                },
                "derivation_steps": [
                    "Write $\\psi = R e^{iS/\\hbar}$ and substitute into the Schrödinger equation.",
                    "The imaginary part gives a continuity equation for $|\\psi|^2 = R^2$ with current $\\propto \\nabla S$.",
                    "Identifying that current with $|\\psi|^2 v$ yields the guidance law $v = \\nabla S/m = (\\hbar/m)\\,\\mathrm{Im}(\\nabla\\psi/\\psi)$.",
                ],
            },
        ],
    },
    {
        "slug": "bell_theorem",
        "related_simulation": "bell",
        "prerequisites": ["entanglement", "measurement"],
        "overview": [
            "Bell's theorem proves that no theory based on local hidden variables — pre-existing properties plus no faster-than-light influence — can reproduce all the predictions of quantum mechanics. It turns a philosophical debate into an experimental question.",
            "The CHSH inequality bounds a combination S of correlation measurements at four detector-angle settings: any local-realistic theory obeys |S| ≤ 2. Quantum mechanics, using entangled pairs, predicts S can reach 2√2 ≈ 2.83 (the Tsirelson bound).",
            "Experiments overwhelmingly see |S| > 2. The loophole-free tests of 2015 (Hensen et al., Nature 526; plus the Vienna and NIST groups) closed the locality and detection loopholes simultaneously, and the work earned the 2022 Nobel Prize.",
        ],
        "history": (
            "John Bell derived his inequality in 1964; Clauser, Horne, Shimony, and Holt cast it in testable CHSH form in 1969. Aspect's 1982 experiments were decisive but had loopholes; the 2015 loophole-free experiments settled the matter. Aspect, Clauser, and Zeilinger won the 2022 Nobel Prize."
        ),
        "formulas": [
            {
                "latex": r"S = E(a,b) - E(a,b') + E(a',b) + E(a',b'),\quad |S| \le 2 \;\text{(local)},\; |S|_{\max}^{QM} = 2\sqrt{2}",
                "description": "The CHSH quantity: bounded by 2 for local hidden variables, reaching 2√2 in quantum mechanics.",
                "symbols": {
                    "E(a,b)": "correlation of outcomes at settings a and b",
                    "a, a', b, b'": "the two measurement angles on each side",
                    "S": "the CHSH combination",
                },
                "derivation_steps": [
                    "For local hidden variables each outcome is a fixed ±1 function of the local setting; algebra bounds $|S| \\le 2$.",
                    "Quantum mechanics gives $E(a,b) = -\\cos(a-b)$ for a singlet state.",
                    "Choosing $a=0°, a'=90°, b=45°, b'=135°$ yields $|S| = 2\\sqrt{2}$ — a clear violation of the classical bound.",
                ],
            },
        ],
    },
    {
        "slug": "decoherence",
        "related_simulation": "decoherence",
        "prerequisites": ["measurement", "entanglement"],
        "overview": [
            "Decoherence explains why we never see everyday objects in superposition. A quantum system is never truly isolated: it entangles with countless environmental degrees of freedom, and that entanglement rapidly destroys the interference between its branches.",
            "Formally, tracing out the environment turns the system's density matrix nearly diagonal in a preferred ('pointer') basis — the off-diagonal coherences decay like e^(−Γt). The system then behaves like a classical statistical mixture, even though no collapse has occurred.",
            "Decoherence does not by itself solve the measurement problem — it explains the appearance of collapse and the emergence of classicality, but not why one particular outcome is experienced. It is the bridge between the quantum and classical worlds.",
        ],
        "history": (
            "H. Dieter Zeh introduced the idea in 1970; Wojciech Zurek developed pointer states and einselection through the 1980s. Decoherence times were later measured directly in cavity-QED experiments by Serge Haroche's group (Nobel 2012)."
        ),
        "formulas": [
            {
                "latex": r"\rho_{ij}(t) = \rho_{ij}(0)\,e^{-\Gamma t}\quad (i \neq j)",
                "description": "Off-diagonal density-matrix elements (coherences) decay exponentially with the environment.",
                "symbols": {
                    r"\rho_{ij}": "coherence between branches i and j",
                    r"\Gamma": "decoherence rate (∝ coupling strength)",
                    "t": "time",
                },
                "derivation_steps": [
                    "Let the system entangle with environment states: $\\sum_i c_i|a_i\\rangle|E_i\\rangle$.",
                    "Tracing out the environment leaves $\\rho_{ij} \\propto \\langle E_j|E_i\\rangle$.",
                    "As distinct environment states become orthogonal, $\\langle E_j|E_i\\rangle \\to 0$ like $e^{-\\Gamma t}$ — interference is lost and $\\rho$ goes diagonal.",
                ],
            },
        ],
    },
    {
        "slug": "relational_qm",
        "prerequisites": ["measurement"],
        "overview": [
            "Relational quantum mechanics holds that there is no observer-independent state of a system — only states relative to other systems. A measurement outcome is a fact for the observer who made it, not an absolute fact about the world.",
            "Different observers can give different, equally valid accounts of the same events, much as relativity makes simultaneity observer-dependent. The wavefunction encodes the information one system has about another, not an intrinsic property.",
            "This dissolves the measurement problem by denying that there is a single global state needing to collapse. Its challenge is to explain how observers nonetheless agree when they compare notes.",
        ],
        "history": (
            "Carlo Rovelli introduced relational quantum mechanics in a 1996 paper, drawing on the lessons of relativity. It has since attracted interest from physicists and philosophers exploring information-theoretic readings of quantum theory."
        ),
        "formulas": [
            {
                "latex": r"\psi_{A|B}",
                "description": "The state is always relative: ψ of system A as described by observer B; there is no absolute ψ.",
                "symbols": {
                    "A": "the observed system",
                    "B": "the observer system relative to which the state is defined",
                },
                "derivation_steps": [
                    "Reject the assumption that systems have observer-independent states.",
                    "Each interaction establishes correlations that are facts only relative to the participating systems.",
                    "Consistency across observers follows from further interactions, not from a pre-existing global state.",
                ],
            },
        ],
    },
    {
        "slug": "qbism",
        "prerequisites": ["measurement"],
        "overview": [
            "Quantum Bayesianism (QBism) reads the wavefunction as an agent's personal degrees of belief about the outcomes of their future measurements — not a description of objective reality. Probabilities are Bayesian: subjective, and updated by experience.",
            "Collapse is then nothing mysterious: it is just an agent updating their beliefs upon acquiring new information, exactly as in classical Bayesian inference. The quantum formalism is a decision-theoretic tool for placing better bets on a participatory world.",
            "QBism cleanly avoids the measurement problem and non-locality puzzles by relocating quantum states into the mind of the user. Critics counter that it risks abandoning physics' goal of describing nature itself.",
        ],
        "history": (
            "Developed in the 2000s–2010s by Christopher Fuchs, Carlton Caves, and Rüdiger Schack from a strict subjective-Bayesian reading of probability. It builds on Wheeler's 'participatory universe' and ongoing work to derive the Born rule from symmetric measurements (SIC-POVMs)."
        ),
        "formulas": [
            {
                "latex": r"P(E) = \text{agent's degree of belief in outcome } E",
                "description": "Quantum probabilities are personal Bayesian credences, updated on measurement.",
                "symbols": {
                    "P(E)": "subjective probability assigned to outcome E",
                    "E": "a possible measurement outcome",
                },
                "derivation_steps": [
                    "Adopt the strict subjective view: probabilities express an agent's beliefs, not frequencies in the world.",
                    "A quantum state is a catalogue of such beliefs about measurement outcomes.",
                    "Measurement is Bayesian updating, so 'collapse' carries no physical mystery.",
                ],
            },
        ],
    },
    {
        "slug": "quantum_zeno",
        "prerequisites": ["measurement", "superposition"],
        "overview": [
            "The quantum Zeno effect is the surprising result that a system which is observed continuously enough can be frozen in its initial state — 'a watched quantum pot never boils'. Frequent measurement repeatedly resets the evolution before it can build up.",
            "The reason is that for short times the survival probability decreases quadratically, not linearly, in time. Slicing the evolution into many tiny intervals with a measurement after each makes the total decay probability vanish as the measurement rate grows.",
            "An anti-Zeno effect — accelerated decay under frequent measurement — also exists for suitable systems. Both have been observed in trapped ions and cold atoms, and are tools for controlling fragile quantum states.",
        ],
        "history": (
            "Named after Zeno's arrow paradox, the effect was analysed by Misra and Sudarshan in 1977. Itano and Wineland's group demonstrated it in trapped ions in 1990, and the anti-Zeno effect was confirmed experimentally around 2001."
        ),
        "formulas": [
            {
                "latex": r"P_{\text{survival}}(t) \approx 1 - (t/\tau_Z)^2,\qquad P_N \to 1 \text{ as } N \to \infty",
                "description": "Short-time survival is quadratic, so N frequent measurements suppress decay.",
                "symbols": {
                    "P_{\\text{survival}}": "probability of remaining in the initial state",
                    r"\tau_Z": "Zeno time set by the energy spread",
                    "N": "number of measurements in interval t",
                },
                "derivation_steps": [
                    "For short times the survival probability is $1 - (t/\\tau_Z)^2$, quadratic in t.",
                    "Split t into N intervals; each survives with probability $1 - (t/N\\tau_Z)^2$.",
                    "The product $[1-(t/N\\tau_Z)^2]^N \\to 1$ as $N \\to \\infty$ — continuous observation freezes the state.",
                ],
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Populate Interpretations-branch topics with full content (run after seed_concepts)."

    @transaction.atomic
    def handle(self, *args, **options):
        run(self, TOPICS, "Interpretations")

"""Populate the Quantum Biology branch with full content: overviews, history,
structured formulas (symbols + derivation steps), prerequisite links, and a
simulation key for coherent photosynthetic transport.

Idempotent — re-running updates rows in place. Run after `seed_concepts`.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from ._content import run

TOPICS = [
    {
        "slug": "quantum_biology_intro",
        "prerequisites": ["quantum_tunneling", "decoherence"],
        "overview": [
            "Quantum biology asks whether non-trivial quantum effects — coherence, tunnelling, entanglement — play a functional role in living systems. The surprise is that warm, wet, noisy biology might exploit such effects at all, since decoherence is expected to be ferociously fast there.",
            "The strongest candidates are energy transport in photosynthesis, proton and electron tunnelling in enzymes, and the radical-pair mechanism proposed for birds' magnetic compass. In each, quantum behaviour could offer an efficiency or sensitivity that classical physics cannot match.",
            "The field is young and some claims are contested, partly because distinguishing genuine quantum function from ordinary chemistry is hard. Still, it has reframed how we think about the interface of physics and life.",
        ],
        "history": (
            "Schrödinger's 1944 book 'What Is Life?' anticipated quantum effects in biology. The modern field took off after 2007, when ultrafast spectroscopy revealed long-lived coherences in photosynthetic complexes, prompting a wave of experiments and debate."
        ),
        "formulas": [
            {
                "latex": r"\tau_{\text{dec}} \;\lesssim\; \tau_{\text{function}}",
                "description": "Quantum effects matter biologically only if the decoherence time is at least as long as the functional timescale.",
                "symbols": {
                    r"\tau_{\text{dec}}": "decoherence time in the warm, wet environment",
                    r"\tau_{\text{function}}": "timescale of the biological process",
                },
                "derivation_steps": [
                    "Coherence survives only for the decoherence time $\\tau_{\\text{dec}}$ set by environmental coupling.",
                    "A quantum effect is functional only if it persists over the process timescale $\\tau_{\\text{function}}$.",
                    "Quantum biology hinges on finding systems where $\\tau_{\\text{dec}}$ is unexpectedly long relative to $\\tau_{\\text{function}}$.",
                ],
            },
        ],
    },
    {
        "slug": "photosynthesis_coherence",
        "related_simulation": "photosynthesis",
        "prerequisites": ["quantum_biology_intro", "superposition"],
        "overview": [
            "When a photon is absorbed by a light-harvesting complex, its energy (an exciton) must travel to the reaction centre to be converted to chemical energy. Remarkably, this transfer is extremely efficient — close to 100% in some organisms.",
            "Ultrafast spectroscopy revealed wavelike, coherent oscillations during this transport, suggesting the exciton explores multiple pathways simultaneously rather than hopping randomly. Such quantum coherence could let it avoid traps and find the fastest route.",
            "How much the coherence helps, and whether it is biologically selected or incidental, is debated — some argue 'environment-assisted' transport, where a bit of noise actually aids efficiency, is the real story. Either way, it is the flagship example of quantum biology.",
        ],
        "history": (
            "Engel and Fleming's group reported long-lived quantum coherence in the Fenna–Matthews–Olson complex in 2007 (Nature 446), igniting the field. Later work emphasised environment-assisted quantum transport (ENAQT) and questioned the room-temperature lifetimes."
        ),
        "formulas": [
            {
                "latex": r"H = \sum_i \varepsilon_i |i\rangle\langle i| + \sum_{i\neq j} J_{ij}\,|i\rangle\langle j|",
                "description": "Tight-binding exciton Hamiltonian: site energies plus couplings that let the excitation delocalise.",
                "symbols": {
                    r"\varepsilon_i": "energy of the exciton on chromophore i",
                    "J_{ij}": "electronic coupling between chromophores i and j",
                    r"|i\rangle": "state with the excitation localised on site i",
                },
                "derivation_steps": [
                    "Model each chromophore as a site that can hold the excitation, with energy $\\varepsilon_i$.",
                    "Dipole–dipole couplings $J_{ij}$ let the excitation hop and form delocalised superpositions across sites.",
                    "Diagonalising H gives exciton eigenstates spread over several chromophores — the basis of coherent transport.",
                ],
            },
        ],
    },
    {
        "slug": "avian_magnetoreception",
        "prerequisites": ["quantum_biology_intro", "spin"],
        "overview": [
            "Many migratory birds sense the Earth's magnetic field and use it as a compass. The leading explanation is the radical-pair mechanism: light striking the protein cryptochrome in the eye creates a pair of molecules each with an unpaired electron spin.",
            "These two electron spins form an entangled state that oscillates between singlet and triplet configurations. The Earth's weak magnetic field subtly tips the balance of that interconversion, changing the yield of chemical products — a signal the bird can read.",
            "It is striking that such a faint field (~50 μT) could have a chemical effect at all; the radical-pair model explains it through spin coherence lasting microseconds. The mechanism is supported by behavioural and spectroscopic evidence but not yet fully proven in vivo.",
        ],
        "history": (
            "Schulten proposed the radical-pair mechanism in 1978. Cryptochrome was identified as the likely sensor around 2000 (Ritz, Wiltschko), and disruption experiments with radiofrequency fields since the 2000s have supported a quantum-coherent compass."
        ),
        "formulas": [
            {
                "latex": r"|S\rangle = \tfrac{1}{\sqrt2}(|{\uparrow\downarrow}\rangle - |{\downarrow\uparrow}\rangle) \;\rightleftharpoons\; |T_0\rangle",
                "description": "Singlet–triplet interconversion of the radical pair, tuned by the external magnetic field.",
                "symbols": {
                    r"|S\rangle": "singlet state of the two electron spins",
                    r"|T_0\rangle": "(neutral) triplet state",
                    r"\uparrow, \downarrow": "individual electron spin orientations",
                },
                "derivation_steps": [
                    "Light creates a spin-correlated radical pair, born in the singlet state.",
                    "Hyperfine couplings and the external field drive coherent singlet↔triplet oscillation.",
                    "Singlet and triplet pairs react to different products, so the field-dependent yield encodes magnetic-field direction.",
                ],
            },
        ],
    },
    {
        "slug": "enzyme_tunneling",
        "prerequisites": ["quantum_tunneling", "quantum_biology_intro"],
        "overview": [
            "Enzymes accelerate reactions by enormous factors, and part of that speed-up comes from quantum tunnelling. Rather than going over an energy barrier, a light particle — often a proton or an electron — tunnels through it.",
            "The signature is a large kinetic isotope effect: replacing hydrogen with heavier deuterium slows the reaction far more than classical transition-state theory predicts, because the heavier particle's wavefunction tunnels much less effectively.",
            "Some enzymes appear to actively promote tunnelling, using protein vibrations to compress the donor–acceptor distance at the moment of transfer. This blends quantum mechanics with the dynamics of large biomolecules.",
        ],
        "history": (
            "Hydrogen tunnelling in chemistry was recognised by mid-century, but its central role in enzyme catalysis emerged from Klinman's kinetic-isotope-effect studies in the 1980s–90s and the 'promoting vibration' models that followed."
        ),
        "formulas": [
            {
                "latex": r"\text{KIE} = \frac{k_H}{k_D} \gg \text{(classical maximum)}",
                "description": "An anomalously large hydrogen/deuterium rate ratio is the fingerprint of tunnelling.",
                "symbols": {
                    "k_H": "reaction rate with hydrogen transfer",
                    "k_D": "reaction rate with deuterium transfer",
                    "KIE": "kinetic isotope effect",
                },
                "derivation_steps": [
                    "Tunnelling probability falls off as $e^{-2\\kappa L}$ with $\\kappa \\propto \\sqrt{m}$ — heavier particles tunnel far less.",
                    "Deuterium (twice the mass of hydrogen) therefore reacts much more slowly than a classical barrier would predict.",
                    "A measured KIE exceeding the classical ceiling (~7) signals that tunnelling, not thermal barrier crossing, dominates.",
                ],
            },
        ],
    },
    {
        "slug": "olfaction_tunneling",
        "prerequisites": ["quantum_tunneling", "phonons"],
        "overview": [
            "How does the nose tell apart molecules of similar shape? The conventional 'lock-and-key' model says receptors recognise molecular shape, but it struggles with cases where similar-shaped molecules smell different — or different-shaped ones smell alike.",
            "The vibration theory of olfaction proposes that receptors also read a molecule's vibrational frequencies via inelastic electron tunnelling: an electron tunnels across the bound molecule only if the molecule can absorb the exact energy difference as a vibration.",
            "Support comes from experiments where deuterated molecules (same shape, different vibrations) reportedly smell different to flies and possibly humans. The theory remains controversial, with shape-based models still dominant.",
        ],
        "history": (
            "Malcolm Dyson floated a vibrational idea in the 1930s; Luca Turin revived and sharpened it as inelastic electron tunnelling in 1996. Marshall Stoneham and colleagues gave it a physical model in 2007; deuterium-discrimination tests since have been mixed."
        ),
        "formulas": [
            {
                "latex": r"\hbar\omega = \varepsilon_D - \varepsilon_A",
                "description": "Inelastic tunnelling: an electron crosses only when a molecular vibration absorbs the energy gap.",
                "symbols": {
                    r"\hbar\omega": "energy of a molecular vibrational mode",
                    r"\varepsilon_D": "donor electron energy level",
                    r"\varepsilon_A": "acceptor electron energy level",
                },
                "derivation_steps": [
                    "An electron sits at a donor site; an acceptor lies at lower energy across the odorant.",
                    "Elastic tunnelling is blocked by the energy mismatch $\\varepsilon_D - \\varepsilon_A$.",
                    "If a molecular vibration has exactly that energy, the electron tunnels inelastically, exciting the mode — so the receptor effectively reads the vibration.",
                ],
            },
        ],
    },
    {
        "slug": "dna_mutation_tunneling",
        "prerequisites": ["quantum_tunneling", "quantum_biology_intro"],
        "overview": [
            "The two strands of DNA are held together by hydrogen bonds between base pairs, in which protons sit in double-well potentials. A proton can quantum-mechanically tunnel from its normal position to the other well, creating a rare 'tautomer' of the base.",
            "If such a tautomeric shift happens just as the DNA is being copied, the altered base can mispair, planting a point mutation in the daughter strand. This is a proposed quantum route to spontaneous mutation, complementing thermal mechanisms.",
            "Whether proton tunnelling contributes significantly to real mutation rates is still debated; recent computational work suggests tautomer populations from tunnelling may be larger than once thought, keeping the idea alive.",
        ],
        "history": (
            "Per-Olov Löwdin proposed proton tunnelling as a mutation mechanism in 1963, soon after Watson and Crick noted that tautomers could cause mispairing. Modern open-quantum-system simulations (2010s–2020s) have revisited and partly supported the idea."
        ),
        "formulas": [
            {
                "latex": r"P_{\text{tunnel}} \propto e^{-2\kappa a},\qquad \kappa = \frac{\sqrt{2m_p(V_0 - E)}}{\hbar}",
                "description": "Proton tunnelling probability across the hydrogen-bond barrier between base-pair wells.",
                "symbols": {
                    "P_{\\text{tunnel}}": "probability of the proton tunnelling to the other well",
                    "m_p": "proton mass",
                    "a": "barrier width (proton transfer distance)",
                    "V_0 - E": "barrier height above the proton energy",
                },
                "derivation_steps": [
                    "Model each hydrogen bond as a double well separated by a barrier of height $V_0$ and width a.",
                    "The proton's tunnelling amplitude decays as $e^{-\\kappa a}$ with $\\kappa = \\sqrt{2m_p(V_0-E)}/\\hbar$.",
                    "A tunnelled proton yields a tautomeric base that can mispair during replication, fixing a mutation.",
                ],
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Populate Quantum Biology-branch topics with full content (run after seed_concepts)."

    @transaction.atomic
    def handle(self, *args, **options):
        run(self, TOPICS, "Quantum Biology")

"""Populate the Quantum Field Theory branch with full content: overviews,
history, structured formulas (symbols + derivation steps), prerequisite links,
and simulation keys (Standard Model table, Feynman diagrams, Higgs potential).

Idempotent — re-running updates rows in place. Run after `seed_concepts`.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from ._content import run

TOPICS = [
    {
        "slug": "qed",
        "related_simulation": "feynman",
        "prerequisites": ["quantum_vacuum", "spin"],
        "overview": [
            "Quantum electrodynamics is the quantum field theory of light and charged matter — the most precisely tested theory in all of physics. Electrons and positrons are excitations of the electron field; photons are excitations of the electromagnetic field; they interact at a single basic vertex.",
            "Every process is a sum over Feynman diagrams: lines for particles, vertices where a charge emits or absorbs a photon, each vertex carrying a factor of the coupling. More vertices mean higher powers of the small fine-structure constant, so the series converges quickly.",
            "QED's prediction for the electron's magnetic moment matches experiment to twelve significant figures. Its success became the template for the entire Standard Model.",
        ],
        "history": (
            "Born from Dirac's 1928 equation, QED was made consistent by Tomonaga, Schwinger, and Feynman around 1948 (Nobel 1965), with Dyson proving their approaches equivalent. Feynman's diagrams turned the theory into a calculational engine."
        ),
        "formulas": [
            {
                "latex": r"\alpha = \frac{e^2}{4\pi\varepsilon_0 \hbar c} \approx \frac{1}{137}",
                "description": "The fine-structure constant: the dimensionless strength of the electromagnetic interaction.",
                "symbols": {
                    r"\alpha": "fine-structure constant",
                    "e": "elementary charge",
                    r"\hbar": "reduced Planck constant",
                    "c": "speed of light",
                    r"\varepsilon_0": "vacuum permittivity",
                },
                "derivation_steps": [
                    "Each QED vertex contributes a factor of the charge e, so amplitudes are power series in $e^2$.",
                    "Collecting the fundamental constants into a dimensionless group gives $\\alpha = e^2/4\\pi\\varepsilon_0\\hbar c$.",
                    "Because $\\alpha \\approx 1/137 \\ll 1$, perturbation theory (the diagram expansion) converges rapidly.",
                ],
            },
        ],
    },
    {
        "slug": "qcd",
        "related_simulation": "feynman",
        "prerequisites": ["qed"],
        "overview": [
            "Quantum chromodynamics is the theory of the strong force, binding quarks into protons, neutrons, and other hadrons. Its charge is 'colour', which comes in three types, and its force carriers — gluons — themselves carry colour, so they interact with one another.",
            "That self-interaction produces two signature behaviours. Asymptotic freedom means quarks behave almost freely at very short distances (high energy). Confinement means the force grows with separation, so quarks can never be isolated — pull them apart and the energy makes new quark pairs instead.",
            "QCD is hard to solve precisely because its coupling is large at everyday energies; physicists turn to lattice simulations to compute hadron masses from first principles.",
        ],
        "history": (
            "Gell-Mann and Zweig proposed quarks in 1964. Colour and the QCD gauge theory followed, and Gross, Wilczek, and Politzer discovered asymptotic freedom in 1973 (Nobel 2004), explaining why quarks seem free inside hadrons yet can never escape."
        ),
        "formulas": [
            {
                "latex": r"\alpha_s(Q^2) = \frac{12\pi}{(33 - 2 n_f)\ln(Q^2/\Lambda^2)}",
                "description": "The running strong coupling: it shrinks at high momentum transfer Q (asymptotic freedom).",
                "symbols": {
                    r"\alpha_s": "strong coupling constant",
                    "Q": "momentum transfer (energy scale)",
                    "n_f": "number of active quark flavours",
                    r"\Lambda": "QCD scale (~200 MeV)",
                },
                "derivation_steps": [
                    "Gluon self-interactions make the beta function negative when $33 > 2 n_f$.",
                    "Integrating the renormalisation-group equation gives a coupling that decreases logarithmically with energy: asymptotic freedom.",
                    "Run the other way and $\\alpha_s$ blows up near $Q \\sim \\Lambda$ — the onset of confinement.",
                ],
            },
        ],
    },
    {
        "slug": "standard_model",
        "related_simulation": "standard_model",
        "prerequisites": ["qed", "qcd", "higgs_mechanism"],
        "overview": [
            "The Standard Model is our best theory of the fundamental particles and three of the four forces. Matter is built from twelve fermions — six quarks and six leptons in three generations — while forces are carried by gauge bosons: the photon, gluons, and the W and Z.",
            "The Higgs boson, confirmed in 2012, completes the roster: its field gives the W, Z, and the fermions their masses. The model is a gauge theory with the symmetry group SU(3)×SU(2)×U(1).",
            "Extraordinarily successful — predicting the W, Z, top quark, and Higgs before they were seen — it is still incomplete: it omits gravity, dark matter, and neutrino masses, leaving clear signposts toward deeper physics.",
        ],
        "history": (
            "Assembled through the 1960s–70s by Glashow, Weinberg, and Salam (electroweak unification, Nobel 1979) together with the quark and QCD developments. Its predicted particles were confirmed one by one, culminating in the Higgs discovery at the LHC in 2012."
        ),
        "formulas": [
            {
                "latex": r"SU(3)_C \times SU(2)_L \times U(1)_Y",
                "description": "The gauge symmetry group of the Standard Model: strong × weak × hypercharge.",
                "symbols": {
                    "SU(3)_C": "colour symmetry of the strong force (8 gluons)",
                    "SU(2)_L": "weak isospin acting on left-handed fermions",
                    "U(1)_Y": "weak hypercharge",
                },
                "derivation_steps": [
                    "Demanding local gauge invariance under each group forces the existence of its gauge bosons.",
                    "$SU(3)_C$ gives 8 gluons; $SU(2)_L \\times U(1)_Y$ gives four electroweak bosons.",
                    "The Higgs mechanism breaks $SU(2)_L\\times U(1)_Y \\to U(1)_{EM}$, leaving the massless photon and the massive W and Z.",
                ],
            },
        ],
    },
    {
        "slug": "feynman_diagrams",
        "related_simulation": "feynman",
        "prerequisites": ["qed"],
        "overview": [
            "Feynman diagrams are pictures that stand for terms in the perturbation expansion of a scattering amplitude. Lines represent particles propagating, and vertices represent interactions; reading a diagram with the Feynman rules yields the mathematical contribution of that process.",
            "External lines are the incoming and outgoing particles; internal lines are virtual particles that need not satisfy the usual energy–momentum relation. Each vertex contributes a power of the coupling constant, so simpler diagrams with fewer vertices usually dominate.",
            "The full amplitude is the sum over all diagrams with the right external particles. The interactive explorer shows several canonical processes — scattering, annihilation, and beta decay — and their vertices.",
        ],
        "history": (
            "Richard Feynman introduced his diagrams at the 1948 Pocono conference. Initially met with scepticism, they were systematised by Dyson and quickly became the universal language of particle physics."
        ),
        "formulas": [
            {
                "latex": r"\frac{1}{p^2 - m^2 + i\epsilon}",
                "description": "The propagator: the amplitude for a virtual particle of mass m to travel with four-momentum p.",
                "symbols": {
                    "p": "four-momentum carried by the internal line",
                    "m": "mass of the virtual particle",
                    r"i\epsilon": "infinitesimal prescription fixing the contour",
                },
                "derivation_steps": [
                    "Each internal line is a propagator, the Green's function of the particle's wave equation.",
                    "Each vertex contributes a coupling factor; momentum is conserved at every vertex.",
                    "Multiply the factors and integrate over undetermined internal momenta to get the amplitude; $|\\mathcal{M}|^2$ gives the rate.",
                ],
            },
        ],
    },
    {
        "slug": "renormalization",
        "prerequisites": ["qed", "quantum_vacuum"],
        "overview": [
            "Naive quantum field theory calculations are plagued by infinities: loop diagrams integrate over arbitrarily high momenta and diverge. Renormalization is the systematic procedure that absorbs these infinities into a redefinition of a few measured quantities like charge and mass.",
            "The key insight is that the 'bare' parameters in the Lagrangian are not observable; only physical, measured values are. Once charge and mass are fixed to experiment at one scale, every other prediction comes out finite and astonishingly accurate.",
            "The renormalization group then describes how effective couplings 'run' with the energy scale — explaining QCD's asymptotic freedom and unifying our picture of physics across scales. A theory is renormalizable if finitely many parameters suffice.",
        ],
        "history": (
            "Developed for QED by Tomonaga, Schwinger, Feynman, and Dyson around 1948. Kenneth Wilson's renormalization group (Nobel 1982) reframed it as a deep statement about physics at different length scales, with sweeping consequences in particle and condensed-matter physics."
        ),
        "formulas": [
            {
                "latex": r"\mu\frac{d g}{d\mu} = \beta(g)",
                "description": "The renormalization-group equation: how a coupling g runs with the energy scale μ.",
                "symbols": {
                    "g": "coupling constant",
                    r"\mu": "renormalization (energy) scale",
                    r"\beta(g)": "beta function governing the running",
                },
                "derivation_steps": [
                    "Physical predictions must not depend on the arbitrary scale $\\mu$ at which parameters are defined.",
                    "Requiring $\\mu$-independence of observables yields the RG equation $\\mu\\, dg/d\\mu = \\beta(g)$.",
                    "The sign of $\\beta$ decides the fate: $\\beta < 0$ gives asymptotic freedom (QCD), $\\beta > 0$ a coupling that grows with energy (QED).",
                ],
            },
        ],
    },
    {
        "slug": "higgs_mechanism",
        "related_simulation": "higgs",
        "prerequisites": ["electroweak_theory"],
        "overview": [
            "Gauge symmetry forbids the force carriers of the weak interaction from having mass, yet the W and Z are very heavy. The Higgs mechanism resolves this: a field that permeates all of space takes a non-zero value in the vacuum, spontaneously breaking the electroweak symmetry.",
            "The Higgs potential has the shape of a Mexican hat. The symmetric point at the centre is unstable; the field rolls down to a non-zero value, and particles acquire mass in proportion to how strongly they couple to that vacuum field. The photon, which does not couple, stays massless.",
            "The leftover ripple of the field is the Higgs boson, discovered at the LHC in 2012 — the experimental confirmation that this is how fundamental masses arise.",
        ],
        "history": (
            "Proposed independently in 1964 by Englert and Brout, by Higgs, and by Guralnik, Hagen, and Kibble. The boson's discovery at CERN in 2012 earned Englert and Higgs the 2013 Nobel Prize, 48 years after the prediction."
        ),
        "formulas": [
            {
                "latex": r"V(\phi) = \mu^2 |\phi|^2 + \lambda |\phi|^4",
                "description": "The Higgs potential; for μ² < 0 the minimum sits at a non-zero field value v.",
                "symbols": {
                    r"\phi": "the complex Higgs field",
                    r"\mu^2": "mass parameter (negative in the broken phase)",
                    r"\lambda": "self-coupling (> 0 for stability)",
                },
                "derivation_steps": [
                    "For $\\mu^2 > 0$ the potential has a single minimum at $\\phi = 0$ — the symmetric vacuum.",
                    "For $\\mu^2 < 0$ the minimum moves to $|\\phi| = v = \\sqrt{-\\mu^2/2\\lambda}$; the field acquires a vacuum expectation value.",
                    "Expanding the gauge-boson and fermion couplings around v gives them masses proportional to v; the photon decouples and stays massless.",
                ],
            },
        ],
    },
    {
        "slug": "electroweak_theory",
        "prerequisites": ["qed", "spin"],
        "overview": [
            "At low energies electromagnetism and the weak nuclear force look utterly different — one is long-ranged and the other extremely short-ranged. Electroweak theory shows they are two facets of a single unified interaction that becomes manifest at high energy.",
            "The unified theory has four gauge bosons. After the Higgs mechanism breaks the symmetry, they mix: three combine into the massive W⁺, W⁻, and Z, while one combination remains the massless photon. The mixing angle θ_W relates their masses and couplings.",
            "The theory predicted the W and Z bosons and the neutral-current interactions before they were observed — triumphs that confirmed the unification and cemented the Standard Model.",
        ],
        "history": (
            "Glashow, Weinberg, and Salam built electroweak unification between 1961 and 1968 (Nobel 1979). Neutral currents were seen at CERN in 1973, and the W and Z bosons were discovered there in 1983 (Rubbia and van der Meer, Nobel 1984)."
        ),
        "formulas": [
            {
                "latex": r"M_W = M_Z \cos\theta_W",
                "description": "The W and Z masses are linked by the weak mixing (Weinberg) angle.",
                "symbols": {
                    "M_W": "mass of the W boson (~80.4 GeV)",
                    "M_Z": "mass of the Z boson (~91.2 GeV)",
                    r"\theta_W": "weak mixing angle",
                },
                "derivation_steps": [
                    "The Higgs vacuum value gives masses to three of the four electroweak gauge bosons.",
                    "The neutral $W^3$ and $B$ fields mix through the angle $\\theta_W$ into the physical Z and the massless photon.",
                    "Working out the mass matrix gives the relation $M_W = M_Z\\cos\\theta_W$, verified experimentally.",
                ],
            },
        ],
    },
    {
        "slug": "quantum_vacuum",
        "prerequisites": ["uncertainty", "harmonic_oscillator"],
        "overview": [
            "The quantum vacuum is not empty. Every field has a lowest-energy state that still seethes with zero-point fluctuations, because the uncertainty principle forbids a field and its rate of change from both being exactly zero.",
            "These fluctuations have measurable consequences: the Casimir force pulls two uncharged plates together, the Lamb shift nudges atomic energy levels, and virtual particle pairs continually flicker in and out of existence, screening charges and contributing to particle masses.",
            "The vacuum's energy is also a deep puzzle. Naive estimates of its gravitational effect exceed the observed cosmological constant by some 120 orders of magnitude — one of the largest discrepancies in physics.",
        ],
        "history": (
            "Zero-point energy emerged from Planck and the early oscillator quantisation. Hendrik Casimir predicted his force in 1948; Lamb measured the vacuum-induced shift in hydrogen in 1947. The vacuum-energy / cosmological-constant problem remains unresolved."
        ),
        "formulas": [
            {
                "latex": r"E_0 = \tfrac{1}{2}\hbar\omega,\qquad F_{\text{Casimir}} = -\frac{\pi^2 \hbar c}{240\, d^4}\,A",
                "description": "Zero-point energy of a field mode, and the resulting Casimir attraction between two plates a distance d apart.",
                "symbols": {
                    "E_0": "zero-point energy per mode",
                    r"\omega": "mode angular frequency",
                    "d": "plate separation",
                    "A": "plate area",
                },
                "derivation_steps": [
                    "Each field mode is a quantum oscillator with ground-state energy $\\tfrac12\\hbar\\omega$, which cannot be removed.",
                    "Conducting plates restrict which modes fit between them, lowering the vacuum energy in the gap relative to outside.",
                    "The energy difference depends on separation as $1/d^3$, so its derivative gives an attractive force $\\propto 1/d^4$.",
                ],
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Populate Quantum Field Theory-branch topics with full content (run after seed_concepts)."

    @transaction.atomic
    def handle(self, *args, **options):
        run(self, TOPICS, "Quantum Field Theory")

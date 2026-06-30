"""Populate the Quantum Gravity branch with full content: overviews, history,
structured formulas (symbols + derivation steps), prerequisite links, and a
simulation key for Hawking radiation.

Idempotent — re-running updates rows in place. Run after `seed_concepts`.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from ._content import run

TOPICS = [
    {
        "slug": "quantum_gravity_intro",
        "prerequisites": ["quantum_vacuum", "uncertainty"],
        "overview": [
            "Quantum gravity is the unfinished search for a theory that unites quantum mechanics with Einstein's general relativity. Each works superbly in its own domain, but they rest on incompatible foundations: a fixed quantum stage versus a dynamical, curved spacetime.",
            "Treating gravity like the other forces fails: quantising the metric naively gives a non-renormalizable theory whose infinities cannot be absorbed. The problem only bites where both theories matter at once — at the Planck scale, and inside black holes and the early universe.",
            "Leading candidate frameworks — string theory and loop quantum gravity — take radically different routes, and experiment offers almost no guidance because the relevant energies are so extreme. It remains the central open problem of fundamental physics.",
        ],
        "history": (
            "Attempts date to the 1930s. Bronstein noted the special difficulty of quantising gravity in 1936; serious programmes grew from the 1960s (DeWitt, Wheeler) onward. The non-renormalizability of perturbative quantum gravity was established in the 1970s–80s."
        ),
        "formulas": [
            {
                "latex": r"S = \frac{c^3}{16\pi G}\int R\,\sqrt{-g}\,d^4x",
                "description": "The Einstein–Hilbert action whose quantisation is the central difficulty.",
                "symbols": {
                    "R": "Ricci scalar curvature",
                    "g": "determinant of the metric tensor",
                    "G": "Newton's gravitational constant",
                    "c": "speed of light",
                },
                "derivation_steps": [
                    "General relativity follows from extremising the Einstein–Hilbert action.",
                    "Expanding the metric as a flat background plus a graviton field gives a quantum field theory of gravitons.",
                    "Loop corrections produce divergences that need infinitely many counterterms — the theory is non-renormalizable, signalling new physics at the Planck scale.",
                ],
            },
        ],
    },
    {
        "slug": "planck_scale",
        "prerequisites": ["quantum_gravity_intro"],
        "overview": [
            "The Planck scale is the regime where quantum and gravitational effects become equally strong, built from the three constants ℏ, c, and G alone. The Planck length is about 1.6×10⁻³⁵ m and the Planck energy about 10¹⁹ GeV.",
            "At these scales the smooth spacetime of relativity is expected to break down: quantum fluctuations of geometry become large, and the very notions of distance and duration may lose meaning. Probing it directly would need a collider the size of a galaxy.",
            "Many quantum-gravity proposals predict a minimum length or a 'foamy' spacetime near the Planck scale, motivating searches for tiny Lorentz-violation effects in light from distant gamma-ray bursts.",
        ],
        "history": (
            "Max Planck noted in 1899 that ℏ, c, and G fix natural units of length, time, and mass independent of any human convention. Their significance as the scale of quantum gravity became clear with later work on spacetime foam (Wheeler, 1955)."
        ),
        "formulas": [
            {
                "latex": r"\ell_P = \sqrt{\frac{\hbar G}{c^3}} \approx 1.6\times10^{-35}\,\text{m}",
                "description": "The Planck length, the natural length scale of quantum gravity.",
                "symbols": {
                    r"\ell_P": "Planck length",
                    r"\hbar": "reduced Planck constant",
                    "G": "gravitational constant",
                    "c": "speed of light",
                },
                "derivation_steps": [
                    "Form the unique length from $\\hbar$, $G$, and $c$ by dimensional analysis.",
                    "Setting a particle's Compton wavelength $\\hbar/mc$ equal to its Schwarzschild radius $2Gm/c^2$ gives a mass — the Planck mass.",
                    "The corresponding length is $\\ell_P = \\sqrt{\\hbar G/c^3}$, where quantum and gravitational scales coincide.",
                ],
            },
        ],
    },
    {
        "slug": "hawking_radiation",
        "related_simulation": "hawking",
        "prerequisites": ["quantum_vacuum", "quantum_gravity_intro"],
        "overview": [
            "Black holes are not perfectly black. Applying quantum field theory to the curved spacetime near a horizon, Hawking showed that black holes emit thermal radiation and therefore have a real temperature and entropy.",
            "Heuristically, vacuum fluctuations near the horizon create particle pairs; one falls in carrying negative energy while its partner escapes to infinity, so the hole slowly loses mass. The temperature is inversely proportional to the mass, so smaller holes are hotter.",
            "This means black holes evaporate, ending in a final burst — over timescales vastly longer than the age of the universe for stellar masses. The result ties together gravity, quantum theory, and thermodynamics, and sets up the information paradox.",
        ],
        "history": (
            "Bekenstein argued in 1972 that black holes carry entropy; Stephen Hawking, initially sceptical, derived the radiation in 1974–75, fixing the temperature and confirming the entropy. It remains one of the few concrete results combining gravity and quantum theory."
        ),
        "formulas": [
            {
                "latex": r"T_H = \frac{\hbar c^3}{8\pi G M k_B}",
                "description": "The Hawking temperature of a black hole of mass M — smaller holes are hotter.",
                "symbols": {
                    "T_H": "Hawking temperature",
                    "M": "black-hole mass",
                    r"\hbar": "reduced Planck constant",
                    "G": "gravitational constant",
                    "k_B": "Boltzmann constant",
                },
                "derivation_steps": [
                    "Quantum fields on the black-hole background mix positive- and negative-frequency modes across the horizon.",
                    "The escaping flux has a thermal (Planck) spectrum, defining a temperature.",
                    "Working it out gives $T_H \\propto 1/M$: as the hole radiates and shrinks, it heats up and evaporates ever faster.",
                ],
            },
        ],
    },
    {
        "slug": "black_hole_information",
        "prerequisites": ["hawking_radiation", "measurement"],
        "overview": [
            "If a black hole forms from a pure quantum state and then evaporates into seemingly featureless thermal Hawking radiation, the original information appears to be destroyed. But quantum mechanics forbids that: evolution is unitary and information must be preserved.",
            "This is the black-hole information paradox — a sharp clash between general relativity (which says the interior is causally cut off) and quantum theory (which says information cannot be lost). It has driven decades of work at the frontier of quantum gravity.",
            "Recent progress using the holographic principle and the 'island' formula suggests the radiation does carry the information out, with the entanglement entropy following the Page curve. A complete, agreed resolution is still being worked out.",
        ],
        "history": (
            "Hawking posed the paradox in 1976, arguing information is lost; he conceded a 2004 bet to Preskill. Susskind and 't Hooft championed unitarity via holography; the 2019–20 island/Page-curve calculations marked a major step toward resolution."
        ),
        "formulas": [
            {
                "latex": r"S_{BH} = \frac{k_B c^3 A}{4 G \hbar}",
                "description": "Bekenstein–Hawking entropy: a black hole's entropy is one quarter of its horizon area in Planck units.",
                "symbols": {
                    "S_{BH}": "black-hole entropy",
                    "A": "horizon area",
                    "G": "gravitational constant",
                    r"\hbar": "reduced Planck constant",
                },
                "derivation_steps": [
                    "Combine the first law of black-hole mechanics with the Hawking temperature $T_H$.",
                    "Integrating $dS = dM c^2 / T_H$ yields entropy proportional to the horizon area, not the volume.",
                    "The finite entropy implies a finite number of microstates — information must be stored and ultimately released.",
                ],
            },
        ],
    },
    {
        "slug": "holographic_principle",
        "prerequisites": ["black_hole_information"],
        "overview": [
            "The holographic principle proposes that all the information inside a region of space can be encoded on its boundary, with no more than one bit per Planck area. A volume of reality is described by data living on a lower-dimensional surface — like a hologram.",
            "It was inspired by black-hole entropy scaling with area rather than volume. Its most concrete realisation is the AdS/CFT correspondence, an exact duality between a gravitational theory in a bulk spacetime and a non-gravitational quantum field theory on its boundary.",
            "Holography reframes spacetime and gravity as emergent from the entanglement structure of a boundary quantum theory, and has become a central tool for studying quantum gravity, the information paradox, and even strongly-coupled matter.",
        ],
        "history": (
            "'t Hooft proposed the principle in 1993 and Susskind gave it a string-theory form in 1994. Maldacena's 1997 AdS/CFT correspondence made it precise and is among the most-cited results in theoretical physics."
        ),
        "formulas": [
            {
                "latex": r"S_{\max} = \frac{k_B\, A}{4\,\ell_P^2}",
                "description": "The holographic bound: maximum entropy (information) in a region scales with its boundary area.",
                "symbols": {
                    "S_{\\max}": "maximum entropy of the region",
                    "A": "area of the bounding surface",
                    r"\ell_P": "Planck length",
                },
                "derivation_steps": [
                    "A black hole is the most entropic object that fits in a region, and its entropy is $A/4\\ell_P^2$.",
                    "Any other contents would have less entropy, or would collapse to a larger black hole.",
                    "So the information in any region is bounded by its boundary area — the basis of holography.",
                ],
            },
        ],
    },
    {
        "slug": "string_theory",
        "prerequisites": ["quantum_gravity_intro", "standard_model"],
        "overview": [
            "String theory replaces point particles with tiny one-dimensional vibrating strings. Different vibration modes correspond to different particles, and one mode is automatically a graviton — so the theory contains gravity from the outset, finite and quantum-consistent.",
            "Consistency requires extra spatial dimensions (ten in superstring theory) curled up too small to see, and supersymmetry pairing bosons with fermions. The five superstring theories are now understood as limits of a single eleven-dimensional 'M-theory'.",
            "String theory has produced deep mathematical and physical insights — AdS/CFT, black-hole entropy counting — but has not yet made a testable prediction that distinguishes it from alternatives, and the vast 'landscape' of possible vacua is a major challenge.",
        ],
        "history": (
            "Born around 1968 as a model of the strong force, strings were reinterpreted as a theory of gravity by Scherk and Schwarz in 1974. The 1984 'first superstring revolution' (Green–Schwarz anomaly cancellation) and Witten's 1995 M-theory unification followed."
        ),
        "formulas": [
            {
                "latex": r"T = \frac{1}{2\pi\alpha'}",
                "description": "String tension set by the Regge slope α′; the string length is ℓ_s = √(α′).",
                "symbols": {
                    "T": "string tension",
                    r"\alpha'": "Regge slope (sets the string length scale)",
                },
                "derivation_steps": [
                    "A relativistic string sweeps out a worldsheet; its action is proportional to the worldsheet area (Nambu–Goto).",
                    "The proportionality constant is the tension $T = 1/2\\pi\\alpha'$.",
                    "Quantising the vibrations gives a spectrum of particles, including a massless spin-2 graviton.",
                ],
            },
        ],
    },
    {
        "slug": "loop_quantum_gravity",
        "prerequisites": ["quantum_gravity_intro", "planck_scale"],
        "overview": [
            "Loop quantum gravity quantises spacetime itself rather than adding gravity to a fixed background. It applies quantum principles directly to Einstein's geometry, and finds that area and volume come in discrete units at the Planck scale.",
            "Space is described by spin networks — graphs whose edges carry quanta of area and whose nodes carry quanta of volume; their evolution in time forms 'spin foams'. Geometry is granular, with a smallest possible area of order the Planck length squared.",
            "Unlike string theory, loop quantum gravity needs no extra dimensions or supersymmetry, and it is background-independent. Its challenges are recovering smooth classical spacetime at large scales and making contact with particle physics.",
        ],
        "history": (
            "Founded in the late 1980s by Abhay Ashtekar's reformulation of general relativity, developed by Rovelli, Smolin, and others. The discreteness of area and volume spectra was derived in the mid-1990s."
        ),
        "formulas": [
            {
                "latex": r"A = 8\pi\gamma\,\ell_P^2 \sum_i \sqrt{j_i(j_i+1)}",
                "description": "Quantised area: a surface's area comes in discrete units set by the spins jᵢ piercing it.",
                "symbols": {
                    "A": "area of a surface",
                    r"\gamma": "Barbero–Immirzi parameter",
                    r"\ell_P": "Planck length",
                    "j_i": "spin labels (half-integers) of edges crossing the surface",
                },
                "derivation_steps": [
                    "Reformulate gravity using connection variables, then promote geometric quantities to operators.",
                    "The area operator's eigenvalues depend on spin-network edges crossing the surface.",
                    "The spectrum is discrete, $A \\propto \\sum_i \\sqrt{j_i(j_i+1)}$, so area is fundamentally quantised.",
                ],
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Populate Quantum Gravity-branch topics with full content (run after seed_concepts)."

    @transaction.atomic
    def handle(self, *args, **options):
        run(self, TOPICS, "Quantum Gravity")

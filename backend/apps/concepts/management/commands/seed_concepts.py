"""Seed the knowledge base with the core quantum concepts.

Mirrors the topic walkthrough shipped in the frontend (`src/data/topics.tsx`)
so the `/api/concepts/` API returns the same set of topics the simulations tour
covers. Idempotent: re-running updates existing rows (matched by slug) rather
than creating duplicates.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from apps.concepts.models import Category, Concept, ConceptContent

CATEGORIES = [
    ("foundations", "Foundations", "The experiments and principles that forced physics to go quantum.", "#7C3AED"),
    ("dynamics", "States & Dynamics", "How quantum states are shaped, confined, and evolve in time.", "#2563EB"),
    ("information", "Quantum Information", "Superposition, entanglement, and the qubit as a unit of computation.", "#0891B2"),
    ("light-and-matter", "Light & Matter", "Where quantisation first showed up: photons, electrons, and heat.", "#D97706"),
]

# (slug, title, category, difficulty, summary, equation, [explanation paragraphs])
CONCEPTS = [
    (
        "double_slit", "The Double-Slit Experiment", "foundations", "beginner",
        "Why a single particle interferes with itself.", "P(y) = |ψ₁ + ψ₂|²",
        [
            "Fire particles one at a time at a barrier with two narrow openings. Classically you would expect two bright bands behind the slits. Instead, an interference pattern of many fringes builds up — even though particles arrive one by one and never meet.",
            "Each particle travels as a probability wave that passes through both slits at once. The two paths interfere, and the squared amplitude of the combined wave sets the odds of where the particle lands.",
            "If you place a detector to learn which slit the particle went through, the interference vanishes and you recover two plain bands. Knowing the path destroys the superposition — measurement changes the outcome.",
        ],
    ),
    (
        "particle_in_box", "Particle in a Box", "dynamics", "beginner",
        "How confinement quantises energy.", "Eₙ = n²h² / 8mL²",
        [
            "Trap a particle between two infinitely high walls. Its wavefunction must vanish at both walls, so only standing waves with a whole number of half-wavelengths fit — exactly like the harmonics of a guitar string.",
            "Because only certain wavelengths are allowed, only certain energies are allowed: E ∝ n². Energy becomes discrete purely as a consequence of confining the particle.",
            "Squaring each standing wave gives the probability of finding the particle at each position. This toy model underlies quantum dots, conjugated molecules, and nanoscale electronics.",
        ],
    ),
    (
        "wavefunction", "Wavefunction Evolution", "dynamics", "intermediate",
        "How a wave packet spreads through time.", "iℏ ∂ψ/∂t = Ĥψ",
        [
            "A free particle can be described by a Gaussian wave packet — a localised bump of probability. The Schrödinger equation tells that packet how to evolve, and it inevitably spreads out as time passes.",
            "Spreading is the price of localisation: a tightly-pinned position requires a wide spread of momenta, and those momentum components travel at different speeds, smearing the packet.",
            "The complex phase of ψ rotates as it travels, but only |ψ|² — the real probability density — is observable. The total probability always integrates to one.",
        ],
    ),
    (
        "quantum_tunneling", "Quantum Tunneling", "dynamics", "advanced",
        "Passing through walls that should stop you.", "T ≈ e^(−2κL)",
        [
            "Send a particle at a potential barrier taller than its energy. Classically it must bounce back. Quantum mechanically its wavefunction decays inside the barrier rather than stopping dead.",
            "That surviving amplitude means a real, non-zero chance of finding the particle beyond a wall it could never climb. Transmission falls off exponentially with barrier width and height.",
            "Tunneling powers radioactive alpha decay, the scanning tunneling microscope, flash memory, and the proton fusion that lets the Sun shine.",
        ],
    ),
    (
        "superposition", "Quantum Superposition", "information", "beginner",
        "Being in many states at once — until you look.", "|ψ⟩ = α|0⟩ + β|1⟩,  |α|² + |β|² = 1",
        [
            "A quantum system need not be in just one state. It can occupy a weighted sum — a superposition — of several at once. A qubit lives as α|0⟩ + β|1⟩.",
            "The complex weights α and β are amplitudes, not probabilities. When measured, the state collapses to a single outcome, with probability |α|² for 0 and |β|² for 1.",
            "Superposition is not ignorance about a hidden true value — it is the resource that lets a quantum computer explore many possibilities in a single coherent state.",
        ],
    ),
    (
        "entanglement", "Quantum Entanglement", "information", "intermediate",
        "Correlations no classical signal can explain.", "|Ψ⁻⟩ = (|01⟩ − |10⟩) / √2",
        [
            "Two particles can share a single joint state that cannot be written as separate descriptions. In the singlet state, neither qubit has a definite spin, yet they are guaranteed opposite when measured along the same axis.",
            "Measure one and you instantly know the other — even light-years away. But no usable signal travels: each side alone sees pure randomness.",
            "Bell's theorem turns this into a testable inequality. Real experiments violate it, ruling out any local hidden-variable explanation.",
        ],
    ),
    (
        "uncertainty", "The Uncertainty Principle", "foundations", "intermediate",
        "Why sharp position means fuzzy momentum.", "Δx · Δp ≥ ℏ / 2",
        [
            "Heisenberg's principle says certain pairs of properties can never both be pinned down at once. The more precisely you fix one, the more the other must blur.",
            "A wavefunction sharply peaked in position is a sum of many momentum waves — so its momentum is spread wide. The two descriptions are Fourier transforms of each other.",
            "The floor is ℏ/2, so the trade-off is invisible for baseballs but dominant for electrons. It explains why atoms don't collapse.",
        ],
    ),
    (
        "spin", "Quantum Spin & Stern–Gerlach", "foundations", "intermediate",
        "Intrinsic angular momentum that comes in steps.", "Sz = ±½ ℏ",
        [
            "Spin is an intrinsic angular momentum carried by particles like electrons — not a literal spinning ball, but a genuine quantum degree of freedom. For a spin-½ particle, measuring spin along any axis yields only two values.",
            "The 1922 Stern–Gerlach experiment sent silver atoms through a non-uniform magnetic field. The beam split cleanly into two — direct proof that the projection of spin is quantised.",
            "Chain two analysers and measuring spin along x scrambles a previously definite z-spin, because those components are incompatible observables.",
        ],
    ),
    (
        "harmonic_oscillator", "Quantum Harmonic Oscillator", "dynamics", "advanced",
        "The most reused model in all of physics.", "Eₙ = (n + ½) ℏω",
        [
            "Put a particle in a parabolic potential and quantum mechanics delivers a perfectly even ladder of energy levels spaced by ℏω. This describes vibrating molecules, phonons, and modes of the electromagnetic field.",
            "The eigenstates are Hermite polynomials times a Gaussian. The ground state sits at energy ½ℏω — the zero-point energy that never vanishes.",
            "Because every smooth potential looks parabolic near its minimum, the harmonic oscillator is the universal first approximation for any bound system.",
        ],
    ),
    (
        "qubit", "The Qubit & Bloch Sphere", "information", "advanced",
        "Every pure single-qubit state on one sphere.", "|ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩",
        [
            "A classical bit is 0 or 1. A qubit's pure states form a continuous surface — the Bloch sphere. The north pole is |0⟩, the south pole |1⟩, and every other point is a superposition.",
            "The phase φ is invisible to a single measurement but absolutely real: it controls interference. Logic gates are rotations of the sphere.",
            "Mixed or noisy states sit inside the ball rather than on its surface, and the radius measures how 'quantum' the state still is.",
        ],
    ),
    (
        "photoelectric", "The Photoelectric Effect", "light-and-matter", "beginner",
        "The experiment that proved light is quantised.", "KEmax = hf − φ",
        [
            "Shine light on a metal and electrons can be knocked loose. Experiment showed that below a threshold frequency, no electrons emerge no matter how intense the beam.",
            "Einstein's 1905 explanation was that light arrives as discrete packets, photons, each with energy hf. Only if hf exceeds the work function φ does the electron escape.",
            "So frequency, not brightness, sets whether and how energetically electrons fly off; intensity only sets how many.",
        ],
    ),
    (
        "blackbody", "Blackbody Radiation", "light-and-matter", "intermediate",
        "The catastrophe that started it all, in 1900.", "B(λ,T) ∝ 1 / [λ⁵ (e^{hc/λkT} − 1)]",
        [
            "Any warm object glows with a spectrum that depends only on its temperature. Classical physics predicted the intensity should grow without bound at short wavelengths — the 'ultraviolet catastrophe'.",
            "In 1900 Max Planck fixed it by assuming energy is exchanged only in discrete bundles of size E = hf. It was the first appearance of the quantum.",
            "The spectrum's peak shifts to shorter wavelengths as temperature rises (Wien's law), and total power climbs as T⁴ (Stefan–Boltzmann).",
        ],
    ),
    (
        "measurement", "Measurement & Collapse", "foundations", "advanced",
        "How the spread of possibility becomes one fact.", "P(x) = |ψ(x)|²   (Born rule)",
        [
            "Between observations a quantum system evolves smoothly through the Schrödinger equation. Measurement is the abrupt exception: the wavefunction collapses to a single eigenstate.",
            "The Born rule fixes the odds: the probability of an outcome is the squared magnitude of its amplitude, |ψ|².",
            "Why and how collapse happens is the measurement problem, the field's deepest open question. Interpretations differ: Copenhagen, many-worlds, and decoherence.",
        ],
    ),
]


class Command(BaseCommand):
    help = "Seed the database with the core quantum concepts and their content."

    @transaction.atomic
    def handle(self, *args, **options):
        cats = {}
        for slug, name, desc, color in CATEGORIES:
            cat, _ = Category.objects.update_or_create(
                slug=slug,
                defaults={"name": name, "description": desc, "color": color},
            )
            cats[slug] = cat

        created, updated = 0, 0
        for order, (slug, title, cat_slug, difficulty, summary, equation, paragraphs) in enumerate(CONCEPTS):
            concept, was_created = Concept.objects.update_or_create(
                slug=slugify(slug, allow_unicode=False) or slug,
                defaults={
                    "title": title,
                    "category": cats[cat_slug],
                    "summary": summary,
                    "difficulty": difficulty,
                    "order": order,
                    "related_simulation": slug,
                    "is_published": True,
                },
            )
            ConceptContent.objects.update_or_create(
                concept=concept,
                level=difficulty,
                defaults={
                    "explanation": "\n\n".join(paragraphs),
                    "key_equations": [{"label": title, "latex": equation}],
                    "further_reading": [],
                },
            )
            created += was_created
            updated += not was_created

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {len(CONCEPTS)} concepts ({created} created, {updated} updated) "
                f"across {len(CATEGORIES)} categories."
            )
        )

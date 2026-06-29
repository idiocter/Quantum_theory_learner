"""Seed the knowledge base: 8 branches and 65 topics.

The 13 original topics carry full explanatory content + a Formula row; the
remaining 52 are stubs (branch + tagline + difficulty now, full content in later
phases). Idempotent: re-running updates existing rows (matched by slug) and
never duplicates. Concept full-text `search_vector` is repopulated at the end.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from apps.concepts.models import Category, Concept, ConceptContent, Formula

# (slug, name, description, colour, order)
BRANCHES = [
    ("foundations", "Foundations", "The experiments and principles that forced physics to go quantum.", "#7C3AED", 1),
    ("atomic", "Atomic & Molecular", "Quantisation in atoms, light, and matter.", "#D97706", 2),
    ("quantum-information", "Quantum Information", "Qubits, gates, algorithms, and quantum communication.", "#0891B2", 3),
    ("condensed-matter", "Condensed Matter", "Emergent quantum behaviour in solids and ultracold matter.", "#2563EB", 4),
    ("qft", "Quantum Field Theory", "Fields, particles, and the Standard Model.", "#DB2777", 5),
    ("interpretations", "Interpretations", "What the theory means: collapse, many-worlds, and Bell.", "#9333EA", 6),
    ("gravity", "Quantum Gravity", "Where quantum theory meets spacetime.", "#0D9488", 7),
    ("biology", "Quantum Biology", "Quantum effects in living systems.", "#65A30D", 8),
]

# Full-content topics (the 13 originals).
# (slug, title, branch, difficulty, summary, equation, [explanation paragraphs])
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
        "particle_in_box", "Particle in a Box", "foundations", "beginner",
        "How confinement quantises energy.", "Eₙ = n²h² / 8mL²",
        [
            "Trap a particle between two infinitely high walls. Its wavefunction must vanish at both walls, so only standing waves with a whole number of half-wavelengths fit — exactly like the harmonics of a guitar string.",
            "Because only certain wavelengths are allowed, only certain energies are allowed: E ∝ n². Energy becomes discrete purely as a consequence of confining the particle.",
            "Squaring each standing wave gives the probability of finding the particle at each position. This toy model underlies quantum dots, conjugated molecules, and nanoscale electronics.",
        ],
    ),
    (
        "wavefunction", "Wavefunction Evolution", "foundations", "intermediate",
        "How a wave packet spreads through time.", "iℏ ∂ψ/∂t = Ĥψ",
        [
            "A free particle can be described by a Gaussian wave packet — a localised bump of probability. The Schrödinger equation tells that packet how to evolve, and it inevitably spreads out as time passes.",
            "Spreading is the price of localisation: a tightly-pinned position requires a wide spread of momenta, and those momentum components travel at different speeds, smearing the packet.",
            "The complex phase of ψ rotates as it travels, but only |ψ|² — the real probability density — is observable. The total probability always integrates to one.",
        ],
    ),
    (
        "quantum_tunneling", "Quantum Tunneling", "foundations", "advanced",
        "Passing through walls that should stop you.", "T ≈ e^(−2κL)",
        [
            "Send a particle at a potential barrier taller than its energy. Classically it must bounce back. Quantum mechanically its wavefunction decays inside the barrier rather than stopping dead.",
            "That surviving amplitude means a real, non-zero chance of finding the particle beyond a wall it could never climb. Transmission falls off exponentially with barrier width and height.",
            "Tunneling powers radioactive alpha decay, the scanning tunneling microscope, flash memory, and the proton fusion that lets the Sun shine.",
        ],
    ),
    (
        "superposition", "Quantum Superposition", "quantum-information", "beginner",
        "Being in many states at once — until you look.", "|ψ⟩ = α|0⟩ + β|1⟩,  |α|² + |β|² = 1",
        [
            "A quantum system need not be in just one state. It can occupy a weighted sum — a superposition — of several at once. A qubit lives as α|0⟩ + β|1⟩.",
            "The complex weights α and β are amplitudes, not probabilities. When measured, the state collapses to a single outcome, with probability |α|² for 0 and |β|² for 1.",
            "Superposition is not ignorance about a hidden true value — it is the resource that lets a quantum computer explore many possibilities in a single coherent state.",
        ],
    ),
    (
        "entanglement", "Quantum Entanglement", "quantum-information", "intermediate",
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
        "harmonic_oscillator", "Quantum Harmonic Oscillator", "foundations", "advanced",
        "The most reused model in all of physics.", "Eₙ = (n + ½) ℏω",
        [
            "Put a particle in a parabolic potential and quantum mechanics delivers a perfectly even ladder of energy levels spaced by ℏω. This describes vibrating molecules, phonons, and modes of the electromagnetic field.",
            "The eigenstates are Hermite polynomials times a Gaussian. The ground state sits at energy ½ℏω — the zero-point energy that never vanishes.",
            "Because every smooth potential looks parabolic near its minimum, the harmonic oscillator is the universal first approximation for any bound system.",
        ],
    ),
    (
        "qubit", "The Qubit & Bloch Sphere", "quantum-information", "advanced",
        "Every pure single-qubit state on one sphere.", "|ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩",
        [
            "A classical bit is 0 or 1. A qubit's pure states form a continuous surface — the Bloch sphere. The north pole is |0⟩, the south pole |1⟩, and every other point is a superposition.",
            "The phase φ is invisible to a single measurement but absolutely real: it controls interference. Logic gates are rotations of the sphere.",
            "Mixed or noisy states sit inside the ball rather than on its surface, and the radius measures how 'quantum' the state still is.",
        ],
    ),
    (
        "photoelectric", "The Photoelectric Effect", "atomic", "beginner",
        "The experiment that proved light is quantised.", "KEmax = hf − φ",
        [
            "Shine light on a metal and electrons can be knocked loose. Experiment showed that below a threshold frequency, no electrons emerge no matter how intense the beam.",
            "Einstein's 1905 explanation was that light arrives as discrete packets, photons, each with energy hf. Only if hf exceeds the work function φ does the electron escape.",
            "So frequency, not brightness, sets whether and how energetically electrons fly off; intensity only sets how many.",
        ],
    ),
    (
        "blackbody", "Blackbody Radiation", "atomic", "intermediate",
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

# Stub topics — branch + tagline + difficulty now; full content in later phases.
# (slug, title, branch, difficulty, summary)
STUBS = [
    # ── foundations ──
    ("wave_particle_duality", "Wave–Particle Duality", "foundations", "beginner", "Light and matter behave as both wave and particle."),
    ("schrodinger_equation", "The Schrödinger Equation", "foundations", "intermediate", "The master equation of quantum dynamics."),
    # ── atomic & molecular ──
    ("bohr_model", "The Bohr Model", "atomic", "beginner", "Quantised orbits and the hydrogen spectrum."),
    ("atomic_orbitals", "Atomic Orbitals", "atomic", "intermediate", "The shapes of electron probability clouds."),
    ("pauli_exclusion", "Pauli Exclusion Principle", "atomic", "intermediate", "Why electrons stack into shells."),
    ("zeeman_effect", "The Zeeman Effect", "atomic", "advanced", "Spectral lines splitting in a magnetic field."),
    ("lasers", "Lasers & Stimulated Emission", "atomic", "intermediate", "Coherent light from population inversion."),
    ("molecular_bonding", "Molecular Bonding", "atomic", "advanced", "How orbitals combine into chemical bonds."),
    # ── quantum information ──
    ("quantum_gates", "Quantum Gates", "quantum-information", "intermediate", "Unitary operations that steer qubits."),
    ("quantum_circuits", "Quantum Circuits", "quantum-information", "intermediate", "Composing gates into algorithms."),
    ("grover_algorithm", "Grover's Algorithm", "quantum-information", "advanced", "A quadratic speedup for unstructured search."),
    ("shor_algorithm", "Shor's Algorithm", "quantum-information", "advanced", "Factoring that would break RSA."),
    ("quantum_teleportation", "Quantum Teleportation", "quantum-information", "advanced", "Moving a state with entanglement + classical bits."),
    ("quantum_cryptography", "Quantum Cryptography (BB84)", "quantum-information", "intermediate", "Provably secure key exchange."),
    # ── condensed matter ──
    ("band_theory", "Band Theory", "condensed-matter", "intermediate", "Why solids are metals, semiconductors, or insulators."),
    ("superconductivity", "Superconductivity", "condensed-matter", "advanced", "Zero resistance and Cooper pairs."),
    ("bose_einstein_condensate", "Bose–Einstein Condensate", "condensed-matter", "advanced", "A new state of matter near absolute zero."),
    ("quantum_hall_effect", "The Quantum Hall Effect", "condensed-matter", "advanced", "Quantised conductance in two dimensions."),
    ("topological_insulators", "Topological Insulators", "condensed-matter", "advanced", "Insulating bulk, conducting edges."),
    ("josephson_junctions", "Josephson Junctions", "condensed-matter", "advanced", "Tunnelling supercurrents that power qubits."),
    ("quantum_statistics", "Quantum Statistics", "condensed-matter", "intermediate", "Fermi–Dirac versus Bose–Einstein."),
    ("phonons", "Phonons", "condensed-matter", "intermediate", "Quantised lattice vibrations."),
    ("majorana_fermions", "Majorana Fermions", "condensed-matter", "advanced", "Particles that are their own antiparticle."),
    # ── quantum field theory ──
    ("qed", "Quantum Electrodynamics", "qft", "advanced", "The quantum theory of light and electrons."),
    ("qcd", "Quantum Chromodynamics", "qft", "advanced", "The strong force and quark confinement."),
    ("standard_model", "The Standard Model", "qft", "intermediate", "The particle catalogue of reality."),
    ("feynman_diagrams", "Feynman Diagrams", "qft", "intermediate", "Picturing particle interactions."),
    ("renormalization", "Renormalization", "qft", "advanced", "Taming the infinities of field theory."),
    ("higgs_mechanism", "The Higgs Mechanism", "qft", "advanced", "Where mass comes from."),
    ("electroweak_theory", "Electroweak Unification", "qft", "advanced", "One force behind two."),
    ("quantum_vacuum", "The Quantum Vacuum", "qft", "advanced", "Why empty space is never truly empty."),
    # ── interpretations ──
    ("copenhagen", "The Copenhagen Interpretation", "interpretations", "intermediate", "Collapse taken as a primitive."),
    ("many_worlds", "The Many-Worlds Interpretation", "interpretations", "intermediate", "Every outcome happens, in its own branch."),
    ("pilot_wave", "Pilot-Wave Theory", "interpretations", "advanced", "Particles guided by a real wave (Bohmian)."),
    ("relational_qm", "Relational Quantum Mechanics", "interpretations", "advanced", "States are relative to the observer."),
    ("qbism", "QBism", "interpretations", "advanced", "The wavefunction as personal belief."),
    ("decoherence", "Decoherence", "interpretations", "advanced", "Why we never see everyday superpositions."),
    ("bell_theorem", "Bell's Theorem", "interpretations", "advanced", "No local hidden-variable theory can match QM."),
    ("quantum_zeno", "The Quantum Zeno Effect", "interpretations", "advanced", "A watched system never decays."),
    # ── quantum gravity ──
    ("quantum_gravity_intro", "The Quantum Gravity Problem", "gravity", "advanced", "Why general relativity and QM don't mix."),
    ("hawking_radiation", "Hawking Radiation", "gravity", "advanced", "Black holes glow and slowly evaporate."),
    ("black_hole_information", "The Information Paradox", "gravity", "advanced", "Where does the information go?"),
    ("string_theory", "String Theory", "gravity", "advanced", "Particles as vibrating strings."),
    ("loop_quantum_gravity", "Loop Quantum Gravity", "gravity", "advanced", "Quantising spacetime itself."),
    ("holographic_principle", "The Holographic Principle", "gravity", "advanced", "Volume encoded on a boundary."),
    ("planck_scale", "The Planck Scale", "gravity", "advanced", "Where spacetime may become grainy."),
    # ── quantum biology ──
    ("quantum_biology_intro", "What Is Quantum Biology?", "biology", "intermediate", "Quantum effects in warm, wet, living systems."),
    ("photosynthesis_coherence", "Quantum Photosynthesis", "biology", "advanced", "Coherent energy transport in light harvesting."),
    ("avian_magnetoreception", "Avian Magnetoreception", "biology", "advanced", "How birds may sense Earth's magnetic field."),
    ("enzyme_tunneling", "Enzyme Tunnelling", "biology", "advanced", "Protons tunnelling to speed up catalysis."),
    ("olfaction_tunneling", "The Quantum Nose", "biology", "advanced", "Smell via vibration-assisted tunnelling?"),
    ("dna_mutation_tunneling", "Proton Tunnelling in DNA", "biology", "advanced", "A quantum route to genetic mutation."),
]

# slug -> prerequisite slugs (the originals' learning path).
PREREQUISITES = {
    "particle_in_box": ["wavefunction"],
    "wavefunction": ["double_slit"],
    "quantum_tunneling": ["wavefunction", "particle_in_box"],
    "superposition": ["double_slit"],
    "entanglement": ["superposition"],
    "uncertainty": ["wavefunction"],
    "spin": ["superposition"],
    "harmonic_oscillator": ["particle_in_box", "wavefunction"],
    "qubit": ["superposition"],
    "measurement": ["superposition", "double_slit"],
}


class Command(BaseCommand):
    help = "Seed 8 branches and 65 topics (13 with full content, 52 stubs)."

    @transaction.atomic
    def handle(self, *args, **options):
        branches = {}
        for slug, name, desc, color, order in BRANCHES:
            branches[slug], _ = Category.objects.update_or_create(
                slug=slug,
                defaults={"name": name, "description": desc, "color": color, "order": order},
            )

        # Per-branch ordering counters so topics sort sensibly within a branch.
        order_in_branch = {slug: 0 for slug, *_ in BRANCHES}

        def _slug(s):
            return slugify(s, allow_unicode=False) or s

        full_created = stub_created = 0

        # Full-content topics
        for slug, title, branch, difficulty, summary, equation, paragraphs in CONCEPTS:
            order_in_branch[branch] += 1
            concept, created = Concept.objects.update_or_create(
                slug=_slug(slug),
                defaults={
                    "title": title,
                    "category": branches[branch],
                    "summary": summary,
                    "difficulty": difficulty,
                    "order": order_in_branch[branch],
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
            Formula.objects.update_or_create(
                concept=concept,
                order=0,
                defaults={"latex": equation, "description": title, "symbols": {}, "derivation_steps": []},
            )
            full_created += created

        # Stub topics
        for slug, title, branch, difficulty, summary in STUBS:
            order_in_branch[branch] += 1
            _, created = Concept.objects.update_or_create(
                slug=_slug(slug),
                defaults={
                    "title": title,
                    "category": branches[branch],
                    "summary": summary,
                    "difficulty": difficulty,
                    "order": order_in_branch[branch],
                    "related_simulation": slug if slug in SIM_KEYS else "",
                    "is_published": True,
                },
            )
            stub_created += created

        # Prerequisites (only among the originals).
        by_slug = {c.slug: c for c in Concept.objects.all()}
        for slug, prereq_slugs in PREREQUISITES.items():
            concept = by_slug.get(slug)
            if concept:
                concept.prerequisites.set([by_slug[p] for p in prereq_slugs if p in by_slug])

        # Drop any old branches no longer in the taxonomy (e.g. dynamics, light-and-matter).
        removed, _ = Category.objects.exclude(slug__in=[b[0] for b in BRANCHES]).delete()

        # Make sure every concept's FTS vector is populated.
        for concept in Concept.objects.all():
            concept.update_search_vector()

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {len(BRANCHES)} branches and {len(CONCEPTS) + len(STUBS)} topics "
                f"({len(CONCEPTS)} full, {len(STUBS)} stubs). Removed {removed} stale category rows."
            )
        )


# Stub slugs that already have a built simulation component in the frontend
# registry; everything else leaves related_simulation blank for now.
SIM_KEYS = set()

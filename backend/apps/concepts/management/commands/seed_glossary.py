"""Seed the cross-cutting glossary terms the QC-track lessons reference.

Idempotent: each term is matched by slug via `update_or_create`, so re-running
refreshes definitions/links in place and never duplicates. The slugs here are
exactly the `[[term-slug]]` markers authored in
`populate_qc_foundations.py` (CONTENT_SCHEMA section 7). Each term optionally
links to the `qc-` lesson that defines it, so the frontend tooltip can deep-link
to /concepts/<slug>. Unknown/unseeded markers fail safe to plain text in the UI.

    venv/bin/python manage.py seed_glossary
"""

from django.core.management.base import BaseCommand

from apps.concepts.models import Concept, GlossaryTerm

# (slug, term label, defining concept slug or None, definition)
TERMS = [
    (
        "bits",
        "Bit",
        "qc-prereq-classical-computing",
        "The classical unit of information: a variable taking exactly one of two "
        "values, 0 or 1.",
    ),
    (
        "unitary",
        "Unitary operator",
        "qc-prereq-linear-algebra",
        "A matrix U whose adjoint is its inverse (U†U = UU† = I). Unitaries "
        "preserve inner products and norms, so every closed-system quantum "
        "evolution and every quantum gate is unitary — hence reversible.",
    ),
    (
        "hermitian",
        "Hermitian operator",
        "qc-prereq-linear-algebra",
        "A matrix equal to its own conjugate transpose (A = A†). Its eigenvalues "
        "are real, which is why physical observables are represented by Hermitian "
        "operators.",
    ),
    (
        "orthonormal-basis",
        "Orthonormal basis",
        "qc-prereq-linear-algebra",
        "A set of mutually orthogonal unit vectors that span the space. Any state "
        "expands as a sum of basis vectors weighted by inner-product coefficients.",
    ),
    (
        "hilbert-space",
        "Hilbert space",
        "qc-multi-qubit-tensor",
        "A complex vector space equipped with an inner product (and complete). A "
        "single qubit lives in C^2; n qubits live in a 2^n-dimensional Hilbert "
        "space.",
    ),
    (
        "amplitude",
        "Probability amplitude",
        "qc-prereq-complex-numbers",
        "A complex number attached to a basis outcome. Its modulus squared gives "
        "the outcome's probability, but the amplitude itself carries phase and "
        "can interfere.",
    ),
    (
        "global-phase",
        "Global phase",
        "qc-prereq-complex-numbers",
        "An overall unit-modulus factor e^{iγ} multiplying an entire state. It "
        "leaves every measurement probability unchanged and is therefore "
        "physically unobservable.",
    ),
    (
        "relative-phase",
        "Relative phase",
        "qc-superposition",
        "The phase difference between the amplitudes within a superposition. "
        "Unlike a global phase it changes interference and is physically "
        "observable.",
    ),
    (
        "qubit",
        "Qubit",
        "qc-qubit-state-vector",
        "The basic unit of quantum information: a unit state vector in the "
        "two-dimensional complex Hilbert space C^2, generally α|0> + β|1> with "
        "|α|² + |β|² = 1.",
    ),
    (
        "state-vector",
        "State vector",
        "qc-qubit-state-vector",
        "The normalized complex vector that fully describes a pure quantum state; "
        "for a qubit, a unit vector in C^2.",
    ),
    (
        "computational-basis",
        "Computational basis",
        "qc-qubit-state-vector",
        "The standard orthonormal basis {|0>, |1>} (and its 2^n bit-string "
        "extensions for multiple qubits) in which measurements are conventionally "
        "described.",
    ),
    (
        "superposition",
        "Superposition",
        "qc-superposition",
        "A normalized linear combination of basis states, e.g. α|0> + β|1>. A "
        "qubit can occupy a coherent combination of |0> and |1> at once.",
    ),
    (
        "bloch-sphere",
        "Bloch sphere",
        "qc-bloch-sphere",
        "The geometric picture of a single-qubit pure state as a point on the "
        "unit sphere, parametrized by angles (θ, φ) via cos(θ/2)|0> + "
        "e^{iφ} sin(θ/2)|1>.",
    ),
    (
        "tensor-product",
        "Tensor product",
        "qc-multi-qubit-tensor",
        "The operation (⊗) that combines subsystem Hilbert spaces; dimensions "
        "multiply, so two qubits give a 4-dimensional joint space.",
    ),
    (
        "product-state",
        "Product state",
        "qc-multi-qubit-tensor",
        "A multi-qubit state that factorizes as a tensor product of "
        "single-qubit states. Its local measurement outcomes are statistically "
        "independent — the opposite of an entangled state.",
    ),
    (
        "born-rule",
        "Born rule",
        "qc-measurement-born-rule",
        "The rule giving the probability of a projective-measurement outcome i "
        "for state |ψ> as P(i) = |<i|ψ>|².",
    ),
    (
        "projective-measurement",
        "Projective measurement",
        "qc-measurement-born-rule",
        "An idealized measurement described by orthogonal projectors onto an "
        "observable's eigenspaces; it collapses the state onto the observed "
        "eigenspace and is irreversible.",
    ),
    (
        "wavefunction-collapse",
        "Wavefunction collapse",
        "qc-measurement-born-rule",
        "The (renormalized) update of a state to the measured eigenspace after a "
        "projective measurement; unlike unitary evolution it is irreversible.",
    ),
    (
        "expectation-value",
        "Expectation value",
        "qc-measurement-born-rule",
        "The probability-weighted mean of an observable's outcomes, <ψ|A|ψ> = "
        "Σ_i a_i P(a_i).",
    ),
    (
        "observable",
        "Observable",
        "qc-measurement-born-rule",
        "A measurable physical quantity, represented by a Hermitian operator "
        "whose real eigenvalues are the possible measurement outcomes.",
    ),
    (
        "entanglement",
        "Entanglement",
        "qc-entanglement-bell-states",
        "A joint state that cannot be written as a tensor product of "
        "single-subsystem states; its parts exhibit correlations with no "
        "classical explanation.",
    ),
    (
        "bell-state",
        "Bell state",
        "qc-entanglement-bell-states",
        "One of the four maximally entangled two-qubit states forming an "
        "orthonormal basis, e.g. |Φ+> = (|00> + |11>)/√2.",
    ),
    (
        "no-signaling",
        "No-signaling",
        "qc-entanglement-bell-states",
        "The principle that measuring one half of an entangled pair cannot "
        "transmit information: the local outcome statistics (marginals) are "
        "unchanged by the distant party's actions.",
    ),
    (
        "no-cloning",
        "No-cloning theorem",
        "qc-no-cloning",
        "The theorem that no unitary operation can copy an arbitrary unknown "
        "quantum state onto a blank register.",
    ),
]


class Command(BaseCommand):
    help = "Seed the cross-cutting glossary terms referenced by the QC lessons."

    def handle(self, *args, **options):
        concepts = {c.slug: c for c in Concept.objects.all()}
        created = updated = 0
        missing_links = []
        for slug, term, concept_slug, definition in TERMS:
            concept = concepts.get(concept_slug) if concept_slug else None
            if concept_slug and concept is None:
                missing_links.append((slug, concept_slug))
            _, was_created = GlossaryTerm.objects.update_or_create(
                slug=slug,
                defaults={"term": term, "definition": definition, "concept": concept},
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Glossary seeded: {created} created, {updated} updated "
                f"({len(TERMS)} total)."
            )
        )
        for slug, concept_slug in missing_links:
            self.stdout.write(
                self.style.WARNING(
                    f"  term '{slug}' references unseeded concept '{concept_slug}' "
                    f"— left unlinked."
                )
            )

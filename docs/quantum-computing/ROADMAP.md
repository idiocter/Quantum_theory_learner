# Quantum Computing Course Track — ROADMAP

A researcher/professional-level Quantum Computing track inside the Quantum World /
Quantum Learning System platform (Next.js 16 + Django 6 / PostgreSQL, KaTeX math,
DB-backed content, canvas simulations via a client-only registry).

> **Platform reality (read once).** Content is **not MDX** — it lives in PostgreSQL
> (`Category → Concept → ConceptContent`/`Formula`), authored by idempotent Django
> `populate_*` management commands. Math is **KaTeX** (`$...$`/`$$...$$` via
> `components/ui/Tex.tsx`), not MathJax. Prerequisites already exist
> (`Concept.prerequisites` M2M + `ConceptLink`); progress exists
> (`UserTopicProgress`, `UserProgress`); quizzes exist (`Quiz`/`Question`/`QuizAttempt`).
> **Recommended structure: Module → a `Category` branch, Lesson → a `Concept`** — this
> reuses progress, quizzes, full-text search, the knowledge graph, and tutor RAG with no
> new content tables. New models are added only for genuinely new systems (glossary,
> saved playground circuits).

## Audience
Researchers and working professionals. Assume linear algebra, complex numbers, and
probability as background (Module 0 only *diagnoses* them). No analogy-only treatments;
favour derivation and application.

## Modules

- **Module 0 — Prerequisites Diagnostic.** Linear algebra (vector spaces, inner
  products, eigen-decomposition, unitaries/Hermitians), complex numbers, probability,
  classical computing basics (bits, gates, complexity). A diagnostic quiz that routes
  gaps to references; not graded content.
- **Module 1 — Foundations of QM for Computing.** Qubits & state vectors, superposition,
  the Bloch sphere, measurement & the Born rule, multi-qubit systems & tensor products,
  entanglement (Bell states), the no-cloning theorem.
- **Module 2 — Quantum Gates & Circuits.** Single-qubit gates (Pauli, H, S, T, rotations),
  multi-qubit gates (CNOT, CZ, Toffoli), universal gate sets, the circuit model & circuit
  identities, introduction to density matrices & mixed states.
- **Module 3 — Core Quantum Algorithms.** Deutsch–Jozsa, the Quantum Fourier Transform,
  quantum phase estimation, Grover search (incl. optimal iteration count), Shor's
  factoring (order-finding + QFT).
- **Module 4 — Quantum Programming Practicum.** Qiskit/Cirq, statevector & sampling
  simulators, running on real hardware (via a server-side broker), basic noise models.
  Sandboxed in-browser code playground.
- **Module 5 — Quantum Error Correction & Noise.** Decoherence & noise channels, the
  3-qubit/Shor code, the Steane code, stabilizer formalism, surface codes & the threshold
  theorem (conceptual).
- **Module 6 — Variational & Near-Term Algorithms.** VQE, QAOA, the variational principle,
  barren plateaus, an introduction to quantum machine learning. NISQ framing throughout.
- **Module 7 — Quantum Cryptography & Communication.** BB84 & QKD security, entanglement-
  based QKD (E91), quantum teleportation, superdense coding.
- **Module 8 — Research Frontiers & Industry Applications.** Hardware landscape
  (superconducting, trapped-ion, photonic, neutral-atom), honest quantum-advantage status,
  applications by sector, career pathways.

## Cross-cutting systems (built once, reused by all modules)
- **Glossary layer** — new: `GlossaryTerm` model + API + frontend linker; content authors
  mark first-use terms with a fixed marker.
- **Progress tracking + prerequisite graph** — reuse `UserTopicProgress`/`UserProgress`;
  add **server-side prerequisite enforcement** (a lesson unlocks when its prerequisites
  are satisfied) on top of the existing `Concept.prerequisites` graph.
- **Assessment engine** — reuse `Quiz`/`Question`/`QuizAttempt` and its server-side
  grading; one objective-tagged item per learning objective.
- **LaTeX rendering pipeline** — reuse the existing KaTeX components (`Tex`/`TexProse`).
  No new pipeline.
- **Citation system** — references to Nielsen & Chuang sections and primary papers
  (arXiv/DOI), verified by physics-accuracy-reviewer; stored in `ConceptContent.further_reading`.

## Agents (`.claude/agents/`)
`curriculum-architect` (structure, objectives, `prerequisites.json`, content schema) →
`lesson-content-writer` (DB lesson content via `populate_*`) →
`circuit-visualizer-builder` (registry sims) →
`code-playground-engineer` (sandboxed runner) →
`quiz-assessment-generator` (objective-tagged banks) →
`integration-engineer` (routes/models/APIs/glossary) →
`physics-accuracy-reviewer` (hard correctness gate; no commit without a clean pass).

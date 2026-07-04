# Quantum Computing Course Track — PHASE PLAN

Four phases. Each lists scope, the agent invocation sequence (treated as real handoffs —
each agent reads the previous one's output), and a conventional commit message template.
**Hard gate:** no phase is committed without a `REVIEW: CLEAN` from `physics-accuracy-reviewer`,
and migrations apply to **dev only** until a human confirms production.

---

## Phase 1 — Modules 0–1 + cross-cutting foundations
**Scope:** Module 0 prerequisites diagnostic; Module 1 (qubits, superposition, Bloch
sphere, measurement, entanglement, no-cloning). Cross-cutting: glossary layer,
server-side prerequisite-graph enforcement, KaTeX pipeline reuse, progress DB wiring.
Establishes the Module→`Category` / Lesson→`Concept` pattern.

**Agent sequence:**
1. `curriculum-architect` → Module 0 + 1 outline, Bloom-tagged objectives, `prerequisites.json`, `CONTENT_SCHEMA.md`.
2. `lesson-content-writer` → diagnostic copy + Module 1 lessons via `populate_qc_foundations.py`.
3. `circuit-visualizer-builder` → Bloch sphere visualizer + Bell-state simulator (registered keys).
4. `quiz-assessment-generator` → diagnostic + Module 1 objective-tagged bank.
5. `integration-engineer` → routes, `Category`/`Concept` content + glossary model/API, prerequisite enforcement, progress wiring (dev migration only).
6. `physics-accuracy-reviewer` → full pass; must return `REVIEW: CLEAN`.

```
feat(quantum-course): phase 1 — modules 0–1 + glossary/prereq/progress foundations

- curriculum-architect: prerequisites.json + content schema for modules 0–1
- lesson-content-writer: prerequisites diagnostic + module 1 lessons (DB)
- circuit-visualizer-builder: Bloch sphere + Bell-state simulators
- quiz-assessment-generator: diagnostic + module 1 assessment bank
- integration-engineer: routes, glossary layer, server-side prerequisite enforcement, progress wiring
- reviewed by physics-accuracy-reviewer: clean
```

---

## Phase 2 — Modules 2–3 (gates/circuits, core algorithms)
**Scope:** Module 2 (gates, universal sets, circuit model, density-matrix intro);
Module 3 (Deutsch–Jozsa, QFT, phase estimation, Grover, Shor). Headline interactives:
drag-and-drop circuit builder with live state-vector/amplitude readout, and algorithm
step-through animations.

**Agent sequence:** `curriculum-architect` → `lesson-content-writer` →
`circuit-visualizer-builder` (circuit builder + algorithm step-throughs) →
`quiz-assessment-generator` → `integration-engineer` → `physics-accuracy-reviewer`.

```
feat(quantum-course): phase 2 — modules 2–3 (gates, circuits, core algorithms)

- lesson-content-writer: module 2–3 lessons (DB)
- circuit-visualizer-builder: drag-drop circuit builder + Deutsch–Jozsa/QFT/Grover/Shor step-throughs
- quiz-assessment-generator: module 2–3 assessment banks
- integration-engineer: routes + navigation for modules 2–3
- reviewed by physics-accuracy-reviewer: clean
```

---

## Phase 3 — Modules 4–5 (practicum, error correction) — ⚠ HIGHEST INFRA RISK
**Scope:** Module 4 sandboxed Qiskit/Cirq playground (isolated execution, timeouts/resource
caps, saved circuits); Module 5 error-correction & noise (decoherence, Shor/Steane codes,
surface codes) with encode→error→syndrome→correct demos. **Risk:** safe arbitrary-code
execution — gated on a verified sandbox; ship a disabled state rather than an unsafe runner.

**Agent sequence:** `curriculum-architect` → `lesson-content-writer` →
`code-playground-engineer` (sandbox + run API + starter snippets) →
`circuit-visualizer-builder` (error-correction demos) →
`quiz-assessment-generator` (incl. code-based items) →
`integration-engineer` (saved-circuit persistence, run endpoints, rate limits) →
`physics-accuracy-reviewer`.

```
feat(quantum-course): phase 3 — modules 4–5 (sandboxed playground, error correction)

- code-playground-engineer: sandboxed Qiskit/Cirq runner (timeouts/resource caps), starter snippets
- lesson-content-writer: module 4–5 lessons (DB)
- circuit-visualizer-builder: error-correction encode/syndrome/correct demos
- quiz-assessment-generator: module 4–5 banks (incl. code-based items)
- integration-engineer: run endpoints, saved-circuit persistence, strict rate limits (dev only)
- reviewed by physics-accuracy-reviewer: clean
```

---

## Phase 4 — Modules 6–8 + full-course polish
**Scope:** Module 6 (VQE/QAOA/QML intro), Module 7 (BB84/QKD/teleportation), Module 8
(hardware landscape, honest quantum-advantage, careers). Polish: course navigation &
search, end-to-end prerequisite-graph QA (acyclicity + reachability across all modules),
and a full-course physics review.

**Agent sequence:** `curriculum-architect` (finalize full graph) → `lesson-content-writer`
→ `circuit-visualizer-builder` (VQE/QAOA + protocol demos) → `quiz-assessment-generator`
→ `integration-engineer` (search, nav, whole-course prerequisite QA) →
`physics-accuracy-reviewer` (full-course pass).

```
feat(quantum-course): phase 4 — modules 6–8 + full-course polish

- lesson-content-writer: module 6–8 lessons (DB)
- circuit-visualizer-builder: VQE/QAOA + QKD/teleportation demos
- quiz-assessment-generator: module 6–8 banks
- integration-engineer: course search + navigation, end-to-end prerequisite-graph QA
- reviewed by physics-accuracy-reviewer: clean (full-course)
```

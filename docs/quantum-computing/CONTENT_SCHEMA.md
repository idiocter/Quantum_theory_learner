# Quantum Computing Track - Content Schema Contract

This is the binding contract every downstream agent follows when authoring,
visualizing, assessing, or integrating the Quantum Computing track lessons.
Phase 1 covered Modules 0-1; **Phase 2 appends Modules 2-3** (gates & circuits,
core algorithms) under the same contract - the sections below now cover all four
modules, with Phase-2 additions called out in sections 1, 5, and 7. The
canonical IDs (lesson slugs, objective IDs) live in
`docs/quantum-computing/prerequisites.json`; this file specifies **how** the
content for those slugs is shaped on top of the existing DB models.

Read alongside:
- `backend/apps/concepts/models.py` - `Category`, `Concept`, `ConceptContent`, `Formula`, `ConceptLink`.
- `backend/apps/concepts/management/commands/_content.py` - the `apply_topic` populate contract.
- `backend/apps/concepts/management/commands/populate_foundations.py` - the reference authoring style.
- `frontend/src/components/ui/Tex.tsx` - `Tex` (single expression, no `$`) and `TexProse` (`$...$` / `$$...$$` in prose).

No MDX. No MathJax. No new content tables. Module -> `Category`; Lesson ->
`Concept`. Content is authored by an idempotent
`populate_qc_foundations.py` management command (matching the existing
`populate_*` pattern) that calls `_content.run(...)`.

---

## 1. Structural mapping

| Curriculum unit | DB object | Identifier |
|---|---|---|
| Module 0 | `Category` | slug `qc-prerequisites` |
| Module 1 | `Category` | slug `qc-foundations` |
| Module 2 | `Category` | slug `qc-gates-circuits` |
| Module 3 | `Category` | slug `qc-algorithms` |
| Lesson | `Concept` | the lesson `slug` from `prerequisites.json` |
| Lesson body (per difficulty) | `ConceptContent` | `(concept, level)` |
| Structured formula | `Formula` | `(concept, order)` |
| Prerequisite edge | `Concept.prerequisites` M2M (+ `ConceptLink` relation=`prerequisite`) | `prerequisites[]` in JSON |

**Categories to create** (integration-engineer, dev migration / seed only):

- `qc-prerequisites` - name "QC: Prerequisites Diagnostic", `order` after existing branches.
- `qc-foundations` - name "QC: Foundations of Quantum Mechanics for Computing".
- `qc-gates-circuits` - name "QC: Quantum Gates & Circuits", `order` after `qc-foundations` (suggest `11`).
- `qc-algorithms` - name "QC: Core Quantum Algorithms", `order` after `qc-gates-circuits` (suggest `12`).

**Phase-2 authoring command.** Modules 2-3 are authored by a second idempotent
command `populate_qc_gates_algorithms.py` (same `_content.run` contract and the
same `update_or_create`-by-slug pattern as `populate_qc_foundations.py`). It
seeds the two new Category rows and the 10 new Concept rows, then fills content.
All 10 Module 2-3 lessons are single-difficulty `ConceptContent` (the JSON
`difficulty`) and, unlike Module 0, every one is a graded Module-1-style lesson:
`history` required, `math_derivation` required, `key_equations` +
`further_reading` required, `>= 1 Formula`.

**Slug namespace rule.** Every QC-track concept slug is prefixed `qc-` and uses
hyphens. This is deliberate: the existing physics track already owns
`qubit`, `superposition`, `entanglement`, `measurement`, `bell_theorem`,
`quantum_gates`, `quantum_circuits`, `grover_algorithm`, `shor_algorithm`,
`quantum_teleportation`, `quantum_cryptography` (underscore style). **Never reuse
or overwrite those.** Create new `qc-` concepts.

**Seeding order.** `_content.apply_topic` does `Concept.objects.get(slug=...)`
and warns if the slug is not seeded. So the 11 `qc-` Concept rows (and the two
Categories) must be seeded first (integration-engineer extends `seed_concepts`
or adds a `seed_qc.py`), then `populate_qc_foundations.py` fills content.

---

## 2. Which fields each lesson populates

### `Concept` (the lesson row)
| Field | Module 0 (diagnostic) | Module 1 (lessons) |
|---|---|---|
| `title` | from JSON `title` | from JSON `title` |
| `slug` | from JSON `slug` | from JSON `slug` |
| `category` | `qc-prerequisites` | `qc-foundations` |
| `summary` | <= 500 chars, plain text, no `<script>` (validator) | same |
| `history` | optional 1 short paragraph (refresher framing) | required - discovery/attribution paragraph (e.g. Bloch 1946, Wootters-Zurek 1982, Bell 1964) |
| `difficulty` | as in JSON | as in JSON |
| `order` | follow `topological_order` within the branch | follow `topological_order` within the branch |
| `related_simulation` | `""` (empty - no sim) | the JSON `related_simulation` key (see section 5) |
| `prerequisites` | none | the JSON `prerequisites[]` slugs |
| `is_published` | `true` | `true` |

> `validate_content` treats published concepts with no `ConceptContent` or no
> `Formula` as hard errors, and a missing `related_simulation` as a warning
> (error only with `--require-sim`). Module 0 and the two sim-less Module 1
> lessons (`qc-multi-qubit-tensor`, `qc-no-cloning`) will emit the sim warning;
> that is expected. Every lesson MUST still have content + >=1 formula.

### `ConceptContent` (one row, `level == concept.difficulty`)
Authored via the `_content` topic dict (`overview`, `math_derivation`,
`key_equations`, `further_reading`). Single difficulty level per lesson for
Phase 1 (the audience is uniform - researchers/professionals).

| Field | Required | Content |
|---|---|---|
| `explanation` | yes | `overview` paragraphs joined by `\n\n`. Prose may contain inline `$...$` and display `$$...$$`. Must cover every learning objective for the lesson (see section 6). |
| `math_derivation` | Module 1: yes; Module 0: optional | Worked derivation prose with `$$...$$` display math. |
| `key_equations` | yes (Module 1) | JSON list `[{"label": "...", "latex": "..."}]`. `latex` is a bare expression (no `$` delimiters) - rendered by `Tex`. |
| `further_reading` | yes (Module 1), optional (Module 0) | JSON list `[{"title": "...", "url": "..."}]`. See section 4 (citations). |

### `Formula` (>= 1 per published lesson)
| Field | Required | Content |
|---|---|---|
| `latex` | yes | Raw LaTeX, **no** `$` delimiters (e.g. `r"|\psi\rangle = \alpha|0\rangle + \beta|1\rangle"`). Rendered by `Tex`. |
| `description` | yes | One-line plain-English meaning. |
| `symbols` | yes | JSON dict `{symbol: meaning}`. Keys are raw LaTeX tokens (e.g. `r"\alpha"`, `r"\langle i|\psi\rangle"`). |
| `derivation_steps` | recommended | JSON list of step strings; each step may contain inline `$...$`. |
| `order` | yes | Integer; `_content` assigns it from list position. |

Module 0 diagnostic concepts still need >= 1 `Formula` to satisfy
`validate_content` (e.g. the inner-product definition, Euler's formula, the
expectation-value definition, a truth table rendered as text+formula).

---

## 3. LaTeX / KaTeX conventions

KaTeX only (`throwOnError: false`). Two render paths, and **the delimiter rule
differs by field**:

- **Prose fields** (`explanation`, `math_derivation`, `Formula.derivation_steps`,
  and any text passed through `TexProse`): wrap math in `$...$` (inline) or
  `$$...$$` (display block). `TexProse` regex-replaces these delimiters.
- **Expression fields** (`Formula.latex`, `key_equations[].latex`): store a
  **bare** expression with **no** `$` delimiters. These go through `Tex`, which
  calls `renderToString` on the whole string. Adding `$` here renders a literal
  dollar sign.

Authoring rules:

1. **Use Python raw strings** (`r"..."`) for any value containing a backslash, so
   `\rangle`, `\alpha`, `\frac` survive. If a non-raw string is unavoidable,
   double every backslash (`\\rangle`) - see existing `derivation_steps` in
   `populate_foundations.py`.
2. **Dirac notation**: `\langle` / `\rangle` (or the `braket` macros if KaTeX is
   configured for them - default is **not**, so use `\langle 0|`, `|\psi\rangle`,
   `\langle i|\psi\rangle`). Keep it consistent across the track.
3. **Standard token vocabulary** (use these exact forms so search + tutor RAG and
   the symbol legends stay uniform):
   - kets/bras: `|0\rangle`, `|1\rangle`, `|+\rangle`, `|-\rangle`, `|\psi\rangle`, `\langle\psi|`
   - amplitudes: `\alpha`, `\beta`; probabilities `P(i)`
   - tensor product: `\otimes`
   - Bloch angles: `\theta`, `\phi`; Bloch vector `(x,y,z)` or `\hat{n}`
   - Bell states: `|\Phi^{+}\rangle`, `|\Phi^{-}\rangle`, `|\Psi^{+}\rangle`, `|\Psi^{-}\rangle`
   - operators/observables: `\hat{A}`, expectation `\langle\psi|\hat{A}|\psi\rangle`
   - Pauli matrices: `\sigma_x, \sigma_y, \sigma_z` (or `X, Y, Z` - declare once per lesson, do not mix)
4. **No HTML.** `validate_no_script` rejects `<script>`; do not embed raw HTML
   tags in any content field. Math only via KaTeX delimiters.
5. **Unicode in plain prose is fine** (existing content uses `psi`, superscripts),
   but anything that must render as math goes through KaTeX delimiters, not
   Unicode glyphs.

---

## 4. Citations (`further_reading`)

Stored in `ConceptContent.further_reading` as `[{"title": "...", "url": "..."}]`.
Each Module 1 lesson cites:

- the relevant **Nielsen & Chuang** section (title string `"Nielsen & Chuang, Sec X.Y"`, url to the book DOI or a stable reference page), and
- >= 1 **primary source** where one is canonical, by **arXiv or DOI URL**, e.g.:
  - no-cloning: Wootters & Zurek, Nature 299, 802 (1982) - DOI.
  - Bell states / nonlocality: Bell, Physics 1, 195 (1964); Nielsen & Chuang Ch. 1-2.
  - Bloch sphere: Nielsen & Chuang Sec 1.2; Bloch, Phys. Rev. 70, 460 (1946).

physics-accuracy-reviewer verifies every citation resolves and supports the
claim it is attached to. No bare titles without URLs.

---

## 5. Interactive-component slots (registry keys)

A lesson references **exactly one** primary interactive via
`Concept.related_simulation` (a single CharField, max 50). The value is a key in
`frontend/src/components/simulations/registry.tsx` `SIMULATION_BY_KEY`.
circuit-visualizer-builder owns registering new keys there.

### Slots used by Module 1

| Slot key | Status | Lessons (`related_simulation`) | What it must show |
|---|---|---|---|
| `bloch_sphere` | **NEW** - circuit-visualizer-builder registers | `qc-qubit-state-vector`, `qc-bloch-sphere` | Interactive Bloch sphere: set/drag `(theta, phi)`, show the state `cos(theta/2)|0> + e^{i phi} sin(theta/2)|1>`, mark `|0>,|1>,|+/->,|+/-i>`, show antipodal orthogonality. |
| `bell_state` | **NEW** - circuit-visualizer-builder registers | `qc-entanglement-bell-states` | Bell-state preparation + correlated local measurements: pick one of the four Bell states, measure each qubit in a chosen basis, show perfectly correlated outcome sampling and the no-signaling marginals. |
| `superposition` | **EXISTING** (reuse `Superposition`) | `qc-superposition` | Amplitude/phase of a single-qubit superposition. |
| `born_rule` | **EXISTING** (reuse `BornRuleSampler`) | `qc-measurement-born-rule` | Repeated-measurement sampling converging to Born-rule probabilities. |

> Existing keys `qubit` (-> `BlochSphere`), `measurement`, `entanglement` remain
> available for reuse if a richer purpose-built component is not yet ready, but
> the Phase 1 target is the two NEW keys above. Do not rename existing keys.

`qc-multi-qubit-tensor` and `qc-no-cloning` ship with `related_simulation = ""`
in Phase 1 (no canvas slot); they rely on prose, formulas, and derivation steps.

### Slots used by Modules 2-3 (Phase 2)

Every Module 2-3 lesson references a primary interactive. **Two keys are reused**
(`quantum_circuit`, `grover` - already in `SIMULATION_BY_KEY`); **eight are NEW**
keys circuit-visualizer-builder registers. All eight NEW components share a
common requirement: a **live state-vector / amplitude (and where relevant phase)
readout** synchronized to the step being shown, since the audience needs to see
the numeric state evolve, not just an animation.

| Slot key | Status | Lesson (`related_simulation`) | What it must show |
|---|---|---|---|
| `single_qubit_gate` | **NEW** | `qc-single-qubit-gates` | Apply X/Y/Z/H/S/T and R_x/R_y/R_z(theta) to a chosen qubit; show the 2x2 matrix, the output amplitudes, and the Bloch-vector rotation (axis + angle) live. |
| `multi_qubit_gate` | **NEW** | `qc-multi-qubit-gates` | 2-3 qubit CNOT/CZ/SWAP/Toffoli on a chosen input; show the truth-table/matrix action, the output state vector, phase kickback, and whether the result is entangled (product vs non-factorizable). |
| `quantum_circuit` | **EXISTING** (reuse `QuantumCircuit`, the 4-qubit builder) | `qc-circuit-model` | Place single/multi-qubit gates on wires, read the composed unitary / output state, and demonstrate circuit identities (HXH=Z, CNOT-conjugation, etc.). |
| `gate_decomposition` | **NEW** | `qc-universal-gate-sets` | Approximate a target single-qubit unitary with a growing sequence from {H, T} (+ CNOT for 2-qubit); show approximation error vs sequence length (Solovay-Kitaev intuition) and a Clifford-vs-Clifford+T contrast. |
| `density_matrix` | **NEW** | `qc-density-matrices-mixed-states` | Build a pure/mixed ensemble; show rho, Tr(rho^2) purity, the Bloch-ball position (|r|<1 inside), and the partial trace of a two-qubit state to a maximally mixed reduced state. |
| `deutsch_jozsa` | **NEW** | `qc-deutsch-jozsa` | Pick a constant/balanced oracle for small n; step through H^{tensor n} -> U_f -> H^{tensor n}, showing phase kickback and the all-zeros measurement outcome. |
| `qft` | **NEW** | `qc-quantum-fourier-transform` | Step-through of the QFT circuit (Hadamards + controlled-phase + final swaps) on a chosen input; show amplitudes/phases and the DFT relationship. |
| `phase_estimation` | **NEW** | `qc-phase-estimation` | Choose U and eigenphase phi; step through counting-register Hadamards, controlled-U^{2^j}, inverse QFT; show the estimated bit string and success probability vs counting-qubit count. |
| `grover` | **EXISTING** (reuse `GroverAmplification`) | `qc-grover-search` | Amplitude-amplification bar chart across iterations; mark the optimal iteration count and the over-rotation past it. |
| `shor` | **NEW** | `qc-shor-factoring` | Order-finding via phase estimation on modular multiplication (small N, e.g. 15); show measured phase -> continued fraction -> order r -> gcd factors. |

Planned headline builder (`circuit_builder`, **NEW, not yet slotted to a
lesson**): the Phase-2 plan calls for a richer drag-and-drop circuit builder with
live state-vector/amplitude readout. When circuit-visualizer-builder ships it, it
MAY supersede `quantum_circuit` as the `related_simulation` for `qc-circuit-model`
(and optionally back the Module-4 playground). Until then `qc-circuit-model`
stays on the reused `quantum_circuit` key. Reserve the key name `circuit_builder`
now so nothing else claims it.

### Naming rule for new slots
Registry key = lower snake_case, matches the conceptual slot name here
(`bloch_sphere`, `bell_state`). The component export in `registry.tsx` is
PascalCase (`BlochSphereQC`-style if a new component is needed to avoid clashing
with the existing `BlochSphere`/`bloch`). The **key** is the contract; the
component name is the builder's choice as long as it maps from the key.

---

## 6. Objective coverage rule

`prerequisites.json` is the source of truth for objectives. Two obligations:

1. **lesson-content-writer**: the `explanation` (+ `math_derivation` / formulas)
   for a lesson MUST contain the material needed to satisfy **every** objective
   listed for that slug. An objective with no supporting content is a review
   failure.
2. **quiz-assessment-generator**: produce **exactly one** assessable item per
   objective ID, tagged with that ID and its Bloom level. The objective
   statements are phrased to make the item type obvious (compute / identify /
   prove / evaluate-the-flaw). Module 0 items are diagnostic (route gaps to the
   matching `qc-prereq-*` concept and its `further_reading`); Module 1-3 items
   are graded.

Objectives flagged as **harder to assess** (Understand/Analyze/Evaluate items
that assert a conceptual claim rather than a numeric computation) require
carefully engineered single-best-answer distractors; each still maps to exactly
one item: `qc-universal-gate-sets.o2`, `.o3`, `.o5`;
`qc-deutsch-jozsa.o5`; `qc-grover-search.o5`; `qc-shor-factoring.o4`;
`qc-quantum-fourier-transform.o5`; `qc-phase-estimation.o5`. Prefer
select-the-correct-statement / identify-the-flaw formats with plausible
physics-grounded distractors over recall prompts.

---

## 7. Glossary first-use marker convention

The glossary layer (`GlossaryTerm` model + linker, built by integration-engineer)
relies on a fixed in-text marker that authors place on the **first use only** of
a glossary term within a given `ConceptContent.explanation`.

**Marker syntax:** double square brackets, optional display override with a pipe.

```
[[term-slug]]                      -> links the canonical term, surface text = term label
[[term-slug|surface text]]         -> links the canonical term, renders "surface text"
```

Examples:
```
A [[bloch-sphere|Bloch sphere]] is the geometric picture of a single-qubit state.
... cannot be written as a [[tensor-product]] of single-qubit states ...
```

Rules:
- `term-slug` is lower kebab-case and resolves to a `GlossaryTerm.slug`. If the
  surface form already reads as the term, omit the pipe (`[[entanglement]]`).
- **First use per lesson per content field only.** Do not re-mark the same term;
  the linker styles only the marked occurrence and leaves later mentions plain.
- **Never place a marker inside `$...$` or `$$...$$`** or inside a `Formula`
  field - markers live in prose only. The glossary linker runs on prose and must
  not see math.
- `[[...]]` is chosen because it cannot collide with KaTeX (`$`) or with Markdown
  links (`[text](url)`). The linker strips the brackets and renders a
  term-definition tooltip/anchor; if the slug is unknown it renders the surface
  text plain (fail-safe), and validation reports the unknown slug.
- Marker resolution is non-recursive: do not nest markers or place math inside a
  marker's surface text.

Phase-1 candidate glossary terms (authors mark first use; integration-engineer
seeds the `GlossaryTerm` rows): `qubit`, `state-vector`, `amplitude`,
`superposition`, `global-phase`, `relative-phase`, `bloch-sphere`,
`computational-basis`, `orthonormal-basis`, `born-rule`, `projective-measurement`,
`wavefunction-collapse`, `expectation-value`, `observable`, `unitary`,
`hermitian`, `tensor-product`, `hilbert-space`, `product-state`, `entanglement`,
`bell-state`, `no-cloning`, `no-signaling`.

**Phase-2 additional candidate glossary terms** (Modules 2-3; same first-use
marking rule, same fail-safe linker behavior). Module 2 - gates & circuits:
`quantum-gate`, `pauli-gate`, `hadamard-gate`, `phase-gate`, `t-gate`,
`rotation-gate`, `controlled-gate`, `cnot-gate`, `cz-gate`, `swap-gate`,
`toffoli-gate`, `phase-kickback`, `quantum-circuit-model`, `circuit-identity`,
`universal-gate-set`, `clifford-group`, `solovay-kitaev-theorem`,
`gottesman-knill-theorem`, `density-matrix`, `mixed-state`, `pure-state`,
`purity`, `partial-trace`, `reduced-density-matrix`, `maximally-mixed-state`,
`bloch-ball`. Module 3 - algorithms: `quantum-oracle`, `phase-oracle`,
`quantum-parallelism`, `deutsch-jozsa-algorithm`, `quantum-fourier-transform`,
`controlled-phase-gate`, `quantum-phase-estimation`, `grovers-algorithm`,
`amplitude-amplification`, `grover-diffusion-operator`, `order-finding`,
`continued-fraction-expansion`, `shors-algorithm`, `quantum-advantage`.

> Do not collide these glossary slugs with the underscore-style physics-track
> `Concept` slugs (`quantum_gates`, `quantum_circuits`, `grover_algorithm`,
> `shor_algorithm`). Glossary terms are kebab-case `GlossaryTerm.slug` values, a
> separate namespace from Concept slugs.

---

## 8. Quick checklist for lesson-content-writer (per lesson)

- [ ] Concept row seeded with correct `category`, `difficulty`, `order`, `related_simulation`.
- [ ] `summary` <= 500 chars, no HTML.
- [ ] `history` paragraph present (Module 1).
- [ ] `explanation` covers every objective ID for the slug; first-use glossary terms marked `[[...]]`.
- [ ] `math_derivation` present with `$$...$$` (Module 1).
- [ ] `key_equations` populated; each `latex` is a bare expression (no `$`).
- [ ] >= 1 `Formula` with `latex` (no `$`), `description`, `symbols` legend, `derivation_steps`.
- [ ] `further_reading` cites Nielsen & Chuang section + primary source URL(s).
- [ ] `prerequisites[]` edges match `prerequisites.json`.
- [ ] Raw strings (`r"..."`) used for all LaTeX-bearing values.

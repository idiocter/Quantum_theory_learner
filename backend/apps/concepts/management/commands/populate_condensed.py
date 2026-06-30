"""Populate the Condensed Matter branch with full content: overviews, history,
structured formulas (symbols + derivation steps), prerequisite links, and
simulation keys (band structure, Cooper pairs, BEC).

Idempotent — re-running updates rows in place. Run after `seed_concepts`.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from ._content import run

TOPICS = [
    {
        "slug": "band_theory",
        "related_simulation": "band_theory",
        "prerequisites": ["particle_in_box", "pauli_exclusion"],
        "overview": [
            "When atoms condense into a crystal, their discrete atomic energy levels broaden into continuous bands of allowed energies separated by forbidden gaps. Electrons fill these bands from the bottom up, and the highest filled level at zero temperature is the Fermi level.",
            "Whether a solid conducts depends entirely on where the Fermi level lands. If it falls inside a band, the partly filled band carries current and the material is a metal. If it sits in a gap, electrons need a kick across the gap to move: a small gap makes a semiconductor, a large gap an insulator.",
            "Band theory is the foundation of all electronics. Doping a semiconductor shifts the Fermi level and tailors its conductivity, which is exactly what makes transistors, diodes, and solar cells possible.",
        ],
        "history": (
            "Felix Bloch's 1928 theorem showed that electron wavefunctions in a periodic lattice take a wave-times-periodic form, leading directly to energy bands. Alan Wilson used the band picture in 1931 to explain the difference between metals, semiconductors, and insulators."
        ),
        "formulas": [
            {
                "latex": r"\psi_{nk}(r) = e^{i k \cdot r}\, u_{nk}(r)",
                "description": "Bloch's theorem: electron states in a periodic crystal are plane waves modulated by a lattice-periodic function.",
                "symbols": {
                    r"\psi_{nk}": "Bloch wavefunction in band n at wavevector k",
                    "e^{i k \\cdot r}": "plane-wave envelope",
                    "u_{nk}(r)": "function with the periodicity of the lattice",
                },
                "derivation_steps": [
                    "The crystal potential satisfies $V(r + R) = V(r)$ for every lattice vector R.",
                    "Translation by R commutes with the Hamiltonian, so eigenstates can be chosen as eigenstates of translation, picking up only a phase $e^{ik\\cdot R}$.",
                    "Factoring that phase out leaves a lattice-periodic $u_{nk}(r)$; the allowed energies $E_n(k)$ form bands.",
                ],
            },
        ],
    },
    {
        "slug": "superconductivity",
        "related_simulation": "cooper_pairs",
        "prerequisites": ["band_theory", "quantum_statistics"],
        "overview": [
            "Below a critical temperature some metals lose all electrical resistance and expel magnetic fields entirely (the Meissner effect). Current can flow forever without dissipation — the hallmark of superconductivity.",
            "BCS theory explains it: an electron moving through the lattice attracts the positive ions, and the resulting distortion (a phonon) attracts a second electron. This weak, phonon-mediated attraction binds electrons into Cooper pairs despite their Coulomb repulsion.",
            "Cooper pairs are bosons, so they all condense into a single coherent quantum state with an energy gap that protects it from scattering. That macroscopic coherence is why a superconductor carries current without loss.",
        ],
        "history": (
            "Kamerlingh Onnes discovered superconductivity in mercury in 1911 (Nobel 1913). The microscopic BCS theory of Bardeen, Cooper, and Schrieffer arrived in 1957 (Nobel 1972). High-temperature cuprate superconductors, found by Bednorz and Müller in 1986, remain only partly understood."
        ),
        "formulas": [
            {
                "latex": r"\Delta = 2\hbar\omega_D\, e^{-1/N(0)V}",
                "description": "BCS energy gap: the binding energy scale of Cooper pairs.",
                "symbols": {
                    r"\Delta": "superconducting energy gap",
                    r"\omega_D": "Debye frequency (phonon cutoff)",
                    "N(0)": "density of electron states at the Fermi level",
                    "V": "effective attractive interaction strength",
                },
                "derivation_steps": [
                    "Cooper showed the Fermi sea is unstable to an arbitrarily weak attraction V: a bound pair forms for any V > 0.",
                    "Solving the BCS gap equation self-consistently for a thin shell of width $\\hbar\\omega_D$ around the Fermi surface gives $\\Delta = 2\\hbar\\omega_D e^{-1/N(0)V}$.",
                    "The non-analytic $e^{-1/N(0)V}$ form shows superconductivity cannot be reached by ordinary perturbation theory in V.",
                ],
            },
        ],
    },
    {
        "slug": "bose_einstein_condensate",
        "related_simulation": "bec",
        "prerequisites": ["quantum_statistics"],
        "overview": [
            "Cool a dilute gas of bosonic atoms close enough to absolute zero and a large fraction suddenly collapses into the single lowest-energy quantum state. The atoms lose their individual identity and are described by one shared macroscopic wavefunction — a Bose–Einstein condensate.",
            "Condensation happens when the thermal de Broglie wavelength grows until neighbouring atoms' wavefunctions overlap. Below the critical temperature the ground-state occupation becomes macroscopic, a purely statistical effect requiring no interaction between the atoms.",
            "BECs make quantum behaviour visible on a human scale: they show interference between matter waves, superfluid flow, and quantised vortices. They are now a workhorse for precision measurement and quantum simulation.",
        ],
        "history": (
            "Predicted by Satyendra Nath Bose and Albert Einstein in 1924–25, the condensate took 70 years to realise. Eric Cornell, Carl Wieman, and Wolfgang Ketterle produced the first atomic BECs (rubidium and sodium) in 1995, sharing the 2001 Nobel Prize."
        ),
        "formulas": [
            {
                "latex": r"T_c = \frac{2\pi\hbar^2}{m k_B}\left(\frac{n}{\zeta(3/2)}\right)^{2/3}",
                "description": "Critical temperature for Bose–Einstein condensation of an ideal gas.",
                "symbols": {
                    "T_c": "condensation temperature",
                    "n": "number density of atoms",
                    "m": "atomic mass",
                    r"\zeta(3/2)": "Riemann zeta value ≈ 2.612",
                    "k_B": "Boltzmann constant",
                },
                "derivation_steps": [
                    "Condensation sets in when the thermal de Broglie wavelength $\\lambda_T = h/\\sqrt{2\\pi m k_B T}$ is comparable to the interparticle spacing $n^{-1/3}$.",
                    "Summing the Bose occupation over excited states caps the non-condensed number; setting it equal to N fixes $T_c$.",
                    "The result is $n\\lambda_T^3 = \\zeta(3/2) \\approx 2.612$, which rearranges to the expression for $T_c$.",
                ],
            },
        ],
    },
    {
        "slug": "quantum_statistics",
        "prerequisites": ["pauli_exclusion"],
        "overview": [
            "Identical quantum particles come in two kinds with opposite social behaviour. Fermions (half-integer spin) obey the Pauli exclusion principle and follow Fermi–Dirac statistics; bosons (integer spin) are gregarious and follow Bose–Einstein statistics.",
            "The difference traces to the symmetry of the joint wavefunction under particle exchange: antisymmetric for fermions, symmetric for bosons. This single fact dictates how the available energy states fill up at a given temperature.",
            "These statistics explain why electrons stack into a Fermi sea (giving metals their structure and white dwarfs their pressure) while photons and cold atoms can pile into one state (giving lasers and condensates). At high temperature both reduce to the classical Maxwell–Boltzmann distribution.",
        ],
        "history": (
            "Fermi and Dirac derived fermion statistics in 1926; Bose and Einstein had treated photon and atom statistics in 1924–25. Pauli's 1940 spin–statistics theorem proved the deep link between a particle's spin and which statistics it must obey."
        ),
        "formulas": [
            {
                "latex": r"\langle n_i \rangle = \frac{1}{e^{(\varepsilon_i - \mu)/k_B T} \pm 1}",
                "description": "Mean occupation of a state: + gives Fermi–Dirac (fermions), − gives Bose–Einstein (bosons).",
                "symbols": {
                    r"\langle n_i \rangle": "average number of particles in state i",
                    r"\varepsilon_i": "energy of state i",
                    r"\mu": "chemical potential",
                    "k_B": "Boltzmann constant",
                    "T": "temperature",
                },
                "derivation_steps": [
                    "Maximise the entropy of indistinguishable particles subject to fixed total number and energy, using a grand-canonical ensemble.",
                    "Antisymmetry caps each fermion state at one particle (the +1 term); symmetry lets boson states hold any number (the −1 term).",
                    "For $\\varepsilon - \\mu \\gg k_B T$ both reduce to the classical Boltzmann factor $e^{-(\\varepsilon-\\mu)/k_BT}$.",
                ],
            },
        ],
    },
    {
        "slug": "phonons",
        "prerequisites": ["harmonic_oscillator", "band_theory"],
        "overview": [
            "The atoms of a crystal vibrate collectively, and quantising those lattice vibrations gives discrete quanta of sound energy called phonons. They are the acoustic analogue of photons: quasiparticles carrying energy ℏω and crystal momentum.",
            "Phonons come in acoustic branches (neighbouring atoms move together, vanishing energy at long wavelength) and optical branches (atoms move against each other). Their spectrum is set by the masses and bonds in the unit cell.",
            "Phonons dominate a solid's heat capacity and thermal conductivity, scatter electrons to create electrical resistance, and — remarkably — provide the glue that binds Cooper pairs in conventional superconductors.",
        ],
        "history": (
            "Einstein (1907) and then Debye (1912) quantised lattice vibrations to explain why heat capacities fall at low temperature, fixing the classical Dulong–Petit law. Igor Tamm coined the term 'phonon' in 1932."
        ),
        "formulas": [
            {
                "latex": r"\omega(k) = 2\sqrt{\frac{K}{m}}\,\left|\sin\!\frac{ka}{2}\right|",
                "description": "Dispersion relation for a 1-D monatomic chain of masses m coupled by springs K.",
                "symbols": {
                    r"\omega": "vibrational angular frequency",
                    "k": "phonon wavevector",
                    "K": "interatomic spring constant",
                    "m": "atomic mass",
                    "a": "lattice spacing",
                },
                "derivation_steps": [
                    "Write Newton's equation for atom n coupled to its neighbours: $m\\ddot{u}_n = K(u_{n+1} + u_{n-1} - 2u_n)$.",
                    "Try a travelling-wave solution $u_n = A e^{i(kna - \\omega t)}$.",
                    "Substituting gives $\\omega^2 = \\tfrac{2K}{m}(1 - \\cos ka)$, i.e. $\\omega = 2\\sqrt{K/m}\\,|\\sin(ka/2)|$.",
                ],
            },
        ],
    },
    {
        "slug": "quantum_hall_effect",
        "prerequisites": ["band_theory", "uncertainty"],
        "overview": [
            "Confine electrons to a two-dimensional sheet, cool it, and apply a strong perpendicular magnetic field: the Hall conductance no longer rises smoothly but locks onto exact integer (or fractional) multiples of e²/h, flat over wide ranges of field.",
            "The quantisation is astonishingly precise — good to parts per billion regardless of sample shape or disorder — because it reflects a topological invariant of the filled Landau levels, not material details. It now defines the standard of electrical resistance.",
            "The fractional quantum Hall effect, seen at partial Landau-level filling, reveals emergent quasiparticles carrying a fraction of the electron's charge and obeying anyonic statistics — a striking example of collective quantum behaviour.",
        ],
        "history": (
            "Klaus von Klitzing discovered the integer effect in 1980 (Nobel 1985). Tsui, Störmer, and Laughlin explained the fractional effect found in 1982 (Nobel 1998). Thouless and collaborators revealed its topological origin (Nobel 2016)."
        ),
        "formulas": [
            {
                "latex": r"\sigma_{xy} = \nu\,\frac{e^2}{h}",
                "description": "Quantised Hall conductance, with ν an integer (or simple fraction).",
                "symbols": {
                    r"\sigma_{xy}": "Hall conductance",
                    r"\nu": "filling factor (integer or fraction)",
                    "e": "elementary charge",
                    "h": "Planck constant",
                },
                "derivation_steps": [
                    "A 2-D electron gas in a field B has quantised Landau levels with degeneracy $eB/h$ per unit area.",
                    "When $\\nu$ levels are exactly filled, the bulk is gapped and only chiral edge channels conduct.",
                    "Each edge channel contributes $e^2/h$, so $\\sigma_{xy} = \\nu e^2/h$ — quantised and topologically protected.",
                ],
            },
        ],
    },
    {
        "slug": "topological_insulators",
        "prerequisites": ["band_theory", "quantum_hall_effect"],
        "overview": [
            "A topological insulator is an ordinary insulator in its interior but hosts metallic states on its surface or edges that cannot be removed without closing the bulk energy gap. The distinction between such materials and ordinary insulators is topological, not based on symmetry breaking.",
            "The protected surface states are special: electron spin is locked perpendicular to momentum, so electrons of opposite spin travel in opposite directions and cannot backscatter off non-magnetic disorder. This makes the surface conduction remarkably robust.",
            "Topological insulators arise from strong spin–orbit coupling and are characterised by a Z₂ topological invariant. They are a leading platform for spintronics and for engineering exotic states like Majorana modes.",
        ],
        "history": (
            "Kane and Mele predicted the quantum spin Hall (Z₂) insulator in 2005; Bernevig, Hughes, and Zhang proposed it in HgTe quantum wells, where König et al. observed it in 2007. Three-dimensional topological insulators followed soon after."
        ),
        "formulas": [
            {
                "latex": r"\nu \in \mathbb{Z}_2 = \{0, 1\}",
                "description": "The Z₂ invariant: 0 marks a trivial insulator, 1 a topological one with protected edge states.",
                "symbols": {
                    r"\nu": "Z₂ topological invariant",
                    r"\mathbb{Z}_2": "the two-element group {0, 1}",
                },
                "derivation_steps": [
                    "Time-reversal symmetry pairs electron states into Kramers doublets that cannot be split at special momenta.",
                    "Counting how these doublets connect across the Brillouin zone yields a quantity defined only modulo 2.",
                    "An odd number of edge crossings ($\\nu = 1$) cannot be unwound without closing the gap — the surface states are protected.",
                ],
            },
        ],
    },
    {
        "slug": "josephson_junctions",
        "related_simulation": "cooper_pairs",
        "prerequisites": ["superconductivity", "quantum_tunneling"],
        "overview": [
            "Place a thin insulating barrier between two superconductors and Cooper pairs tunnel coherently across it. A supercurrent flows with zero voltage, set entirely by the difference in quantum phase between the two superconductors — the Josephson effect.",
            "Apply a constant voltage instead and the phase winds at a fixed rate, producing an alternating current whose frequency depends only on fundamental constants. This exact voltage-to-frequency link now defines the volt.",
            "Josephson junctions are the building blocks of SQUIDs (the most sensitive magnetometers known) and of superconducting qubits, the leading hardware behind today's quantum computers.",
        ],
        "history": (
            "Brian Josephson predicted the effect in 1962 as a 22-year-old graduate student; it was confirmed within a year and earned him the 1973 Nobel Prize. Superconducting qubits built on junctions now dominate industrial quantum-computing efforts."
        ),
        "formulas": [
            {
                "latex": r"I = I_c \sin\varphi,\qquad \frac{d\varphi}{dt} = \frac{2eV}{\hbar}",
                "description": "The two Josephson relations linking supercurrent, phase, and voltage.",
                "symbols": {
                    "I": "supercurrent across the junction",
                    "I_c": "critical (maximum) supercurrent",
                    r"\varphi": "superconducting phase difference",
                    "V": "voltage across the junction",
                    "e": "elementary charge",
                },
                "derivation_steps": [
                    "Each superconductor is described by a macroscopic wavefunction with a definite phase; coupling them allows pair tunnelling.",
                    "The tunnelling current depends on the phase difference as $I = I_c\\sin\\varphi$ (DC effect).",
                    "A voltage makes the phase evolve as $\\dot\\varphi = 2eV/\\hbar$ (AC effect), since a Cooper pair carries charge 2e.",
                ],
            },
        ],
    },
    {
        "slug": "majorana_fermions",
        "prerequisites": ["topological_insulators", "superconductivity"],
        "overview": [
            "A Majorana fermion is a particle that is its own antiparticle — a real solution of a relativistic wave equation, in contrast to the complex electron. No fundamental Majorana particle is confirmed, though neutrinos may be of this type.",
            "In condensed matter, Majorana modes can appear as zero-energy quasiparticles bound to the ends of certain superconducting nanowires. A single electron is effectively split into two spatially separated Majoranas, storing quantum information non-locally.",
            "Because that information is shared between two distant modes, it is protected from local noise — and braiding the modes performs robust quantum gates. This makes Majoranas a sought-after route to fault-tolerant topological quantum computing.",
        ],
        "history": (
            "Ettore Majorana wrote down his real fermion equation in 1937, shortly before vanishing without trace. Kitaev proposed a Majorana nanowire model in 2001; experimental signatures appeared from 2012 onward, though unambiguous confirmation remains contested."
        ),
        "formulas": [
            {
                "latex": r"\gamma = \gamma^{\dagger},\qquad \gamma^2 = 1",
                "description": "Defining property of a Majorana mode: it equals its own creation operator.",
                "symbols": {
                    r"\gamma": "Majorana operator",
                    r"\gamma^{\dagger}": "its Hermitian conjugate (creation operator)",
                },
                "derivation_steps": [
                    "An ordinary fermion operator $c$ can be split into two Hermitian parts: $c = (\\gamma_1 + i\\gamma_2)/2$.",
                    "Each $\\gamma_i$ satisfies $\\gamma_i = \\gamma_i^\\dagger$ and $\\gamma_i^2 = 1$ — it is its own antiparticle.",
                    "Separating $\\gamma_1$ and $\\gamma_2$ to opposite ends of a wire stores one qubit non-locally, protecting it from local perturbations.",
                ],
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Populate Condensed Matter-branch topics with full content (run after seed_concepts)."

    @transaction.atomic
    def handle(self, *args, **options):
        run(self, TOPICS, "Condensed Matter")

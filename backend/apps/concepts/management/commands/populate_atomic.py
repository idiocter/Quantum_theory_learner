"""Populate the Atomic & Molecular branch with full content: overviews,
history, structured formulas (symbols + derivation steps), and prerequisite
links. Topics without a built simulation leave related_simulation untouched.

Idempotent — re-running updates rows in place. Run after `seed_concepts`.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from ._content import run

TOPICS = [
    {
        "slug": "blackbody",
        "related_simulation": "blackbody",
        "overview": [
            "Any warm object glows with a spectrum of light that depends only on its temperature, not on what it is made of. Classical physics predicted the intensity should rise without bound at short wavelengths — the absurd 'ultraviolet catastrophe' that would have every warm body blazing with infinite ultraviolet.",
            "In 1900 Max Planck rescued the spectrum by assuming, almost in desperation, that the oscillators in the walls exchange energy only in discrete bundles of size E = hf. This single hypothesis bent the curve down at short wavelengths and matched experiment perfectly. It was the birth of the quantum.",
            "The resulting Planck law explains why a heated poker glows first dull red then white: its peak wavelength shifts shorter as it heats (Wien's law) and its total radiated power climbs as the fourth power of temperature (Stefan–Boltzmann).",
        ],
        "history": (
            "Max Planck announced his radiation law to the German Physical Society in December 1900, introducing the constant h that bears his name. He regarded quantisation as a mathematical trick for years; Einstein took it literally in 1905. Planck received the 1918 Nobel Prize."
        ),
        "formulas": [
            {
                "latex": r"B(\lambda, T) = \frac{2hc^2}{\lambda^5}\,\frac{1}{e^{hc/\lambda k_B T} - 1}",
                "description": "Planck's law for the spectral radiance of a blackbody at temperature T.",
                "symbols": {
                    "B(\\lambda, T)": "spectral radiance",
                    r"\lambda": "wavelength",
                    "T": "absolute temperature",
                    "h": "Planck constant",
                    "c": "speed of light",
                    "k_B": "Boltzmann constant",
                },
                "derivation_steps": [
                    "Count the electromagnetic modes per unit volume in a cavity: the density grows as $1/\\lambda^4$.",
                    "Classically each mode holds energy $k_B T$ (equipartition), giving the divergent Rayleigh–Jeans law.",
                    "Planck instead allowed energies only in steps of $hf$; the average energy per mode becomes $\\tfrac{hf}{e^{hf/k_BT}-1}$, which vanishes for $hf \\gg k_BT$.",
                    "Multiplying the mode density by this average energy yields Planck's law and cures the ultraviolet catastrophe.",
                ],
            },
            {
                "latex": r"\lambda_{\max} T = b",
                "description": "Wien's displacement law: the peak wavelength is inversely proportional to temperature (b ≈ 2.898×10⁻³ m·K).",
                "symbols": {
                    r"\lambda_{\max}": "wavelength of peak emission",
                    "T": "absolute temperature",
                    "b": "Wien's displacement constant",
                },
                "derivation_steps": [
                    "Set $\\partial B/\\partial\\lambda = 0$ in Planck's law to find the peak.",
                    "The transcendental result gives $\\lambda_{\\max} T = b$, a constant — hotter bodies peak at shorter wavelengths.",
                ],
            },
        ],
    },
    {
        "slug": "photoelectric",
        "related_simulation": "photoelectric",
        "prerequisites": ["blackbody", "wave_particle_duality"],
        "overview": [
            "Shine light on a metal and electrons can be ejected. Experiment showed something classical waves could not explain: below a threshold frequency no electrons emerge no matter how bright the light, while above it electrons appear instantly even at feeble intensity.",
            "Einstein's 1905 explanation was that light arrives as discrete quanta — photons — each carrying energy hf. A single photon gives all its energy to one electron; only if hf exceeds the metal's work function φ does the electron escape, and the surplus becomes kinetic energy.",
            "So frequency, not brightness, decides whether and how energetically electrons fly off; intensity only sets how many. This was the first hard evidence that light itself is quantised, and it earned Einstein the Nobel Prize.",
        ],
        "history": (
            "Heinrich Hertz noticed the effect in 1887 and Philipp Lenard mapped it in 1902. Einstein's light-quantum paper of 1905 — one of his 'miracle year' works — explained it and won him the 1921 Nobel Prize. Millikan, initially sceptical, confirmed the linear relation precisely by 1916."
        ),
        "formulas": [
            {
                "latex": r"K_{\max} = hf - \phi",
                "description": "Maximum kinetic energy of an ejected photoelectron.",
                "symbols": {
                    "K_{\\max}": "maximum kinetic energy of the electron",
                    "h": "Planck constant",
                    "f": "frequency of the incident light",
                    r"\phi": "work function of the metal",
                },
                "derivation_steps": [
                    "A single photon delivers energy $E = hf$ to one electron.",
                    "Escaping the metal costs the work function $\\phi$.",
                    "Energy conservation leaves $K_{\\max} = hf - \\phi$; no electrons emerge unless $hf > \\phi$, defining a threshold frequency $f_0 = \\phi/h$.",
                ],
            },
        ],
    },
    {
        "slug": "bohr_model",
        "prerequisites": ["photoelectric"],
        "overview": [
            "Rutherford's nuclear atom had a fatal flaw: a classical orbiting electron should radiate away its energy and spiral into the nucleus in a fraction of a nanosecond. Atoms plainly do not do this, and they emit light only at sharp, characteristic wavelengths.",
            "In 1913 Niels Bohr postulated that the electron occupies only certain stationary orbits where its angular momentum is a whole-number multiple of ℏ, and that it radiates only when jumping between them. Quantisation, imposed by hand, made the atom stable.",
            "The model nailed the hydrogen spectrum — the Balmer and Lyman series fell out exactly — and introduced energy levels and quantum jumps. It fails for multi-electron atoms and was superseded by the Schrödinger treatment, but it remains the indispensable first picture of the atom.",
        ],
        "history": (
            "Niels Bohr published his three-part 'trilogy' in 1913, fusing Rutherford's nucleus with Planck and Einstein's quanta. It explained the Rydberg formula known empirically since 1888 and won Bohr the 1922 Nobel Prize, a year after Einstein."
        ),
        "formulas": [
            {
                "latex": r"E_n = -\frac{13.6\ \text{eV}}{n^2}",
                "description": "Energy levels of the hydrogen atom in the Bohr model.",
                "symbols": {
                    "E_n": "energy of the n-th level",
                    "n": "principal quantum number (1, 2, 3, …)",
                    "13.6 eV": "Rydberg energy (ground-state binding energy)",
                },
                "derivation_steps": [
                    "Quantise angular momentum: $m v r = n\\hbar$.",
                    "Balance the Coulomb force against the centripetal requirement: $\\tfrac{e^2}{4\\pi\\varepsilon_0 r^2} = \\tfrac{m v^2}{r}$.",
                    "Eliminating v and r gives quantised radii $r_n \\propto n^2$ and energies $E_n = -\\tfrac{13.6\\,\\text{eV}}{n^2}$.",
                ],
            },
            {
                "latex": r"\frac{1}{\lambda} = R_H\!\left(\frac{1}{n_1^2} - \frac{1}{n_2^2}\right)",
                "description": "Rydberg formula for the wavelengths of hydrogen's spectral lines.",
                "symbols": {
                    r"\lambda": "emitted/absorbed wavelength",
                    "R_H": "Rydberg constant for hydrogen",
                    "n_1, n_2": "lower and upper level numbers (n₂ > n₁)",
                },
                "derivation_steps": [
                    "A jump from level $n_2$ to $n_1$ emits a photon of energy $hf = E_{n_2} - E_{n_1}$.",
                    "Substituting $E_n = -\\tfrac{13.6\\,\\text{eV}}{n^2}$ and $1/\\lambda = f/c$ gives the Rydberg formula.",
                ],
            },
        ],
    },
    {
        "slug": "atomic_orbitals",
        "prerequisites": ["bohr_model", "schrodinger_equation"],
        "overview": [
            "Solving the Schrödinger equation for an electron in the hydrogen atom replaces Bohr's flat orbits with three-dimensional standing waves of probability — orbitals. Each is labelled by three quantum numbers: n (size and energy), ℓ (shape), and mₗ (orientation).",
            "The familiar s, p, d, f shapes are the angular parts of these solutions: spherical s orbitals, dumbbell p orbitals, cloverleaf d orbitals. The square of the wavefunction gives the probability cloud where the electron is likely to be found; there is no definite trajectory.",
            "Orbitals are the foundation of the periodic table. Their ordering and capacities — set by the allowed quantum numbers — explain the rows and columns of chemistry and the structure of every element.",
        ],
        "history": (
            "Schrödinger solved the hydrogen atom in 1926, recovering Bohr's energies while replacing orbits with wavefunctions. The orbital language and the s/p/d/f notation, inherited from spectroscopy ('sharp, principal, diffuse, fundamental'), became the backbone of quantum chemistry."
        ),
        "formulas": [
            {
                "latex": r"\psi_{n\ell m}(r,\theta,\varphi) = R_{n\ell}(r)\,Y_\ell^{m}(\theta,\varphi)",
                "description": "Hydrogen orbitals separate into a radial part and a spherical-harmonic angular part.",
                "symbols": {
                    r"\psi_{n\ell m}": "orbital wavefunction",
                    "R_{n\\ell}(r)": "radial function",
                    "Y_\\ell^{m}": "spherical harmonic (angular shape)",
                    "n, \\ell, m": "principal, azimuthal, magnetic quantum numbers",
                },
                "derivation_steps": [
                    "The Coulomb potential is spherically symmetric, so the equation separates in spherical coordinates.",
                    "The angular part gives spherical harmonics $Y_\\ell^m$ with $\\ell = 0,1,\\dots,n-1$ and $m = -\\ell,\\dots,\\ell$.",
                    "Requiring a normalisable radial solution quantises the energy as $E_n = -13.6\\,\\text{eV}/n^2$, matching Bohr.",
                ],
            },
        ],
    },
    {
        "slug": "pauli_exclusion",
        "prerequisites": ["atomic_orbitals", "spin"],
        "overview": [
            "No two identical fermions — electrons, protons, neutrons — can occupy the same quantum state at once. This exclusion principle is why electrons stack into successive shells instead of all collapsing into the lowest orbital.",
            "It follows from a deep symmetry: the total wavefunction of identical fermions must be antisymmetric (change sign) when two particles are swapped. If two were in the same state, that antisymmetric function would be identically zero — an impossibility.",
            "Exclusion builds the periodic table, gives matter its volume, and holds up white dwarf and neutron stars against gravity through degeneracy pressure. Without it, chemistry and solid matter as we know them would not exist.",
        ],
        "history": (
            "Wolfgang Pauli proposed the principle in 1925 to explain atomic spectra, before spin was understood; the fourth quantum number he invoked turned out to be spin. He proved the spin–statistics connection in 1940 and received the 1945 Nobel Prize."
        ),
        "formulas": [
            {
                "latex": r"\Psi(\dots, x_i, \dots, x_j, \dots) = -\,\Psi(\dots, x_j, \dots, x_i, \dots)",
                "description": "The many-fermion wavefunction is antisymmetric under exchange of any two particles.",
                "symbols": {
                    r"\Psi": "total wavefunction of the identical fermions",
                    "x_i, x_j": "combined space-and-spin coordinates of two particles",
                },
                "derivation_steps": [
                    "Swapping two identical fermions multiplies $\\Psi$ by $-1$.",
                    "If both particles shared the same state, swapping would leave $\\Psi$ unchanged, forcing $\\Psi = -\\Psi$.",
                    "The only solution is $\\Psi = 0$: two fermions cannot occupy the same state.",
                ],
            },
        ],
    },
    {
        "slug": "lasers",
        "prerequisites": ["bohr_model"],
        "overview": [
            "A laser produces an intense, coherent, single-colour beam by exploiting stimulated emission: a passing photon coaxes an excited atom to emit a second photon identical in phase, direction, and frequency. One photon becomes two, two become four — a coherent avalanche.",
            "The trick is to create a population inversion, with more atoms in the excited state than the ground state, so stimulated emission outpaces absorption. This requires pumping energy in and usually a metastable level where atoms linger. An optical cavity feeds the light back through the medium to amplify it.",
            "Lasers underpin fibre-optic communication, barcode scanners, surgery, precision metrology, and the cooling of atoms to billionths of a degree. They are quantum amplifiers turned into everyday tools.",
        ],
        "history": (
            "Einstein predicted stimulated emission in 1917. Townes built the microwave maser in 1954; Maiman fired the first working (ruby) laser in 1960. Townes, Basov, and Prokhorov shared the 1964 Nobel Prize for the underlying principle."
        ),
        "formulas": [
            {
                "latex": r"\frac{N_2}{N_1} = e^{-(E_2 - E_1)/k_B T}",
                "description": "Boltzmann ratio of level populations in thermal equilibrium — a laser must invert it (N₂ > N₁).",
                "symbols": {
                    "N_2, N_1": "populations of the upper and lower levels",
                    "E_2 - E_1": "energy gap between the levels",
                    "k_B": "Boltzmann constant",
                    "T": "temperature",
                },
                "derivation_steps": [
                    "In thermal equilibrium the upper level is less populated, $N_2 < N_1$, so absorption dominates.",
                    "Stimulated emission and absorption have equal rates per atom (Einstein's B coefficients), so net gain needs $N_2 > N_1$ — a population inversion.",
                    "Pumping plus a metastable level achieves this non-equilibrium condition, turning the medium into an amplifier.",
                ],
            },
        ],
    },
    {
        "slug": "zeeman_effect",
        "prerequisites": ["atomic_orbitals", "spin"],
        "overview": [
            "Place an atom in a magnetic field and its spectral lines split into closely spaced components. The field lifts the degeneracy of states that differ only in the orientation of their angular momentum, so transitions that once shared a wavelength now separate.",
            "The 'normal' Zeeman effect splits a line into three, explained by the orbital magnetic moment alone. The 'anomalous' effect — more complex splittings — could not be explained until electron spin and the resulting total angular momentum J were taken into account.",
            "The Zeeman effect is a precision probe: astronomers use it to measure magnetic fields on the Sun and distant stars from the splitting of their absorption lines, and it underlies magnetic resonance techniques.",
        ],
        "history": (
            "Pieter Zeeman observed the splitting in 1896; Lorentz explained the normal case classically, and the two shared the 1902 Nobel Prize. The anomalous effect resisted explanation until the 1925 discovery of spin — Pauli called it one of the great puzzles that forced spin upon physics."
        ),
        "formulas": [
            {
                "latex": r"\Delta E = g_J\, \mu_B\, m_J\, B",
                "description": "Energy shift of a sublevel in a magnetic field (anomalous Zeeman effect).",
                "symbols": {
                    r"\Delta E": "energy shift of the sublevel",
                    "g_J": "Landé g-factor",
                    r"\mu_B": "Bohr magneton",
                    "m_J": "projection of total angular momentum",
                    "B": "magnetic field strength",
                },
                "derivation_steps": [
                    "A magnetic moment $\\vec\\mu$ in a field has energy $-\\vec\\mu\\cdot\\vec B$.",
                    "For an atom $\\mu_z = -g_J \\mu_B m_J$, where $g_J$ blends orbital and spin contributions.",
                    "The shift is therefore $\\Delta E = g_J \\mu_B m_J B$, splitting each level into its $2J+1$ values of $m_J$.",
                ],
            },
        ],
    },
    {
        "slug": "molecular_bonding",
        "prerequisites": ["atomic_orbitals", "pauli_exclusion"],
        "overview": [
            "Atoms bond because combining their atomic orbitals can lower the total energy of the electrons. When two atoms approach, their orbitals overlap and merge into molecular orbitals spread over both nuclei — a constructive 'bonding' combination at lower energy and a destructive 'antibonding' one at higher energy.",
            "Electrons fill the bonding orbital first, gluing the atoms together; the bond order (bonding minus antibonding electrons, over two) predicts whether a molecule is stable and how strong the bond is. The H₂ molecule is the simplest example, and explaining it was an early triumph of quantum mechanics.",
            "This molecular-orbital picture, together with valence-bond theory, accounts for bond lengths, strengths, magnetism, and the colours of molecules — the quantum basis of all of chemistry.",
        ],
        "history": (
            "Heitler and London gave the first quantum treatment of the H₂ bond in 1927, founding valence-bond theory. Mulliken and Hund developed the complementary molecular-orbital theory through the 1930s; Mulliken received the 1966 Nobel Prize in Chemistry for it."
        ),
        "formulas": [
            {
                "latex": r"\psi_{\pm} = \frac{1}{\sqrt{2(1 \pm S)}}\,\big(\phi_A \pm \phi_B\big)",
                "description": "Bonding (+) and antibonding (−) molecular orbitals from a linear combination of two atomic orbitals.",
                "symbols": {
                    r"\psi_{\pm}": "bonding (+) / antibonding (−) molecular orbital",
                    r"\phi_A, \phi_B": "atomic orbitals on atoms A and B",
                    "S": "overlap integral between the atomic orbitals",
                },
                "derivation_steps": [
                    "Approximate the molecular orbital as a linear combination of atomic orbitals (LCAO): $\\psi = c_A\\phi_A + c_B\\phi_B$.",
                    "Symmetry of a homonuclear molecule forces $c_A = \\pm c_B$, giving the in-phase and out-of-phase combinations.",
                    "The in-phase $\\psi_+$ piles electron density between the nuclei (bonding, lower energy); $\\psi_-$ has a node there (antibonding, higher energy).",
                ],
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Populate Atomic & Molecular-branch topics with full content (run after seed_concepts)."

    @transaction.atomic
    def handle(self, *args, **options):
        run(self, TOPICS, "Atomic & Molecular")

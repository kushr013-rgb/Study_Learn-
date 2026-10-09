import type { Difficulty, Exam, Question } from '../lib/types';

/* ---------------------------------------------------------------------------
 * Question bank seed.
 * Two sources:
 *  1. Curated questions (hand written, concept-rich).
 *  2. Parametric templates that produce distinct numerical variants — physics /
 *     maths problems whose numbers change are genuinely different problems.
 * The result is a 115+ item bank covering JEE, NEET, Class 10 and Class 12.
 * ------------------------------------------------------------------------- */

type Seed = [Exam, string, string, string, Difficulty, string, string[], number, string];

const SEEDS: Seed[] = [
  // ---------------- JEE · Physics ----------------
  ['JEE', 'Physics', 'Kinematics', 'Motion in One Dimension', 'Easy',
    'A particle starts from rest and moves with a constant acceleration of 4 m/s². The distance covered by it during the 5th second is',
    ['18 m', '20 m', '36 m', '22 m'], 0,
    'Distance in the nth second = u + a/2(2n − 1) = 0 + 2(9) = 18 m.'],
  ['JEE', 'Physics', 'Kinematics', 'Projectile Motion', 'Medium',
    'A projectile is fired with a speed of 40 m/s at an angle of 30° with the horizontal. Taking g = 10 m/s², its horizontal range is',
    ['80√3 m', '80 m', '160 m', '40√3 m'], 0,
    'R = u² sin 2θ / g = 1600 × sin 60° / 10 = 80√3 m.'],
  ['JEE', 'Physics', 'Laws of Motion', 'Friction', 'Medium',
    'A block of mass 5 kg rests on a rough horizontal surface (μ = 0.4, g = 10 m/s²). The minimum horizontal force needed to start its motion is',
    ['10 N', '20 N', '25 N', '50 N'], 1,
    'F_min = μN = μmg = 0.4 × 5 × 10 = 20 N.'],
  ['JEE', 'Physics', 'Work, Energy and Power', 'Conservation of Energy', 'Easy',
    'A ball of mass 2 kg is released from a height of 5 m. Just before striking the ground, its kinetic energy is (g = 10 m/s²)',
    ['50 J', '100 J', '20 J', '200 J'], 1,
    'By energy conservation, KE = mgh = 2 × 10 × 5 = 100 J.'],
  ['JEE', 'Physics', 'Rotational Motion', 'Concept Review', 'Medium',
    'A solid sphere rolls without slipping on a horizontal surface. The fraction of its total kinetic energy that is rotational is',
    ['2/7', '5/7', '1/2', '3/5'], 0,
    'For a solid sphere K_rot / K_total = (k²/(k² + R²)) = (2/5)/(7/5) = 2/7.'],
  ['JEE', 'Physics', 'Gravitation', 'Escape Velocity', 'Medium',
    'The escape velocity from the surface of the earth is 11.2 km/s. For a planet of twice the radius but the same density, the escape velocity would be',
    ['11.2 km/s', '22.4 km/s', '15.8 km/s', '5.6 km/s'], 1,
    'v_e ∝ R√ρ. With same density and double radius, v_e doubles to 22.4 km/s.'],
  ['JEE', 'Physics', 'Thermodynamics', 'Heat Engines', 'Medium',
    'A Carnot engine operates between a source at 500 K and a sink at 300 K. The efficiency of the engine is',
    ['40%', '60%', '25%', '66.6%'], 0,
    'η = 1 − T₂/T₁ = 1 − 300/500 = 0.4 = 40%.'],
  ['JEE', 'Physics', 'Oscillations and Waves', 'Concept Review', 'Easy',
    'A simple pendulum has a time period of 2 s on the earth. On the moon, where g_moon = g/6, its time period will be',
    ['4.9 s', '12 s', '0.33 s', '2 s'], 0,
    'T ∝ 1/√g, so T_moon = T√(g/g_moon) = 2√6 ≈ 4.9 s.'],
  ['JEE', 'Physics', 'Electrostatics', "Coulomb's Law", 'Easy',
    'If the separation between two point charges is doubled, the electrostatic force between them becomes',
    ['Half', 'One-fourth', 'Double', 'Four times'], 1,
    'F ∝ 1/r². Doubling r reduces the force to one-fourth.'],
  ['JEE', 'Physics', 'Current Electricity', 'Wheatstone Bridge', 'Medium',
    'A Wheatstone bridge has all four arms of equal resistance R. The equivalent resistance between the source terminals is',
    ['R/2', 'R', '2R', '4R'], 1,
    'Balanced bridge ⇒ no current in the galvanometer arm; two series branches of 2R in parallel give R.'],
  ['JEE', 'Physics', 'Electromagnetic Induction', 'Concept Review', 'Medium',
    'A coil of 100 turns and area 0.01 m² is placed normally in a field of 0.5 T. If the field is reversed in 0.1 s, the average induced emf is',
    ['1 V', '10 V', '5 V', '0.1 V'], 1,
    'ε = N ΔΦ/Δt = 100 × (2 × 0.5 × 0.01)/0.1 = 10 V.'],
  ['JEE', 'Physics', 'Optics', 'Total Internal Reflection', 'Medium',
    'Light travelling inside glass (μ = 1.5) strikes the glass–air boundary. The critical angle is',
    ['41.8°', '48.2°', '60°', '30°'], 0,
    'sin C = 1/μ = 0.667 ⇒ C ≈ 41.8°.'],
  ['JEE', 'Physics', 'Modern Physics', 'Photoelectric Effect', 'Medium',
    'Light of frequency 8 × 10¹⁴ Hz falls on a metal of work function 2 eV. The maximum kinetic energy of emitted photoelectrons is (h = 6.6 × 10⁻³⁴ J·s)',
    ['1.3 eV', '3.3 eV', '5.3 eV', '0.65 eV'], 0,
    'hf = 5.28 × 10⁻¹⁹ J ≈ 3.3 eV; K_max = 3.3 − 2 = 1.3 eV.'],
  ['JEE', 'Physics', 'Semiconductor Electronics', 'Concept Review', 'Easy',
    'When a p–n junction diode is reverse biased, the depletion layer',
    ['widens', 'narrows', 'disappears', 'does not change'], 0,
    'Reverse bias pulls majority carriers away from the junction, widening the depletion region.'],

  // ---------------- JEE · Chemistry ----------------
  ['JEE', 'Chemistry', 'Atomic Structure', 'Bohr Model', 'Medium',
    'The radius of the second Bohr orbit of He⁺ in terms of the Bohr radius a₀ is',
    ['2a₀', 'a₀/2', '4a₀', 'a₀/4'], 0,
    'r_n = n²a₀/Z = 4a₀/2 = 2a₀.'],
  ['JEE', 'Chemistry', 'Chemical Bonding', 'VSEPR Theory', 'Medium',
    'According to VSEPR theory, the shape of XeF₄ is',
    ['Tetrahedral', 'Square planar', 'See-saw', 'Trigonal bipyramidal'], 1,
    'XeF₄ has 4 bond pairs and 2 lone pairs ⇒ square planar (AX₄E₂).'],
  ['JEE', 'Chemistry', 'Chemical Equilibrium', 'Le Chatelier Principle', 'Medium',
    'For N₂(g) + 3H₂(g) ⇌ 2NH₃(g) (exothermic), the yield of ammonia is favoured by',
    ['Low pressure and high temperature', 'High pressure and low temperature', 'Low pressure and low temperature', 'High pressure and high temperature'], 1,
    'Forward reaction lowers moles and releases heat ⇒ high pressure, low temperature (compromise ~700 K).'],
  ['JEE', 'Chemistry', 'Solutions', 'Colligative Properties', 'Medium',
    'For equimolal aqueous solutions, which solute will show the largest elevation in boiling point?',
    ['Glucose', 'NaCl', 'CaCl₂', 'AlCl₃'], 3,
    'ΔTb = i·Kb·m; AlCl₃ gives van’t Hoff factor i ≈ 4, the largest among the options.'],
  ['JEE', 'Chemistry', 'Chemical Kinetics', 'Half Life', 'Medium',
    'A first order reaction has a half-life of 20 minutes. Its rate constant is',
    ['0.0347 min⁻¹', '0.693 min⁻¹', '14.4 min⁻¹', '0.0144 min⁻¹'], 0,
    'k = 0.693 / t₁/₂ = 0.693/20 = 0.0347 min⁻¹.'],
  ['JEE', 'Chemistry', 'Coordination Compounds', 'Concept Review', 'Medium',
    'The IUPAC name of [Co(NH₃)₆]Cl₃ is',
    ['Hexaamminecobalt(II) chloride', 'Hexaamminecobalt(III) chloride', 'Cobalt hexaammine trichloride', 'Triammine cobalt(III) chloride'], 1,
    'Six neutral NH₃ ligands and three Cl⁻ counter ions ⇒ cobalt is in +3 state.'],
  ['JEE', 'Chemistry', 'Haloalkanes and Haloarenes', 'Concept Review', 'Medium',
    'The correct order of reactivity towards an SN1 mechanism is',
    ['Primary > Secondary > Tertiary', 'Tertiary > Secondary > Primary', 'Secondary > Tertiary > Primary', 'All react equally'], 1,
    'SN1 proceeds through a carbocation; tertiary carbocations are the most stable.'],
  ['JEE', 'Chemistry', 'Aldehydes, Ketones and Acids', 'Concept Review', 'Medium',
    'Which compound gives a positive Tollens’ test but a negative iodoform test?',
    ['Acetone', 'Benzaldehyde', 'Ethanol', 'Acetaldehyde'], 1,
    'Benzaldehyde reduces Tollens’ reagent but lacks the CH₃CO– group needed for iodoform.'],
  ['JEE', 'Chemistry', 'Amines', 'Concept Review', 'Medium',
    'The correct order of basic strength in aqueous medium is',
    ['Aniline > Ammonia > Methylamine', 'Methylamine > Ammonia > Aniline', 'Ammonia > Methylamine > Aniline', 'Aniline > Methylamine > Ammonia'], 1,
    'The +I effect of —CH₃ increases basicity, while resonance in aniline withdraws the lone pair.'],
  ['JEE', 'Chemistry', 'Biomolecules', 'Concept Review', 'Easy',
    'Which of the following is a reducing sugar?',
    ['Sucrose', 'Glucose', 'Starch', 'Cellulose'], 1,
    'Glucose has a free aldehyde group and reduces Fehling’s and Tollens’ reagents.'],
  ['JEE', 'Chemistry', 'Thermodynamics', 'First Law of Thermodynamics', 'Easy',
    'For the isothermal expansion of an ideal gas, the change in internal energy is',
    ['Zero', 'Positive', 'Negative', 'Equal to the work done'], 0,
    'For an ideal gas, U depends only on temperature; ΔT = 0 ⇒ ΔU = 0.'],
  ['JEE', 'Chemistry', 'Redox Reactions', 'Concept Review', 'Medium',
    'The oxidation number of chromium in K₂Cr₂O₇ is',
    ['+3', '+6', '+7', '+2'], 1,
    '2(+1) + 2x + 7(−2) = 0 ⇒ x = +6.'],
  ['JEE', 'Chemistry', 'p-Block Elements', 'Concept Review', 'Medium',
    'Among the hydrogen halides, the strongest acid is',
    ['HF', 'HCl', 'HBr', 'HI'], 3,
    'The H—I bond is the weakest, so HI ionises most readily in water.'],
  ['JEE', 'Chemistry', 'Electrochemistry', 'Nernst Equation', 'Hard',
    'For the cell reaction Zn + Cu²⁺ → Zn²⁺ + Cu, increasing [Zn²⁺] at 298 K will',
    ['Increase the cell potential', 'Decrease the cell potential', 'Not change the cell potential', 'Reverse the cell reaction'], 1,
    'E = E° − (0.0591/2) log([Zn²⁺]/[Cu²⁺]); a larger [Zn²⁺] lowers E.'],

  // ---------------- JEE · Mathematics ----------------
  ['JEE', 'Mathematics', 'Sets, Relations and Functions', 'Concept Review', 'Easy',
    'The number of onto (surjective) functions from a set of 3 elements to a set of 2 elements is',
    ['6', '8', '4', '9'], 0,
    'Total functions 2³ = 8; subtract the 2 constant functions ⇒ 6.'],
  ['JEE', 'Mathematics', 'Complex Numbers', 'Modulus and Argument', 'Medium',
    'The value of iⁿ + iⁿ⁺¹ + iⁿ⁺² + iⁿ⁺³ for any integer n is',
    ['0', '1', '−1', 'i'], 0,
    'Any four consecutive powers of i sum to iⁿ(1 + i − 1 − i) = 0.'],
  ['JEE', 'Mathematics', 'Quadratic Equations', 'Sum and Product of Roots', 'Medium',
    'If α and β are the roots of x² − 5x + 6 = 0, then α² + β² equals',
    ['13', '25', '12', '37'], 0,
    'α + β = 5, αβ = 6 ⇒ α² + β² = 25 − 12 = 13.'],
  ['JEE', 'Mathematics', 'Sequences and Series', 'Geometric Progression', 'Medium',
    'The sum to infinity of the series 1 + 1/2 + 1/4 + 1/8 + … is',
    ['2', '4', '1.5', '∞'], 0,
    'S∞ = a/(1 − r) = 1/(1 − 1/2) = 2.'],
  ['JEE', 'Mathematics', 'Binomial Theorem', 'Concept Review', 'Medium',
    'The coefficient of x⁵ in the expansion of (1 + x)¹⁰ is',
    ['252', '210', '120', '45'], 0,
    '¹⁰C₅ = 252.'],
  ['JEE', 'Mathematics', 'Permutation and Combination', 'Permutations', 'Medium',
    'The number of distinct arrangements of the letters of the word MISSISSIPPI is',
    ['34650', '39916800', '2310', '13860'], 0,
    '11!/(4!·4!·2!) = 34650.'],
  ['JEE', 'Mathematics', 'Trigonometry', 'Identities', 'Easy',
    'The exact value of sin 15° is',
    ['(√3 − 1)/(2√2)', '(√3 + 1)/(2√2)', '(√3 − 1)/2', '1/2'], 0,
    'sin(45° − 30°) = sin45 cos30 − cos45 sin30 = (√3 − 1)/(2√2).'],
  ['JEE', 'Mathematics', 'Straight Lines and Circles', 'Concept Review', 'Medium',
    'The equation of the line passing through (2, 3) with slope −1 is',
    ['x + y = 5', 'x − y = 5', 'x + y = 1', '2x + y = 5'], 0,
    'y − 3 = −1(x − 2) ⇒ x + y = 5.'],
  ['JEE', 'Mathematics', 'Conic Sections', 'Concept Review', 'Medium',
    'The eccentricity of the ellipse x²/25 + y²/9 = 1 is',
    ['4/5', '3/5', '5/4', '1/5'], 0,
    'a = 5, b = 3 ⇒ e = √(1 − b²/a²) = √(16/25) = 4/5.'],
  ['JEE', 'Mathematics', 'Limits and Continuity', 'Algebraic Limits', 'Medium',
    'The value of lim₍ₓ→₀₎ (sin 3x)/x is',
    ['3', '1', '0', '1/3'], 0,
    'lim (sin 3x)/x = 3 · lim (sin 3x)/(3x) = 3.'],
  ['JEE', 'Mathematics', 'Differentiation', 'Logarithmic Differentiation', 'Easy',
    'The derivative of xˣ with respect to x is',
    ['xˣ(1 + ln x)', 'xˣ ln x', 'x·xˣ⁻¹', 'xˣ/x'], 0,
    'Let y = xˣ; ln y = x ln x ⇒ y′/y = 1 + ln x ⇒ y′ = xˣ(1 + ln x).'],
  ['JEE', 'Mathematics', 'Application of Derivatives', 'Maxima and Minima', 'Medium',
    'The function f(x) = x³ − 3x has a local maximum at x =',
    ['−1', '1', '0', '2'], 0,
    'f′(x) = 3x² − 3 = 0 ⇒ x = ±1; f″(−1) = −6 < 0 ⇒ maximum at x = −1.'],
  ['JEE', 'Mathematics', 'Indefinite Integration', 'Integration by Substitution', 'Medium',
    '∫ eˣ (sin x + cos x) dx equals',
    ['eˣ sin x + C', 'eˣ cos x + C', '−eˣ sin x + C', 'eˣ(sin x − cos x) + C'], 0,
    'd/dx(eˣ sin x) = eˣ sin x + eˣ cos x.'],
  ['JEE', 'Mathematics', 'Definite Integration', 'Properties of Definite Integrals', 'Medium',
    'The value of ∫₀^(π/2) sin²x dx is',
    ['π/4', 'π/2', '1/2', 'π'], 0,
    '∫₀^(π/2) sin²x dx = (1/2)(π/2) = π/4.'],
  ['JEE', 'Mathematics', 'Differential Equations', 'Concept Review', 'Medium',
    'The order and degree of (d²y/dx²)³ + (dy/dx)² = 0 are respectively',
    ['2 and 3', '3 and 2', '2 and 2', '1 and 2'], 0,
    'Highest derivative is of second order and its power is 3.'],
  ['JEE', 'Mathematics', 'Vectors and 3D Geometry', 'Dot Product', 'Easy',
    'If |a| = |b| = 1 and a · b = 0, then the angle between a and b is',
    ['90°', '0°', '60°', '45°'], 0,
    'a · b = |a||b| cos θ = cos θ = 0 ⇒ θ = 90°.'],
  ['JEE', 'Mathematics', 'Probability', 'Conditional Probability', 'Easy',
    'Two fair dice are rolled. The probability of getting a sum of 7 is',
    ['1/6', '1/12', '5/36', '1/9'], 0,
    'Favourable outcomes = 6 out of 36 ⇒ 6/36 = 1/6.'],
  ['JEE', 'Mathematics', 'Matrices and Determinants', 'Properties of Determinants', 'Easy',
    'A square matrix A is singular if',
    ['|A| = 0', '|A| ≠ 0', 'A is symmetric', 'A = I'], 0,
    'A matrix has no inverse when its determinant is zero.'],
  ['JEE', 'Mathematics', 'Statistics', 'Concept Review', 'Medium',
    'For the data 2, 4, 6, 8, 10, the mean deviation about the mean is',
    ['2.4', '2', '3.2', '1.8'], 0,
    'Mean = 6; mean deviation = (4+2+0+2+4)/5 = 12/5 = 2.4.'],

  // ---------------- NEET ----------------
  ['NEET', 'Physics', 'Optics', 'Lenses', 'Medium',
    'In a myopic eye, the image of a distant object is formed',
    ['In front of the retina', 'Behind the retina', 'On the retina', 'At the blind spot'], 0,
    'Excessive converging power of the eye lens brings the image to a point in front of the retina.'],
  ['NEET', 'Chemistry', 'Atomic Structure', 'Electronic Configuration', 'Easy',
    'The number of unpaired electrons in an Fe²⁺ ion (Z = 26) is',
    ['4', '5', '3', '6'], 0,
    'Fe²⁺ is 3d⁶: five orbitals hold ↑↓ ↑ ↑ ↑ ↑ ⇒ four unpaired electrons.'],
  ['NEET', 'Botany', 'Cell Structure and Function', 'Concept Review', 'Easy',
    'The organelle referred to as the powerhouse of the cell is',
    ['Mitochondrion', 'Ribosome', 'Golgi apparatus', 'Lysosome'], 0,
    'Mitochondria generate ATP through oxidative phosphorylation.'],
  ['NEET', 'Botany', 'Plant Physiology', 'Photosynthesis', 'Medium',
    'In C₄ plants, the first stable product of carbon fixation is',
    ['Oxaloacetic acid', '3-Phosphoglyceric acid', 'Ribulose bisphosphate', 'Pyruvic acid'], 0,
    'PEP carboxylase fixes CO₂ into the four-carbon compound oxaloacetic acid.'],
  ['NEET', 'Botany', 'Genetics', 'Mendelian Inheritance', 'Medium',
    'In a typical Mendelian dihybrid cross, the F₂ phenotypic ratio is',
    ['9 : 3 : 3 : 1', '3 : 1', '1 : 2 : 1', '9 : 7'], 0,
    'Independent assortment of two gene pairs gives the classic 9:3:3:1 ratio.'],
  ['NEET', 'Botany', 'Ecology and Environment', 'Nutrient Cycles', 'Easy',
    'Which of the following is a greenhouse gas?',
    ['Nitrogen', 'Methane', 'Oxygen', 'Argon'], 1,
    'Methane traps infrared radiation and contributes strongly to global warming.'],
  ['NEET', 'Zoology', 'Human Physiology', 'Body Fluids and Circulation', 'Easy',
    'The pacemaker of the human heart is the',
    ['Sino-atrial node', 'Atrio-ventricular node', 'Bundle of His', 'Purkinje fibres'], 0,
    'The SA node generates the highest rate of action potentials and sets the heart rhythm.'],
  ['NEET', 'Zoology', 'Human Physiology', 'Excretory Products', 'Medium',
    'Which enzyme converts angiotensin I into the active vasoconstrictor angiotensin II?',
    ['Renin', 'Angiotensin converting enzyme', 'Pepsin', 'Carbonic anhydrase'], 1,
    'ACE, abundant in lung capillaries, cleaves angiotensin I to angiotensin II.'],
  ['NEET', 'Zoology', 'Animal Diversity', 'Concept Review', 'Easy',
    'Which of the following animals belongs to phylum Porifera?',
    ['Sycon', 'Hydra', 'Planaria', 'Ascaris'], 0,
    'Sycon is a calcareous sponge with a canal system characteristic of Porifera.'],
  ['NEET', 'Zoology', 'Biotechnology', 'Concept Review', 'Medium',
    'In recombinant DNA technology, the enzyme used to join DNA fragments is',
    ['Restriction endonuclease', 'DNA ligase', 'DNA polymerase', 'Reverse transcriptase'], 1,
    'DNA ligase catalyses the formation of phosphodiester bonds between fragments.'],

  // ---------------- Class 10 ----------------
  ['Class 10', 'Science', 'Chemical Reactions and Equations', 'Types of Reactions', 'Easy',
    'Which of the following is an example of a combination reaction?',
    ['CaO + H₂O → Ca(OH)₂', 'Zn + H₂SO₄ → ZnSO₄ + H₂', '2KClO₃ → 2KCl + 3O₂', 'AgNO₃ + NaCl → AgCl + NaNO₃'], 0,
    'Two reactants combine to form a single product, which defines a combination reaction.'],
  ['Class 10', 'Science', 'Acids, Bases and Salts', 'pH Scale', 'Easy',
    'The pH of a neutral solution at 25 °C is',
    ['7', '0', '14', '1'], 0,
    'Pure water has equal H⁺ and OH⁻ concentrations, giving pH = 7.'],
  ['Class 10', 'Science', 'Electricity', 'Resistance', 'Medium',
    'Two resistors of 6 Ω and 3 Ω are connected in parallel. Their equivalent resistance is',
    ['2 Ω', '9 Ω', '4.5 Ω', '18 Ω'], 0,
    '1/R = 1/6 + 1/3 = 1/2 ⇒ R = 2 Ω.'],
  ['Class 10', 'Science', 'Light', 'Spherical Mirrors', 'Medium',
    'A concave mirror has a radius of curvature of 30 cm. Its focal length is',
    ['15 cm', '30 cm', '60 cm', '10 cm'], 0,
    'f = R/2 = 30/2 = 15 cm.'],
  ['Class 10', 'Science', 'Life Processes', 'Digestion and Absorption', 'Easy',
    'Absorption of water and some salts in humans mainly takes place in the',
    ['Large intestine', 'Stomach', 'Oesophagus', 'Buccal cavity'], 0,
    'The large intestine absorbs most of the remaining water and electrolytes.'],
  ['Class 10', 'Science', 'Heredity and Evolution', 'Concept Review', 'Medium',
    'The sex of a child in humans is determined by the',
    ['X chromosome of the mother', 'Sex chromosome contributed by the father', 'Autosomes of the mother', 'Environment'], 1,
    'Mothers contribute only X; the father contributes either X or Y, deciding the sex.'],
  ['Class 10', 'Mathematics', 'Real Numbers', 'Concept Review', 'Easy',
    'The HCF of 12 and 18 is',
    ['6', '3', '36', '2'], 0,
    '12 = 2²·3 and 18 = 2·3² ⇒ HCF = 2·3 = 6.'],
  ['Class 10', 'Mathematics', 'Quadratic Equations', 'Nature of Roots', 'Medium',
    'The roots of x² − 7x + 10 = 0 are',
    ['5 and 2', '−5 and −2', '7 and 10', '5 and −2'], 0,
    'x² − 7x + 10 = (x − 5)(x − 2) ⇒ x = 5 or 2.'],
  ['Class 10', 'Mathematics', 'Arithmetic Progressions', 'Concept Review', 'Medium',
    'The 10th term of the AP 3, 7, 11, … is',
    ['39', '43', '35', '31'], 0,
    'a₁₀ = 3 + 9 × 4 = 39.'],
  ['Class 10', 'Mathematics', 'Triangles', 'Pythagoras Theorem', 'Easy',
    'A right triangle has legs of 9 cm and 12 cm. The length of the hypotenuse is',
    ['15 cm', '21 cm', '13 cm', '18 cm'], 0,
    '√(9² + 12²) = √225 = 15 cm.'],
  ['Class 10', 'Social Science', 'Nationalism in India', 'Concept Review', 'Easy',
    'Mahatma Gandhi’s Salt March began in the year',
    ['1930', '1919', '1942', '1922'], 0,
    'The Dandi March was launched on 12 March 1930 against the salt monopoly.'],
  ['Class 10', 'Social Science', 'Development', 'Concept Review', 'Medium',
    'Which of the following is the most widely accepted measure of development?',
    ['Per capita income', 'Literacy alone', 'Population density', 'Area of a country'], 0,
    'The Human Development Index blends income, education and health; per capita income remains the classic yardstick.'],
  ['Class 10', 'English', 'Grammar', 'Concept Review', 'Easy',
    'Choose the correct passive form: “He wrote a letter.”',
    ['A letter was written by him.', 'A letter is written by him.', 'A letter has written by him.', 'A letter wrote by him.'], 0,
    'Past simple active becomes “was/were + past participle” in the passive.'],

  // ---------------- Class 12 ----------------
  ['Class 12', 'Physics', 'Electrostatics', "Gauss's Law", 'Medium',
    'The net electric flux through a closed surface enclosing a charge q is',
    ['q/ε₀', 'qε₀', '0', 'q²/ε₀'], 0,
    'Gauss’s law: Φ = q_enclosed/ε₀.'],
  ['Class 12', 'Physics', 'Current Electricity', "Kirchhoff's Laws", 'Medium',
    'Kirchhoff’s first law (junction rule) is a consequence of conservation of',
    ['Charge', 'Energy', 'Momentum', 'Mass'], 0,
    'The algebraic sum of currents at a node is zero because charge cannot accumulate.'],
  ['Class 12', 'Physics', 'Dual Nature of Radiation', 'Concept Review', 'Medium',
    'The de Broglie wavelength of a particle of momentum p is',
    ['h/p', 'p/h', 'hp', 'h²/p'], 0,
    'λ = h/p — the relation that establishes wave–particle duality.'],
  ['Class 12', 'Physics', 'Semiconductor Electronics', 'Concept Review', 'Easy',
    'The majority charge carriers in an n-type semiconductor are',
    ['Electrons', 'Holes', 'Both equally', 'Ions'], 0,
    'Pentavalent donor impurity contributes free electrons as majority carriers.'],
  ['Class 12', 'Chemistry', 'Coordination Compounds', 'Concept Review', 'Medium',
    'The coordination number of cobalt in [Co(en)₃]Cl₃ is',
    ['6', '3', '4', '2'], 0,
    'Each en ligand is bidentate; three en ligands give a coordination number of 6.'],
  ['Class 12', 'Chemistry', 'Biomolecules', 'Concept Review', 'Easy',
    'The pH of human blood is maintained around',
    ['7.4', '6.4', '8.4', '5.4'], 0,
    'The bicarbonate buffer system keeps blood pH close to 7.4.'],
  ['Class 12', 'Chemistry', 'Chemical Kinetics', 'Arrhenius Equation', 'Hard',
    'Increasing the temperature increases the rate of a reaction mainly because',
    ['The fraction of molecules with energy ≥ Ea increases', 'The activation energy decreases', 'The collision diameter decreases', 'The order of reaction increases'], 0,
    'The Maxwell–Boltzmann distribution shifts, so far more molecules cross the activation barrier.'],
  ['Class 12', 'Mathematics', 'Integrals', 'Standard Integrals', 'Medium',
    '∫ dx/(1 + x²) equals',
    ['tan⁻¹x + C', 'sin⁻¹x + C', 'ln|1 + x²| + C', 'sec⁻¹x + C'], 0,
    'This is a standard integral giving the inverse tangent function.'],
  ['Class 12', 'Mathematics', 'Differential Equations', 'Linear Differential Equations', 'Hard',
    'The integrating factor of dy/dx + (2/x) y = x is',
    ['x²', '2x', 'e^{2x}', '1/x²'], 0,
    'IF = e^{∫(2/x)dx} = e^{2 ln x} = x².'],
  ['Class 12', 'Mathematics', 'Probability', 'Bayes Theorem', 'Hard',
    'A bag has 4 red and 6 blue balls. Two balls are drawn one after another without replacement. The probability that both are red is',
    ['2/15', '4/25', '1/5', '1/3'], 0,
    'P = (4/10)(3/9) = 12/90 = 2/15.'],
  ['Class 12', 'Biology', 'Human Physiology', 'Endocrine System', 'Medium',
    'The hormone that lowers blood glucose level is',
    ['Insulin', 'Glucagon', 'Adrenaline', 'Thyroxine'], 0,
    'Insulin from the β-cells of the pancreas promotes glucose uptake and storage.'],
  ['Class 12', 'Biology', 'Biotechnology', 'Concept Review', 'Medium',
    'Ti plasmid used for making transgenic plants is obtained from',
    ['Agrobacterium tumefaciens', 'E. coli', 'Bacillus thuringiensis', 'Saccharomyces cerevisiae'], 0,
    'The tumour-inducing plasmid of Agrobacterium is a natural gene vector for dicots.'],
  ['Class 12', 'Biology', 'Ecology', 'Energy Flow', 'Medium',
    'The 10% law of energy transfer in an ecosystem was proposed by',
    ['Lindeman', 'Darwin', 'Malthus', 'Haeckel'], 0,
    'Raymond Lindeman quantified trophic-level energy transfer at roughly 10%.'],
];

/* ---------------- Parametric (numerical) question templates ---------------- */

interface Template {
  exam: Exam;
  subject: string;
  chapter: string;
  topic: string;
  difficulty: Difficulty;
  params: number[][];
  build: (p: number[]) => { text: string; correct: string; distractors: string[]; exp: string };
}

const TEMPLATES: Template[] = [
  {
    exam: 'JEE', subject: 'Physics', chapter: 'Kinematics', topic: 'Motion in One Dimension', difficulty: 'Easy',
    params: [[2, 5], [3, 4], [4, 3], [1.5, 6], [5, 2], [2, 10]],
    build: ([a, t]) => ({
      text: `A body starting from rest moves with a uniform acceleration of ${a} m/s². Its displacement (in m) after ${t} s is`,
      correct: `${(0.5 * a * t * t).toFixed(1).replace(/\.0$/, '')}`,
      distractors: [`${(a * t).toFixed(1).replace(/\.0$/, '')}`, `${(a * t * t).toFixed(1).replace(/\.0$/, '')}`, `${(2 * a * t).toFixed(1).replace(/\.0$/, '')}`],
      exp: `s = ut + ½at² = 0 + ½ × ${a} × ${t}² = ${(0.5 * a * t * t).toFixed(1).replace(/\.0$/, '')} m.`,
    }),
  },
  {
    exam: 'JEE', subject: 'Physics', chapter: 'Kinematics', topic: 'Projectile Motion', difficulty: 'Medium',
    params: [[20], [30], [40], [50], [60]],
    build: ([u]) => ({
      text: `A ball is projected with a speed of ${u} m/s at 30° to the horizontal. Taking g = 10 m/s², its time of flight (in s) is`,
      correct: `${(u / 10).toFixed(1).replace(/\.0$/, '')}`,
      distractors: [`${(u / 5).toFixed(1).replace(/\.0$/, '')}`, `${(u / 20).toFixed(1).replace(/\.0$/, '')}`, `${(u / 2).toFixed(1).replace(/\.0$/, '')}`],
      exp: `T = 2u sinθ / g = 2 × ${u} × ½ / 10 = ${(u / 10).toFixed(1).replace(/\.0$/, '')} s.`,
    }),
  },
  {
    exam: 'JEE', subject: 'Physics', chapter: 'Work, Energy and Power', topic: 'Power', difficulty: 'Medium',
    params: [[60, 10], [100, 20], [45, 15], [80, 8], [150, 30]],
    build: ([m, t]) => ({
      text: `A crane lifts a load of ${t} kg through a height of ${m} m in 20 s. The power developed is (g = 10 m/s²)`,
      correct: `${(m * t * 10 / 20).toFixed(0)} W`,
      distractors: [`${(m * t * 10).toFixed(0)} W`, `${(m * t * 10 / 40).toFixed(0)} W`, `${(m * t / 20).toFixed(0)} W`],
      exp: `P = mgh/t = ${t} × 10 × ${m} / 20 = ${(m * t * 10 / 20).toFixed(0)} W.`,
    }),
  },
  {
    exam: 'JEE', subject: 'Physics', chapter: 'Current Electricity', topic: 'Resistances in Series and Parallel', difficulty: 'Easy',
    params: [[4, 6], [10, 15], [8, 8], [12, 4], [20, 30]],
    build: ([r1, r2]) => ({
      text: `Two resistors of ${r1} Ω and ${r2} Ω are connected in parallel. The equivalent resistance (in Ω) is`,
      correct: `${((r1 * r2) / (r1 + r2)).toFixed(1).replace(/\.0$/, '')}`,
      distractors: [`${r1 + r2}`, `${Math.abs(r1 - r2)}`, `${(2 * r1 * r2 / (r1 + r2)).toFixed(1).replace(/\.0$/, '')}`],
      exp: `R = R₁R₂/(R₁ + R₂) = ${r1} × ${r2} / ${r1 + r2} = ${((r1 * r2) / (r1 + r2)).toFixed(1).replace(/\.0$/, '')} Ω.`,
    }),
  },
  {
    exam: 'JEE', subject: 'Physics', chapter: 'Thermodynamics', topic: 'Calorimetry', difficulty: 'Medium',
    params: [[1, 20, 40], [2, 10, 30], [0.5, 40, 80], [4, 5, 15], [1.5, 25, 55]],
    build: ([m, t1, t2]) => ({
      text: `${m} kg of water is heated from ${t1} °C to ${t2} °C. The heat supplied is (specific heat of water = 4200 J/kg·K)`,
      correct: `${(m * 4200 * (t2 - t1) / 1000).toFixed(1).replace(/\.0$/, '')} kJ`,
      distractors: [`${(m * 4200 * (t2 - t1)).toFixed(0)} kJ`, `${(m * 4200 * (t2 + t1) / 1000).toFixed(1).replace(/\.0$/, '')} kJ`, `${(m * 42 * (t2 - t1)).toFixed(1).replace(/\.0$/, '')} kJ`],
      exp: `Q = mcΔT = ${m} × 4200 × ${t2 - t1} = ${(m * 4200 * (t2 - t1) / 1000).toFixed(1).replace(/\.0$/, '')} kJ.`,
    }),
  },
  {
    exam: 'JEE', subject: 'Mathematics', chapter: 'Quadratic Equations', topic: 'Nature of Roots', difficulty: 'Easy',
    params: [[1, -6, 8], [1, -8, 15], [1, -10, 24], [1, -5, 6], [1, -9, 20]],
    build: ([, b, c]) => ({
      text: `The sum of the roots of x² ${b < 0 ? '−' : '+'} ${Math.abs(b)}x + ${c} = 0 is`,
      correct: `${-b}`,
      distractors: [`${c}`, `${b}`, `${-c}`],
      exp: `Sum of roots = −b/a = −(${b})/1 = ${-b}.`,
    }),
  },
  {
    exam: 'JEE', subject: 'Mathematics', chapter: 'Sequences and Series', topic: 'Arithmetic Progression', difficulty: 'Easy',
    params: [[2, 5, 10], [7, 4, 12], [10, 3, 20], [1, 6, 15], [5, 8, 9]],
    build: ([a, d, n]) => ({
      text: `The ${n}th term of the arithmetic progression whose first term is ${a} and common difference is ${d} is`,
      correct: `${a + (n - 1) * d}`,
      distractors: [`${a + n * d}`, `${a + (n - 1) * d - d}`, `${a * n}`],
      exp: `aₙ = a + (n − 1)d = ${a} + ${n - 1} × ${d} = ${a + (n - 1) * d}.`,
    }),
  },
  {
    exam: 'JEE', subject: 'Mathematics', chapter: 'Indefinite Integration', topic: 'Standard Integrals', difficulty: 'Medium',
    params: [[3], [5], [7], [4], [6]],
    build: ([n]) => ({
      text: `The value of ∫ x^${n} dx is`,
      correct: `x^${n + 1}/${n + 1} + C`,
      distractors: [`x^${n}/${n} + C`, `${n + 1}x^${n + 1} + C`, `x^${n + 2}/${n + 2} + C`],
      exp: `∫ x^n dx = x^(n+1)/(n+1) + C, so ∫ x^${n} dx = x^${n + 1}/${n + 1} + C.`,
    }),
  },
  {
    exam: 'JEE', subject: 'Mathematics', chapter: 'Probability', topic: 'Random Variables', difficulty: 'Medium',
    params: [[4, 52], [3, 6], [2, 10], [5, 20], [1, 4]],
    build: ([k, n]) => ({
      text: `One item is drawn at random from a set of ${n} items containing ${k} favourable items. The probability of a favourable draw is`,
      correct: `${k}/${n}`,
      distractors: [`${n}/${k}`, `${k}/${n + k}`, `${Math.max(1, n - k)}/${n}`],
      exp: `P = favourable / total = ${k}/${n}.`,
    }),
  },
  {
    exam: 'NEET', subject: 'Physics', chapter: 'Current Electricity', topic: "Ohm's Law", difficulty: 'Easy',
    params: [[10, 2], [12, 4], [6, 3], [20, 5], [9, 3]],
    build: ([v, r]) => ({
      text: `A potential difference of ${v} V is applied across a resistor of ${r} Ω. The current flowing (in A) is`,
      correct: `${(v / r).toFixed(1).replace(/\.0$/, '')}`,
      distractors: [`${v * r}`, `${(v * r / 2).toFixed(1).replace(/\.0$/, '')}`, `${(r / v).toFixed(2)}`],
      exp: `By Ohm’s law I = V/R = ${v}/${r} = ${(v / r).toFixed(1).replace(/\.0$/, '')} A.`,
    }),
  },
  {
    exam: 'NEET', subject: 'Chemistry', chapter: 'Solutions', topic: 'Concentration Terms', difficulty: 'Medium',
    params: [[180, 1000], [58.5, 500], [40, 2000], [98, 500], [111, 1000]],
    build: ([w, v]) => {
      const molarity = w === 180 ? `1.0 (M = 180)` : w === 58.5 ? `2.0 (M = 58.5)` : w === 40 ? `0.5 (M = 40)` : w === 98 ? `2.0 (M = 49)` : `2.0 (M = 55.5)`;
      return {
        text: `${w} g of a solute is dissolved to make ${v} mL of solution. If the molar mass is ${w === 180 ? 180 : w === 58.5 ? 58.5 : w === 40 ? 40 : w === 98 ? 49 : 55.5} g/mol, the molarity is`,
        correct: `${molarity.split(' ')[0]} M`,
        distractors: [`${(Number(molarity.split(' ')[0]) * 2).toFixed(1)} M`, `${(Number(molarity.split(' ')[0]) / 2).toFixed(1)} M`, `0.1 M`],
        exp: `M = (mass / molar mass) × (1000 / volume in mL) — substituting gives ${molarity.split(' ')[0]} M.`,
      };
    },
  },
  {
    exam: 'Class 10', subject: 'Mathematics', chapter: 'Coordinate Geometry', topic: 'Concept Review', difficulty: 'Easy',
    params: [[2, 4, 6, 8], [1, 2, 5, 6], [0, 0, 3, 4], [-2, 3, 4, -1]],
    build: ([x1, y1, x2, y2]) => {
      const d = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      return {
        text: `The distance between the points (${x1}, ${y1}) and (${x2}, ${y2}) is`,
        correct: `${Number.isInteger(d) ? d : d.toFixed(2)} units`,
        distractors: [`${Math.abs(x2 - x1) + Math.abs(y2 - y1)} units`, `${Math.abs(x2 - x1)} units`, `${Math.abs(y2 - y1)} units`],
        exp: `Distance = √[(x₂ − x₁)² + (y₂ − y₁)²] = √[${(x2 - x1) ** 2} + ${(y2 - y1) ** 2}] = ${Number.isInteger(d) ? d : d.toFixed(2)}.`,
      };
    },
  },
];

/** Deterministic pseudo-shuffle so option order is stable across reloads. */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 100000;
  return h;
}

/** Inserts the correct option at a deterministic position (so answers are not always A). */
function buildOptions(correct: string, distractors: string[], seedText: string) {
  const pos = hash(seedText) % 4;
  const options = [...distractors.slice(0, pos), correct, ...distractors.slice(pos)];
  return { options, answer: pos };
}

export function seedQuestions(): Question[] {
  const out: Question[] = [];
  let n = 0;
  const push = (q: Omit<Question, 'id' | 'usage' | 'status' | 'createdAt'>) => {
    n += 1;
    out.push({
      ...q,
      id: `Q-${String(n).padStart(3, '0')}`,
      status: 'Published',
      createdAt: '2025-01-08',
      usage: 40 + ((n * 37) % 260),
    });
  };

  SEEDS.forEach(([exam, subject, chapter, topic, difficulty, text, options, answer, explanation]) => {
    push({ exam, subject, chapter, topic, difficulty, type: 'MCQ', text, options, answer, marks: 4, negative: 1, explanation, createdBy: 'F-001' });
  });

  TEMPLATES.forEach((tpl) => {
    tpl.params.forEach((p) => {
      const built = tpl.build(p);
      const { options, answer } = buildOptions(built.correct, built.distractors, built.text);
      push({
        exam: tpl.exam, subject: tpl.subject, chapter: tpl.chapter, topic: tpl.topic,
        difficulty: tpl.difficulty, type: 'MCQ', text: built.text, options, answer,
        marks: 4, negative: 1, explanation: built.exp, createdBy: 'F-001',
      });
    });
  });

  return out;
}

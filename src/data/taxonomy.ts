import type { Exam } from '../lib/types';

/** Academic taxonomy: exam → subject → chapter → topics. */

export const EXAMS: Exam[] = ['JEE', 'NEET', 'Class 10', 'Class 12', 'MH-CET'];

export const EXAM_META: Record<Exam, { tagline: string; color: string; icon: string }> = {
  JEE: { tagline: 'IIT JEE Main & Advanced', color: 'from-indigo-500 to-violet-600', icon: '⚛️' },
  NEET: { tagline: 'Medical entrance (UG)', color: 'from-teal-500 to-emerald-600', icon: '🧬' },
  'Class 10': { tagline: 'CBSE / ICSE / State Board', color: 'from-amber-500 to-orange-600', icon: '📘' },
  'Class 12': { tagline: 'CBSE / ISC Senior Secondary', color: 'from-sky-500 to-blue-600', icon: '🎓' },
  'MH-CET': { tagline: 'Maharashtra Common Entrance Test', color: 'from-rose-500 to-orange-600', icon: '📚' },
};

export const SUBJECTS: Record<Exam, string[]> = {
  JEE: ['Physics', 'Chemistry', 'Mathematics'],
  NEET: ['Physics', 'Chemistry', 'Botany', 'Zoology'],
  'Class 10': ['Science', 'Mathematics', 'Social Science', 'English'],
  'Class 12': ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
  'MH-CET': ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
};

export const CHAPTERS: Record<string, string[]> = {
  'JEE|Physics': [
    'Kinematics', 'Laws of Motion', 'Work, Energy and Power', 'Rotational Motion',
    'Gravitation', 'Thermodynamics', 'Oscillations and Waves', 'Electrostatics',
    'Current Electricity', 'Magnetic Effects of Current', 'Electromagnetic Induction',
    'Optics', 'Modern Physics', 'Semiconductor Electronics',
  ],
  'JEE|Chemistry': [
    'Some Basic Concepts of Chemistry', 'Atomic Structure', 'Chemical Bonding',
    'Thermodynamics', 'Chemical Equilibrium', 'Redox Reactions', 'Solutions',
    'Electrochemistry', 'Chemical Kinetics', 'p-Block Elements', 'd and f Block Elements',
    'Coordination Compounds', 'Haloalkanes and Haloarenes', 'Alcohols, Phenols and Ethers',
    'Aldehydes, Ketones and Acids', 'Amines', 'Biomolecules',
  ],
  'JEE|Mathematics': [
    'Sets, Relations and Functions', 'Complex Numbers', 'Quadratic Equations',
    'Sequences and Series', 'Binomial Theorem', 'Permutation and Combination',
    'Trigonometry', 'Straight Lines and Circles', 'Conic Sections',
    'Limits and Continuity', 'Differentiation', 'Application of Derivatives',
    'Indefinite Integration', 'Definite Integration', 'Differential Equations',
    'Vectors and 3D Geometry', 'Probability', 'Matrices and Determinants', 'Statistics',
  ],
  'NEET|Physics': [
    'Kinematics', 'Laws of Motion', 'Work, Energy and Power', 'Gravitation',
    'Thermodynamics', 'Oscillations and Waves', 'Electrostatics', 'Current Electricity',
    'Magnetic Effects of Current', 'Electromagnetic Induction', 'Optics', 'Modern Physics',
  ],
  'NEET|Chemistry': [
    'Some Basic Concepts of Chemistry', 'Atomic Structure', 'Chemical Bonding',
    'Thermodynamics', 'Chemical Equilibrium', 'Redox Reactions', 'Solutions',
    'Electrochemistry', 'Chemical Kinetics', 'p-Block Elements',
    'Coordination Compounds', 'Organic Chemistry Basics', 'Amines', 'Biomolecules',
  ],
  'NEET|Botany': [
    'Cell Structure and Function', 'Plant Physiology', 'Genetics', 'Molecular Biology',
    'Ecology and Environment', 'Plant Diversity', 'Reproduction in Plants',
  ],
  'NEET|Zoology': [
    'Human Physiology', 'Human Reproduction', 'Genetics and Evolution',
    'Animal Diversity', 'Structural Organisation in Animals', 'Biotechnology',
  ],
  'Class 10|Science': [
    'Chemical Reactions and Equations', 'Acids, Bases and Salts', 'Metals and Non-metals',
    'Carbon and its Compounds', 'Life Processes', 'Control and Coordination',
    'Reproduction', 'Heredity and Evolution', 'Light', 'Electricity',
    'Magnetic Effects of Electric Current', 'Our Environment',
  ],
  'Class 10|Mathematics': [
    'Real Numbers', 'Polynomials', 'Pair of Linear Equations', 'Quadratic Equations',
    'Arithmetic Progressions', 'Triangles', 'Coordinate Geometry', 'Trigonometry',
    'Circles', 'Surface Areas and Volumes', 'Statistics', 'Probability',
  ],
  'Class 10|Social Science': [
    'The Rise of Nationalism in Europe', 'Nationalism in India', 'Resources and Development',
    'Water Resources', 'Agriculture', 'Manufacturing Industries', 'Power Sharing',
    'Federalism', 'Democracy and Diversity', 'Development', 'Money and Credit',
  ],
  'Class 10|English': [
    'Reading Comprehension', 'Writing Skills', 'Grammar', 'Literature: Prose', 'Literature: Poetry',
  ],
  'Class 12|Physics': [
    'Electrostatics', 'Current Electricity', 'Magnetic Effects of Current',
    'Electromagnetic Induction and AC', 'Electromagnetic Waves', 'Optics',
    'Dual Nature of Radiation', 'Atoms and Nuclei', 'Semiconductor Electronics',
  ],
  'Class 12|Chemistry': [
    'Solutions', 'Electrochemistry', 'Chemical Kinetics', 'd and f Block Elements',
    'Coordination Compounds', 'Haloalkanes and Haloarenes', 'Alcohols, Phenols and Ethers',
    'Aldehydes, Ketones and Acids', 'Amines', 'Biomolecules', 'Polymers',
  ],
  'Class 12|Mathematics': [
    'Relations and Functions', 'Inverse Trigonometric Functions', 'Matrices',
    'Determinants', 'Continuity and Differentiability', 'Application of Derivatives',
    'Integrals', 'Application of Integrals', 'Differential Equations',
    'Vector Algebra', 'Three Dimensional Geometry', 'Probability',
  ],
  'Class 12|Biology': [
    'Reproduction', 'Genetics and Evolution', 'Human Physiology', 'Plant Physiology',
    'Biotechnology', 'Ecology', 'Human Health and Disease',
  ],
};

/** Topic lists for frequently practised chapters; others fall back to generated topics. */
export const TOPICS: Record<string, string[]> = {
  Kinematics: ['Motion in One Dimension', 'Motion in Two Dimensions', 'Relative Velocity', 'Projectile Motion', 'Graphical Analysis'],
  'Laws of Motion': ["Newton's First Law", "Newton's Second Law", "Newton's Third Law", 'Friction', 'Circular Motion'],
  'Work, Energy and Power': ['Work Done by a Force', 'Work-Energy Theorem', 'Conservation of Energy', 'Power', 'Collisions'],
  Gravitation: ["Kepler's Laws", 'Gravitational Potential', 'Escape Velocity', 'Satellite Motion'],
  Thermodynamics: ['First Law of Thermodynamics', 'Heat Engines', 'Entropy', 'Calorimetry', 'Kinetic Theory'],
  Electrostatics: ["Coulomb's Law", 'Electric Field', "Gauss's Law", 'Electric Potential', 'Capacitors'],
  'Current Electricity': ["Ohm's Law", 'Resistances in Series and Parallel', "Kirchhoff's Laws", 'Wheatstone Bridge', 'Electrical Power'],
  Optics: ['Reflection at Plane Surfaces', 'Spherical Mirrors', 'Refraction', 'Total Internal Reflection', 'Lenses', 'Wave Optics'],
  'Modern Physics': ['Photoelectric Effect', 'Atomic Models', 'Radioactivity', 'Nuclear Fission and Fusion'],
  'Atomic Structure': ['Bohr Model', 'Quantum Numbers', 'Electronic Configuration', 'Dual Nature of Matter'],
  'Chemical Bonding': ['Ionic Bonding', 'Covalent Bonding', 'VSEPR Theory', 'Hybridisation', 'Molecular Orbital Theory'],
  'Chemical Equilibrium': ['Law of Mass Action', 'Le Chatelier Principle', 'Ionic Equilibrium', 'Solubility Product', 'Buffer Solutions'],
  'Chemical Kinetics': ['Rate of Reaction', 'Order of Reaction', 'Arrhenius Equation', 'Half Life'],
  Solutions: ['Concentration Terms', "Raoult's Law", 'Colligative Properties', 'Abnormal Molar Mass'],
  Electrochemistry: ['Electrolytic Cells', 'Galvanic Cells', 'Nernst Equation', 'Conductance', 'Corrosion'],
  'Indefinite Integration': ['Integration by Substitution', 'Integration by Parts', 'Partial Fractions', 'Standard Integrals'],
  'Definite Integration': ['Properties of Definite Integrals', 'Area Under Curves', 'Fundamental Theorem'],
  'Differential Equations': ['Formation of Differential Equations', 'Variable Separable Method', 'Linear Differential Equations', 'Homogeneous Equations'],
  Differentiation: ['Chain Rule', 'Product and Quotient Rule', 'Implicit Differentiation', 'Logarithmic Differentiation'],
  'Application of Derivatives': ['Rate of Change', 'Tangents and Normals', 'Maxima and Minima', 'Increasing and Decreasing Functions'],
  'Limits and Continuity': ['Algebraic Limits', 'Limits using L-Hospital Rule', 'Continuity of Functions'],
  'Quadratic Equations': ['Nature of Roots', 'Sum and Product of Roots', 'Quadratic Inequalities', 'Common Roots'],
  'Complex Numbers': ['Modulus and Argument', 'De Moivre Theorem', 'Cube Roots of Unity', 'Locus in Complex Plane'],
  'Sequences and Series': ['Arithmetic Progression', 'Geometric Progression', 'Special Series', 'Harmonic Progression'],
  'Permutation and Combination': ['Fundamental Principle', 'Permutations', 'Combinations', 'Circular Permutations'],
  Probability: ['Conditional Probability', 'Bayes Theorem', 'Random Variables', 'Binomial Distribution'],
  'Matrices and Determinants': ['Matrix Operations', 'Adjoint and Inverse', 'Solving Linear Equations', 'Properties of Determinants'],
  Trigonometry: ['Trigonometric Ratios', 'Identities', 'Equations', 'Inverse Functions', 'Heights and Distances'],
  'Vectors and 3D Geometry': ['Dot Product', 'Cross Product', 'Equation of a Line', 'Equation of a Plane'],
  'Human Physiology': ['Digestion and Absorption', 'Breathing and Respiration', 'Body Fluids and Circulation', 'Excretory Products', 'Neural Control', 'Endocrine System'],
  Genetics: ['Mendelian Inheritance', 'Chromosomal Basis', 'DNA Structure', 'Gene Expression', 'Human Genome Project'],
  'Plant Physiology': ['Photosynthesis', 'Respiration in Plants', 'Plant Growth', 'Transpiration', 'Mineral Nutrition'],
  Ecology: ['Ecosystem Structure', 'Energy Flow', 'Nutrient Cycles', 'Biodiversity', 'Succession'],
  'Light': ['Reflection of Light', 'Spherical Mirrors', 'Refraction of Light', 'Lenses', 'Human Eye'],
  Electricity: ['Electric Current and Circuit', 'Potential Difference', 'Resistance', 'Heating Effect', 'Electric Power'],
  'Acids, Bases and Salts': ['pH Scale', 'Neutralisation', 'Common Salt Chemicals', 'Indicators'],
  'Chemical Reactions and Equations': ['Balancing Equations', 'Types of Reactions', 'Oxidation and Reduction', 'Corrosion'],
  'Real Numbers': ['Euclid Division Lemma', 'Fundamental Theorem of Arithmetic', 'Irrational Numbers', 'Rational Decimals'],
  Polynomials: ['Zeroes of a Polynomial', 'Relationship between Zeroes and Coefficients', 'Division Algorithm'],
  Triangles: ['Similarity of Triangles', 'Basic Proportionality Theorem', 'Pythagoras Theorem', 'Areas of Similar Triangles'],
};

export function chaptersFor(exam: Exam, subject: string): string[] {
  return CHAPTERS[`${exam}|${subject}`] ?? [];
}

export function topicsFor(chapter: string): string[] {
  return TOPICS[chapter] ?? ['Concept Review', 'Formula Application', 'Previous Year Questions', 'Advanced Problems'];
}

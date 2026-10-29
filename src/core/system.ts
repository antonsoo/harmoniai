/**
 * The Greater Perfect System in the diatonic genus: fifteen notes over two octaves, named
 * as Cleonides and the other theorists name them. Index 0 is the lowest in pitch.
 * Glosses follow LSJ (via Logeion) unless marked as a reading of a compound.
 */
export type Step = "T" | "S";

export interface Note {
  index: number;
  greek: string;
  romanized: string;
  english: string;
  /** What the name means, and where that comes from. */
  literal: string;
  source: string;
  /** The modern letter name of the same position on the white keys, from A. */
  letter: string;
  tetrachord: "proslambanomenos" | "hypaton" | "meson" | "mese" | "diezeugmenon" | "hyperbolaion";
}

export const NOTES: Note[] = [
  {
    index: 0,
    greek: "προσλαμβανόμενος",
    romanized: "proslambanomenos",
    english: "the added note",
    literal: "taken in addition: 'the added note at the bottom of the scale'",
    source: "LSJ s.v. προσλαμβάνω",
    letter: "A",
    tetrachord: "proslambanomenos",
  },
  {
    index: 1,
    greek: "ὑπάτη ὑπάτων",
    romanized: "hypatē hypatōn",
    english: "highest of the highest",
    literal: "ὑπάτη: 'the highest of the three strings … but the lowest in pitch'",
    source: "LSJ s.v. ὑπάτη",
    letter: "B",
    tetrachord: "hypaton",
  },
  {
    index: 2,
    greek: "παρυπάτη ὑπάτων",
    romanized: "parhypatē hypatōn",
    english: "next to the highest, of the highest",
    literal: "παρυπάτη: 'string next the ὑπάτη'",
    source: "LSJ s.v. παρυπάτη",
    letter: "c",
    tetrachord: "hypaton",
  },
  {
    index: 3,
    greek: "λιχανὸς ὑπάτων",
    romanized: "lichanos hypatōn",
    english: "forefinger string, of the highest",
    literal:
      "λιχανός: 'licking'; the forefinger, 'from its use in licking up'; 'the string struck with the forefinger'",
    source: "LSJ s.v. λιχανός",
    letter: "d",
    tetrachord: "hypaton",
  },
  {
    index: 4,
    greek: "ὑπάτη μέσων",
    romanized: "hypatē mesōn",
    english: "highest of the middle ones",
    literal: "ὑπάτη, 'highest', in the tetrachord of the middle strings",
    source: "LSJ s.v. ὑπάτη",
    letter: "e",
    tetrachord: "meson",
  },
  {
    index: 5,
    greek: "παρυπάτη μέσων",
    romanized: "parhypatē mesōn",
    english: "next to the highest, of the middle ones",
    literal: "παρυπάτη: 'string next the ὑπάτη'",
    source: "LSJ s.v. παρυπάτη",
    letter: "f",
    tetrachord: "meson",
  },
  {
    index: 6,
    greek: "λιχανὸς μέσων",
    romanized: "lichanos mesōn",
    english: "forefinger string, of the middle ones",
    literal: "λιχανός: 'the string struck with the forefinger'",
    source: "LSJ s.v. λιχανός",
    letter: "g",
    tetrachord: "meson",
  },
  {
    index: 7,
    greek: "μέση",
    romanized: "mesē",
    english: "the middle string",
    literal:
      "'originally the middle string of the seven-stringed (or of an earlier three-stringed) lyre'",
    source: "LSJ s.v. μέση",
    letter: "a",
    tetrachord: "mese",
  },
  {
    index: 8,
    greek: "παραμέση",
    romanized: "paramesē",
    english: "next to the middle",
    literal: "παρά 'beside' + μέση 'middle': the string next above the mesē",
    source: "a reading of the compound; not a separate LSJ lemma",
    letter: "b",
    tetrachord: "diezeugmenon",
  },
  {
    index: 9,
    greek: "τρίτη διεζευγμένων",
    romanized: "tritē diezeugmenōn",
    english: "third, of the disjoined",
    literal: "τρίτη 'third': the third string counting down from the nētē",
    source: "a reading of the name; LSJ s.v. διαζεύγνυμι for 'disjunct'",
    letter: "c'",
    tetrachord: "diezeugmenon",
  },
  {
    index: 10,
    greek: "παρανήτη διεζευγμένων",
    romanized: "paranētē diezeugmenōn",
    english: "next to the lowest, of the disjoined",
    literal: "παρανήτη: 'string next below the νήτη'",
    source: "LSJ s.v. παρανήτη",
    letter: "d'",
    tetrachord: "diezeugmenon",
  },
  {
    index: 11,
    greek: "νήτη διεζευγμένων",
    romanized: "nētē diezeugmenōn",
    english: "lowest of the disjoined",
    literal:
      "νήτη, contracted from νεάτη: 'the lowest of the three strings … but the highest in pitch'",
    source: "LSJ s.v. νεάτη",
    letter: "e'",
    tetrachord: "diezeugmenon",
  },
  {
    index: 12,
    greek: "τρίτη ὑπερβολαίων",
    romanized: "tritē hyperbolaiōn",
    english: "third, of the extra ones",
    literal:
      "ὑπερβολαῖος: 'added, additional'; 'of the highest tetrachord in the two-octave scale'",
    source: "LSJ s.v. ὑπερβολαῖος",
    letter: "f'",
    tetrachord: "hyperbolaion",
  },
  {
    index: 13,
    greek: "παρανήτη ὑπερβολαίων",
    romanized: "paranētē hyperbolaiōn",
    english: "next to the lowest, of the extra ones",
    literal: "παρανήτη: 'string next below the νήτη'",
    source: "LSJ s.v. παρανήτη",
    letter: "g'",
    tetrachord: "hyperbolaion",
  },
  {
    index: 14,
    greek: "νήτη ὑπερβολαίων",
    romanized: "nētē hyperbolaiōn",
    english: "lowest of the extra ones",
    literal: "νήτη: the 'lowest' string, highest in pitch",
    source: "LSJ s.v. νεάτη",
    letter: "a'",
    tetrachord: "hyperbolaion",
  },
];

/** Steps between successive notes, lowest first: diatonic, with the disjunction mesē–paramesē. */
export const STEPS: Step[] = ["T", "S", "T", "T", "S", "T", "T", "T", "S", "T", "T", "S", "T", "T"];

export interface Species {
  /** Cleonides' order: first to seventh. */
  ordinal: number;
  name: string;
  greek: string;
  romanized: string;
  /** Index of the lowest note of the octave, as Cleonides gives it by name. */
  from: number;
  /** Where the two semitones fall, counted from the low end and from the high end (Cleonides). */
  semitone: { fromLow: number; fromHigh: number };
  /** Modern name of the white-key octave on the same letters. */
  modern: string;
  /** The words Cleonides uses for the span. */
  span: string;
  /** Other names he records. */
  alsoCalled?: string;
}

/** Cleonides, Harmonic Introduction 9 (Jan 1895, pp. 197–198). */
export const SPECIES: Species[] = [
  {
    ordinal: 1,
    name: "Mixolydian",
    greek: "μιξολύδιον",
    romanized: "mixolydion",
    from: 1,
    semitone: { fromLow: 1, fromHigh: 4 },
    modern: "Locrian",
    span: "ἀπὸ ὑπάτης ὑπάτων ἐπὶ παραμέσην",
  },
  {
    ordinal: 2,
    name: "Lydian",
    greek: "λύδιον",
    romanized: "lydion",
    from: 2,
    semitone: { fromLow: 3, fromHigh: 1 },
    modern: "Ionian (major)",
    span: "ἀπὸ παρυπάτης ὑπάτων ἐπὶ τρίτην διεζευγμένων",
  },
  {
    ordinal: 3,
    name: "Phrygian",
    greek: "φρύγιον",
    romanized: "phrygion",
    from: 3,
    semitone: { fromLow: 2, fromHigh: 2 },
    modern: "Dorian",
    span: "ἀπὸ λιχανοῦ ὑπάτων ἐπὶ παρανήτην διεζευγμένων",
  },
  {
    ordinal: 4,
    name: "Dorian",
    greek: "δώριον",
    romanized: "dōrion",
    from: 4,
    semitone: { fromLow: 1, fromHigh: 3 },
    modern: "Phrygian",
    span: "ἀπὸ ὑπάτης μέσων ἐπὶ νήτην διεζευγμένων",
  },
  {
    ordinal: 5,
    name: "Hypolydian",
    greek: "ὑπολύδιον",
    romanized: "hypolydion",
    from: 5,
    semitone: { fromLow: 4, fromHigh: 1 },
    modern: "Lydian",
    span: "ἀπὸ παρυπάτης μέσων ἐπὶ τρίτην ὑπερβολαίων",
  },
  {
    ordinal: 6,
    name: "Hypophrygian",
    greek: "ὑποφρύγιον",
    romanized: "hypophrygion",
    from: 6,
    semitone: { fromLow: 3, fromHigh: 2 },
    modern: "Mixolydian",
    span: "ἀπὸ λιχανοῦ μέσων ἐπὶ παρανήτην ὑπερβολαίων",
  },
  {
    ordinal: 7,
    name: "Hypodorian",
    greek: "ὑποδώριον",
    romanized: "hypodōrion",
    from: 7,
    semitone: { fromLow: 2, fromHigh: 3 },
    modern: "Aeolian (natural minor)",
    span: "ἀπὸ μέσης ἐπὶ νήτην ὑπερβολαίων ἢ ἀπὸ προσλαμβανομένου ἐπὶ μέσην",
    alsoCalled: "κοινὸν καὶ λοκριστί: 'common', and 'Locrian'",
  },
];

export function speciesSteps(species: Species): Step[] {
  return STEPS.slice(species.from, species.from + 7);
}

/** Positions (1-based, from the low end) of the semitones in an octave's steps. */
export function semitonePositions(steps: readonly Step[]): number[] {
  return steps.flatMap((s, i) => (s === "S" ? [i + 1] : []));
}

export type Tuning = "pythagorean" | "aristoxenian";

/** Size of a step in cents: Pythagorean 9:8 and 256:243, or Aristoxenus's tone and half-tone. */
export function stepCents(step: Step, tuning: Tuning): number {
  if (tuning === "aristoxenian") return step === "T" ? 200 : 100;
  return step === "T" ? 1200 * Math.log2(9 / 8) : 1200 * Math.log2(256 / 243);
}

/** Frequency of each note, with the mesē at `mese` hertz. */
export function frequencies(tuning: Tuning, mese = 220): number[] {
  const cents = [0];
  for (const step of STEPS) cents.push((cents.at(-1) ?? 0) + stepCents(step, tuning));
  const meseCents = cents[7] ?? 0;
  return cents.map((c) => mese * 2 ** ((c - meseCents) / 1200));
}

/** Words of Greek music theory, glossed from LSJ (via Logeion). */
export interface Word {
  greek: string;
  romanized: string;
  meaning: string;
  note: string;
  source: string;
}

export const WORDS: Word[] = [
  {
    greek: "ἁρμονία",
    romanized: "harmonia",
    meaning:
      "a means of joining, a fastening; then the stringing of an instrument; a musical scale",
    note: "In the Odyssey the word is used of the joints that hold Odysseus's raft together. A harmonia was first a fit of parts, then a way of tuning strings.",
    source: "LSJ: Od. 5.248; Heraclitus 51; Philolaus 6",
  },
  {
    greek: "τόνος",
    romanized: "tonos",
    meaning:
      "that by which a thing is stretched: a cord, a brace, the cords of a bed; tension; pitch",
    note: "A tone is a stretching. The same word names the cords of a bed and the pitch of a voice.",
    source: "LSJ s.v. τόνος",
  },
  {
    greek: "διὰ πασῶν",
    romanized: "dia pasōn",
    meaning: "'through all [the strings]': the concord of the first and last notes, the octave",
    note: "English 'diapason' comes from it. Cleonides' octave species are εἴδη τοῦ διὰ πασῶν, 'forms of the through-all'.",
    source: "LSJ s.v. διαπασῶν; Plato, Republic 432a",
  },
  {
    greek: "ἡμιτόνιον",
    romanized: "hēmitonion",
    meaning: "semitone; also half the skein of gut in a torsion catapult",
    note: "Vitruvius tells architects to learn music for exactly this: the twisted sinew in the left and right half-tones of a catapult is not wedged until both sound the same note to the craftsman's ear, or the shot flies crooked.",
    source: "LSJ s.v. ἡμιτόνιον; Vitruvius I.1.8",
  },
  {
    greek: "τετράχορδον",
    romanized: "tetrachordon",
    meaning:
      "four-stringed; a tetrachord, 'a scale of four notes, comprising two tones and a half'",
    note: "The building block of the system: four notes spanning a fourth. The fifteen notes are four tetrachords and one added note.",
    source: "LSJ s.v. τετράχορδος",
  },
  {
    greek: "διάτονος",
    romanized: "diatonos",
    meaning:
      "on the stretch, vehement; in a wall, a bonding course running through; in music, the diatonic genus",
    note: "The genus of tones and semitones heard on this page. Greek theory also had chromatic and enharmonic genera with smaller steps.",
    source: "LSJ s.v. διάτονος",
  },
  {
    greek: "λύρα",
    romanized: "lyra",
    meaning:
      "lyre, 'a stringed instrument with a sounding-board formed of the shell of a tortoise'",
    note: "Euripides speaks of the 'seven-toned lyre'. The middle of seven strings is the origin of the name mesē.",
    source: "LSJ s.v. λύρα; Euripides, Iphigenia in Tauris 1129",
  },
  {
    greek: "κιθάρα",
    romanized: "kithara",
    meaning: "lyre; the large concert instrument of professional players",
    note: "Herodotus uses it of Arion, who sang to the kithara before leaping from the ship.",
    source: "LSJ s.v. κιθάρα; Herodotus 1.24",
  },
  {
    greek: "Δωριστί",
    romanized: "Dōristi",
    meaning: "in Dorian fashion; in the Dorian dialect; in the Dorian mode",
    note: "The names of the harmoniai are adverbs of people and place. The same word says how a man lives, which dialect he speaks, and how a song is tuned.",
    source: "LSJ: Plato, Letter 7 336c; Callimachus, Iambi; Aristotle, Politics 1340b4",
  },
  {
    greek: "Φρυγιστί",
    romanized: "Phrygisti",
    meaning: "in the Phrygian mode",
    note: "Phrygia was inland Anatolia. Aristotle says the Phrygian harmonia makes listeners ἐνθουσιαστικοί, possessed by a god.",
    source: "LSJ: Plato, Republic 399a; Aristotle, Politics 1340b5, 1342b6",
  },
  {
    greek: "Λυδιστί",
    romanized: "Lydisti",
    meaning: "after the Lydian fashion; in the Lydian mode",
    note: "Lydia was the kingdom of Croesus, in western Anatolia. Plato calls some Lydian harmoniai 'slack' and fit for drinking parties.",
    source: "LSJ: Cratinus 256; Plato, Laches 188d, Republic 398e",
  },
  {
    greek: "Ἰαστί",
    romanized: "Iasti",
    meaning: "in the Ionian mode; in the Ionic dialect",
    note: "Ionia was the Greek coast of Anatolia. Like Dorian, the word names both a dialect and a harmonia.",
    source: "LSJ: Pratinas 5; Plato, Republic 398e",
  },
  {
    greek: "Λοκριστί",
    romanized: "Lokristi",
    meaning: "in Locrian manner: ἡ Λ. ἁρμονία, the Locrian harmonia",
    note: "Locris was in central Greece. Cleonides gives Locrian as another name for his seventh species, A to a; today 'Locrian' means B to b.",
    source: "LSJ: Athenaeus 14.625e; Cleonides 9",
  },
  {
    greek: "μιξολυδιστί",
    romanized: "mixolydisti",
    meaning: "in the mixolydian mode: 'mixed Lydian'",
    note: "Plato counts it among the mournful harmoniai; Aristotle says it makes listeners mournful and tense.",
    source: "LSJ: Plato, Republic 398e; Aristotle, Politics 1340b1",
  },
];

/** Cleonides 9, Jan 1895 p. 198 lines 14–19. Initial case normalized;
 * excerpt boundaries marked in the UI. These are his diatonic descriptions. */
export const DIATONIC_READINGS: Record<string, { greek: string; english: string }> = {
  Mixolydian: {
    greek:
      "πρῶτον μέν ἐστιν εἶδος τὸ διὰ πασῶν, οὗ πρῶτον μὲν ἐπὶ τὸ βαρύ, τέταρτον δὲ ἐπὶ τὸ ὀξύ ἐστι τὸ ἡμιτόνιον",
    english:
      "The first species of the octave is the one whose semitone is first toward the low end and fourth toward the high end.",
  },
  Lydian: {
    greek: "δεύτερον δὲ οὗ τρίτον μὲν ἐπὶ τὸ βαρύ, πρῶτον δὲ ἐπὶ τὸ ὀξύ",
    english:
      "The second: the one whose [semitone is] third toward the low end and first toward the high end.",
  },
  Phrygian: {
    greek: "τρίτον δὲ οὗ δεύτερον ἐφ’ ἑκάτερα",
    english: "The third: the one whose [semitone is] second from either end.",
  },
  Dorian: {
    greek: "τέταρτον δὲ οὗ πρῶτον μὲν ἐπὶ τὸ βαρύ, τρίτον δὲ ἐπὶ τὸ ὀξύ",
    english:
      "The fourth: the one whose [semitone is] first toward the low end and third toward the high end.",
  },
};

export const GENUS_BRIDGE = {
  greek:
    "ἔστι δὲ καὶ ταῦτα ἀπὸ τῶν αὐτῶν φθόγγων ἐπὶ τοὺς αὐτοὺς καθάπερ ἐπὶ τῆς ἁρμονίας καὶ τοῦ χρώματος καὶ ἐκαλεῖτο τοῖς αὐτοῖς ὀνόμασιν.",
  english:
    "These too run from the same notes to the same notes as in the enharmonic and chromatic, and were called by the same names.",
};
export const MODERN_SOURCE = "https://odp.library.tamu.edu/stepstomusictheory/chapter/modes/";

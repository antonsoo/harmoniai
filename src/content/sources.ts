/**
 * Quotations, each from the edition named, with new and deliberately literal English.
 * Greek follows the printed text as published: Jan's Musici scriptores Graeci (Leipzig
 * 1895) for Cleonides, checked against the page images; Burnet (1903) for Plato and Ross
 * (1957) for Aristotle, as published by the Perseus Digital Library.
 */
export interface Passage {
  id: string;
  greek: string;
  english: string;
  cite: string;
  url: string;
}

const JAN = "https://archive.org/details/musiciscriptoresjank";

export const CLEONIDES_SPECIES: Record<number, Passage> = {
  1: {
    id: "c1",
    greek:
      "πρῶτον μὲν … ἔστι δὲ ἀπὸ ὑπάτης ὑπάτων ἐπὶ παραμέσην, ἐκαλεῖτο δὲ ὑπὸ τῶν ἀρχαίων μιξολύδιον.",
    english: "The first … runs from hypatē hypatōn to paramesē; the ancients called it Mixolydian.",
    cite: "Cleonides, Harmonic Introduction 9; Jan 1895, p. 197",
    url: JAN,
  },
  2: {
    id: "c2",
    greek: "δεύτερον … ἔστι δὲ ἀπὸ παρυπάτης ὑπάτων ἐπὶ τρίτην διεζευγμένων, ἐκαλεῖτο δὲ λύδιον.",
    english:
      "The second … runs from parhypatē hypatōn to tritē diezeugmenōn; it was called Lydian.",
    cite: "Cleonides, Harmonic Introduction 9; Jan 1895, p. 197",
    url: JAN,
  },
  3: {
    id: "c3",
    greek: "τρίτον … ἔστι δὲ ἀπὸ λιχανοῦ ὑπάτων ἐπὶ παρανήτην διεζευγμένων, ἐκαλεῖτο δὲ φρύγιον.",
    english:
      "The third … runs from lichanos hypatōn to paranētē diezeugmenōn; it was called Phrygian.",
    cite: "Cleonides, Harmonic Introduction 9; Jan 1895, p. 197",
    url: JAN,
  },
  4: {
    id: "c4",
    greek: "τέταρτον … ἔστι δὲ ἀπὸ ὑπάτης μέσων ἐπὶ νήτην διεζευγμένων, ἐκαλεῖτο δὲ δώριον.",
    english: "The fourth … runs from hypatē mesōn to nētē diezeugmenōn; it was called Dorian.",
    cite: "Cleonides, Harmonic Introduction 9; Jan 1895, pp. 197–198",
    url: JAN,
  },
  5: {
    id: "c5",
    greek: "πέμπτον … ἔστι δὲ ἀπὸ παρυπάτης μέσων ἐπὶ τρίτην ὑπερβολαίων, ἐκαλεῖτο δὲ ὑπολύδιον.",
    english:
      "The fifth … runs from parhypatē mesōn to tritē hyperbolaiōn; it was called Hypolydian.",
    cite: "Cleonides, Harmonic Introduction 9; Jan 1895, p. 198",
    url: JAN,
  },
  6: {
    id: "c6",
    greek: "ἕκτον … ἔστι δὲ ἀπὸ λιχανοῦ μέσων ἐπὶ παρανήτην ὑπερβολαίων, ἐκαλεῖτο δὲ ὑποφρύγιον.",
    english:
      "The sixth … runs from lichanos mesōn to paranētē hyperbolaiōn; it was called Hypophrygian.",
    cite: "Cleonides, Harmonic Introduction 9; Jan 1895, p. 198",
    url: JAN,
  },
  7: {
    id: "c7",
    greek:
      "ἕβδομον … ἔστι δὲ ἀπὸ μέσης ἐπὶ νήτην ὑπερβολαίων ἢ ἀπὸ προσλαμβανομένου ἐπὶ μέσην· ἐκαλεῖτο δὲ κοινὸν καὶ λοκριστὶ καὶ ὑποδώριον.",
    english:
      "The seventh … runs from mesē to nētē hyperbolaiōn, or from proslambanomenos to mesē; it was called 'common', and Locrian, and Hypodorian.",
    cite: "Cleonides, Harmonic Introduction 9; Jan 1895, p. 198",
    url: JAN,
  },
};

export const CLEONIDES_DIATONIC: Passage = {
  id: "diatonic",
  greek:
    "Ἐν δὲ διατόνῳ πρῶτον μέν ἐστιν εἶδος τὸ διὰ πασῶν, οὗ πρῶτον μὲν ἐπὶ τὸ βαρύ, τέταρτον δὲ ἐπὶ τὸ ὀξύ ἐστι τὸ ἡμιτόνιον· δεύτερον δὲ οὗ τρίτον μὲν ἐπὶ τὸ βαρύ, πρῶτον δὲ ἐπὶ τὸ ὀξύ· τρίτον δὲ οὗ δεύτερον ἐφ᾽ ἑκάτερα …",
  english:
    "In the diatonic, the first species of the octave is the one whose semitone is first at the low end and fourth at the high end; the second, third at the low end and first at the high; the third, second from either end …",
  cite: "Cleonides, Harmonic Introduction 9; Jan 1895, p. 198",
  url: JAN,
};

export const PLATO: Passage = {
  id: "plato",
  greek:
    "τίνες οὖν θρηνώδεις ἁρμονίαι; λέγε μοι· σὺ γὰρ μουσικός. — μειξολυδιστί, ἔφη, καὶ συντονολυδιστὶ καὶ τοιαῦταί τινες. … τίνες οὖν μαλακαί τε καὶ συμποτικαὶ τῶν ἁρμονιῶν; — ἰαστί, ἦ δ᾽ ὅς, καὶ λυδιστὶ αὖ τινες χαλαραὶ καλοῦνται. — ταύταις οὖν, ὦ φίλε, ἐπὶ πολεμικῶν ἀνδρῶν ἔσθ᾽ ὅτι χρήσῃ; — οὐδαμῶς, ἔφη· ἀλλὰ κινδυνεύει σοι δωριστὶ λείπεσθαι καὶ φρυγιστί. — οὐκ οἶδα, ἔφην ἐγώ, τὰς ἁρμονίας …",
  english:
    "'Which harmoniai are the mournful ones? Tell me; you're the musician.' 'Mixolydian,' he said, 'and tense Lydian, and others like them.' … 'And which are soft and fit for drinking parties?' 'Ionian,' he said, 'and Lydian; some are called slack.' 'Will you have any use for these, my friend, for men at war?' 'None at all. It looks as if you are left with Dorian and Phrygian.' 'I don't know the harmoniai,' I said …",
  cite: "Plato, Republic III, 398e–399a (Burnet)",
  url: "https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.01.0167:book=3:section=398e",
};

export const ARISTOTLE: Passage = {
  id: "aristotle",
  greek:
    "εὐθὺς γὰρ ἡ τῶν ἁρμονιῶν διέστηκε φύσις, ὥστε ἀκούοντας ἄλλως διατίθεσθαι … ἀλλὰ πρὸς μὲν ἐνίας ὀδυρτικωτέρως καὶ συνεστηκότως μᾶλλον, οἷον πρὸς τὴν μιξολυδιστὶ καλουμένην, πρὸς δὲ τὰς μαλακωτέρως τὴν διάνοιαν, οἷον πρὸς τὰς ἀνειμένας, μέσως δὲ καὶ καθεστηκότως μάλιστα πρὸς ἑτέραν, οἷον δοκεῖ ποιεῖν ἡ δωριστὶ μόνη τῶν ἁρμονιῶν, ἐνθουσιαστικοὺς δ᾽ ἡ φρυγιστί.",
  english:
    "The nature of the harmoniai differs from the start, so that listeners are affected differently by each: by some, like the one called Mixolydian, more mournfully and with more constraint; by others, the slack ones, more softly in mind; most of all in a middle and settled way by another, as the Dorian alone of the harmoniai seems to do; while the Phrygian makes them inspired.",
  cite: "Aristotle, Politics VIII, 1340a40–b5 (Ross)",
  url: "https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.01.0057:book=8:section=1340b",
};

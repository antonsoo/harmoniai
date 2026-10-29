/**
 * Nāṭyaśāstra 28, as printed in Kāvyamālā 42 (ed. Śivadatta and K. P. Parab, Nirṇaya Sāgara
 * Press, Bombay 1894; public domain), read against the page images. A footnote on its p. 301
 * says the chapter was taken over from J. Grosset's 1888 edition, which brackets the
 * two-vīṇā demonstration as doubtful. The same scan holds an earlier setting of pp. 297–304
 * without that footnote (physical PDF pages 300–307); EARLIER_SETTING quotes it.
 * Transliteration is IAST; translations are new. Verse numbers are the Kāvyamālā's (and
 * Grosset's); Ghosh's 1961 translation numbers the śruti verses one lower.
 */
import type { Stage, Svara } from "../core/sruti";

export const EDITION =
  "Nāṭyaśāstra, ed. Śivadatta and K. P. Parab, Kāvyamālā 42 (Bombay: Nirṇaya Sāgara Press, 1894)";
export const EDITION_URL =
  "https://archive.org/details/natyasastrakasinathpandurangparabpanditsivadattanirnayasagarpresskm42mula";

export interface Line {
  deva: string;
  iast: string;
  english: string;
  cite: string;
}

export const SVARA_NAMES: Record<
  Svara,
  { iast: string; deva: string; short: string; abbr: string }
> = {
  sa: { iast: "ṣaḍja", deva: "षड्ज", short: "स", abbr: "sa" },
  ri: { iast: "ṛṣabha", deva: "ऋषभ", short: "रि", abbr: "ri" },
  ga: { iast: "gāndhāra", deva: "गान्धार", short: "ग", abbr: "ga" },
  ma: { iast: "madhyama", deva: "मध्यम", short: "म", abbr: "ma" },
  pa: { iast: "pañcama", deva: "पञ्चम", short: "प", abbr: "pa" },
  dha: { iast: "dhaivata", deva: "धैवत", short: "ध", abbr: "dha" },
  ni: { iast: "niṣāda", deva: "निषाद", short: "नि", abbr: "ni" },
};

export const SRUTI_VERSE: Line = {
  deva: "तिस्रो द्वे च चतस्रश्च चतस्रस्तिस्र एव च ।\nद्वे चतस्रश्च षड्जाख्ये ग्रामे श्रुतिनिदर्शनम् ॥",
  iast: "tisro dve ca catasraś ca catasras tisra eva ca |\ndve catasraś ca ṣaḍjākhye grāme śrutinidarśanam ||",
  english:
    "Three, two and four, four and three, two and four: the śrutis shown for the grāma named after ṣaḍja.",
  cite: "28.25, p. 304. The count starts from ṛṣabha and ends with ṣaḍja's four.",
};

export const PRAMANA: Line = {
  deva: "मध्यमग्रामे तु श्रुत्यपकृष्टः पञ्चमः कार्यः । पञ्चमश्रुत्युत्कर्षादपकर्षाद्वा यदन्तरं मार्दवादायतत्वाद्वा तत्प्रमाणश्रुतिः । निदर्शनं त्वासामभिव्याख्यास्यामः ।",
  iast: "madhyamagrāme tu śrutyapakṛṣṭaḥ pañcamaḥ kāryaḥ | pañcamaśrutyutkarṣād apakarṣād vā yad antaraṃ mārdavād āyatatvād vā tat pramāṇaśrutiḥ | nidarśanaṃ tv āsām abhivyākhyāsyāmaḥ |",
  english:
    "In the madhyama-grāma, though, the pañcama is to be set a śruti lower. The interval made by raising or lowering the pañcama a śruti, by slackening the string or stretching it, is the standard śruti. Now we shall explain how the śrutis are shown.",
  cite: "28, prose after verse 25, p. 304",
};

/** The demonstration, cut at each stage of the movable vīṇā. */
export const DEMONSTRATION: Record<Stage, Line & { title: string }> = {
  0: {
    title: "Two vīṇās, tuned alike",
    deva: "द्वे वीणे तुल्यप्रमाणतन्त्र्युपवादनदण्डमूर्च्छने षड्जग्रामाश्रिते कार्ये ।",
    iast: "dve vīṇe tulyapramāṇatantryupavādanadaṇḍamūrcchane ṣaḍjagrāmāśrite kārye |",
    english:
      "Two vīṇās, alike in size, strings, playing, neck and mūrcchanā, are to be set in the ṣaḍja-grāma.",
    cite: "p. 304",
  },
  pa: {
    title: "Lower one pañcama",
    deva: "तयोरेकतरस्यां मध्यमग्रामिकीं कृत्वा पञ्चमस्यापकर्षे श्रुतिं",
    iast: "tayor ekatarasyāṃ madhyamagrāmikīṃ kṛtvā pañcamasyāpakarṣe śrutiṃ",
    english: "In one of the two, make the madhyama-grāma by lowering the pañcama a śruti;",
    cite: "p. 304",
  },
  1: {
    title: "Retune to that pañcama",
    deva: "तामेव पञ्चमवशात्षड्जग्रामिकीं कुर्यात् । एवं श्रुतिरपकृष्टा भवति ।",
    iast: "tām eva pañcamavaśāt ṣaḍjagrāmikīṃ kuryāt | evaṃ śrutir apakṛṣṭā bhavati |",
    english:
      "then make that same vīṇā ṣaḍja-grāma again, by its pañcama. In this way a śruti has been lowered.",
    cite: "p. 304",
  },
  2: {
    title: "Lower again: two meet",
    deva: "पुनरपि तद्वदेवापकर्षाद्गान्धारनिषादवन्तावितरस्यां धैवतर्षभौ प्रविशतो द्विश्रुत्यधिकत्वात् ।",
    iast: "punar api tadvad evāpakarṣād gāndhāraniṣādavantāv itarasyāṃ dhaivatarṣabhau praviśato dviśrutyadhikatvāt |",
    english:
      "Lower it again in the same way, and its gāndhāra and niṣāda enter the dhaivata and ṛṣabha of the other, since they stood two śrutis higher.",
    cite: "p. 304",
  },
  3: {
    title: "Lower again: two more",
    deva: "पुनस्तद्वदेवापकर्षाद्धैवतर्षभावितरस्यां पञ्चमषड्जौ प्रविशतः श्रुत्यधिकत्वात् ।",
    iast: "punas tadvad evāpakarṣād dhaivatarṣabhāv itarasyāṃ pañcamaṣaḍjau praviśataḥ śrutyadhikatvāt |",
    english:
      "Lower it again in the same way, and its dhaivata and ṛṣabha enter the pañcama and ṣaḍja of the other, since they stood a śruti [read: three śrutis] higher.",
    cite: "p. 304",
  },
  4: {
    title: "Lower again: the last three",
    deva: "तद्वत्पुनरपकृष्टायां तस्यां पञ्चममध्यमषड्जा इतरस्यां मध्यमगान्धारनिषादवन्तः प्रवेक्ष्यन्ति चतुःश्रुत्यधिकत्वात् । एवमनेन श्रुतिनिदर्शनेन द्वैग्रामिक्यो द्वाविंशतिश्रुतयः प्रत्यवगन्तव्याः ।",
    iast: "tadvat punar apakṛṣṭāyāṃ tasyāṃ pañcamamadhyamaṣaḍjā itarasyāṃ madhyamagāndhāraniṣādavantaḥ pravekṣyanti catuḥśrutyadhikatvāt | evam anena śrutinidarśanena dvaigrāmikyo dvāviṃśatiśrutayaḥ pratyavagantavyāḥ |",
    english:
      "When it is lowered once more in the same way, its pañcama, madhyama and ṣaḍja will enter the madhyama, gāndhāra and niṣāda of the other, since they stood four śrutis higher. By this showing of the śrutis, then, the twenty-two śrutis of the two grāmas are to be understood.",
    cite: "p. 304",
  },
};

/** The demonstration in the earlier setting of p. 301: no three-śruti lowering. */
export const EARLIER_SETTING: Line = {
  deva: "पुनरपि तद्वदेवापकर्षयेत् । यथा — गान्धारनिषादवन्तावितरस्यामृषभधैवतौ प्रवेक्ष्यतो द्विश्रुत्यभ्यधिकत्वात् । तद्वत्पुनरपकृष्टायां तस्यां पञ्चममध्यमषड्जा इतरस्यां मध्यमगान्धारनिषादवन्तः प्रवेक्ष्यन्ति चतुःश्रुत्यभ्यधिकत्वात् ।",
  iast: "punar api tadvad evāpakarṣayet | yathā — gāndhāraniṣādavantāv itarasyām ṛṣabhadhaivatau pravekṣyato dviśrutyabhyadhikatvāt | tadvat punar apakṛṣṭāyāṃ tasyāṃ pañcamamadhyamaṣaḍjā itarasyāṃ madhyamagāndhāraniṣādavantaḥ pravekṣyanti catuḥśrutyabhyadhikatvāt |",
  english:
    "Let him lower it again in the same way. Thus its gāndhāra and niṣāda will enter the ṛṣabha and dhaivata of the other, since they stand two śrutis higher. When it is lowered again in the same way, its pañcama, madhyama and ṣaḍja will enter the madhyama, gāndhāra and niṣāda of the other, since they stand four śrutis higher.",
  cite: "28, earlier setting of p. 301 (physical PDF page 304 of the scan)",
};

export const CONSONANCE: Line = {
  deva: "ययोश्च नवत्रयोदशकं परस्परतः श्रुत्यन्तरे तावन्योन्यसंवादिनौ । यथा — षड्जपञ्चमौ ऋषभधैवतौ गान्धारनिषादवन्तौ षड्जमध्यमाविति षड्जग्रामे । मध्यमग्रामेऽप्येवमेव षड्जपञ्चमवर्ज्यं पञ्चमर्षभयोश्चात्र संवाद इति ।",
  iast: "yayoś ca navatrayodaśakaṃ parasparataḥ śrutyantare tāv anyonyasaṃvādinau | yathā — ṣaḍjapañcamau ṛṣabhadhaivatau gāndhāraniṣādavantau ṣaḍjamadhyamāv iti ṣaḍjagrāme | madhyamagrāme 'py evam eva ṣaḍjapañcamavarjyaṃ pañcamarṣabhayoś cātra saṃvāda iti |",
  english:
    "Two notes nine or thirteen śrutis apart are consonant with each other: in the ṣaḍja-grāma, for example, ṣaḍja and pañcama, ṛṣabha and dhaivata, gāndhāra and niṣāda, ṣaḍja and madhyama. In the madhyama-grāma it is the same, except ṣaḍja and pañcama; there pañcama and ṛṣabha are consonant.",
  cite: "28, prose after verse 23, p. 303",
};

export const FIRST_NOTES: Line = {
  deva: "तत्र षड्जग्रामे — षड्जेनोत्तरमन्द्रा, निषादेन रजनी, धैवतेनोत्तरायता, पञ्चमेन शुद्धषड्जा, मध्यमेन मत्सरीकृता, गान्धारेणाश्वक्रान्ता, ऋषभेणाभिरुद्गता, इति । अथ मध्यमग्रामे — मध्यमेन सौवीरी, गान्धारेण हरिणाश्वा, ऋषभेण कलोपनता, षड्जेन शुद्धमध्यमा, निषादेन मार्गी, धैवतेन पौरवी, पञ्चमेन हृष्यका, इति ।",
  iast: "tatra ṣaḍjagrāme — ṣaḍjenottaramandrā, niṣādena rajanī, dhaivatenottarāyatā, pañcamena śuddhaṣaḍjā, madhyamena matsarīkṛtā, gāndhāreṇāśvakrāntā, ṛṣabheṇābhirudgatā, iti | atha madhyamagrāme — madhyamena sauvīrī, gāndhāreṇa hariṇāśvā, ṛṣabheṇa kalopanatā, ṣaḍjena śuddhamadhyamā, niṣādena mārgī, dhaivatena pauravī, pañcamena hṛṣyakā, iti |",
  english:
    "In the ṣaḍja-grāma: uttaramandrā with ṣaḍja, rajanī with niṣāda, uttarāyatā with dhaivata, śuddhaṣaḍjā with pañcama, matsarīkṛtā with madhyama, aśvakrāntā with gāndhāra, abhirudgatā with ṛṣabha. In the madhyama-grāma: sauvīrī with madhyama, hariṇāśvā with gāndhāra, kalopanatā with ṛṣabha, śuddhamadhyamā with ṣaḍja, mārgī with niṣāda, pauravī with dhaivata, hṛṣyakā with pañcama.",
  cite: "28, prose after verse 33, p. 305. The verse calls the fourth śuddhamadhyā.",
};

export const FINGERS: Line = {
  deva: "कोणवाद्या विपञ्ची स्याच्चित्रा चाङ्गुलिवादनात् ॥",
  iast: "koṇavādyā vipañcī syāc citrā cāṅgulivādanāt ||",
  english: "The vipañcī is played with a plectrum, the citrā with the fingers.",
  cite: "29.124b, p. 328",
};

export interface SanskritWord {
  deva: string;
  iast: string;
  /** Monier-Williams, quoted. */
  senses: string[];
  note: string;
  page: number;
}

/** Senses quoted from Monier-Williams, A Sanskrit-English Dictionary (1899), via the Cologne Digital Sanskrit Dictionaries. */
export const SANSKRIT_WORDS: SanskritWord[] = [
  {
    deva: "श्रुति",
    iast: "śruti",
    senses: [
      "hearing, listening",
      "(in music) a particular division of the octave, a quarter tone or interval (twenty-two of these are enumerated, four constituting a major tone, three a minor, and two a semitone; they are said to be personified as nymphs)",
    ],
    note: "From śru, 'hear'. The same word names the Veda as heard revelation.",
    page: 1101,
  },
  {
    deva: "स्वर",
    iast: "svara",
    senses: ["sound, noise", "voice", "a note of the musical scale"],
    note: "Also the vowels and the accents of Vedic recitation.",
    page: 1285,
  },
  {
    deva: "ग्राम",
    iast: "grāma",
    senses: ["an inhabited place, village, hamlet", "a number of tones, scale, gamut"],
    note: "MW also gives 'a multitude, class, collection': a grāma is a set of notes.",
    page: 373,
  },
  {
    deva: "मूर्छना",
    iast: "mūrchanā",
    senses: [
      "fainting, swooning",
      "(in music) modulation, melody, a regulated rise or fall of sounds through the Grāma or musical scale",
    ],
    note: "From mūrch, which MW glosses both 'to become solid, thicken' and 'to faint'. The 1894 edition prints both mūrchanā and mūrcchanā.",
    page: 823,
  },
  {
    deva: "षड्ज",
    iast: "ṣaḍja",
    senses: [
      "'six-born' … so called because it is supposed to be produced by six organs, viz. tongue, teeth, palate, nose, throat, and chest",
    ],
    note: "The first note: sa. MW adds that its sound 'is said to resemble the note of peacocks'.",
    page: 1109,
  },
  {
    deva: "ऋषभ",
    iast: "ṛṣabha",
    senses: ["a bull", "the second of the seven notes of the Hindū gamut"],
    note: "Abbreviated ri.",
    page: 226,
  },
  {
    deva: "गान्धार",
    iast: "gāndhāra",
    senses: [
      "the third of the 7 primary notes of music",
      "pl. N. of a people and of their country (north-east of Peshawar …)",
    ],
    note: "The same word names a note and a people, as Dorian and Lydian do in Greek.",
    page: 353,
  },
  {
    deva: "मध्यम",
    iast: "madhyama",
    senses: ["middle", "(in music) the 4th or 5th note"],
    note: "Greek has the same idea: μέση, 'the middle string'.",
    page: 782,
  },
  {
    deva: "पञ्चम",
    iast: "pañcama",
    senses: ["the fifth", "(in music) the 5th (later 7th) note of the gamut"],
    note: "Counted from ṣaḍja it is the fifth note; thirteen śrutis up, the consonant pair of ṣaḍja.",
    page: 578,
  },
  {
    deva: "धैवत",
    iast: "dhaivata",
    senses: ["the sixth note of the gamut"],
    note: "Abbreviated dha.",
    page: 520,
  },
  {
    deva: "निषाद",
    iast: "niṣāda",
    senses: ["(in music) N. of the first (more properly the last or 7th) note of the gamut"],
    note: "Also the name of a people in Vedic and epic texts (MW).",
    page: 561,
  },
  {
    deva: "सौवीरी",
    iast: "sauvīrī",
    senses: [
      "Sauvīra: N. of a people inhabiting a district in the neighbourhood of the Indus",
      "(in music) a partic. Mūrchanā",
    ],
    note: "The first mūrcchanā of the madhyama-grāma shares a people's name too.",
    page: 1255,
  },
  {
    deva: "पौरवी",
    iast: "pauravī",
    senses: [
      "Paurava: N. of a people in the north or north-east of India",
      "(in music) N. of a Mūrchanā or a Rāga",
    ],
    note: "The sixth mūrcchanā of the madhyama-grāma.",
    page: 651,
  },
  {
    deva: "निदर्शन",
    iast: "nidarśana",
    senses: ["pointing to, showing", "proof, evidence", "instance, example, illustration"],
    note: "Bharata's word for the two-vīṇā demonstration: śrutinidarśana.",
    page: 548,
  },
  {
    deva: "प्रमाण",
    iast: "pramāṇa",
    senses: ["measure, scale, standard"],
    note: "pramāṇaśruti, the standard śruti by which the movable vīṇā is lowered each time.",
    page: 685,
  },
];

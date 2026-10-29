/**
 * Bharata's two grāmas and his two-vīṇā demonstration, Nāṭyaśāstra 28 (Kāvyamālā 42,
 * Bombay 1894, pp. 303–305). Positions count śrutis above ṣaḍja; the octave is 22.
 */
import { SPECIES, type Species, type Step, speciesSteps } from "./system";

export type Svara = "sa" | "ri" | "ga" | "ma" | "pa" | "dha" | "ni";
export type Grama = "sadja" | "madhyama";

export const ORDER: readonly Svara[] = ["sa", "ri", "ga", "ma", "pa", "dha", "ni"];
export const OCTAVE = 22;

/**
 * How many śrutis each note holds: the distance up to it from the note below.
 * Verses 26–29: ṣaḍja four, ṛṣabha three, gāndhāra two, madhyama four, pañcama four
 * (three in the madhyama-grāma), dhaivata three (four there), niṣāda two.
 */
export const SPAN: Record<Grama, Record<Svara, number>> = {
  sadja: { sa: 4, ri: 3, ga: 2, ma: 4, pa: 4, dha: 3, ni: 2 },
  madhyama: { sa: 4, ri: 3, ga: 2, ma: 4, pa: 3, dha: 4, ni: 2 },
};

/** Śrutis above ṣaḍja for each note of a grāma; ṣaḍja is 0 and its octave 22. */
export function positions(grama: Grama): Record<Svara, number> {
  const span = SPAN[grama];
  const out = { sa: 0 } as Record<Svara, number>;
  let at = 0;
  for (const s of ORDER.slice(1)) {
    at += span[s];
    out[s] = at;
  }
  return out;
}

/** Interval in śrutis from `a` up to the next `b`, within one octave. */
export function interval(grama: Grama, a: Svara, b: Svara): number {
  const p = positions(grama);
  return (((p[b] - p[a]) % OCTAVE) + OCTAVE) % OCTAVE;
}

/** Bharata: notes nine or thirteen śrutis apart are consonant (saṃvādin), twenty apart dissonant. */
export function consonant(grama: Grama, a: Svara, b: Svara): boolean {
  const n = interval(grama, a, b);
  return n === 9 || n === 13;
}

export function dissonant(grama: Grama, a: Svara, b: Svara): boolean {
  const n = interval(grama, a, b);
  return n === 2 || n === 20;
}

/**
 * The stages of the demonstration. "pa" is the moment the movable vīṇā has only its
 * pañcama lowered, which makes it a madhyama-grāma vīṇā; each numbered stage has every
 * string lowered by that many śrutis.
 */
export type Stage = 0 | "pa" | 1 | 2 | 3 | 4;
export const STAGES: readonly Stage[] = [0, "pa", 1, 2, 3, 4];

/** Positions of the movable vīṇā's strings at a stage. */
export function movable(stage: Stage): Record<Svara, number> {
  const base = positions("sadja");
  if (stage === "pa") return { ...base, pa: base.pa - 1 };
  const out = { ...base };
  for (const s of ORDER) out[s] = base[s] - stage;
  return out;
}

export interface Meeting {
  moving: Svara;
  fixed: Svara;
}

/** Strings of the movable vīṇā that sound the same pitch class as a string of the fixed one. */
export function meetings(stage: Stage): Meeting[] {
  const fixed = positions("sadja");
  const moved = movable(stage);
  const out: Meeting[] = [];
  for (const m of ORDER) {
    const at = (((moved[m] ?? 0) % OCTAVE) + OCTAVE) % OCTAVE;
    const f = ORDER.find((s) => fixed[s] === at);
    if (f) out.push({ moving: m, fixed: f });
  }
  return out;
}

/**
 * Bharata's count: each note first meets the note below it at the lowering equal to its
 * own number of śrutis, so the lowerings at which the seven notes meet add up to 22.
 */
export function firstMeetings(): { lowered: number; meetings: Meeting[] }[] {
  const seen = new Set<Svara>();
  const out: { lowered: number; meetings: Meeting[] }[] = [];
  for (const k of [1, 2, 3, 4] as const) {
    const fresh = meetings(k).filter((m) => !seen.has(m.moving));
    for (const m of fresh) seen.add(m.moving);
    out.push({ lowered: k, meetings: fresh });
  }
  return out;
}

/** Cents in a number of equal śrutis. */
export const srutiCents = (n: number) => (1200 * n) / OCTAVE;

/** Frequency of a position, with ṣaḍja at `sa` hertz and every śruti equal. */
export const srutiHz = (position: number, sa = 220) => sa * 2 ** (position / OCTAVE);

export interface Murcchana {
  grama: Grama;
  /** Bharata's order within the grāma, from 1. */
  ordinal: number;
  iast: string;
  deva: string;
  /** The note it starts on (prose after verse 33). */
  first: Svara;
}

export const MURCCHANAS: readonly Murcchana[] = [
  { grama: "sadja", ordinal: 1, iast: "uttaramandrā", deva: "उत्तरमन्द्रा", first: "sa" },
  { grama: "sadja", ordinal: 2, iast: "rajanī", deva: "रजनी", first: "ni" },
  { grama: "sadja", ordinal: 3, iast: "uttarāyatā", deva: "उत्तरायता", first: "dha" },
  { grama: "sadja", ordinal: 4, iast: "śuddhaṣaḍjā", deva: "शुद्धषड्जा", first: "pa" },
  { grama: "sadja", ordinal: 5, iast: "matsarīkṛtā", deva: "मत्सरीकृता", first: "ma" },
  { grama: "sadja", ordinal: 6, iast: "aśvakrāntā", deva: "अश्वक्रान्ता", first: "ga" },
  { grama: "sadja", ordinal: 7, iast: "abhirudgatā", deva: "अभिरुद्गता", first: "ri" },
  { grama: "madhyama", ordinal: 1, iast: "sauvīrī", deva: "सौवीरी", first: "ma" },
  { grama: "madhyama", ordinal: 2, iast: "hariṇāśvā", deva: "हरिणाश्वा", first: "ga" },
  { grama: "madhyama", ordinal: 3, iast: "kalopanatā", deva: "कलोपनता", first: "ri" },
  { grama: "madhyama", ordinal: 4, iast: "śuddhamadhyā", deva: "शुद्धमध्या", first: "sa" },
  { grama: "madhyama", ordinal: 5, iast: "mārgī", deva: "मार्गी", first: "ni" },
  { grama: "madhyama", ordinal: 6, iast: "pauravī", deva: "पौरवी", first: "dha" },
  { grama: "madhyama", ordinal: 7, iast: "hṛṣyakā", deva: "हृष्यका", first: "pa" },
];

/** The seven notes of a mūrcchanā from its first note upward, as positions (may pass 22). */
export function murcchanaPositions(m: Murcchana): number[] {
  const p = positions(m.grama);
  const start = ORDER.indexOf(m.first);
  return Array.from({ length: 8 }, (_, k) => {
    const s = ORDER[(start + k) % 7] as Svara;
    return p[s] + (start + k >= 7 ? OCTAVE : 0);
  });
}

/** Steps of a mūrcchanā in śrutis, lowest first. */
export function murcchanaSpans(m: Murcchana): number[] {
  const at = murcchanaPositions(m);
  return at.slice(1).map((p, i) => p - (at[i] ?? 0));
}

/** The same steps as tones and half-tones: two śrutis is a half-tone, three or four a tone. */
export const asSteps = (spans: number[]): Step[] => spans.map((n) => (n === 2 ? "S" : "T"));

/** Cleonides' octave species with the same order of tones and half-tones. */
export function greekTwin(m: Murcchana): Species | undefined {
  const want = asSteps(murcchanaSpans(m)).join("");
  return SPECIES.find((s) => speciesSteps(s).join("") === want);
}

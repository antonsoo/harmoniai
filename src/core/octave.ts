import { frequencies, NOTES, SPECIES, type Species, type Tuning } from "./system";

export interface OctaveState {
  species: number;
  tuning: Tuning;
  mese: 110 | 220 | 330;
  selected: number;
  orientation: "named" | "pitch";
}
export const DEFAULT_OCTAVE: OctaveState = {
  species: 4,
  tuning: "pythagorean",
  mese: 220,
  selected: 7,
  orientation: "named",
};
export function selectedSpecies(state: OctaveState): Species {
  return SPECIES.find((s) => s.ordinal === state.species) ?? (SPECIES[3] as Species);
}
export function octaveOrder(state: OctaveState): number[] {
  const from = selectedSpecies(state).from;
  const up = Array.from({ length: 8 }, (_, k) => from + k);
  return [...up, ...up.slice(0, -1).reverse()];
}
export function octaveRows(state: OctaveState) {
  const pitches = frequencies(state.tuning, state.mese);
  const species = selectedSpecies(state);
  return NOTES.map((note) => ({
    ...note,
    hz: pitches[note.index] as number,
    centsFromMese: 1200 * Math.log2((pitches[note.index] as number) / state.mese),
    inOctave: note.index >= species.from && note.index <= species.from + 7,
  }));
}
export const tuningName = (tuning: Tuning): string =>
  tuning === "pythagorean" ? "Ratio model: 9:8 and 256:243" : "Equal-step model: 200 and 100 cents";

/** Recognized controls are strict; section anchors and unrelated URL fields survive. */
export function readOctave(search: string): OctaveState {
  const p = new URLSearchParams(search);
  const result = { ...DEFAULT_OCTAVE };
  for (const key of ["species", "tuning", "mese", "selected", "orientation"] as const) {
    const values = p.getAll(key);
    if (!values.length) continue;
    const v = values[0];
    if (values.length !== 1 || !v)
      throw new Error("This octave link repeats or omits a control value.");
    switch (key) {
      case "species":
        if (!/^[1-7]$/.test(v)) throw new Error("Choose an octave species from 1 to 7.");
        result.species = Number(v);
        break;
      case "tuning":
        if (v !== "pythagorean" && v !== "aristoxenian") throw new Error("Unknown tuning model.");
        result.tuning = v;
        break;
      case "mese":
        if (!["110", "220", "330"].includes(v))
          throw new Error("Choose mesē at 110, 220 or 330 Hz.");
        result.mese = Number(v) as OctaveState["mese"];
        break;
      case "selected":
        if (!/^(?:[0-9]|1[0-4])$/.test(v)) throw new Error("Choose one of the fifteen strings.");
        result.selected = Number(v);
        break;
      case "orientation":
        if (v !== "named" && v !== "pitch") throw new Error("Unknown string orientation.");
        result.orientation = v;
        break;
    }
  }
  return result;
}
export function octaveQuery(state: OctaveState): string {
  return new URLSearchParams(Object.entries(state).map(([k, v]) => [k, String(v)])).toString();
}

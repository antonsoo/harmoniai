import { SPECIES, type Step, speciesSteps, stepCents, type Tuning } from "./system";

export const SHARED_NAMES = ["Dorian", "Phrygian", "Lydian", "Mixolydian"] as const;
export type SharedName = (typeof SHARED_NAMES)[number];
export type Relation = "name" | "pattern";
export interface ComparisonState {
  name: SharedName;
  relation: Relation;
  tuning: Tuning;
  start: number;
}

// Modern ascending interval orders, independently specified rather than derived
// from Cleonides' labels. See Steps to Music Theory, chapter 11.1.
export const MODERN: Record<string, readonly Step[]> = {
  Ionian: ["T", "T", "S", "T", "T", "T", "S"],
  Dorian: ["T", "S", "T", "T", "T", "S", "T"],
  Phrygian: ["S", "T", "T", "T", "S", "T", "T"],
  Lydian: ["T", "T", "T", "S", "T", "T", "S"],
  Mixolydian: ["T", "T", "S", "T", "T", "S", "T"],
  Aeolian: ["T", "S", "T", "T", "S", "T", "T"],
  Locrian: ["S", "T", "T", "S", "T", "T", "T"],
};

export function pitches(steps: readonly Step[], tuning: Tuning, start: number) {
  const cents = [0];
  for (const step of steps) cents.push((cents.at(-1) ?? 0) + stepCents(step, tuning));
  return { cents, hz: cents.map((c) => start * 2 ** (c / 1200)) };
}

export function compare(state: ComparisonState) {
  const greek = SPECIES.find((s) => s.name === state.name);
  if (!greek) throw new Error("Unknown Greek species");
  const modernName = state.relation === "name" ? state.name : greek.modern.split(" ")[0];
  const modernSteps = MODERN[modernName ?? ""];
  if (!modernSteps) throw new Error("Unknown modern mode");
  const ancientSteps = speciesSteps(greek);
  const a = pitches(ancientSteps, state.tuning, state.start);
  const b = pitches(modernSteps, state.tuning, state.start);
  const differences = a.cents.flatMap((c, i) =>
    Math.abs(c - (b.cents[i] ?? 0)) > 1e-8 ? [i + 1] : [],
  );
  return { greek, modernName, ancientSteps, modernSteps, a, b, differences };
}

export function readComparison(params: URLSearchParams): ComparisonState {
  const name = SHARED_NAMES.find((n) => n.toLowerCase() === params.get("name")) ?? "Dorian";
  return {
    name,
    relation: params.get("relation") === "pattern" ? "pattern" : "name",
    tuning: params.get("tuning") === "pythagorean" ? "pythagorean" : "aristoxenian",
    start: [110, 220, 330].includes(Number(params.get("start")))
      ? Number(params.get("start"))
      : 220,
  };
}

export function comparisonQuery(state: ComparisonState): string {
  return new URLSearchParams({
    name: state.name.toLowerCase(),
    relation: state.relation,
    tuning: state.tuning,
    start: String(state.start),
  }).toString();
}

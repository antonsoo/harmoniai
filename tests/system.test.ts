import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CLEONIDES_SPECIES } from "../src/content/sources";
import {
  frequencies,
  NOTES,
  SPECIES,
  STEPS,
  semitonePositions,
  speciesSteps,
} from "../src/core/system";

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

/** Read 'ἀπὸ X [Y] ἐπὶ Z [W]' from Cleonides' Greek and return the two note indices. */
function parseSpan(greek: string): [number, number] {
  const m = greek.match(
    /ἀπὸ (\S+)(?: (ὑπάτων|μέσων|διεζευγμένων|ὑπερβολαίων))? ἐπὶ (\S+?)(?: (ὑπάτων|μέσων|διεζευγμένων|ὑπερβολαίων))?(?=[,·]| ἢ)/,
  );
  assert.ok(m, `no span in ${greek}`);
  const stems: [RegExp, string][] = [
    [/^προσλαμβαν/, "proslambanomenos"],
    [/^παρυπάτ/, "parhypatē"],
    [/^ὑπάτ/, "hypatē"],
    [/^λιχαν/, "lichanos"],
    [/^παραμέσ/, "paramesē"],
    [/^μέσ/, "mesē"],
    [/^τρίτ/, "tritē"],
    [/^παρανήτ/, "paranētē"],
    [/^νήτ/, "nētē"],
  ];
  const tetra: Record<string, string> = {
    ὑπάτων: "hypatōn",
    μέσων: "mesōn",
    διεζευγμένων: "diezeugmenōn",
    ὑπερβολαίων: "hyperbolaiōn",
  };
  const find = (word: string, group?: string) => {
    const stem = stems.find(([re]) => re.test(word))?.[1];
    assert.ok(stem, `unknown note word ${word}`);
    const name = group ? `${stem} ${tetra[group]}` : stem;
    const note = NOTES.find((n) => n.romanized === name);
    assert.ok(note, `no note ${name}`);
    return note.index;
  };
  return [find(m[1] ?? "", m[2]), find(m[3] ?? "", m[4])];
}

describe("the Greater Perfect System", () => {
  it("has fifteen notes over exactly two octaves in Pythagorean tuning", () => {
    assert.equal(NOTES.length, 15);
    assert.equal(STEPS.length, 14);
    const f = frequencies("pythagorean");
    close((f[14] ?? 0) / (f[0] ?? 1), 4, 1e-12);
    close(f[7] ?? 0, 220);
  });

  it("puts a fourth under the mesē, a fifth above it, and the tone of disjunction between", () => {
    const f = frequencies("pythagorean");
    close((f[7] ?? 0) / (f[4] ?? 1), 4 / 3, 1e-12);
    close((f[11] ?? 0) / (f[7] ?? 1), 3 / 2, 1e-12);
    close((f[8] ?? 0) / (f[7] ?? 1), 9 / 8, 1e-12);
  });

  it("gives equal tempered pitches in the Aristoxenian tuning", () => {
    const f = frequencies("aristoxenian");
    close((f[8] ?? 0) / (f[7] ?? 1), 2 ** (2 / 12), 1e-12);
    close((f[9] ?? 0) / (f[8] ?? 1), 2 ** (1 / 12), 1e-12);
  });
});

describe("Cleonides' seven octave species", () => {
  it("start where his Greek says each one starts, and span an octave", () => {
    for (const s of SPECIES) {
      const quote = CLEONIDES_SPECIES[s.ordinal]?.greek ?? "";
      const [from, to] = parseSpan(quote);
      assert.equal(from, s.from, s.name);
      assert.equal(to, s.from + 7, s.name);
    }
  });

  it("agree with his separate account of where the half-steps fall", () => {
    for (const s of SPECIES) {
      const positions = semitonePositions(speciesSteps(s));
      assert.equal(positions.length, 2, s.name);
      assert.equal(positions[0], s.semitone.fromLow, `${s.name} from the low end`);
      assert.equal(8 - (positions[1] ?? 0), s.semitone.fromHigh, `${s.name} from the high end`);
    }
  });

  it("are seven different octaves, one starting on each white key", () => {
    const letters = SPECIES.map((s) => NOTES[s.from]?.letter.toLowerCase().replace("'", ""));
    assert.deepEqual(new Set(letters).size, 7);
  });

  it("share four names with modern modes, each on a different octave", () => {
    const shared = SPECIES.filter((g) => SPECIES.some((m) => m.modern.split(" ")[0] === g.name));
    assert.deepEqual(
      shared.map((s) => s.name),
      ["Mixolydian", "Lydian", "Phrygian", "Dorian"],
    );
    for (const s of shared) assert.notEqual(s.modern.split(" ")[0], s.name);
    const dorian = SPECIES.find((s) => s.name === "Dorian");
    assert.equal(NOTES[dorian?.from ?? 0]?.letter, "e");
    assert.equal(dorian?.modern, "Phrygian");
  });
});

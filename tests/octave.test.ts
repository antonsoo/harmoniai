import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_OCTAVE,
  octaveOrder,
  octaveQuery,
  octaveRows,
  readOctave,
} from "../src/core/octave";

// Literal pitch table, independent of the application's interval accumulation.
const ratios = [
  1,
  9 / 8,
  32 / 27,
  4 / 3,
  3 / 2,
  128 / 81,
  16 / 9,
  2,
  9 / 4,
  64 / 27,
  8 / 3,
  3,
  256 / 81,
  32 / 9,
  4,
];
const semitones = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19, 20, 22, 24];

test("every octave keeps the reference and two-to-one endpoints under all settings", () => {
  for (const species of [1, 2, 3, 4, 5, 6, 7])
    for (const tuning of ["pythagorean", "aristoxenian"] as const)
      for (const mese of [110, 220, 330] as const) {
        const state = { ...DEFAULT_OCTAVE, species, tuning, mese };
        const rows = octaveRows(state);
        rows.forEach((r, i) => {
          const expected =
            (mese / 2) *
            (tuning === "pythagorean"
              ? (ratios[i] as number)
              : 2 ** ((semitones[i] as number) / 12));
          assert.ok(Math.abs(r.hz - expected) < 1e-10);
        });
        const order = octaveOrder(state);
        assert.equal(order.length, 15);
        assert.equal(order[0], species);
        assert.equal(order[7], species + 7);
        assert.equal(order[14], species);
        assert.ok(Math.abs((rows[species + 7]?.hz ?? 0) / (rows[species]?.hz ?? 1) - 2) < 1e-12);
        assert.equal(rows.filter((r) => r.inOctave).length, 8);
        assert.deepEqual(readOctave(`?${octaveQuery(state)}`), state);
      }
});

test("shared controls are validated as a whole before replacing the starting octave", () => {
  assert.deepEqual(readOctave(""), DEFAULT_OCTAVE);
  assert.deepEqual(readOctave("?selected=14&orientation=pitch"), {
    ...DEFAULT_OCTAVE,
    selected: 14,
    orientation: "pitch",
  });
  for (const search of [
    "?species=0",
    "?species=8",
    "?species=01",
    "?species=1&species=2",
    "?tuning=unknown",
    "?mese=440",
    "?mese=220.0",
    "?selected=15",
    "?selected=-1",
    "?selected=2.5",
    "?orientation=other",
    "?selected=",
  ])
    assert.throws(() => readOctave(search));
});

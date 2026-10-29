import assert from "node:assert/strict";
import { test } from "node:test";
import {
  consonant,
  dissonant,
  firstMeetings,
  greekTwin,
  interval,
  MURCCHANAS,
  meetings,
  murcchanaSpans,
  OCTAVE,
  ORDER,
  positions,
  SPAN,
  srutiCents,
} from "../src/core/sruti";

test("both grāmas hold twenty-two śrutis", () => {
  for (const g of ["sadja", "madhyama"] as const) {
    assert.equal(
      ORDER.reduce((n, s) => n + SPAN[g][s], 0),
      OCTAVE,
    );
  }
  // Verse 25 lists the ṣaḍja-grāma from ṛṣabha: three, two, four, four, three, two, four.
  assert.deepEqual(
    ["ri", "ga", "ma", "pa", "dha", "ni", "sa"].map((s) => SPAN.sadja[s as "sa"]),
    [3, 2, 4, 4, 3, 2, 4],
  );
  // The madhyama-grāma differs only in its pañcama, one śruti lower.
  const s = positions("sadja");
  const m = positions("madhyama");
  assert.deepEqual(
    ORDER.filter((x) => s[x] !== m[x]),
    ["pa"],
  );
  assert.equal(s.pa - m.pa, 1);
});

test("the demonstration meets exactly the strings the prose names", () => {
  // Kāvyamālā p. 304: nothing meets after the first lowering; then gāndhāra and niṣāda
  // enter ṛṣabha and dhaivata; then dhaivata and ṛṣabha enter pañcama and ṣaḍja; then
  // pañcama, madhyama and ṣaḍja enter madhyama, gāndhāra and niṣāda.
  const pairs = (k: 1 | 2 | 3 | 4) =>
    meetings(k)
      .map((x) => `${x.moving}>${x.fixed}`)
      .sort();
  assert.deepEqual(pairs(1), []);
  assert.deepEqual(pairs(2), ["ga>ri", "ni>dha"]);
  assert.deepEqual(pairs(3), ["dha>pa", "ri>sa"]);
  assert.deepEqual(pairs(4), ["ma>ga", "pa>ma", "sa>ni"]);
  // Tuned alike, all seven strings sound together.
  assert.equal(meetings(0).length, 7);
  // Each note meets at the lowering equal to its span, so the lowerings add up to 22.
  const total = firstMeetings().reduce((n, f) => n + f.lowered * f.meetings.length, 0);
  assert.equal(total, OCTAVE);
  // The earlier 1894 setting has no three-śruti lowering: then only 16 śrutis are measured.
  const withoutThird = firstMeetings()
    .filter((f) => f.lowered !== 3)
    .reduce((n, f) => n + f.lowered * f.meetings.length, 0);
  assert.equal(withoutThird, 16);
});

test("consonance and dissonance follow the examples in the text", () => {
  // p. 303: ṣaḍja–pañcama, ṛṣabha–dhaivata, gāndhāra–niṣāda, ṣaḍja–madhyama in the
  // ṣaḍja-grāma; in the madhyama-grāma not ṣaḍja–pañcama, but pañcama–ṛṣabha.
  for (const [a, b] of [
    ["sa", "pa"],
    ["ri", "dha"],
    ["ga", "ni"],
    ["sa", "ma"],
  ] as const) {
    assert.ok(consonant("sadja", a, b), `${a}–${b}`);
  }
  assert.ok(!consonant("madhyama", "sa", "pa"));
  assert.ok(consonant("madhyama", "pa", "ri"));
  assert.equal(interval("madhyama", "pa", "ri"), 13);
  // Dissonant: ṛṣabha–gāndhāra and dhaivata–niṣāda, twenty śrutis one way round.
  assert.ok(dissonant("sadja", "ga", "ri"));
  assert.ok(dissonant("sadja", "ni", "dha"));
  assert.equal(interval("sadja", "ga", "ri"), 20);
});

test("equal śrutis put the fourth and fifth seven cents off pure", () => {
  assert.equal(srutiCents(9).toFixed(1), "490.9");
  assert.equal(srutiCents(13).toFixed(1), "709.1");
  assert.equal((1200 * Math.log2(3 / 2)).toFixed(1), "702.0");
});

test("the seven ṣaḍja-grāma mūrcchanās are the seven Greek octave species", () => {
  const sadja = MURCCHANAS.filter((m) => m.grama === "sadja");
  assert.deepEqual(murcchanaSpans(sadja[0] as (typeof sadja)[0]), [3, 2, 4, 4, 3, 2, 4]);
  const twins = sadja.map((m) => greekTwin(m)?.name);
  assert.deepEqual(twins, [
    "Phrygian",
    "Lydian",
    "Mixolydian",
    "Hypodorian",
    "Hypophrygian",
    "Hypolydian",
    "Dorian",
  ]);
  // Every madhyama-grāma mūrcchanā also matches one species when tones are not told apart.
  const madhyama = MURCCHANAS.filter((m) => m.grama === "madhyama");
  assert.equal(madhyama.filter((m) => greekTwin(m)).length, 7);
  for (const m of MURCCHANAS)
    assert.equal(
      murcchanaSpans(m).reduce((a, b) => a + b, 0),
      OCTAVE,
    );
});

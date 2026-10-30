import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { SAMPLE_RATE, sequence, wave } from "../src/audio/comparison";
import { PLATES } from "../src/content/plates";
import { compare, comparisonQuery, readComparison, SHARED_NAMES } from "../src/core/comparison";

test("same-name comparisons isolate the independently counted degrees; pattern controls agree", () => {
  const expected = { Dorian: [2, 6], Phrygian: [2, 6], Lydian: [4], Mixolydian: [2, 3, 5, 6] };
  for (const name of SHARED_NAMES)
    for (const tuning of ["aristoxenian", "pythagorean"] as const)
      for (const start of [110, 220, 330]) {
        const state = { name, tuning, start, relation: "name" as const };
        const c = compare(state);
        assert.deepEqual(c.differences, expected[name]);
        assert.equal(c.a.hz[0], start);
        assert.equal(c.b.hz[0], start);
        assert.ok(Math.abs((c.a.hz[7] ?? 0) - 2 * start) < 1e-9);
        assert.ok(Math.abs((c.b.hz[7] ?? 0) - 2 * start) < 1e-9);
        const control = compare({ ...state, relation: "pattern" });
        assert.deepEqual(control.a, control.b);
        assert.deepEqual(readComparison(new URLSearchParams(comparisonQuery(state))), state);
      }
});

test("the exported PCM contains every requested pitch, including the changed degrees", () => {
  let worstCents = 0;
  for (const name of SHARED_NAMES)
    for (const tuning of ["aristoxenian", "pythagorean"] as const) {
      const c = compare({ name, tuning, start: 220, relation: "name" });
      const events = sequence([c.a.hz, c.b.hz]);
      const bytes = wave(events);
      const data = new DataView(bytes.buffer);
      assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), "RIFF");
      assert.equal(data.getUint32(24, true), 44100);
      assert.equal(data.getUint32(40, true), bytes.length - 44);
      assert.equal(data.getUint16(22, true), 1);
      assert.equal(events.length, 16);
      assert.equal(events[8]?.start, 4.33);
      for (const event of events) {
        const first = Math.round((event.start + 0.06) * SAMPLE_RATE);
        const last = Math.round((event.start + 0.3) * SAMPLE_RATE);
        const crossings: number[] = [];
        for (let i = first; i < last; i++) {
          const a = data.getInt16(44 + 2 * i, true),
            b = data.getInt16(46 + 2 * i, true);
          if (a <= 0 && b > 0) crossings.push(i - a / (b - a));
        }
        const pitch =
          ((crossings.length - 1) * SAMPLE_RATE) / ((crossings.at(-1) ?? 0) - (crossings[0] ?? 0));
        const cents = Math.abs(1200 * Math.log2(pitch / event.hz));
        worstCents = Math.max(worstCents, cents);
        assert.ok(cents < 0.01, `${event.hz} Hz differs by ${cents} cents`);
      }
    }
  console.log(`Decoded PCM, 128 notes: worst pitch error ${worstCents.toFixed(6)} cents`);
});

test("the reviewed plate bytes and public source record agree", () => {
  const manifest = JSON.parse(readFileSync("public/sources/manifest.json", "utf8"));
  assert.deepEqual(manifest.pages, PLATES);
  for (const plate of PLATES) {
    const bytes = readFileSync(`public/${plate.path}`);
    assert.equal(bytes.length, plate.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), plate.sha256);
  }
});

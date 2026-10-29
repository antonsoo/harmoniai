import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { boxOf, distractors, grade, pickNext, tally } from "../src/core/leitner";

/** A small deterministic generator, so the weighting can be measured. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("Leitner schedule", () => {
  it("moves a right answer up a box and a wrong one back to the first", () => {
    let b = grade({}, "echinus", true);
    b = grade(b, "echinus", true);
    assert.equal(boxOf(b, "echinus"), 3);
    b = grade(b, "echinus", false);
    assert.equal(boxOf(b, "echinus"), 1);
    for (let i = 0; i < 10; i++) b = grade(b, "abacus", true);
    assert.equal(boxOf(b, "abacus"), 5);
  });

  it("asks words in box 1 about sixteen times as often as words in box 5", () => {
    const rand = lcg(7);
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 40000; i++) {
      const id = pickNext(["a", "b", "c"], { a: 1, b: 5, c: 5 }, null, rand);
      counts[id] = (counts[id] ?? 0) + 1;
    }
    const ratio = (counts.a ?? 0) / (counts.b ?? 1);
    assert.ok(ratio > 14 && ratio < 18, `ratio ${ratio}`);
  });

  it("never repeats the word just asked when another is available", () => {
    const rand = lcg(3);
    for (let i = 0; i < 200; i++) assert.notEqual(pickNext(["a", "b"], {}, "a", rand), "a");
    assert.equal(pickNext(["only"], {}, "only", rand), "only");
  });

  it("offers distinct distractors that never include the answer", () => {
    const rand = lcg(11);
    const ids = ["a", "b", "c", "d", "e"];
    for (let i = 0; i < 50; i++) {
      const d = distractors(ids, "c", 3, rand);
      assert.equal(d.length, 3);
      assert.ok(!d.includes("c"));
      assert.equal(new Set(d).size, 3);
    }
  });

  it("counts words per box", () => {
    assert.deepEqual(tally(["a", "b", "c"], { a: 1, b: 3, c: 3 }), [1, 0, 2, 0, 0]);
  });
});

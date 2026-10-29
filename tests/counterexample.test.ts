import assert from "node:assert/strict";
import test from "node:test";
import { PURE_LOWERINGS, PURE_PITCHES, ratioCents } from "../src/core/counterexample";

test("a pure fifth and unequal lowerings retain all seven named meetings exactly", () => {
  // Exact integer cross-products, independent of cents and the equal-step dial.
  const expected = [[], ["ga>ri", "ni>dha"], ["dha>pa", "ri>sa"], ["ma>ga", "pa>ma", "sa>ni"]];
  const names = ["sa", "ri", "ga", "ma", "pa", "dha", "ni"];
  for (let stage = 1; stage <= 4; stage++) {
    const shift = PURE_LOWERINGS[stage];
    assert.ok(shift);
    const found: string[] = [];
    PURE_PITCHES.forEach(([mn, md], m) => {
      PURE_PITCHES.forEach(([fn, fd], f) => {
        for (const [on, od] of [
          [1, 2],
          [1, 1],
          [2, 1],
        ] as const) {
          if (mn * shift[1] * fd * od === md * shift[0] * fn * on)
            found.push(`${names[m]}>${names[f]}`);
        }
      });
    });
    assert.deepEqual(found.sort(), expected[stage - 1]);
  }
  assert.deepEqual(PURE_PITCHES[4], [3, 2]);
  assert.deepEqual(PURE_PITCHES[3], [4, 3]);
  const totals = PURE_LOWERINGS.map(ratioCents);
  const increments = totals.slice(1).map((n, i) => n - (totals[i] ?? 0));
  assert.deepEqual(
    increments.map((n) => n.toFixed(3)),
    ["21.506", "90.225", "70.672", "21.506"],
  );
});

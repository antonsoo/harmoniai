import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pluckSamples } from "../src/audio/pluck";

function rms(xs: Float32Array, a: number, b: number): number {
  let s = 0;
  for (let i = a; i < b; i++) s += (xs[i] ?? 0) ** 2;
  return Math.sqrt(s / (b - a));
}

/** Pitch by autocorrelation over a short window. */
function pitch(xs: Float32Array, sampleRate: number): number {
  const start = 2000;
  const n = 4096;
  let best = 0;
  let bestLag = 0;
  for (let lag = 40; lag < 1200; lag++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += (xs[start + i] ?? 0) * (xs[start + i + lag] ?? 0);
    if (s > best) {
      best = s;
      bestLag = lag;
    }
  }
  return sampleRate / bestLag;
}

describe("plucked string", () => {
  let seed = 1;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  it("sounds at the requested pitch within a few cents", () => {
    for (const f of [110, 220, 330]) {
      const xs = pluckSamples(f, 48000, 0.5, random);
      const cents = 1200 * Math.log2(pitch(xs, 48000) / f);
      assert.ok(Math.abs(cents) < 15, `${f} Hz came out ${cents.toFixed(1)} cents off`);
    }
  });

  it("dies away and ends in silence", () => {
    const xs = pluckSamples(220, 48000, 1.6, random);
    assert.equal(xs.length, 76800);
    assert.ok(rms(xs, 0, 4800) > 5 * rms(xs, 72000, 76800));
    assert.equal(xs[xs.length - 1], 0);
  });
});

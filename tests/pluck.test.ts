import assert from "node:assert/strict";
import test from "node:test";
import { pluckedWave } from "../src/audio/octave";
import { pluckSamples } from "../src/audio/pluck";

function rms(xs: Float32Array, a: number, b: number): number {
  let s = 0;
  for (let i = a; i < b; i++) s += (xs[i] ?? 0) ** 2;
  return Math.sqrt(s / (b - a));
}

test("harmonic plucks are bounded, finite, reproducible and end in silence", () => {
  for (const rate of [44100, 48000])
    for (const f of [55, 110, 220, 330, 660, 1760]) {
      const xs = pluckSamples(f, rate, 1.6);
      assert.equal(xs.length, Math.round(rate * 1.6));
      assert.ok(xs.every((x) => Number.isFinite(x) && Math.abs(x) <= 1));
      assert.ok(rms(xs, 0, rate / 10) > 5 * rms(xs, Math.floor(rate * 1.5), xs.length));
      assert.equal(xs[0], 0);
      assert.equal(Math.abs(xs.at(-1) ?? 1), 0);
      assert.deepEqual(xs, pluckSamples(f, rate, 1.6));
    }
});

test("nearby targets never collapse onto one integer-delay waveform", () => {
  const a = pluckSamples(440, 44100, 0.5);
  const b = pluckSamples(441, 44100, 0.5);
  assert.notDeepEqual(a, b);
  // A separately evaluated closed-form signal checks the recursive oscillator.
  for (const i of [400, 1000, 8000, 15000]) {
    let y = 0,
      bound = 0;
    for (let h = 1; h <= 24; h++) {
      const amplitude = Math.sin(Math.PI * h * 0.23) / h ** 2;
      bound += Math.abs(amplitude);
      y +=
        amplitude *
        Math.exp((-(2.8 + 0.35 * h ** 2) * i) / 44100) *
        Math.sin((2 * Math.PI * h * 440 * i) / 44100);
    }
    assert.ok(Math.abs((a[i] ?? 0) - y / bound) < 2e-7);
  }
});

test("WAV uses the live pluck and gain, including overlapping tails", () => {
  const bytes = pluckedWave([220, 330]);
  const view = new DataView(bytes.buffer);
  assert.equal(view.getUint32(24, true), 44100);
  assert.equal(view.getUint32(40, true), Math.round(2.02 * 44100) * 2);
  const a = pluckSamples(220, 44100, 1.6);
  const b = pluckSamples(330, 44100, 1.6);
  for (const i of [500, 19000, 22000, 60000, 80000]) {
    const j = i - Math.round(0.42 * 44100);
    const expected = Math.round(((a[i] ?? 0) + (b[j] ?? 0)) * 0.32 * 32767);
    assert.equal(view.getInt16(44 + 2 * i, true), expected);
  }
});

test("invalid synthesis requests cannot allocate unbounded signals", () => {
  for (const f of [NaN, Infinity, -1, 0, 19, 22050]) assert.throws(() => pluckSamples(f, 44100, 1));
  for (const rate of [0, 44100.1, NaN, 1000000]) assert.throws(() => pluckSamples(220, rate, 1));
  for (const duration of [0, -1, NaN, Infinity, 31])
    assert.throws(() => pluckSamples(220, 44100, duration));
});

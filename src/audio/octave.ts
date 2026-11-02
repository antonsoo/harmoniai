import { pcmWave, SAMPLE_RATE } from "./comparison";
import { PLUCK_GAIN, PLUCK_GAP, PLUCK_SECONDS, pluckSamples } from "./pluck";

/** The same finite pluck and overlap as live playback, at the stated file rate. */
export function pluckedWave(pitches: readonly number[], sampleRate = SAMPLE_RATE) {
  if (!pitches.length) throw new Error("Choose at least one note.");
  const out = new Float64Array(
    Math.round(((pitches.length - 1) * PLUCK_GAP + PLUCK_SECONDS) * sampleRate),
  );
  const prepared = new Map<number, ReturnType<typeof pluckSamples>>();
  pitches.forEach((hz, i) => {
    let note = prepared.get(hz);
    if (!note) {
      note = pluckSamples(hz, sampleRate, PLUCK_SECONDS);
      prepared.set(hz, note);
    }
    const start = Math.round(i * PLUCK_GAP * sampleRate);
    note.forEach((value, j) => {
      if (start + j < out.length) out[start + j] = (out[start + j] ?? 0) + value * PLUCK_GAIN;
    });
  });
  return pcmWave(out, sampleRate);
}

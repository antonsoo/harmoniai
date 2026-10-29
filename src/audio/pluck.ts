/**
 * A plucked string by the Karplus–Strong method: a burst of noise circulating in a delay
 * line one period long, averaged on each pass so the high partials die first. It is a
 * synthetic sound, not a model of any ancient instrument.
 */
export function pluckSamples(
  frequency: number,
  sampleRate: number,
  seconds: number,
  random: () => number = Math.random,
): Float32Array<ArrayBuffer> {
  const period = Math.max(2, Math.round(sampleRate / frequency));
  const ring = new Float32Array(period);
  for (let i = 0; i < period; i++) ring[i] = random() * 2 - 1;
  const out = new Float32Array(Math.round(sampleRate * seconds));
  const decay = 0.996;
  let j = 0;
  for (let i = 0; i < out.length; i++) {
    const next = (j + 1) % period;
    const value = ring[j] ?? 0;
    out[i] = value;
    ring[j] = decay * 0.5 * (value + (ring[next] ?? 0));
    j = next;
  }
  // A short fade so the note ends without a click.
  const fade = Math.min(out.length, Math.round(sampleRate * 0.05));
  for (let i = 0; i < fade; i++)
    out[out.length - 1 - i] = (out[out.length - 1 - i] ?? 0) * (i / fade);
  return out;
}

export class Lyre {
  private context: AudioContext | null = null;
  private voices: AudioBufferSourceNode[] = [];

  private ctx(): AudioContext {
    this.context ??= new AudioContext();
    return this.context;
  }

  /**
   * Play notes one after another, `gap` seconds apart; a step given as several frequencies
   * sounds them together. Returns the start offset of each step.
   */
  play(frequencies: (number | number[])[], gap = 0.42, onNote?: (index: number) => void): number[] {
    this.stop();
    const ctx = this.ctx();
    void ctx.resume();
    const t0 = ctx.currentTime + 0.05;
    const gain = ctx.createGain();
    gain.gain.value = 0.32;
    gain.connect(ctx.destination);
    return frequencies.map((step, i) => {
      for (const f of Array.isArray(step) ? step : [step]) {
        const samples = pluckSamples(f, ctx.sampleRate, 1.6);
        const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
        buffer.copyToChannel(samples, 0);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(gain);
        source.start(t0 + i * gap);
        this.voices.push(source);
      }
      if (onNote) window.setTimeout(() => onNote(i), (0.05 + i * gap) * 1000);
      return i * gap;
    });
  }

  stop(): void {
    for (const v of this.voices) {
      try {
        v.stop();
      } catch {
        // Already finished.
      }
    }
    this.voices = [];
  }
}

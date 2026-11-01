/** A finite, synthetic harmonic pluck. No ancient instrument timbre is inferred.
 * Each partial is placed at an exact multiple of the requested frequency; an
 * integer delay line would quantize the pitch this workshop asks people to hear.
 */
export const PLUCK_SECONDS = 1.6;
export const PLUCK_GAP = 0.42;
export const PLUCK_GAIN = 0.32;

export function pluckSamples(
  frequency: number,
  sampleRate: number,
  seconds: number,
): Float32Array<ArrayBuffer> {
  if (
    !Number.isFinite(frequency) ||
    frequency < 20 ||
    frequency >= sampleRate * 0.45 ||
    !Number.isInteger(sampleRate) ||
    sampleRate < 8000 ||
    sampleRate > 192000 ||
    !Number.isFinite(seconds) ||
    seconds <= 0 ||
    seconds > 30
  )
    throw new Error("Choose an audible pitch, a supported sample rate and a finite duration.");
  const out = new Float32Array(Math.round(sampleRate * seconds));
  const partials = Math.min(24, Math.ceil((sampleRate * 0.45) / frequency) - 1);
  // A fixed virtual pluck position shapes the harmonics. Upper partials die
  // faster. These are teaching-signal choices, not fitted material parameters.
  let bound = 0;
  for (let h = 1; h <= partials; h++) {
    const amplitude = Math.sin(Math.PI * h * 0.23) / (h * h);
    bound += Math.abs(amplitude);
    const omega = (2 * Math.PI * h * frequency) / sampleRate;
    const decay = Math.exp(-(2.8 + 0.35 * h * h) / sampleRate);
    // Complex rotation avoids a transcendental call for every output sample.
    const real = decay * Math.cos(omega);
    const imaginary = decay * Math.sin(omega);
    let cosine = amplitude;
    let sine = 0;
    for (let i = 0; i < out.length; i++) {
      out[i] = (out[i] ?? 0) + sine;
      const next = cosine * real - sine * imaginary;
      sine = sine * real + cosine * imaginary;
      cosine = next;
    }
  }
  const attack = Math.max(1, Math.round(sampleRate * 0.003));
  const release = Math.max(1, Math.round(sampleRate * 0.05));
  for (let i = 0; i < out.length; i++)
    out[i] = ((out[i] ?? 0) / bound) * Math.min(1, i / attack, (out.length - 1 - i) / release);
  return out;
}

export class Lyre {
  private context: AudioContext | null = null;
  private voices: (AudioBufferSourceNode | OscillatorNode)[] = [];
  private callbacks = new Set<number>();
  private gain: GainNode | null = null;
  private generation = 0;

  constructor(private readonly onError: (message: string) => void = () => {}) {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.stop();
    });
    window.addEventListener("pagehide", () => this.stop());
  }

  private ctx(): AudioContext {
    this.context ??= new AudioContext();
    return this.context;
  }

  /** The newest action owns playback, even when audio permission resolves later. */
  private start(run: (ctx: AudioContext, gain: GainNode) => void | Promise<void>): void {
    this.stop();
    const request = this.generation;
    const begin = async () => {
      const ctx = this.ctx();
      await ctx.resume();
      if (request !== this.generation || document.hidden) return;
      if (ctx.state !== "running") throw new Error("Audio is paused by the browser.");
      const gain = ctx.createGain();
      gain.gain.value = PLUCK_GAIN;
      gain.connect(ctx.destination);
      this.gain = gain;
      await run(ctx, gain);
    };
    void begin().catch(() => {
      if (request !== this.generation) return;
      this.stop();
      this.onError("Sound could not start. Check the browser’s sound permission, then play again.");
    });
  }

  private track(source: AudioBufferSourceNode | OscillatorNode, gain: GainNode): void {
    this.voices.push(source);
    source.onended = () => {
      source.disconnect();
      this.voices = this.voices.filter((voice) => voice !== source);
      if (this.voices.length === 0 && this.gain === gain) {
        gain.disconnect();
        this.gain = null;
      }
    };
  }

  /** Schedule the visual cue on the audio clock, including browser suspension. */
  private cue(ctx: AudioContext, at: number, callback: () => void): void {
    const request = this.generation;
    const tick = () => {
      if (request !== this.generation) return;
      const remaining = at - ctx.currentTime;
      if (remaining <= 0) callback();
      else {
        const timer = window.setTimeout(
          () => {
            this.callbacks.delete(timer);
            tick();
          },
          Math.min(50, Math.max(5, remaining * 1000)),
        );
        this.callbacks.add(timer);
      }
    };
    tick();
  }

  play(
    frequencies: (number | number[])[],
    gap = PLUCK_GAP,
    onNote?: (index: number) => void,
  ): void {
    this.start(async (ctx, gain) => {
      // Render before choosing the start time; slow devices must not receive
      // already-past start times while the remaining notes are being prepared.
      const buffers = frequencies.map((step) =>
        (Array.isArray(step) ? step : [step]).map((f) => {
          const samples = pluckSamples(f, ctx.sampleRate, PLUCK_SECONDS);
          const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
          buffer.copyToChannel(samples, 0);
          return buffer;
        }),
      );
      // currentTime may remain the main thread’s old snapshot throughout the
      // synchronous render. Let the browser publish the running audio clock
      // before scheduling; otherwise Firefox can receive a past first onset.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      if (this.gain !== gain || document.hidden || ctx.state !== "running") return;
      const start = ctx.currentTime + 0.05;
      buffers.forEach((chord, i) => {
        for (const buffer of chord) {
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(gain);
          this.track(source, gain);
          source.start(start + i * gap);
        }
        if (onNote) this.cue(ctx, start + i * gap, () => onNote(i));
      });
    });
  }

  /** A pure-sine reference deliberately removes the pluck’s harmonics. */
  playSines(frequencies: number[]): void {
    this.start((ctx, gain) => {
      const start = ctx.currentTime + 0.03;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.05);
      gain.gain.setValueAtTime(0.15, start + 1.8);
      gain.gain.linearRampToValueAtTime(0, start + 2);
      for (const hz of frequencies) {
        const source = ctx.createOscillator();
        source.type = "sine";
        source.frequency.value = hz;
        source.connect(gain);
        this.track(source, gain);
        source.start(start);
        source.stop(start + 2.02);
      }
    });
  }

  stop(): void {
    this.generation++;
    for (const timer of this.callbacks) window.clearTimeout(timer);
    this.callbacks.clear();
    this.gain?.disconnect();
    this.gain = null;
    for (const voice of this.voices) {
      try {
        voice.stop();
      } catch {
        /* Already finished. */
      }
      voice.disconnect();
    }
    this.voices = [];
  }
}

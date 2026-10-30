/** A deterministic teaching signal, not an ancient instrument or performance. */
export const SAMPLE_RATE = 44100;
export const NOTE_SECONDS = 0.38;
export const NOTE_GAP = 0.46;
export const LANE_PAUSE = 0.65;
export interface ToneEvent {
  hz: number;
  start: number;
  duration: number;
}

export function sequence(lanes: readonly (readonly number[])[]): ToneEvent[] {
  const events: ToneEvent[] = [];
  let offset = 0;
  for (const notes of lanes) {
    notes.forEach((hz, i) => {
      events.push({ hz, start: offset + i * NOTE_GAP, duration: NOTE_SECONDS });
    });
    offset += notes.length * NOTE_GAP + LANE_PAUSE;
  }
  return events;
}

/** Mono 16-bit PCM WAV; 20 ms ramps avoid clicks and leave each pitch measurable. */
export function wave(events: readonly ToneEvent[]): Uint8Array<ArrayBuffer> {
  const seconds = Math.max(0, ...events.map((e) => e.start + e.duration)) + 0.12;
  const count = Math.ceil(seconds * SAMPLE_RATE);
  const samples = new Float64Array(count);
  for (const event of events) {
    const first = Math.round(event.start * SAMPLE_RATE);
    const length = Math.round(event.duration * SAMPLE_RATE);
    const ramp = Math.round(0.02 * SAMPLE_RATE);
    for (let i = 0; i < length; i++) {
      const envelope = Math.min(1, i / ramp, (length - 1 - i) / ramp);
      const at = first + i;
      if (at < samples.length)
        samples[at] =
          (samples[at] ?? 0) +
          0.24 * envelope * Math.sin((2 * Math.PI * event.hz * i) / SAMPLE_RATE);
    }
  }
  const bytes = new Uint8Array(44 + count * 2);
  const data = new DataView(bytes.buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) data.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, "RIFF");
  data.setUint32(4, bytes.length - 8, true);
  text(8, "WAVE");
  text(12, "fmt ");
  data.setUint32(16, 16, true);
  data.setUint16(20, 1, true);
  data.setUint16(22, 1, true);
  data.setUint32(24, SAMPLE_RATE, true);
  data.setUint32(28, SAMPLE_RATE * 2, true);
  data.setUint16(32, 2, true);
  data.setUint16(34, 16, true);
  text(36, "data");
  data.setUint32(40, count * 2, true);
  samples.forEach((s, i) => {
    data.setInt16(44 + 2 * i, Math.round(Math.max(-1, Math.min(1, s)) * 32767), true);
  });
  return bytes;
}

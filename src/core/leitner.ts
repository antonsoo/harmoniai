/**
 * A Leitner schedule: every word sits in a box from 1 to 5. A right answer moves it up a
 * box, a wrong one sends it back to box 1, and low boxes come up more often.
 */
export const BOXES = 5;

export type Boxes = Record<string, number>;

export function boxOf(boxes: Boxes, id: string): number {
  const b = boxes[id];
  return b && b >= 1 && b <= BOXES ? b : 1;
}

export function grade(boxes: Boxes, id: string, correct: boolean): Boxes {
  return { ...boxes, [id]: correct ? Math.min(BOXES, boxOf(boxes, id) + 1) : 1 };
}

/**
 * Choose the next word. Weight halves with each box, so box 1 words come up sixteen times
 * as often as box 5 words. The word just asked is skipped when there is any other choice.
 */
export function pickNext(
  ids: readonly string[],
  boxes: Boxes,
  last: string | null,
  random: () => number,
): string {
  const pool = ids.length > 1 ? ids.filter((id) => id !== last) : [...ids];
  if (pool.length === 0) throw new Error("Cannot pick from an empty deck");
  const weights = pool.map((id) => 2 ** (BOXES - boxOf(boxes, id)));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i] ?? 0;
    if (r < 0) return pool[i] as string;
  }
  return pool.at(-1) as string;
}

/** Up to `count` distractors for a multiple-choice question, never including the answer. */
export function distractors(
  ids: readonly string[],
  answer: string,
  count: number,
  random: () => number,
): string[] {
  const others = ids.filter((id) => id !== answer);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [others[i], others[j]] = [others[j] as string, others[i] as string];
  }
  return others.slice(0, count);
}

/** How many words sit in each box. */
export function tally(ids: readonly string[], boxes: Boxes): number[] {
  const counts = Array.from({ length: BOXES }, () => 0);
  for (const id of ids) counts[boxOf(boxes, id) - 1] = (counts[boxOf(boxes, id) - 1] ?? 0) + 1;
  return counts;
}

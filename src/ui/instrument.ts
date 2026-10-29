import { NOTES, type Species, STEPS } from "../core/system";

export type Orientation = "named" | "pitch";

const W = 960;
const ROW = 36;
const TOP = 36;
const X0 = 318;
const X1 = 742;

/** Vertical position of a note: as named, hypatē sits above nētē although it sounds lower. */
export function rowOf(index: number, orientation: Orientation): number {
  const row = orientation === "named" ? index : NOTES.length - 1 - index;
  return TOP + row * ROW;
}

const esc = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;");

const TETRACHORDS: [string, string, number, number][] = [
  ["ὑπάτων", "hypatōn", 1, 4],
  ["μέσων", "mesōn", 4, 7],
  ["διεζευγμένων", "diezeugmenōn", 8, 11],
  ["ὑπερβολαίων", "hyperbolaiōn", 11, 14],
];

export function instrumentSvg(
  species: Species | null,
  orientation: Orientation,
  labelled: boolean,
): string {
  const H = TOP * 2 + (NOTES.length - 1) * ROW;
  const parts: string[] = [];
  if (species) {
    const a = rowOf(species.from, orientation);
    const b = rowOf(species.from + 7, orientation);
    const y = Math.min(a, b) - ROW / 2 + 3;
    parts.push(
      `<rect class="band" x="${X0 - 12}" y="${y}" width="${X1 - X0 + 48}" height="${Math.abs(b - a) + ROW - 6}" rx="6"/>`,
    );
  }
  // Tetrachord brackets at the right.
  for (const [greek, rom, lo, hi] of TETRACHORDS) {
    const ya = rowOf(lo, orientation);
    const yb = rowOf(hi, orientation);
    const y0 = Math.min(ya, yb);
    const y1 = Math.max(ya, yb);
    parts.push(`<path class="bracket" d="M${X1 + 56} ${y0} h6 V${y1} h-6"/>`);
    parts.push(
      `<text class="tetra" x="${X1 + 72}" y="${(y0 + y1) / 2 - 2}" lang="grc">${greek}</text><text class="tetra-rom" x="${X1 + 72}" y="${(y0 + y1) / 2 + 15}">${rom}</text>`,
    );
  }
  // Step sizes between neighbouring strings.
  STEPS.forEach((step, i) => {
    const y = (rowOf(i, orientation) + rowOf(i + 1, orientation)) / 2;
    const inside = species && i >= species.from && i < species.from + 7;
    parts.push(
      `<text class="step${step === "S" ? " semi" : ""}${inside ? " inside" : ""}" x="${X1 + 26}" y="${y + 5}">${step === "S" ? "½" : "1"}</text>`,
    );
  });
  for (const note of NOTES) {
    const y = rowOf(note.index, orientation);
    const inSpecies = species
      ? note.index >= species.from && note.index <= species.from + 7
      : false;
    const weight = 2.6 - (note.index / 14) * 1.7;
    parts.push(`<g class="string${inSpecies ? " in" : ""}" data-note="${note.index}" tabindex="0" role="button">
<rect class="hit" x="${X0 - 300}" y="${y - ROW / 2}" width="${X1 - X0 + 300}" height="${ROW}"/>
<path class="wire" d="M${X0} ${y} L${X1} ${y}" style="stroke-width:${weight.toFixed(2)}px"/>
<circle class="peg" cx="${X0}" cy="${y}" r="3.2"/><circle class="peg" cx="${X1}" cy="${y}" r="3.2"/>
${labelled ? `<text class="gname" x="${X0 - 20}" y="${y + 1}" lang="grc">${esc(note.greek)}</text><text class="rname" x="${X0 - 20}" y="${y + 15}">${esc(note.romanized)}</text>` : ""}
<text class="letter" x="${X1 - 2}" y="${y - 6}">${note.letter}</text>
</g>`);
  }
  return `<svg class="instrument" viewBox="0 0 ${W} ${H}" role="group" aria-label="Fifteen strings of the Greater Perfect System">${parts.join("")}</svg>`;
}

/** Shake a string for a moment after it is plucked; skipped when the reader prefers less motion. */
export function vibrate(svg: SVGSVGElement, index: number, orientation: Orientation): void {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const wire = svg.querySelector<SVGPathElement>(`[data-note="${index}"] .wire`);
  if (!wire) return;
  const y = rowOf(index, orientation);
  const start = performance.now();
  const cycles = 3 + (14 - index) * 0.15;
  const frame = (now: number) => {
    if (!wire.isConnected) return;
    const t = (now - start) / 900;
    if (t >= 1) {
      wire.setAttribute("d", `M${X0} ${y} L${X1} ${y}`);
      return;
    }
    const amp = 6 * (1 - t) ** 2;
    const phase = Math.sin(now / 18);
    const pts: string[] = [];
    for (let k = 0; k <= 40; k++) {
      const x = X0 + ((X1 - X0) * k) / 40;
      pts.push(
        `${k ? "L" : "M"}${x.toFixed(1)} ${(y + amp * phase * Math.sin((Math.PI * k * cycles) / 40 / cycles)).toFixed(2)}`,
      );
    }
    wire.setAttribute("d", pts.join(" "));
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

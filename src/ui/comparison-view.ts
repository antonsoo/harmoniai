import { DIATONIC_READINGS, GENUS_BRIDGE, MODERN_SOURCE } from "../content/diatonic";
import { CLEONIDES_SPECIES } from "../content/sources";
import { type ComparisonState, compare } from "../core/comparison";
import type { Step } from "../core/system";

export const esc = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
export const stepText = (steps: readonly Step[]) =>
  steps.map((s) => (s === "T" ? "T" : "S")).join(" · ");
export const tuningText = (state: ComparisonState) =>
  state.tuning === "pythagorean"
    ? "9:8 tones and 256:243 small steps"
    : "200-cent tones and 100-cent half-tones";

export function finding(state: ComparisonState): string {
  const c = compare(state);
  return c.differences.length
    ? `Degrees ${c.differences.join(" and ")} differ. The shared name does not preserve the interval order.`
    : `All eight pitches agree. Cleonides’ ${state.name} has the interval order called ${c.modernName} today.`;
}

export function laneDrawing(
  steps: readonly Step[],
  cents: readonly number[],
  label: string,
): string {
  const x = (i: number) => 30 + i * 65;
  const y = (c: number) => 180 - c / 8;
  return `<svg viewBox="0 0 520 230" role="img" aria-label="${esc(label)}: ${stepText(steps)}; pitches rise from zero to 1200 cents">
  <line x1="30" y1="180" x2="485" y2="180" class="pitch-base"/>
  <line x1="30" y1="30" x2="485" y2="30" class="pitch-base"/>
  <polyline class="pitch-line" points="${cents.map((c, i) => `${x(i)},${y(c)}`).join(" ")}"/>
  ${cents.map((c, i) => `<circle cx="${x(i)}" cy="${y(c)}" r="5"/><text x="${x(i)}" y="210" text-anchor="middle">${i + 1}</text>${i < 7 ? `<text x="${x(i) + 32}" y="${y((c + (cents[i + 1] ?? 0)) / 2) - 12}" text-anchor="middle">${steps[i]}</text>` : ""}`).join("")}
  </svg>`;
}

export function lanes(state: ComparisonState): string {
  const c = compare(state);
  return `<div class="listening-lanes"><figure class="lane ancient"><figcaption><span class="lane-label">A · Cleonides</span><h2><span lang="grc">${c.greek.greek}</span> ${c.greek.name}</h2></figcaption>${laneDrawing(c.ancientSteps, c.a.cents, `Cleonides ${state.name}`)}<p>${stepText(c.ancientSteps)}</p></figure>
  <figure class="lane modern"><figcaption><span class="lane-label">B · Modern name</span><h2>${c.modernName}</h2></figcaption>${laneDrawing(c.modernSteps, c.b.cents, `Modern ${c.modernName}`)}<p>${stepText(c.modernSteps)}</p></figure></div>`;
}

export function degreeTable(state: ComparisonState, interactive = true): string {
  const c = compare(state);
  return `<div class="degree-table-wrap"><table class="degree-table"><caption>Same starting pitch, ${state.start} Hz. Differences are B minus A, in cents.</caption><thead><tr><th scope="col">Degree</th><th scope="col">A · Hz</th><th scope="col">B · Hz</th><th scope="col">Difference</th>${interactive ? '<th scope="col">Listen</th>' : ""}</tr></thead><tbody>${c.a.hz
    .map((f, i) => {
      const delta = (c.b.cents[i] ?? 0) - (c.a.cents[i] ?? 0);
      return `<tr${Math.abs(delta) > 1e-8 ? ' class="changed"' : ""}><th scope="row">${i + 1}</th><td>${f.toFixed(3)}</td><td>${(c.b.hz[i] ?? 0).toFixed(3)}</td><td>${Math.abs(delta) < 1e-8 ? "same" : `${delta > 0 ? "+" : ""}${delta.toFixed(3)}`}</td>${interactive ? `<td><button type="button" data-degree="${i}" aria-label="Hear degree ${i + 1}, A then B">A, B</button></td>` : ""}</tr>`;
    })
    .join("")}</tbody></table></div>`;
}

export function reading(state: ComparisonState): string {
  const c = compare(state);
  const named = CLEONIDES_SPECIES[c.greek.ordinal];
  const interval = DIATONIC_READINGS[state.name];
  if (!named || !interval) throw new Error("Reading unavailable");
  return `<h3>The named span</h3><blockquote><p lang="grc">${esc(named.greek)}</p><p>${esc(named.english)}</p><cite>${esc(named.cite)}. Ellipses mark omissions.</cite></blockquote>
  <h3>The diatonic intervals</h3><blockquote><p lang="grc">… ${esc(interval.greek)} …</p><p>${esc(interval.english)}</p><cite>Cleonides 9; Jan p. 198, lines 14–19. Square brackets supply words understood from the preceding clause.</cite></blockquote>
  <p>Count the spaces between notes, starting at each end: Cleonides places these two small steps ${c.greek.semitone.fromLow} from the low end and ${c.greek.semitone.fromHigh} from the high end. <span lang="grc">βαρύ</span> is “low”; <span lang="grc">ὀξύ</span> is “high”; <span lang="grc">ἡμιτόνιον</span> is “half-tone”.</p>
  <details><summary>Why these names apply to the diatonic example</summary><p>The preceding named spans are introduced in the enharmonic discussion. After listing the diatonic half-step positions, Cleonides explicitly carries the names across:</p><blockquote><p lang="grc">${esc(GENUS_BRIDGE.greek)}</p><p>${esc(GENUS_BRIDGE.english)}</p><cite>Jan p. 199, lines 1–3. New literal translation; “enharmonic” translates ἁρμονία in this passage.</cite></blockquote></details>
  <p class="small">Modern names: <a href="${MODERN_SOURCE}">Steps to Music Theory, §11.1</a>. Matching an interval order does not equate ancient performance, melodic practice, tuning or ethos with a modern mode.</p>`;
}

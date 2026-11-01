import { sequence, wave } from "./audio/comparison";
import { PLATES } from "./content/plates";
import { type ComparisonState, compare, comparisonQuery } from "./core/comparison";
import { dataUrl, FONTS, verified } from "./study-assets";
import { degreeTable, esc, finding, lanes, reading, tuningText } from "./ui/comparison-view";

export { dataUrl, FONTS, verified } from "./study-assets";

export function comparisonWave(state: ComparisonState) {
  const c = compare(state);
  return wave(sequence([c.a.hz, c.b.hz]));
}

export function csv(state: ComparisonState): string {
  const c = compare(state);
  const rows: (string | number)[][] = [
    [
      "degree",
      "cleonides_name",
      "modern_name",
      "tuning",
      "starting_hz",
      "a_hz",
      "b_hz",
      "a_cents",
      "b_cents",
      "b_minus_a_cents",
      "source",
    ],
  ];
  c.a.hz.forEach((f, i) => {
    rows.push([
      i + 1,
      state.name,
      c.modernName ?? "",
      tuningText(state),
      state.start,
      f,
      c.b.hz[i] ?? 0,
      c.a.cents[i] ?? 0,
      c.b.cents[i] ?? 0,
      (c.b.cents[i] ?? 0) - (c.a.cents[i] ?? 0),
      "Cleonides 9; Jan 1895 pp. 197–199; modern comparison, not recovered performance",
    ]);
  });
  return `${rows
    .map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
    .join("\r\n")}\r\n`;
}

export async function illustratedReading(state: ComparisonState): Promise<string> {
  // The caller passes a snapshot. Loading sources must not change what gets saved.
  const [plates, fonts, license, codeLicense] = await Promise.all([
    Promise.all(
      PLATES.map(async (p) => ({
        ...p,
        data: dataUrl(
          await verified(`${import.meta.env.BASE_URL}${p.path}`, p.sha256),
          "image/jpeg",
        ),
      })),
    ),
    Promise.all(
      FONTS.map(async (f) => ({
        ...f,
        data: dataUrl(await verified(f.url, f.hash), "font/woff2"),
      })),
    ),
    verified(
      `${import.meta.env.BASE_URL}FONT-LICENSE.txt`,
      "21675d953c0ac998c715f200b106198ec59952b6a05d06988c72524020be1c86",
    ),
    verified(
      `${import.meta.env.BASE_URL}LICENSE.txt`,
      "f4cec46403514e2601f3b917ad36bfc8cd9a6d97359ac2f9bb554d2062a251eb",
    ),
  ]);
  const c = compare(state);
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Which ${state.name}? Harmoniai listening edition</title>
  <style>${fonts.map((f) => `@font-face{font-family:Reading;src:url(${f.data}) format('woff2');unicode-range:${f.range}}`).join("")}
  body{font:20px/1.55 Reading,Georgia,serif;color:#24182b;background:#fbfafc;max-width:68rem;margin:2rem auto;padding:0 1rem}h1,h2,h3{font-weight:400;line-height:1.2}h1{color:#6b2a62}a{color:#6b2a62}figure{margin:0}blockquote{margin:1rem 0;padding:0 1rem;border-left:2px solid #6b2a62}cite,.small{font-size:.9em}audio{width:100%}.listening-lanes{display:grid;grid-template-columns:1fr 1fr;gap:2rem}.lane svg{width:100%;fill:#6b2a62}.modern svg{fill:#2c7366}.pitch-line{fill:none;stroke:currentColor;stroke-width:2}.pitch-base{stroke:#d8cfdc;stroke-dasharray:3 4}.lane-label{font-size:.9em}.lane p{letter-spacing:.1em}table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}th,td{padding:.4rem;border-bottom:1px solid #d8cfdc;text-align:right}th:first-child{text-align:left}.changed{background:#eee3ed}caption{text-align:left;margin:1rem 0}img{max-width:100%;height:auto}.source{margin:2rem 0;break-before:page}.source figcaption{margin-bottom:1rem}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.4 Reading,serif}details{margin:1rem 0}summary{cursor:pointer}svg text{font:18px Reading,serif}.degree-table-wrap{overflow:auto}@media(max-width:600px){.listening-lanes{grid-template-columns:1fr}body{font-size:18px}}@media print{body{margin:0;background:white;font-size:11pt}audio,.download-note{display:none}details> *{display:block}summary{display:none}a{color:inherit}img{max-height:240mm;width:auto;display:block;margin:auto}table{break-inside:avoid}@page{size:A4;margin:15mm}}
  </style><h1>Which ${state.name}?</h1><p>A: Cleonides’ ${state.name}. B: modern ${c.modernName}. Both start at ${state.start} Hz, using ${tuningText(state)}.</p><p>${finding(state)}</p>${lanes(state)}
  <h2>Listen: A, then B</h2><audio controls preload="metadata" src="${dataUrl(comparisonWave(state), "audio/wav")}"></audio><p>Eight ascending notes in A, a pause, then eight in B. Pure sine tones; this sound and the shared starting pitch are modern teaching choices. The modern label identifies an interval order, not a historical tuning. This is not a reconstruction of ancient performance.</p>
  ${degreeTable(state, false)}<h2>Read Cleonides</h2>${reading(state).replace("<details>", "<details open>")}
  <p class="download-note">This file includes the sound, all three complete source pages and four font subsets. It opens offline without scripts. External links need a connection. <a href="https://antonsoo.github.io/harmoniai/compare.html?${esc(comparisonQuery(state))}#listen">Reopen this comparison in Harmoniai</a>.</p>
  ${plates.map((p) => `<figure class="source"><figcaption>Cleonides, Jan 1895, printed p. ${p.page}. Complete page, public domain. <a href="${p.url}">Internet Archive image</a>.</figcaption><img src="${p.data}" alt="Complete printed page ${p.page} of Jan's 1895 edition of Cleonides"></figure>`).join("")}
  <h2>Credits and license</h2><p>Greek from K. von Jan, <i>Musici scriptores Graeci</i> (Leipzig: Teubner, 1895), pp. 197–199, public domain. Initial capitalization, apostrophes and punctuation normalized; omissions marked. English and diagrams are new, MIT licensed, © 2026 Anthony Mercer. Translations have not had independent philological review. Modern interval orders referenced to <i>Steps to Music Theory</i>, §11.1; no scores or recordings copied.</p><details><summary>MIT license</summary><pre>${esc(new TextDecoder().decode(codeLicense))}</pre></details><details><summary>Included font licenses</summary><pre>${esc(new TextDecoder().decode(license))}</pre></details></html>`;
}

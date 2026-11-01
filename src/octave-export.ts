import { pluckedWave } from "./audio/octave";
import { PLATES } from "./content/plates";
import { CLEONIDES_SPECIES } from "./content/sources";
import {
  type OctaveState,
  octaveOrder,
  octaveQuery,
  octaveRows,
  selectedSpecies,
  tuningName,
} from "./core/octave";
import { stepCents } from "./core/system";
import { dataUrl, FONT_NOTICE, FONTS, verified } from "./study-assets";
import { esc } from "./ui/comparison-view";
import { instrumentSvg } from "./ui/instrument";

export function octaveCsv(state: OctaveState): string {
  const rows: (string | number | boolean)[][] = [
    [
      "string_index",
      "greek",
      "romanized",
      "literal_name",
      "modern_key_position",
      "in_selected_octave",
      "selected_string",
      "target_hz",
      "cents_from_mese",
      "mese_hz",
      "model",
      "cleonides_species",
      "scope",
    ],
  ];
  for (const r of octaveRows(state))
    rows.push([
      r.index,
      r.greek,
      r.romanized,
      r.english,
      r.letter,
      r.inOctave,
      r.index === state.selected,
      r.hz,
      r.centsFromMese,
      state.mese,
      tuningName(state.tuning),
      selectedSpecies(state).name,
      "Modern pitch realization; not recovered ancient performance",
    ]);
  return (
    rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\r\n") +
    "\r\n"
  );
}
export function octaveTable(state: OctaveState, interactive: boolean): string {
  return `<div class="octave-table-scroll" role="region" aria-label="String pitches" tabindex="0"><table class="octave-table"><caption>Fifteen named positions; the band marks Cleonides’ ${selectedSpecies(state).name}.</caption><thead><tr><th scope="col">String, from low pitch</th><th scope="col">Hz</th><th scope="col">Cents from mesē</th></tr></thead><tbody>${octaveRows(
    state,
  )
    .map(
      (r) =>
        `<tr data-pitch-row="${r.index}" class="${r.inOctave ? "in-octave" : ""}${r.index === state.selected ? " selected-pitch" : ""}"><th scope="row">${interactive ? `<button type="button" data-play-note="${r.index}" aria-pressed="${r.index === state.selected}"><span lang="grc">${esc(r.greek)}</span><small>${esc(r.romanized)}</small></button>` : `<span lang="grc">${esc(r.greek)}</span><small>${esc(r.romanized)}</small>`}</th><td>${r.hz.toFixed(4)}</td><td>${r.centsFromMese.toFixed(3)}</td></tr>`,
    )
    .join("")}</tbody></table></div>`;
}
export async function octaveReading(state: OctaveState, signal?: AbortSignal): Promise<string> {
  const [plates, fonts, license, code] = await Promise.all([
    Promise.all(
      PLATES.map(async (p) => ({
        ...p,
        data: dataUrl(
          await verified(`${import.meta.env.BASE_URL}${p.path}`, p.sha256, signal),
          "image/jpeg",
        ),
      })),
    ),
    Promise.all(
      FONTS.map(async (f) => ({
        ...f,
        data: dataUrl(await verified(f.url, f.hash, signal), "font/woff2"),
      })),
    ),
    verified(`${import.meta.env.BASE_URL}${FONT_NOTICE.path}`, FONT_NOTICE.sha256, signal),
    verified(
      `${import.meta.env.BASE_URL}LICENSE.txt`,
      "f4cec46403514e2601f3b917ad36bfc8cd9a6d97359ac2f9bb554d2062a251eb",
      signal,
    ),
  ]);
  const species = selectedSpecies(state);
  const rows = octaveRows(state);
  const passage = CLEONIDES_SPECIES[state.species];
  const pitches = octaveOrder(state).map((i) => rows[i]?.hz as number);
  signal?.throwIfAborted();
  const sound = dataUrl(pluckedWave(pitches), "audio/wav");
  const diagram = instrumentSvg(species, state.orientation, true)
    .replaceAll(' tabindex="0"', "")
    .replaceAll(' role="button"', "")
    .replace('role="group"', 'role="img"');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${species.name}: a named octave | Harmoniai</title><style>
${fonts.map((f) => `@font-face{font-family:Reading;src:url(${f.data}) format('woff2');unicode-range:${f.range}}`).join("")}
.instrument{width:100%;height:auto}.instrument .hit{fill:transparent}.instrument .band{fill:#eee3ed;stroke:#6b2a62}.instrument .wire{fill:none;stroke:#8a6418}.instrument .in .wire{stroke:#6b2a62}.instrument .peg{fill:#5b4d61}.instrument .bracket{fill:none;stroke:#5b4d61}.gname,.rname,.letter{text-anchor:end}.gname{font-size:20px}.rname,.tetra-rom{font-size:13px;fill:#5b4d61}.letter,.step{font-size:15px}.step{text-anchor:middle}.tetra{font-size:18px}
body{font:20px/1.6 Reading,Georgia,serif;background:#fbfafc;color:#24182b;max-width:55rem;margin:2rem auto;padding:0 1rem}h1,h2{font-weight:400;line-height:1.2}h1,a{color:#6b2a62}audio{width:100%}blockquote{margin:1rem 0;padding:0 1rem;border-left:3px solid #6b2a62}.octave-table-scroll{overflow:auto}table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}th,td{padding:.35rem .5rem;border-bottom:1px solid #d8cfdc;text-align:right;white-space:nowrap}th{text-align:left;font-weight:400}caption{text-align:left;white-space:normal}small{display:block;color:#5b4d61}tr.in-octave{background:#eee3ed}.selected-pitch th{box-shadow:inset 3px 0 #6b2a62}figure{margin:2rem 0;break-before:page}img{max-width:100%;height:auto}pre{white-space:pre-wrap;overflow-wrap:anywhere}details{margin:1rem 0}@media(max-width:600px){body{font-size:18px}th,td{padding:.35rem}}@media print{h1,h2,h3{break-after:avoid}.octave-table-scroll{overflow:visible}tr{break-inside:avoid}body{font-size:11pt;margin:0;background:white}audio,.downloads{display:none}img{max-height:240mm;width:auto;display:block;margin:auto}details>*{display:block}summary{display:none}a{color:inherit}@page{size:A4;margin:15mm}}</style>
<h1><span lang="grc">${species.greek}</span> ${species.name}</h1><p>${tuningName(state.tuning)}. Mesē is held at ${state.mese} Hz. Selected string: <span lang="grc">${esc(rows[state.selected]?.greek ?? "")}</span>, ${(rows[state.selected]?.hz ?? 0).toFixed(4)} Hz.</p>
${diagram}<p>T = tone, ${stepCents("T", state.tuning).toFixed(3)} cents. S = small step, ${stepCents("S", state.tuning).toFixed(3)} cents. ${state.tuning === "pythagorean" ? `Two S steps are ${(stepCents("T", state.tuning) - 2 * stepCents("S", state.tuning)).toFixed(3)} cents smaller than T; “semitone” does not mean half of T in this ratio model.` : "Two S steps equal T in this equal-step model."}</p><p>The highlighted span marks the selected octave. Equal row spacing orders notes; it does not measure pitch distance or physical string lengths.</p><h2>Hear the octave, then return</h2><audio controls preload="metadata" src="${sound}"></audio><p>Eight ascending notes followed by seven descending notes. Synthetic harmonic plucks, 44,100 Hz mono PCM. Each note lasts 1.6 seconds; onsets are 0.42 seconds apart. Tails overlap as in the workshop.</p>
${octaveTable(state, false)}
<h2>Read the named span</h2>${passage ? `<blockquote><p lang="grc">${esc(passage.greek)}</p><p>${esc(passage.english)}</p><cite>${esc(passage.cite)}</cite></blockquote>` : ""}
<p>The half-step positions and named endpoints follow Cleonides. The numerical pitches, reference mesē and synthetic timbre are separate modern teaching choices. The equal-step option realizes tones as 200 cents and half-tones as 100; it does not establish that Aristoxenus prescribed modern equal temperament. The ratio option uses 9:8 and 256:243. White-key letters identify positions, not equal-tempered frequencies. No ancient instrument, absolute pitch, melody or performance is reconstructed.</p>
<p class="downloads"><a download="harmoniai-octave.csv" href="${dataUrl(new TextEncoder().encode(octaveCsv(state)), "text/csv")}">Keep all measurements as CSV</a>. <a download="harmoniai-octave.wav" href="${sound}">Keep the octave WAV</a>. <a href="https://antonsoo.github.io/harmoniai/?${esc(octaveQuery(state))}#strings">Reopen these settings</a>. This file embeds all three printed pages, sound, fonts and licenses. It opens without scripts or a connection; external links need a connection.</p>
${plates.map((p) => `<figure><figcaption>Cleonides in Jan (1895), complete printed p. ${p.page}. Public domain. <a href="${p.url}">Source image</a>.</figcaption><img src="${p.data}" alt="Complete printed page ${p.page} of Jan's edition"></figure>`).join("")}
<h2>Credits and licenses</h2><p>Greek excerpt from Karl von Jan, <i>Musici scriptores Graeci</i> (Leipzig: Teubner, 1895), pp. 197–199. Initial capitalization and punctuation normalized, omissions marked. New English and teaching content, © 2026 Anthony Mercer, MIT. The translation has not had independent philological review. Gentium Book Plus, SIL Open Font License.</p><details open><summary>Code and new content license</summary><pre>${esc(new TextDecoder().decode(code))}</pre></details><details open><summary>Complete font licenses</summary><pre>${esc(new TextDecoder().decode(license))}</pre></details></html>`;
}

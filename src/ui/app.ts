import { pluckedWave } from "../audio/octave";
import { Lyre } from "../audio/pluck";
import { AEGEAN, project } from "../content/aegean";
import {
  ARISTOTLE,
  CLEONIDES_DIATONIC,
  CLEONIDES_SPECIES,
  type Passage,
  PLATO,
} from "../content/sources";
import { WORDS } from "../content/words";
import { type Boxes, grade, pickNext } from "../core/leitner";
import {
  DEFAULT_OCTAVE,
  type OctaveState,
  octaveOrder,
  octaveQuery,
  octaveRows,
  readOctave,
  selectedSpecies,
  tuningName,
} from "../core/octave";
import {
  frequencies,
  NOTES,
  SPECIES,
  type Species,
  speciesSteps,
  type Tuning,
} from "../core/system";
import { octaveCsv, octaveReading, octaveTable } from "../octave-export";
import { instrumentSvg, type Orientation, vibrate } from "./instrument";

const esc = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const ORD = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh"];

function passage(p: Passage): string {
  return `<blockquote class="passage"><p lang="grc">${esc(p.greek)}</p><p class="en">${esc(p.english)}</p><cite><a href="${esc(p.url)}">${esc(p.cite)}</a></cite></blockquote>`;
}

function namesDiagram(selected: Species): string {
  const rowH = 52;
  const top = 44;
  const lx = 230;
  const rx = 540;
  const rows = SPECIES.map((s, i) => {
    const y = top + i * rowH;
    const sel = s === selected ? " sel" : "";
    const letters = `${NOTES[s.from]?.letter ?? ""}–${NOTES[s.from + 7]?.letter ?? ""}`;
    return `<g class="nrow${sel}" data-species="${s.ordinal}"><text class="nl" x="${lx - 14}" y="${y + 5}">${s.name}</text><text class="ng" x="${lx - 14}" y="${y + 21}" lang="grc">${s.greek}</text>
<line class="nline" x1="${lx}" y1="${y}" x2="${rx}" y2="${y}"/><text class="nletters" x="${lx + 12}" y="${y - 7}">${letters}</text>
<text class="nr" x="${rx + 14}" y="${y + 5}">${s.modern}</text></g>`;
  });
  // Dashed curves join a Greek name to the modern octave that now carries the same word.
  const friends = SPECIES.flatMap((g, i) => {
    const j = SPECIES.findIndex((m) => m.modern.split(" ")[0] === g.name);
    if (j < 0 || j === i) return [];
    const y0 = top + i * rowH + 12;
    const y1 = top + j * rowH + 12;
    return [
      `<path class="friend${g === selected ? " sel" : ""}" d="M${lx + 8} ${y0} C ${lx + 120} ${y0}, ${rx - 120} ${y1}, ${rx - 8} ${y1}"/>`,
    ];
  });
  return `<svg class="names" viewBox="0 0 760 ${top + 7 * rowH}" role="img" aria-label="Cleonides' names beside the modern names of the same octaves">
<text class="head" x="${lx - 14}" y="18">Cleonides</text><text class="head" x="${rx + 14}" y="18">Today</text>${friends.join("")}${rows.join("")}</svg>`;
}

/** Approximate homes of the peoples the harmoniai are named after, with the adverb LSJ records. */
const PLACES: {
  label: string;
  greek: string;
  place: string;
  lon: number;
  lat: number;
  dx: number;
  dy: number;
}[] = [
  { label: "Dorians", greek: "Δωριστί", place: "Sparta", lon: 22.43, lat: 37.07, dx: -10, dy: 26 },
  { label: "Locrians", greek: "Λοκριστί", place: "Opous", lon: 23.0, lat: 38.65, dx: -12, dy: -14 },
  { label: "Ionians", greek: "Ἰαστί", place: "Miletus", lon: 27.28, lat: 37.53, dx: 12, dy: 24 },
  { label: "Lydians", greek: "Λυδιστί", place: "Sardis", lon: 28.04, lat: 38.49, dx: 12, dy: -14 },
  {
    label: "Phrygians",
    greek: "Φρυγιστί",
    place: "Gordion",
    lon: 31.99,
    lat: 39.65,
    dx: -10,
    dy: -16,
  },
];

function mapSvg(): string {
  const land = AEGEAN.land.map((d) => `<path class="land" d="${d}"/>`).join("");
  const marks = PLACES.map((p) => {
    const [x, y] = project(p.lon, p.lat);
    const anchor = p.dx < 0 ? "end" : "start";
    return `<g class="place"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5"/><text class="pl" x="${(x + p.dx).toFixed(1)}" y="${(y + p.dy).toFixed(1)}" text-anchor="${anchor}">${p.label} <tspan lang="grc">${p.greek}</tspan></text><text class="pp" x="${(x + p.dx).toFixed(1)}" y="${(y + p.dy + 15).toFixed(1)}" text-anchor="${anchor}">${p.place}</text></g>`;
  }).join("");
  return `<svg class="map" viewBox="0 0 ${AEGEAN.width} ${AEGEAN.height}" role="img" aria-label="Map of the Aegean with the homes of the Dorians, Locrians, Ionians, Lydians and Phrygians"><rect class="sea" width="${AEGEAN.width}" height="${AEGEAN.height}"/>${land}${marks}<text class="sea-label" x="${(AEGEAN.width * 0.47).toFixed(0)}" y="${(AEGEAN.height * 0.55).toFixed(0)}">Aegean Sea</text></svg>`;
}

export function mount(root: HTMLElement): void {
  const lyre = new Lyre((message) => {
    const status = root.querySelector<HTMLElement>("#octave-status");
    if (status) status.textContent = message;
  });
  let incoming = { ...DEFAULT_OCTAVE };
  let linkError = "";
  try {
    incoming = readOctave(location.search);
  } catch (error) {
    linkError = `${(error as Error).message} Showing the starting octave.`;
  }
  let species: Species = selectedSpecies(incoming);
  let orientation: Orientation = incoming.orientation;
  let tuning: Tuning = incoming.tuning;
  let mese: OctaveState["mese"] = incoming.mese;
  let selected = incoming.selected;
  const snapshot = (): OctaveState => ({
    species: species.ordinal,
    orientation,
    tuning,
    mese,
    selected,
  });
  let drill = false;
  let target: number | null = null;
  let answered = false;
  let last: string | null = null;
  let boxes: Boxes = {};
  let score: [number, number] = [0, 0];

  root.innerHTML = `
<section class="hero" id="strings">
  <div class="hero-text">
    <h1>Seven octaves named after peoples</h1>
    <p>Greek theorists cut the two-octave scale into seven octaves and named them after the Dorians, Phrygians, Lydians and their neighbours. Medieval theory kept the names and moved them. Pluck the strings, choose an octave, and read Cleonides' Greek for it.</p>
  </div>
  <div class="bench">
    <div><div class="instrument-wrap" id="instrument"></div><div id="string-readout" class="string-readout" aria-live="polite" aria-atomic="true"></div></div>
    <div class="panel">
      <div class="species-picker" role="radiogroup" aria-label="Octave species">${SPECIES.map(
        (s) =>
          `<button type="button" role="radio" data-species="${s.ordinal}" aria-checked="false"><span lang="grc">${s.greek}</span><span class="en">${s.name}</span></button>`,
      ).join("")}</div>
      <div class="controls">
        <button type="button" class="primary" id="play">Play the octave</button>
        <button type="button" id="stop">Stop</button>
        <label>Tuning <select id="tuning"><option value="pythagorean">Ratio model (9:8, 256:243)</option><option value="aristoxenian">Equal-step model (200, 100 cents)</option></select></label>
        <label>Reference mesē <select id="mese"><option value="110">110 Hz</option><option value="220" selected>220 Hz</option><option value="330">330 Hz</option></select></label>
        <label class="check"><input type="checkbox" id="orient"> Highest pitch on top</label>
        <label class="check"><input type="checkbox" id="drill"> Find the string</label>
      </div>
      <div class="card" id="card" aria-live="polite"></div>
    </div>
  </div>
</section>
<section class="section octave-inspector" id="pitches">
  <h2>Keep the name. Inspect the pitch.</h2>
  <p>Mesē stays at your chosen reference while the tuning model changes. A letter beside a string identifies a white-key position; it does not promise an equal-tempered frequency. Pluck a string to inspect it, or open the pitch table and play its name.</p>
  <div id="pitch-work">
    <div class="controls"><button type="button" id="compare-string">Hear this string in both models</button><button type="button" id="save-note">Save this string WAV</button></div>
    <p id="string-comparison" class="small"></p>
    <details id="pitch-details"><summary>Read and play all fifteen named pitches</summary><div id="pitch-table"></div></details>
    <div class="controls octave-downloads"><button type="button" id="save-octave" class="primary">Save illustrated octave</button><button type="button" id="save-octave-wav">Save octave WAV</button><button type="button" id="save-pitches">Save pitch CSV</button><button type="button" id="copy-octave">Copy octave link</button></div>
    <p class="small">The illustrated file keeps your selected octave, Greek reading, all fifteen measurements, sound, three complete source pages and fonts. It opens offline and prints. The WAV follows the octave up and down, using the same synthetic plucks as this instrument.</p>
    <p class="small">Both numerical tunings and the reference pitch are teaching choices. Equal 200/100-cent steps illustrate tones and half-tones; this is not a claim that Aristoxenus prescribed modern equal temperament. Neither model reconstructs an ancient instrument or performance.</p>
  </div>
  <p id="drill-pitch-note" hidden>Leave “Find the string” to inspect names and save an octave.</p>
  <p id="octave-status" role="status" aria-live="polite"></p>
  <label id="octave-link-box" hidden>Octave link<input id="octave-link" type="url" readonly></label>
</section>
<section class="section" id="places">
  <h2>Where the names come from</h2>
  <div class="two">
    <div>
      <p>Each name is an adverb of a people: Δωριστί, 'in the Dorian way', is also how Greek says 'in the Dorian dialect', and Ἰαστί means both the Ionian harmonia and the Ionic dialect. The Dorians held much of the Peloponnese; the Ionians the coast of Anatolia; the Lydians, Croesus's kingdom inland from them, with its capital at Sardis; the Phrygians the high plateau beyond. Locris lay in central Greece.</p>
      <p class="muted">The dots mark one city for each people, for orientation. Whether a harmonia really came from the people it is named after is a separate question, which this page does not try to settle. Coastlines from Natural Earth.</p>
    </div>
    <figure class="map-wrap">${mapSvg()}</figure>
  </div>
</section>
<section class="section" id="names">
  <h2>The names moved</h2>
  <p><a href="./compare.html">Hear Greek Dorian and modern Dorian from the same starting pitch</a>, then isolate the degrees that changed. Save the sound, Greek reading and printed pages together.</p>
  <div class="names-layout">
    <div class="names-text">
      <p>Cleonides, a follower of Aristoxenus whose dates are uncertain, gives each octave by its first and last string and adds what "the ancients" called it. Lay his seven octaves on a modern keyboard's white keys and each starts on a different letter. Four of the seven names now belong to a different octave: the Greek Dorian, E to e, is today's Phrygian, and the Greek Phrygian is today's Dorian.</p>
      <p>Cleonides already records the drift: his seventh octave was also called Locrian, a name that now means B to b. The modern set comes from the church modes of medieval theory, which reused the Greek names for its own scales. In 1547 Heinrich Glarean's <i>Dodecachordon</i> added Aeolian and Ionian to make twelve, in the belief that he was restoring the ancient system.</p>
    </div>
    <figure class="names-wrap"><div id="names-diagram"></div><figcaption class="muted">Solid lines join the same octave on the white keys. Dashed curves join the same word: the Greek Dorian and the modern Dorian are different octaves.</figcaption></figure>
  </div>
</section>
<section class="section" id="highest">
  <h2>The highest string sounds lowest</h2>
  <div class="two">
    <div>
      <p>The note names come from the strings of a lyre, not from pitch. ὑπάτη means 'highest' (Zeus is ὕπατος, highest of the gods), yet LSJ defines the string as 'the highest of the three strings which formed the framework of the musical scale … but the lowest in pitch'. νήτη, from νεάτη, 'last, lowest', is the opposite: the lowest string, the highest note.</p>
      <p>The drawing above shows them as named, with ὑπάτη on top. Tick <i>Highest pitch on top</i> to turn it the modern way up. λιχανός, the string 'struck with the forefinger', is from λείχω, 'lick': the forefinger is the licking finger.</p>
    </div>
    <div>${passage(CLEONIDES_DIATONIC)}</div>
  </div>
</section>
<section class="section" id="ethos">
  <h2>What a harmonia does to you</h2>
  <p class="wide">Plato's Socrates bans the mournful and the slack harmoniai from his ideal city and keeps two. A generation later Aristotle describes what each one does to a listener. Whether their harmoniai were the same scales as Cleonides' octave species, written centuries later, is uncertain; the names are the same.</p>
  <div class="two">${passage(PLATO)}${passage(ARISTOTLE)}</div>
  <table class="ethos"><thead><tr><th scope="col">Harmonia</th><th scope="col">Plato, Republic III</th><th scope="col">Aristotle, Politics VIII</th></tr></thead><tbody>
  <tr><th scope="row">Mixolydian</th><td>mournful, removed</td><td>mournful, tense</td></tr>
  <tr><th scope="row">Lydian, Ionian</th><td>soft, for drinking; some 'slack'</td><td>the slack ones soften the mind</td></tr>
  <tr><th scope="row">Dorian</th><td>kept, for courage in war</td><td>alone settled and steady</td></tr>
  <tr><th scope="row">Phrygian</th><td>kept</td><td>makes listeners inspired</td></tr>
  </tbody></table>
</section>
<section class="section" id="words">
  <h2>Words of the strings</h2>
  <div class="words">${WORDS.map(
    (w) =>
      `<article class="word"><h3 lang="grc">${esc(w.greek)}</h3><p class="rom">${esc(w.romanized)}</p><p class="meaning">${esc(w.meaning)}</p><p>${esc(w.note)}</p><p class="src">${esc(w.source)}</p></article>`,
  ).join("")}</div>
</section>`;

  const instrument = root.querySelector<HTMLElement>("#instrument");
  const card = root.querySelector<HTMLElement>("#card");
  const names = root.querySelector<HTMLElement>("#names-diagram");
  if (!instrument || !card || !names) return;

  const svg = () => instrument.querySelector<SVGSVGElement>("svg");

  function showSelection(): void {
    const row = octaveRows(snapshot())[selected];
    const readout = root.querySelector<HTMLElement>("#string-readout");
    if (readout) {
      readout.hidden = drill;
      if (row)
        readout.innerHTML = `<span lang="grc">${esc(row.greek)}</span><strong>${row.hz.toFixed(4)} <small>Hz</small></strong><span>${esc(row.romanized)} · ${row.centsFromMese.toFixed(3)} cents from mesē</span>`;
    }
    for (const button of root.querySelectorAll<HTMLElement>(
      "#instrument [data-note], [data-play-note]",
    )) {
      const active = Number(button.dataset.note ?? button.dataset.playNote) === selected;
      button.classList.toggle("selected-string", active && !drill);
      button.setAttribute("aria-pressed", String(active && !drill));
    }
    for (const row of root.querySelectorAll<HTMLElement>("[data-pitch-row]"))
      row.classList.toggle("selected-pitch", Number(row.dataset.pitchRow) === selected);
    const a = frequencies("pythagorean", mese)[selected] ?? 0;
    const b = frequencies("aristoxenian", mese)[selected] ?? 0;
    const comparison = root.querySelector<HTMLElement>("#string-comparison");
    if (comparison)
      comparison.textContent = `First: ratio model, ${a.toFixed(4)} Hz. Then: equal-step model, ${b.toFixed(4)} Hz. Difference: ${(1200 * Math.log2(b / a)).toFixed(3)} cents. Mesē stays at ${mese} Hz in both.`;
  }
  function refreshPitches(): void {
    const table = root.querySelector<HTMLElement>("#pitch-table");
    if (table) table.innerHTML = octaveTable(snapshot(), true);
    const work = root.querySelector<HTMLElement>("#pitch-work");
    if (work) work.hidden = drill;
    const note = root.querySelector<HTMLElement>("#drill-pitch-note");
    if (note) note.hidden = !drill;
    showSelection();
  }

  function drawInstrument(): void {
    if (!instrument) return;
    instrument.innerHTML = instrumentSvg(drill ? null : species, orientation, !drill);
    showSelection();
  }

  function speciesCard(): string {
    const steps = speciesSteps(species);
    const quote = CLEONIDES_SPECIES[species.ordinal];
    const from = NOTES[species.from];
    const to = NOTES[species.from + 7];
    return `<p class="card-kicker">The ${ORD[species.ordinal]} octave species</p>
<h2><span lang="grc">${species.greek}</span> ${species.name}</h2>
<ol class="steps" aria-label="Steps from the lowest note">${steps.map((s) => `<li class="${s === "S" ? "semi" : ""}">${s === "S" ? "½" : "1"}</li>`).join("")}</ol>
<p class="small">From <span lang="grc">${esc(from?.greek ?? "")}</span> to <span lang="grc">${esc(to?.greek ?? "")}</span>. Cleonides places its half-steps ${ORD[species.semitone.fromLow]} from the bottom and ${ORD[species.semitone.fromHigh]} from the top.</p>
${quote ? passage(quote) : ""}
<p class="today">On white keys this octave runs ${from?.letter}–${to?.letter}. Today it is called <b>${species.modern}</b>.${species.alsoCalled ? ` Cleonides adds: <span lang="grc">${esc(species.alsoCalled.split(":")[0] ?? "")}</span>, ${esc(species.alsoCalled.split(":")[1]?.trim() ?? "")}.` : ""}</p>`;
  }

  function ask(): void {
    if (!card) return;
    const ids = NOTES.map((n) => String(n.index));
    const id = pickNext(ids, boxes, last, Math.random);
    last = id;
    target = Number(id);
    answered = false;
    const note = NOTES[target];
    card.innerHTML = `<p class="card-kicker">Find the string</p><h2 lang="grc">${esc(note?.greek ?? "")}</h2><p class="small">${esc(note?.romanized ?? "")}: ${esc(note?.english ?? "")}. Names are hidden on the strings; pluck the one you mean.</p><p class="small">${score[0]} of ${score[1]} right so far.</p>`;
  }

  function render(): void {
    drawInstrument();
    for (const b of root.querySelectorAll<HTMLButtonElement>(".species-picker button")) {
      b.setAttribute("aria-checked", String(Number(b.dataset.species) === species.ordinal));
      b.disabled = drill;
      b.tabIndex = Number(b.dataset.species) === species.ordinal ? 0 : -1;
    }
    const octavePlay = root.querySelector<HTMLButtonElement>("#play");
    if (octavePlay) octavePlay.disabled = drill;
    if (names) names.innerHTML = namesDiagram(species);
    if (drill) ask();
    else if (card) card.innerHTML = speciesCard();
    refreshPitches();
  }

  function pluck(index: number): void {
    const f = frequencies(tuning, mese)[index];
    if (f === undefined) return;
    selected = index;
    showSelection();
    lyre.play([f]);
    const s = svg();
    if (s) vibrate(s, index, orientation);
    if (drill && target !== null && !answered && card) {
      answered = true;
      const ok = index === target;
      boxes = grade(boxes, String(target), ok);
      score = [score[0] + (ok ? 1 : 0), score[1] + 1];
      const want = NOTES[target];
      const got = NOTES[index];
      card.innerHTML = `<p class="card-kicker">${ok ? "Right" : "Not that one"}</p><h2 lang="grc">${esc(want?.greek ?? "")}</h2><p>${ok ? "" : `You plucked <span lang="grc">${esc(got?.greek ?? "")}</span>. `}${esc(want?.literal ?? "")}</p><p class="small">${esc(want?.source ?? "")}</p><button type="button" class="primary" id="next">Next string</button>`;
      card.querySelector<HTMLButtonElement>("#next")?.addEventListener("click", () => {
        ask();
        instrument?.querySelector<SVGElement>("[data-note]")?.focus();
      });
    }
  }

  const tuningControl = root.querySelector<HTMLSelectElement>("#tuning");
  const meseControl = root.querySelector<HTMLSelectElement>("#mese");
  const orientControl = root.querySelector<HTMLInputElement>("#orient");
  if (tuningControl) tuningControl.value = tuning;
  if (meseControl) meseControl.value = String(mese);
  if (orientControl) orientControl.checked = orientation === "pitch";
  const status = root.querySelector<HTMLElement>("#octave-status");
  if (status) status.textContent = linkError;
  render();

  root.addEventListener("click", (e) => {
    const el = e.target as Element;
    const s = el.closest<HTMLElement>("[data-species]");
    if (s && !drill) {
      const found = SPECIES.find((x) => x.ordinal === Number(s.dataset.species));
      if (found) {
        lyre.stop();
        species = found;
        render();
      }
      return;
    }
    const string = el.closest<HTMLElement>("[data-note], [data-play-note]");
    if (string) pluck(Number(string.dataset.note ?? string.dataset.playNote));
  });
  root.addEventListener("keydown", (e) => {
    const picker = (e.target as Element).closest<HTMLButtonElement>(
      ".species-picker [data-species]",
    );
    if (
      picker &&
      !drill &&
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)
    ) {
      e.preventDefault();
      const current = Number(picker.dataset.species) - 1;
      const next =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? 6
            : (current + (["ArrowRight", "ArrowDown"].includes(e.key) ? 1 : 6)) % 7;
      const button = root.querySelector<HTMLButtonElement>(
        `.species-picker [data-species="${next + 1}"]`,
      );
      button?.click();
      button?.focus();
      return;
    }
    const string = (e.target as Element).closest?.("[data-note]");
    if (string && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      pluck(Number(string.getAttribute("data-note")));
    }
  });
  root.querySelector("#play")?.addEventListener("click", () => {
    const f = frequencies(tuning, mese);
    const order = octaveOrder(snapshot());
    lyre.play(
      order.map((i) => f[i] ?? 0),
      0.42,
      (k) => {
        const s = svg();
        const idx = order[k];
        if (s && idx !== undefined) {
          selected = idx;
          showSelection();
          vibrate(s, idx, orientation);
        }
      },
    );
  });
  root.querySelector("#stop")?.addEventListener("click", () => {
    lyre.stop();
    drawInstrument();
  });
  root.querySelector<HTMLSelectElement>("#tuning")?.addEventListener("change", (e) => {
    lyre.stop();
    drawInstrument();
    tuning =
      (e.target as HTMLSelectElement).value === "aristoxenian" ? "aristoxenian" : "pythagorean";
    refreshPitches();
  });
  meseControl?.addEventListener("change", () => {
    lyre.stop();
    mese = Number(meseControl.value) as OctaveState["mese"];
    refreshPitches();
  });
  root.querySelector<HTMLInputElement>("#orient")?.addEventListener("change", (e) => {
    lyre.stop();
    orientation = (e.target as HTMLInputElement).checked ? "pitch" : "named";
    drawInstrument();
  });
  root.querySelector<HTMLInputElement>("#drill")?.addEventListener("change", (e) => {
    lyre.stop();
    drill = (e.target as HTMLInputElement).checked;
    render();
  });

  function save(filename: string, data: BlobPart, type: string): void {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  root.querySelector("#compare-string")?.addEventListener("click", () => {
    lyre.play(
      [
        frequencies("pythagorean", mese)[selected] ?? 0,
        frequencies("aristoxenian", mese)[selected] ?? 0,
      ],
      1.8,
    );
    if (status)
      status.textContent =
        "Ratio model first, then equal-step model. The same named string and mesē reference are kept.";
  });
  root.querySelector("#save-note")?.addEventListener("click", () => {
    save(
      "harmoniai-string.wav",
      pluckedWave([frequencies(tuning, mese)[selected] ?? 0]),
      "audio/wav",
    );
  });
  root.querySelector("#save-octave-wav")?.addEventListener("click", () => {
    const state = snapshot();
    const rows = octaveRows(state);
    save(
      "harmoniai-octave.wav",
      pluckedWave(octaveOrder(state).map((i) => rows[i]?.hz ?? 0)),
      "audio/wav",
    );
  });
  root
    .querySelector("#save-pitches")
    ?.addEventListener("click", () =>
      save("harmoniai-pitches.csv", octaveCsv(snapshot()), "text/csv;charset=utf-8"),
    );
  let saving: AbortController | null = null;
  root
    .querySelector<HTMLButtonElement>("#save-octave")
    ?.addEventListener("click", async (event) => {
      if (saving) {
        saving.abort();
        return;
      }
      const state = snapshot();
      const button = event.currentTarget as HTMLButtonElement;
      const controller = new AbortController();
      saving = controller;
      button.textContent = "Cancel saving";
      if (status)
        status.textContent = `Saving ${selectedSpecies(state).name}, ${tuningName(state.tuning)}, mesē ${state.mese} Hz. Checking sources and fonts…`;
      try {
        const html = await octaveReading(state, controller.signal);
        save("harmoniai-octave.html", html, "text/html;charset=utf-8");
        if (status)
          status.textContent = `Saved ${selectedSpecies(state).name} at mesē ${state.mese} Hz with its sound and complete printed sources. Later changes are not in that file.`;
      } catch (error) {
        if (status)
          status.textContent = controller.signal.aborted
            ? "Saving cancelled. Your settings are still here."
            : `${(error as Error).message} Your settings are still here; try saving again.`;
      } finally {
        saving = null;
        button.textContent = "Save illustrated octave";
      }
    });
  root.querySelector("#copy-octave")?.addEventListener("click", async () => {
    const url = new URL(location.href);
    url.search = octaveQuery(snapshot());
    url.hash = "strings";
    const value = url.href;
    const box = root.querySelector<HTMLElement>("#octave-link-box");
    const field = root.querySelector<HTMLInputElement>("#octave-link");
    if (box && field) {
      box.hidden = false;
      field.value = value;
    }
    try {
      await navigator.clipboard.writeText(value);
      if (status)
        status.textContent =
          "Octave link copied. It keeps the species, model, mesē, orientation and selected string.";
    } catch {
      if (status) status.textContent = "Select and copy the octave link below.";
      field?.focus();
      field?.select();
    }
  });
}

import { Lyre } from "../audio/pluck";
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
  frequencies,
  NOTES,
  SPECIES,
  type Species,
  speciesSteps,
  type Tuning,
} from "../core/system";
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

export function mount(root: HTMLElement): void {
  const lyre = new Lyre();
  let species: Species = SPECIES[3] as Species;
  let orientation: Orientation = "named";
  let tuning: Tuning = "pythagorean";
  let drill = false;
  let target: number | null = null;
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
    <div class="instrument-wrap" id="instrument"></div>
    <div class="panel">
      <div class="species-picker" role="radiogroup" aria-label="Octave species">${SPECIES.map(
        (s) =>
          `<button type="button" role="radio" data-species="${s.ordinal}" aria-checked="false"><span lang="grc">${s.greek}</span><span class="en">${s.name}</span></button>`,
      ).join("")}</div>
      <div class="controls">
        <button type="button" class="primary" id="play">Play the octave</button>
        <button type="button" id="stop">Stop</button>
        <label>Tuning <select id="tuning"><option value="pythagorean">Pythagorean (9:8, 256:243)</option><option value="aristoxenian">Aristoxenian (tones and half-tones)</option></select></label>
        <label class="check"><input type="checkbox" id="orient"> Highest pitch on top</label>
        <label class="check"><input type="checkbox" id="drill"> Find the string</label>
      </div>
      <div class="card" id="card" aria-live="polite"></div>
    </div>
  </div>
</section>
<section class="section" id="names">
  <h2>The names moved</h2>
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

  function drawInstrument(): void {
    if (!instrument) return;
    instrument.innerHTML = instrumentSvg(drill ? null : species, orientation, !drill);
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
    const note = NOTES[target];
    card.innerHTML = `<p class="card-kicker">Find the string</p><h2 lang="grc">${esc(note?.greek ?? "")}</h2><p class="small">${esc(note?.romanized ?? "")}: ${esc(note?.english ?? "")}. Names are hidden on the strings; pluck the one you mean.</p><p class="small">${score[0]} of ${score[1]} right so far.</p>`;
  }

  function render(): void {
    drawInstrument();
    for (const b of root.querySelectorAll<HTMLButtonElement>(".species-picker button")) {
      b.setAttribute("aria-checked", String(Number(b.dataset.species) === species.ordinal));
    }
    if (names) names.innerHTML = namesDiagram(species);
    if (drill) ask();
    else if (card) card.innerHTML = speciesCard();
  }

  function pluck(index: number): void {
    const f = frequencies(tuning)[index];
    if (f === undefined) return;
    lyre.play([f]);
    const s = svg();
    if (s) vibrate(s, index, orientation);
    if (drill && target !== null && card) {
      const ok = index === target;
      boxes = grade(boxes, String(target), ok);
      score = [score[0] + (ok ? 1 : 0), score[1] + 1];
      const want = NOTES[target];
      const got = NOTES[index];
      card.innerHTML = `<p class="card-kicker">${ok ? "Right" : "Not that one"}</p><h2 lang="grc">${esc(want?.greek ?? "")}</h2><p>${ok ? "" : `You plucked <span lang="grc">${esc(got?.greek ?? "")}</span>. `}${esc(want?.literal ?? "")}</p><p class="small">${esc(want?.source ?? "")}</p><button type="button" class="primary" id="next">Next string</button>`;
      card.querySelector<HTMLButtonElement>("#next")?.addEventListener("click", ask);
    }
  }

  render();

  root.addEventListener("click", (e) => {
    const el = e.target as Element;
    const s = el.closest<HTMLElement>("[data-species]");
    if (s && !drill) {
      const found = SPECIES.find((x) => x.ordinal === Number(s.dataset.species));
      if (found) {
        species = found;
        render();
      }
      return;
    }
    const string = el.closest("[data-note]");
    if (string) pluck(Number(string.getAttribute("data-note")));
  });
  root.addEventListener("keydown", (e) => {
    const string = (e.target as Element).closest?.("[data-note]");
    if (string && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      pluck(Number(string.getAttribute("data-note")));
    }
  });
  root.querySelector("#play")?.addEventListener("click", () => {
    const f = frequencies(tuning);
    const up = Array.from({ length: 8 }, (_, k) => species.from + k);
    const order = [...up, ...up.slice(0, -1).reverse()];
    lyre.play(
      order.map((i) => f[i] ?? 0),
      0.42,
      (k) => {
        const s = svg();
        const idx = order[k];
        if (s && idx !== undefined) vibrate(s, idx, orientation);
      },
    );
  });
  root.querySelector("#stop")?.addEventListener("click", () => lyre.stop());
  root.querySelector<HTMLSelectElement>("#tuning")?.addEventListener("change", (e) => {
    tuning =
      (e.target as HTMLSelectElement).value === "aristoxenian" ? "aristoxenian" : "pythagorean";
  });
  root.querySelector<HTMLInputElement>("#orient")?.addEventListener("change", (e) => {
    orientation = (e.target as HTMLInputElement).checked ? "pitch" : "named";
    drawInstrument();
  });
  root.querySelector<HTMLInputElement>("#drill")?.addEventListener("change", (e) => {
    drill = (e.target as HTMLInputElement).checked;
    render();
  });
}

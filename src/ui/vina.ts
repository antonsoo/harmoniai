import { Lyre } from "../audio/pluck";
import {
  CONSONANCE,
  DEMONSTRATION,
  EARLIER_SETTING,
  EDITION,
  EDITION_URL,
  FINGERS,
  FIRST_NOTES,
  type Line,
  PRAMANA,
  SANSKRIT_WORDS,
  SRUTI_VERSE,
  SVARA_NAMES,
} from "../content/natya";
import {
  firstMeetings,
  greekTwin,
  MURCCHANAS,
  type Murcchana,
  meetings,
  movable,
  murcchanaPositions,
  murcchanaSpans,
  OCTAVE,
  ORDER,
  positions,
  STAGES,
  type Stage,
  type Svara,
  srutiCents,
  srutiHz,
} from "../core/sruti";

const esc = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const CX = 260;
const CY = 262;
const R_FIXED = 204;
const R_TICK = 168;
const R_MOVE = 128;
const angle = (n: number) => -Math.PI / 2 + (2 * Math.PI * n) / OCTAVE;
const at = (n: number, r: number) =>
  [CX + r * Math.cos(angle(n)), CY + r * Math.sin(angle(n))] as const;
const f1 = (x: number) => x.toFixed(1);

const name = (s: Svara) => SVARA_NAMES[s].iast;

/** Keep a daṇḍa on the line it ends, and turn verse breaks into line breaks. */
const lines = (s: string) =>
  esc(s)
    .replace(/ ([।॥|]+)/g, "\u00a0$1")
    .replaceAll("\n", "<br>");

function passage(l: Line): string {
  return `<blockquote class="passage skt"><p lang="sa" class="deva">${lines(l.deva)}</p><p lang="sa-Latn" class="iast">${lines(l.iast)}</p><p class="en">${esc(l.english)}</p><cite>Nāṭyaśāstra ${esc(l.cite)}</cite></blockquote>`;
}

/** The fixed vīṇā as an outer ring of 22 śrutis, the movable one as an inner ring. */
function dialSvg(): string {
  const fixed = positions("sadja");
  const ticks = Array.from({ length: OCTAVE }, (_, n) => {
    const [x1, y1] = at(n, R_TICK - 6);
    const [x2, y2] = at(n, R_TICK + 6);
    return `<line class="tick" x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}"/>`;
  }).join("");
  // How many śrutis each gap of the fixed vīṇā holds, written inside the tick ring.
  const spans = ORDER.map((s, i) => {
    const next = ORDER[(i + 1) % 7] as Svara;
    const a = fixed[s];
    const b = i === 6 ? OCTAVE : fixed[next];
    const [x, y] = at((a + b) / 2, R_TICK - 17);
    return `<text class="span" x="${f1(x)}" y="${f1(y + 4)}">${b - a}</text>`;
  }).join("");
  const outer = ORDER.map((s) => {
    const [x, y] = at(fixed[s], R_FIXED);
    const [lx, ly] = at(fixed[s], R_FIXED + 33);
    return `<g class="mark fixed" data-fixed="${s}" role="button" tabindex="0"><circle cx="${f1(x)}" cy="${f1(y)}" r="19"/><text class="deva" lang="sa" x="${f1(x)}" y="${f1(y + 6)}">${SVARA_NAMES[s].short}</text><text class="abbr" x="${f1(lx)}" y="${f1(ly + 5)}">${SVARA_NAMES[s].abbr}</text></g>`;
  }).join("");
  const inner = ORDER.map(
    (s) =>
      `<g class="mark moving" data-moving="${s}" role="button" tabindex="0"><circle r="16"/><text class="deva" lang="sa" y="5">${SVARA_NAMES[s].short}</text><text class="abbr">${SVARA_NAMES[s].abbr}</text></g>`,
  ).join("");
  return `<svg class="dial" viewBox="0 0 520 524" role="group" aria-labelledby="dial-caption">
<circle class="ring" cx="${CX}" cy="${CY}" r="${R_FIXED}"/><circle class="ring tickring" cx="${CX}" cy="${CY}" r="${R_TICK}"/><circle class="ring" cx="${CX}" cy="${CY}" r="${R_MOVE}"/>
${ticks}${spans}<g class="meets"></g>${outer}<g class="inner">${inner}</g>
<text class="centre-n" x="${CX}" y="${CY + 8}"></text><text class="centre-cap" x="${CX}" y="${CY + 34}"></text></svg>`;
}

const stageLabel = (s: Stage) => (s === "pa" ? "pañcama only" : `${s}`);

export function mountVina(root: HTMLElement): void {
  const lyre = new Lyre();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let index = 0;
  let shown: Record<Svara, number> = movable(0);
  let frame = 0;

  const tally = firstMeetings();
  const fixed = positions("sadja");

  root.innerHTML = `
<section class="hero" id="demo">
  <div class="hero-text">
    <h1>Twenty-two śrutis, by ear</h1>
    <p>The <i>Nāṭyaśāstra</i>, a Sanskrit treatise on theatre whose date is disputed, divides the octave into twenty-two śrutis. It does not ask you to take the number on trust. Tune two vīṇās alike, it says, then keep lowering one of them by a śruti and listen for the strings that meet. The passage is obscure and its text insecure; the dial plays it as its 1888 editor printed it, and the last section shows where the witnesses disagree.</p>
  </div>
  <div class="bench">
    <figure class="dial-wrap"><div id="dial">${dialSvg()}</div>
      <figcaption id="dial-caption" class="muted">Outer ring: the vīṇā left as tuned. Inner ring: the one being lowered, turning back one tick per śruti. The small numbers count the śrutis between neighbouring notes. Select a string to hear it; an inner string sounds together with the outer string nearest to it.</figcaption>
    </figure>
    <div class="panel">
      <ol class="stages" aria-label="Stages of the demonstration">${STAGES.map(
        (s, i) =>
          `<li><button type="button" data-stage="${i}"><span class="num">${stageLabel(s)}</span> ${esc(DEMONSTRATION[s].title)}</button></li>`,
      ).join("")}</ol>
      <div class="controls">
        <button type="button" class="primary" id="lower">Lower it a step</button>
        <button type="button" id="reset">Tune both alike</button>
        <button type="button" id="hear">Play string by string</button>
      </div>
      <p class="sum" id="sum" aria-live="polite"></p>
      <div class="card" id="stage-card"></div>
    </div>
  </div>
</section>
<section class="section" id="count">
  <h2>Adding up to twenty-two</h2>
  <div class="two">
    <div>
      <p>Each note meets the note below it at the lowering equal to its own size. Gāndhāra and niṣāda hold two śrutis, so they meet first; ṛṣabha and dhaivata hold three; ṣaḍja, madhyama and pañcama four. Seven gaps, each found by ear, add up to twenty-two. Joanny Grosset, who edited the chapter in 1888, made this sum in his note 36 while calling the passage obscure; the dial makes his observation playable.</p>
      <table class="count"><thead><tr><th scope="col">Lowered by</th><th scope="col">Strings that meet</th><th scope="col">Śrutis</th></tr></thead><tbody>${tally
        .map(
          (t) =>
            `<tr><th scope="row">${t.lowered}</th><td>${
              t.meetings.length
                ? t.meetings.map((m) => `${name(m.moving)} → ${name(m.fixed)}`).join(", ")
                : "none"
            }</td><td>${t.meetings.map(() => t.lowered).join(" + ") || "–"}</td></tr>`,
        )
        .join(
          "",
        )}</tbody><tfoot><tr><th scope="row" colspan="2">Total</th><td>${tally.reduce((n, t) => n + t.lowered * t.meetings.length, 0)}</td></tr></tfoot></table>
    </div>
    <div>${passage(SRUTI_VERSE)}${passage(PRAMANA)}</div>
  </div>
  <h3>What the count forces</h3>
  <div class="two">
    <div>
      <p>Every lowering is the same standard śruti, and the text says the strings meet. If they meet exactly, the seven gaps are 2, 2, 3, 3, 4, 4 and 4 of one unit, and the unit is a twenty-second of an octave: ${srutiCents(1).toFixed(1)} cents. This page plays them that way.</p>
      <p>Bharata also calls notes nine or thirteen śrutis apart consonant. On equal śrutis those intervals are ${srutiCents(9).toFixed(1)} and ${srutiCents(13).toFixed(1)} cents; a pure fourth (4:3) and fifth (3:2) are ${(1200 * Math.log2(4 / 3)).toFixed(1)} and ${(1200 * Math.log2(3 / 2)).toFixed(1)}. With pure fourths and fifths the śrutis cannot all be equal, and then the meetings cannot all be exact. The text gives a count, not string lengths, and says nothing about the size of a śruti in any other terms.</p>
    </div>
    <div>${passage(CONSONANCE)}</div>
  </div>
</section>
<section class="section" id="murcchanas">
  <h2>Fourteen mūrcchanās, seven Greek octaves</h2>
  <div class="two">
    <div>
      <p>A mūrcchanā is the seven notes of a grāma taken in order from one of them. Bharata lists seven for each grāma and gives each its first note, stepping down: ṣaḍja, niṣāda, dhaivata and so on. Cleonides, in Greek, cuts the two-octave scale into seven octaves stepping up. Count only tones and half-tones and the seven ṣaḍja-grāma mūrcchanās are the seven Greek octave species, one for one.</p>
      <p class="muted">The match ignores what Bharata insists on: a three-śruti tone is not a four-śruti tone. In the madhyama-grāma the same seven orders return with the large and small tones in different places. That two theories built the same seven rotations of one scale is the finding; whether either learned it from the other this page does not claim. <a href="./#names">The Greek names and their modern drift</a>.</p>
    </div>
    <div>${passage(FIRST_NOTES)}</div>
  </div>
  <div class="table-scroll"><table class="murcchana"><thead><tr><th scope="col">Grāma</th><th scope="col">Mūrcchanā</th><th scope="col">First note</th><th scope="col">Steps in śrutis</th><th scope="col">Cleonides' octave with the same steps</th><th scope="col">Its name today</th><th scope="col"><span class="visually-hidden">Listen</span></th></tr></thead><tbody>${MURCCHANAS.map(
    (m, i) => {
      const twin = greekTwin(m);
      return `<tr${m.ordinal === 1 ? ' class="first"' : ""}><td>${m.ordinal === 1 ? (m.grama === "sadja" ? "ṣaḍja" : "madhyama") : ""}</td><th scope="row"><span lang="sa" class="deva">${m.deva}</span> <span lang="sa-Latn" class="iast">${m.iast}</span></th><td>${name(m.first)}</td><td><span class="spans" aria-label="${murcchanaSpans(m).join(", ")}">${murcchanaSpans(
        m,
      )
        .map((n) => `<span class="w${n}">${n}</span>`)
        .join(
          "",
        )}</span></td><td>${twin?.name ?? ""}</td><td>${twin?.modern ?? ""}</td><td><button type="button" class="play-m" data-m="${i}" aria-label="Play ${m.iast}">Play</button></td></tr>`;
    },
  ).join("")}</tbody></table></div>
</section>
<section class="section" id="sa-words">
  <h2>Words of the two vīṇās</h2>
  <p class="wide">Several names repeat what the Greek page shows. A note and two mūrcchanās share their names with peoples, as the Dorian and Lydian harmoniai do, and the fourth note is 'the middle' in both languages. Senses are quoted from Monier-Williams.</p>
  <div class="words">${SANSKRIT_WORDS.map(
    (w) =>
      `<article class="word"><h3 lang="sa" class="deva">${w.deva}</h3><p class="rom" lang="sa-Latn">${esc(w.iast)}</p>${w.senses.map((s) => `<p class="meaning">${esc(s)}</p>`).join("")}<p>${esc(w.note)}</p><p class="src">Monier-Williams p. ${w.page}</p></article>`,
  ).join("")}</div>
</section>
<section class="section" id="reading">
  <h2>Whose text this is</h2>
  <div class="two">
    <div>
      <p>The Sanskrit above is the 1894 Kāvyamālā text, transcribed from the scanned pages rather than their OCR. A footnote on its p. 301 says the chapter 'is taken over from the book <i>La Musique Hindoue</i>' by J. Grosset of Paris. Grosset (1888) worked from two manuscripts, A and G. He printed the whole two-vīṇā demonstration in square brackets, his sign for a doubtful passage (p. 21), and in note 36 called it obscure, his translation approximate.</p>
      <p><b>A stage only one manuscript has.</b> Grosset's apparatus records a lacuna in G that swallows the third lowering. The scan of the 1894 volume also holds an earlier setting of the same pages, without the footnote, and its demonstration jumps from the second lowering to the fourth (beside). Without the third stage the meetings account for 16 of the 22 śrutis: ṛṣabha and dhaivata are never measured. The count needs the stage that, of Grosset's two manuscripts, only A preserves.</p>
      <p><b>A missing three.</b> In Grosset's text the third lowering reads <i lang="sa-Latn">śrutyadhikatvāt</i>, 'since they stood a śruti higher'. The count needs three: ṛṣabha and dhaivata hold three śrutis each. Manomohan Ghosh's translation (1961) supplies '[three]'.</p>
      <p><b>A crossed pair.</b> Grosset's second lowering sends <i lang="sa-Latn">gāndhāra-niṣāda</i> into <i lang="sa-Latn">dhaivata-ṛṣabha</i>. Taken in order, gāndhāra would land on dhaivata, eleven śrutis away; Ghosh's 'respectively' reads it that way. The earlier 1894 setting has <i lang="sa-Latn">ṛṣabha-dhaivata</i>, the order the count requires and the dial shows.</p>
      <p><b>Seven strings.</b> In Ghosh's translation, 29.120 gives the citrā vīṇā seven strings and the vipañcī nine. The Kāvyamālā garbles that half-line (its 29.124a) but keeps the second half, beside. The dial draws no instrument. Monier-Williams's 'Indian lute', with its 'two large gourds', describes a later vīṇā, not necessarily Bharata's.</p>
      <p class="muted">Verse numbers are the Kāvyamālā's and Grosset's; Ghosh's run one lower for the śruti verses. <a href="${EDITION_URL}">${esc(EDITION)}</a>, pp. 301–305 and 328, with the earlier setting at physical PDF pages 300–307. J. Grosset, <i>Contribution à l'étude de la musique hindoue</i> (Paris: Leroux, 1888), pp. 21, 28–29, 86. <a href="https://github.com/antonsoo/grama">Grāma</a>, a sibling project, reads the single pañcama-lowering and the count verses from Grosset's pages and leaves this demonstration aside for the same reason.</p>
    </div>
    <div>${passage(EARLIER_SETTING)}${passage(FINGERS)}</div>
  </div>
</section>`;

  const svg = root.querySelector<SVGSVGElement>(".dial");
  const card = root.querySelector<HTMLElement>("#stage-card");
  const sum = root.querySelector<HTMLElement>("#sum");
  const lowerButton = root.querySelector<HTMLButtonElement>("#lower");
  if (!svg || !card || !sum || !lowerButton) return;

  const stage = () => STAGES[index] as Stage;

  function placeMoving(pos: Record<Svara, number>): void {
    for (const s of ORDER) {
      const g = svg?.querySelector<SVGGElement>(`[data-moving="${s}"]`);
      const [x, y] = at(pos[s], R_MOVE);
      g?.setAttribute("transform", `translate(${f1(x)} ${f1(y)})`);
      // The name sits inside the ring, toward the centre, wherever the string has turned.
      const label = g?.querySelector(".abbr");
      const a = angle(pos[s]);
      label?.setAttribute("x", f1(-30 * Math.cos(a)));
      label?.setAttribute("y", f1(-30 * Math.sin(a) + 5));
    }
  }

  function drawMeetings(): void {
    const layer = svg?.querySelector(".meets");
    if (!layer || !svg) return;
    const now = meetings(stage());
    const moved = movable(stage());
    layer.innerHTML = now
      .map((m) => {
        const p = moved[m.moving];
        const [x1, y1] = at(p, R_MOVE + 16);
        const [x2, y2] = at(p, R_FIXED - 19);
        return `<line class="meet" x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}"/>`;
      })
      .join("");
    for (const g of svg.querySelectorAll(".mark")) g.classList.remove("met");
    for (const m of now) {
      svg.querySelector(`[data-moving="${m.moving}"]`)?.classList.add("met");
      svg.querySelector(`[data-fixed="${m.fixed}"]`)?.classList.add("met");
    }
  }

  function centre(): void {
    const s = stage();
    const n = svg?.querySelector(".centre-n");
    const cap = svg?.querySelector(".centre-cap");
    if (!n || !cap) return;
    if (s === "pa") {
      n.textContent = "−1";
      cap.textContent = "pañcama only";
    } else {
      n.textContent = s === 0 ? "0" : `−${s}`;
      cap.textContent = s === 1 ? "śruti" : "śrutis";
    }
  }

  function animateTo(target: Record<Svara, number>): void {
    cancelAnimationFrame(frame);
    const from = { ...shown };
    const start = performance.now();
    const ms = reduce ? 0 : 650;
    const step = (t: number) => {
      const k = ms === 0 ? 1 : Math.min(1, (t - start) / ms);
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      const pos = {} as Record<Svara, number>;
      for (const s of ORDER) pos[s] = from[s] + (target[s] - from[s]) * e;
      placeMoving(pos);
      if (k < 1) frame = requestAnimationFrame(step);
      else {
        shown = target;
        drawMeetings();
      }
    };
    svg?.querySelector(".meets")?.replaceChildren();
    for (const g of svg?.querySelectorAll(".mark") ?? []) g.classList.remove("met");
    frame = requestAnimationFrame(step);
  }

  function render(animate: boolean): void {
    const s = stage();
    const target = movable(s);
    if (animate) animateTo(target);
    else {
      shown = target;
      placeMoving(target);
      drawMeetings();
    }
    centre();
    for (const b of root.querySelectorAll<HTMLButtonElement>("[data-stage]")) {
      if (Number(b.dataset.stage) === index) b.setAttribute("aria-current", "step");
      else b.removeAttribute("aria-current");
    }
    if (lowerButton) {
      lowerButton.disabled = index === STAGES.length - 1;
      lowerButton.textContent =
        index === 0 ? "Lower one pañcama" : index === 1 ? "Retune the rest" : "Lower it again";
      if (index === STAGES.length - 1) lowerButton.textContent = "All seven have met";
    }
    const now = meetings(s);
    const what =
      s === 0
        ? "All seven strings sound together."
        : s === "pa"
          ? "Six strings still agree; the lowered pañcama is now a madhyama-grāma pañcama, three śrutis above madhyama."
          : now.length
            ? `Meeting now: ${now.map((m) => `${name(m.moving)} on ${name(m.fixed)}`).join(", ")}.`
            : "Nothing meets: no note is only one śruti wide.";
    if (card) {
      card.innerHTML = `<p class="card-kicker">${s === "pa" ? "Step 1, first half" : s === 0 ? "Start" : `Lowered ${s} śruti${s === 1 ? "" : "s"}`}</p><h2>${esc(DEMONSTRATION[s].title)}</h2><p>${what}</p>${passage(DEMONSTRATION[s])}`;
    }
    const lowered = typeof s === "number" ? s : 0;
    const parts = tally.flatMap((t) => t.meetings.map(() => t.lowered));
    const done = tally
      .filter((t) => t.lowered <= lowered)
      .reduce((n, t) => n + t.meetings.length, 0);
    if (sum) {
      sum.innerHTML = `${parts.map((p, i) => `<span class="${i < done ? "in" : ""}">${p}</span>`).join(" + ")} = <b class="${done === 7 ? "in" : ""}">${OCTAVE}</b>`;
    }
  }

  function nearestFixed(p: number): number {
    let best = 0;
    let gap = Number.POSITIVE_INFINITY;
    for (const s of ORDER) {
      for (const lap of [-OCTAVE, 0, OCTAVE]) {
        const q = fixed[s] + lap;
        if (Math.abs(q - p) < gap) {
          gap = Math.abs(q - p);
          best = q;
        }
      }
    }
    return best;
  }

  function pluckMark(el: Element): void {
    const f = el.getAttribute("data-fixed") as Svara | null;
    const m = el.getAttribute("data-moving") as Svara | null;
    if (f) lyre.play([srutiHz(fixed[f])]);
    if (m) {
      const p = movable(stage())[m];
      lyre.play([[srutiHz(p), srutiHz(nearestFixed(p))]]);
    }
  }

  render(false);

  root.addEventListener("click", (e) => {
    const el = e.target as Element;
    const mark = el.closest(".mark");
    if (mark) {
      pluckMark(mark);
      return;
    }
    const st = el.closest<HTMLElement>("[data-stage]");
    if (st) {
      index = Number(st.dataset.stage);
      render(true);
      return;
    }
    const pm = el.closest<HTMLElement>(".play-m");
    if (pm) {
      const m = MURCCHANAS[Number(pm.dataset.m)] as Murcchana;
      const pos = murcchanaPositions(m);
      const shift = (pos[0] ?? 0) > 11 ? OCTAVE : 0;
      lyre.play(pos.map((p) => srutiHz(p - shift)));
    }
  });
  root.addEventListener("keydown", (e) => {
    const mark = (e.target as Element).closest?.(".mark");
    if (mark && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      pluckMark(mark);
    }
  });
  lowerButton.addEventListener("click", () => {
    if (index < STAGES.length - 1) {
      index += 1;
      render(true);
    }
  });
  root.querySelector("#reset")?.addEventListener("click", () => {
    index = 0;
    render(true);
  });
  root.querySelector("#hear")?.addEventListener("click", () => {
    // Each lowered string with the nearest string of the other vīṇā: unisons where they meet.
    const moved = movable(stage());
    lyre.play(
      ORDER.map((s) => [srutiHz(moved[s]), srutiHz(nearestFixed(moved[s]))]),
      0.75,
    );
  });
}

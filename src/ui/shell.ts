import { setupOffline } from "../offline";

const THEME_KEY = "harmoniai-theme";

export type Page = "greek" | "india" | "comparison";

const NAV: Record<Page, string> = {
  comparison: `<a href="#listen">Listen</a><a href="#degrees">Compare degrees</a><a href="#reading">Read Cleonides</a><a href="#save">Save</a>`,
  greek: `<a href="#strings">Strings</a><a href="#places">Places</a><a href="#names">Names</a><a href="./compare.html">Which Dorian?</a><a href="#highest">Highest, lowest</a><a href="#ethos">Ethos</a><a href="#words">Words</a>`,
  india: `<a href="#demo">Two vīṇās</a><a href="#count">The count</a><a href="#murcchanas">Mūrcchanās</a><a href="#sa-words">Words</a><a href="#reading">Whose text</a>`,
};

const FOOT: Record<Page, string> = {
  comparison: `Cleonides in Jan (1895), printed pp. 197–199. New literal English. The shared starting pitch, sine tones and comparison are modern teaching choices.`,
  greek: `Greek from Jan's <i>Musici scriptores Graeci</i> (1895) for Cleonides, and Burnet and Ross through the Perseus Digital Library for Plato and Aristotle; senses from LSJ via Logeion. Translations are new. Sounds are synthetic plucked strings, not reconstructions of an ancient instrument.`,
  india: `Sanskrit from the Kāvyamālā <i>Nāṭyaśāstra</i> (Bombay, 1894), which follows Grosset's 1888 edition for this chapter, read against the page images; senses from Monier-Williams (1899) via the Cologne Digital Sanskrit Dictionaries. Translations are new. Sounds are synthetic plucked strings on twenty-two equal śrutis, a modern model.`,
};

/** Masthead, page switch, footer and theme button shared by both pages; returns the main element. */
export function shell(app: HTMLElement, page: Page): HTMLElement | null {
  const other =
    page === "greek"
      ? `<a class="switch" href="./vina.html">Bharata's twenty-two śrutis</a>`
      : `<a class="switch" href="./">Greek octave species</a>`;
  app.innerHTML = `<header class="mast"><a class="brand" href="./"><span lang="grc">ἁρμονίαι</span> <i>Harmoniai</i></a>
<nav aria-label="Sections">${NAV[page]}${other}</nav>
<button type="button" class="theme" aria-label="Switch between the purple codex and the silver page">◐</button></header>
<main id="main"></main>
<footer class="foot"><p>${FOOT[page]} <a href="https://github.com/antonsoo/harmoniai">Source and notes</a>.</p><p><a href="./LICENSE.txt">Code license</a> · <a href="./FONT-LICENSE.txt">Font licenses</a> · <a href="./THIRD_PARTY_NOTICES.txt">Text credits</a></p><p id="offline-status" class="muted"></p></footer>`;
  setupOffline();
  const root = document.documentElement;
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") root.dataset.theme = saved;
  } catch {
    // The system preference applies.
  }
  app.querySelector(".theme")?.addEventListener("click", () => {
    const dark =
      root.dataset.theme === "dark" ||
      (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
    root.dataset.theme = dark ? "light" : "dark";
    try {
      localStorage.setItem(THEME_KEY, root.dataset.theme);
    } catch {
      // The choice lasts for this view.
    }
  });
  return app.querySelector<HTMLElement>("#main");
}

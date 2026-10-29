import "./fonts/fonts.css";
import "./style.css";
import { mount } from "./ui/app";

const THEME_KEY = "harmoniai-theme";
const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  app.innerHTML = `<header class="mast"><a class="brand" href="./"><span lang="grc">ἁρμονίαι</span> <i>Harmoniai</i></a>
<nav aria-label="Sections"><a href="#strings">Strings</a><a href="#places">Places</a><a href="#names">Names</a><a href="#highest">Highest, lowest</a><a href="#ethos">Ethos</a><a href="#words">Words</a></nav>
<button type="button" class="theme" aria-label="Switch between the purple codex and the silver page">◐</button></header>
<main id="main"></main>
<footer class="foot"><p>Greek from Jan's <i>Musici scriptores Graeci</i> (1895) for Cleonides, and Burnet and Ross through the Perseus Digital Library for Plato and Aristotle; senses from LSJ via Logeion. Translations are new. Sounds are synthetic plucked strings, not reconstructions of an ancient instrument. <a href="https://github.com/antonsoo/harmoniai">Source and notes</a>.</p></footer>`;
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
  const main = app.querySelector<HTMLElement>("#main");
  if (main) mount(main);
}

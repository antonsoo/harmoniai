import { sequence, wave } from "../audio/comparison";
import { comparisonWave, csv, illustratedReading, verified } from "../comparison-export";
import { PLATES } from "../content/plates";
import { compare, comparisonQuery, readComparison, SHARED_NAMES } from "../core/comparison";
import { degreeTable, finding, lanes, reading, tuningText } from "./comparison-view";

function save(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function mountComparison(root: HTMLElement): void {
  let state = readComparison(new URLSearchParams(location.search));
  let audioUrl = "";
  let plateUrl = "";
  let plateRequest = 0;
  let saveRequest = 0;
  root.innerHTML = `<section class="hero-text"><p class="eyebrow">An experiment in musical names</p><h1>Which Dorian?</h1><p>The word survived. The intervals moved. Keep the starting pitch fixed, listen to both meanings, then find the notes that changed.</p></section>
  <section id="listen" class="comparison-bench" aria-label="Compare octave names">
  <div class="comparison-controls"><label>Cleonides’ name <select id="compare-name">${SHARED_NAMES.map((name) => `<option>${name}</option>`).join("")}</select></label>
  <label>Compare with <select id="compare-relation"><option value="name">The same modern name</option><option value="pattern">The same interval order</option></select></label>
  <label>Both start at <select id="compare-start"><option value="110">110 Hz</option><option value="220">220 Hz</option><option value="330">330 Hz</option></select></label>
  <label>Both use <select id="compare-tuning"><option value="aristoxenian">200 / 100 cents</option><option value="pythagorean">9:8 / 256:243</option></select></label></div>
  <div id="compare-lanes"></div><p class="comparison-finding" id="compare-finding" role="status"></p>
  <p class="small">T = tone; S = small step. The plots show pitch height; the numbers are degrees 1–8. A cent is 1/1200 of an octave.</p>
  <div class="comparison-play"><button type="button" class="primary" id="compare-both">Hear A, then B</button><button type="button" id="compare-a">Hear A</button><button type="button" id="compare-b">Hear B</button><button type="button" id="compare-stop">Stop</button></div>
  <audio id="comparison-audio" controls preload="metadata" aria-label="Current listening example"></audio><p id="audio-label" role="status"></p>
  <details class="model-note"><summary>What are we choosing for this experiment?</summary><p>The same starting pitch and pure sine tones make the interval orders easier to compare. Choose equal 200/100-cent steps, a modern realization of tone/half-tone arithmetic, or Pythagorean 9:8 tones and 256:243 small steps. Both lanes always use the same choice. Neither is a recovered ancient performance; a modern mode name does not prescribe either tuning. Ancient octave species also do not settle Plato’s or Aristotle’s earlier use of <i>harmonia</i>.</p></details>
  </section>
  <section class="section" id="degrees"><h2>Where do the meanings part?</h2><p>Hear one degree in A, then the same degree in B. Switch to “The same interval order” to hear the control: every pitch should agree.</p><div id="compare-degrees"></div></section>
  <section class="section" id="reading"><h2>Check the Greek, then the page</h2><div class="comparison-reading"><div id="compare-reading"></div><div class="source-reader"><h3>Jan’s printed edition, 1895</h3><p>Page 197 names the first species and includes Jan’s letter diagram. Page 198 completes the names and gives the diatonic half-steps. Page 199 carries the names across genera.</p><label>Printed page <select id="source-page"><option>197</option><option selected>198</option><option>199</option></select></label><button type="button" id="source-load">Show page</button><button type="button" id="source-zoom" disabled>Enlarge</button><p id="source-status" role="status">Choose a complete page to read here.</p><div id="source-viewport" class="source-viewport" tabindex="0" role="region" aria-label="Printed page; use arrow keys to pan when enlarged"><img id="source-image" hidden alt=""></div><p class="small"><a id="source-original" href="${PLATES[1].url}">Internet Archive original</a> · <a href="./sources/manifest.json">Source record</a></p></div></div></section>
  <section class="section" id="save"><h2>Take the listening experiment with you</h2><p>The illustrated reading includes the current comparison, its sound, Greek and English, and all three complete source pages. Open it offline or print it. WAV saves A then B; CSV saves the pitch table.</p><div class="comparison-play"><button type="button" class="primary" id="save-reading">Save illustrated reading</button><button type="button" id="cancel-reading" hidden>Cancel</button><button type="button" id="save-wave">Save WAV</button><button type="button" id="save-csv">Save CSV</button><button type="button" id="copy-comparison">Copy comparison link</button></div><p id="save-status" role="status"></p><label>Link to this comparison <input id="comparison-link" readonly type="url"></label></section>`;
  const $ = <T extends HTMLElement>(id: string) => {
    const element = root.querySelector<T>(`#${id}`);
    if (!element) throw new Error(`Missing ${id}`);
    return element;
  };
  const player = $<HTMLAudioElement>("comparison-audio");
  const status = $("save-status");
  const controls = {
    name: $<HTMLSelectElement>("compare-name"),
    relation: $<HTMLSelectElement>("compare-relation"),
    start: $<HTMLSelectElement>("compare-start"),
    tuning: $<HTMLSelectElement>("compare-tuning"),
  };
  const link = $<HTMLInputElement>("comparison-link");
  function audio(bytes: Uint8Array<ArrayBuffer>, label: string, autoplay: boolean) {
    player.pause();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
    player.src = audioUrl;
    $("audio-label").textContent = label;
    const currentUrl = audioUrl;
    if (autoplay)
      void player.play().catch(() => {
        if (currentUrl !== audioUrl) return;
        $("audio-label").textContent = `${label} Press the audio play control to listen.`;
      });
  }
  function render() {
    controls.name.value = state.name;
    controls.relation.value = state.relation;
    controls.start.value = String(state.start);
    controls.tuning.value = state.tuning;
    $("compare-lanes").innerHTML = lanes(state);
    $("compare-finding").textContent = finding(state);
    $("compare-degrees").innerHTML = degreeTable(state);
    $("compare-reading").innerHTML = reading(state);
    const url = new URL("compare.html", location.href);
    url.search = comparisonQuery(state);
    url.hash = "listen";
    link.value = url.href;
    audio(
      comparisonWave(state),
      `A, then B · ${state.start} Hz starting pitch · ${tuningText(state)}.`,
      false,
    );
  }
  Object.values(controls).forEach((control) => {
    control.addEventListener("change", () => {
      state = readComparison(
        new URLSearchParams({
          name: controls.name.value.toLowerCase(),
          relation: controls.relation.value,
          start: controls.start.value,
          tuning: controls.tuning.value,
        }),
      );
      render();
    });
  });
  for (const which of ["a", "b", "both"] as const)
    $(`compare-${which}`).addEventListener("click", () => {
      const c = compare(state);
      audio(
        wave(sequence(which === "both" ? [c.a.hz, c.b.hz] : [c[which].hz])),
        which === "both"
          ? `A: Cleonides’ ${state.name}, then B: modern ${c.modernName}.`
          : which === "a"
            ? `A: Cleonides’ ${state.name}.`
            : `B: modern ${c.modernName}.`,
        true,
      );
    });
  $("compare-stop").addEventListener("click", () => {
    player.pause();
    player.currentTime = 0;
  });
  $("compare-degrees").addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>("[data-degree]");
    if (!button) return;
    const i = Number(button.dataset.degree);
    const c = compare(state);
    audio(
      wave(sequence([[c.a.hz[i] ?? 0], [c.b.hz[i] ?? 0]])),
      `Degree ${i + 1}: A, then B.`,
      true,
    );
  });
  const source = $<HTMLImageElement>("source-image");
  const zoom = $<HTMLButtonElement>("source-zoom");
  const sourceStatus = $("source-status");
  function clearSource() {
    plateRequest++;
    source.hidden = true;
    source.removeAttribute("src");
    zoom.disabled = true;
    source.classList.remove("enlarged");
    zoom.textContent = "Enlarge";
    if (plateUrl) URL.revokeObjectURL(plateUrl);
    plateUrl = "";
  }
  $<HTMLSelectElement>("source-page").addEventListener("change", () => {
    clearSource();
    sourceStatus.textContent = "Press Show page to load the selected page.";
    const p = PLATES.find((p) => p.page === Number($<HTMLSelectElement>("source-page").value));
    if (p) $<HTMLAnchorElement>("source-original").href = p.url;
  });
  $("source-load").addEventListener("click", async () => {
    clearSource();
    const request = plateRequest;
    const p = PLATES.find((p) => p.page === Number($<HTMLSelectElement>("source-page").value));
    if (!p) return;
    sourceStatus.textContent = `Loading printed page ${p.page}…`;
    try {
      const bytes = await verified(`${import.meta.env.BASE_URL}${p.path}`, p.sha256);
      if (request !== plateRequest) return;
      plateUrl = URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
      source.src = plateUrl;
      source.alt = `Complete printed page ${p.page} of Jan’s 1895 edition of Cleonides`;
      source.hidden = false;
      zoom.disabled = false;
      $("source-viewport")?.scrollTo?.(0, 0);
      sourceStatus.textContent = `Printed page ${p.page}. Enlarge for close reading; use the arrow keys to pan.`;
    } catch (error) {
      if (request === plateRequest)
        sourceStatus.textContent = error instanceof Error ? error.message : "Page unavailable.";
    }
  });
  zoom.addEventListener("click", () => {
    const enlarged = source.classList.toggle("enlarged");
    zoom.textContent = enlarged ? "Fit page" : "Enlarge";
    if (!enlarged) $("source-viewport").scrollTo(0, 0);
  });
  $("save-wave").addEventListener("click", () =>
    save(
      new Blob([comparisonWave(state)], { type: "audio/wav" }),
      `harmoniai-${state.name.toLowerCase()}-${state.relation}.wav`,
    ),
  );
  $("save-csv").addEventListener("click", () =>
    save(
      new Blob([csv(state)], { type: "text/csv;charset=utf-8" }),
      `harmoniai-${state.name.toLowerCase()}-${state.relation}.csv`,
    ),
  );
  const saveReading = $<HTMLButtonElement>("save-reading");
  const cancel = $("cancel-reading");
  saveReading.addEventListener("click", async () => {
    const snapshot = { ...state };
    const request = ++saveRequest;
    saveReading.disabled = true;
    cancel.hidden = false;
    status.textContent = `Preparing the ${snapshot.name} reading with all three source pages…`;
    try {
      const html = await illustratedReading(snapshot);
      if (request !== saveRequest) return;
      save(
        new Blob([html], { type: "text/html;charset=utf-8" }),
        `harmoniai-${snapshot.name.toLowerCase()}-${snapshot.relation}.html`,
      );
      status.textContent = `Saved the ${snapshot.name} / ${snapshot.relation === "name" ? "same name" : "same interval order"} reading at ${snapshot.start} Hz. It includes its own sound and source pages.`;
    } catch (error) {
      if (request === saveRequest)
        status.textContent =
          error instanceof Error ? error.message : "The reading could not be saved.";
    } finally {
      if (request === saveRequest) {
        saveReading.disabled = false;
        cancel.hidden = true;
      }
    }
  });
  cancel.addEventListener("click", () => {
    saveRequest++;
    saveReading.disabled = false;
    cancel.hidden = true;
    status.textContent = "Reading cancelled.";
  });
  $("copy-comparison").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(link.value);
      status.textContent = "Comparison link copied.";
    } catch {
      link.focus();
      link.select();
      status.textContent = "Select and copy the comparison link below.";
    }
  });
  render();
}

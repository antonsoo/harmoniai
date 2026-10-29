import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:4423/harmoniai/";
const output = resolve(process.argv[3] ?? "docs/review/browser");
await mkdir(output, { recursive: true });
const receipts = [];
for (const [engine, launcher] of Object.entries({ chromium, firefox })) {
  const browser = await launcher.launch();
  try {
    for (const width of [1440, 375])
      for (const colorScheme of ["light", "dark"]) {
        const id = `${engine}-${width}-${colorScheme}`;
        const context = await browser.newContext({
          viewport: { width, height: 1000 },
          colorScheme,
        });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.addInitScript(() => {
          window.audioStarts = 0;
          window.sineStarts = [];
          const oscillatorStart = OscillatorNode.prototype.start;
          OscillatorNode.prototype.start = function (...args) {
            window.sineStarts.push(this.frequency.value);
            return oscillatorStart.apply(this, args);
          };
          const start = AudioBufferSourceNode.prototype.start;
          AudioBufferSourceNode.prototype.start = function (...args) {
            window.audioStarts++;
            return start.apply(this, args);
          };
        });
        await page.goto(base);
        await page.locator("#play").waitFor();
        await page.locator("#play").click();
        await page.waitForTimeout(100);
        await page.locator("#stop").click();
        await page.waitForTimeout(150);
        await page.evaluate(() => {
          window.afterStop = 0;
          window.audioObserver = new MutationObserver((r) => {
            window.afterStop += r.length;
          });
          window.audioObserver.observe(document.querySelector(".instrument"), {
            attributes: true,
            subtree: true,
          });
        });
        await page.waitForTimeout(1000);
        assert.equal(
          await page.evaluate(() => window.afterStop),
          0,
          "Stop must cancel future string cues",
        );
        await page.evaluate(() => window.audioObserver.disconnect());
        await page.locator('.species-picker [data-species="3"]').click();
        assert.match(await page.locator("#card").innerText(), /Dorian/);
        await page.locator("#tuning").selectOption("aristoxenian");
        await page.locator('[data-note="3"]').focus();
        await page.keyboard.press("Enter");
        assert.ok((await page.evaluate(() => window.audioStarts)) > 0);
        const greekStarts = await page.evaluate(() => window.audioStarts);
        await page.waitForFunction(
          () => document.querySelector("#offline-status")?.textContent.startsWith("Ready offline"),
          null,
          { timeout: 25000 },
        );
        let a11y = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        assert.deepEqual(
          a11y.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
          [],
        );
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
        );
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `${output}/${id}-greek.png` });
        await context.setOffline(true);
        await page.goto(new URL("vina.html", base).href);
        await page.locator("#equal-fifth").click();
        await page.locator("#pure-fifth").click();
        const sineStarts = await page.evaluate(() => window.sineStarts);
        assert.equal(sineStarts.length, 4);
        assert.deepEqual(sineStarts.slice(2), [220, 330]);
        assert.ok(Math.abs(sineStarts[1] - 220 * 2 ** (13 / 22)) < 0.001);
        assert.match(await page.locator("#lowering-comparison").innerText(), /182.404/);
        await page.locator("#comparison-stop").click();
        await page.locator("#hear").click();
        await page.locator("#vina-stop").click();
        for (const [stage, pattern] of [
          [3, /gāndhāra on ṛṣabha/],
          [4, /ṛṣabha on ṣaḍja/],
          [5, /pañcama on madhyama/],
        ]) {
          await page.locator(`[data-stage="${stage}"]`).click();
          assert.match(await page.locator("#stage-card").innerText(), pattern);
        }
        await page.locator('[data-moving="pa"]').focus();
        await page.keyboard.press("Enter");
        assert.ok((await page.evaluate(() => window.audioStarts)) > 0);
        a11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        assert.deepEqual(
          a11y.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
          [],
        );
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
        );
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `${output}/${id}-vina.png` });
        await page.goto(base);
        await page.locator("#play").click();
        await page.locator("#stop").click();
        assert.deepEqual(errors, []);
        receipts.push({
          engine,
          width,
          colorScheme,
          afterStopMutations: 0,
          greekScheduledSources: greekStarts,
          offlinePages: 2,
          errors,
          audibleOutput: "Not measured; Web Audio buffer sources were scheduled.",
        });
        await context.close();
        console.log(
          id,
          "octaves, stop, vina meetings, keyboard audio, offline pages and accessibility verified",
        );
        await writeFile(
          `${output}/browser.json`,
          JSON.stringify({ base, receipts }, null, 2) + "\n",
        );
      }
  } finally {
    await browser.close();
  }
}

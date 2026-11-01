import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const output = resolve(process.argv[2] ?? "/tmp/harmoniai-pitch-baseline");
await mkdir(output, { recursive: true });
const commit = execFileSync("git", ["rev-parse", "c00cc4d"], { encoding: "utf8" }).trim();
const source = execFileSync("git", ["show", `${commit}:src/audio/pluck.ts`]);
const modulePath = `${output}/previous-pluck.ts`;
await writeFile(modulePath, source);
const { pluckSamples } = await import(pathToFileURL(modulePath).href);
// Independent literal table. The original instrument fixed mesē at 220 Hz.
const ratios = [
  1,
  9 / 8,
  32 / 27,
  4 / 3,
  3 / 2,
  128 / 81,
  16 / 9,
  2,
  9 / 4,
  64 / 27,
  8 / 3,
  3,
  256 / 81,
  32 / 9,
  4,
];
const keys = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19, 20, 22, 24];
for (const rate of [44100, 48000])
  for (const tuning of ["pythagorean", "aristoxenian"])
    for (let index = 0; index < 15; index++) {
      const hz = 110 * (tuning === "pythagorean" ? ratios[index] : 2 ** (keys[index] / 12));
      let seed = 1;
      const samples = pluckSamples(hz, rate, 1.6, () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      });
      await writeFile(
        `${output}/before-${rate}-${tuning}-${index}.f32`,
        new Uint8Array(samples.buffer),
      );
    }
const receipt = {
  commit,
  sourceSha256: createHash("sha256").update(source).digest("hex"),
  signals: 60,
  seed: 1,
  referenceMese: 220,
};
await writeFile(`${output}/source.json`, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));

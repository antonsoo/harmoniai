import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "vite";

async function filesIn(directory: string): Promise<string[]> {
  const files = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      files.map((f) =>
        f.isDirectory()
          ? filesIn(path.join(directory, f.name))
          : Promise.resolve([path.join(directory, f.name)]),
      ),
    )
  ).flat();
}

export async function offlineBuild(
  name: string,
  pages: string[],
): Promise<{ edition: string; plugin: Plugin }> {
  const inputs = [
    ...(await filesIn("src")),
    ...(await filesIn("public")),
    ...pages,
    "scripts/offline-build.ts",
    "vite.config.ts",
    "package.json",
    "package-lock.json",
  ].sort();
  const hash = createHash("sha256");
  for (const file of inputs) {
    hash.update(file);
    hash.update(await readFile(file));
  }
  const edition = hash.digest("hex");
  const base = `/${name}/`;
  return {
    edition,
    plugin: {
      name: "complete-offline-edition",
      apply: "build",
      async closeBundle() {
        const files = (await filesIn("dist")).filter((f) => !f.endsWith("sw.js")).sort();
        const inventory = await Promise.all(
          files.map(async (file) => {
            const bytes = await readFile(file);
            return {
              path: base + path.relative("dist", file).split(path.sep).join("/"),
              bytes: bytes.length,
              sha256: createHash("sha256").update(bytes).digest("hex"),
            };
          }),
        );
        const runtime = (await readFile("src/offline-worker.js", "utf8")).replace(
          "export function installEdition",
          "function installEdition",
        );
        await writeFile(
          "dist/sw.js",
          `/* Complete edition ${edition}; generated from the build. */\n${runtime}\ninstallEdition(${JSON.stringify({ edition, base, prefix: `${name}-`, files: inventory })});\n`,
        );
      },
    },
  };
}

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, symlink, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

const root = resolve(".");
const output = resolve(process.argv[2] ?? "/tmp/harmoniai-next-edition");
const distance = relative(root, output);
if (!distance.startsWith("..") && !isAbsolute(distance))
  throw new Error("Put the synthetic edition outside the source checkout.");
await mkdir(output, { recursive: true });
for (const folder of ["src", "public", "scripts", "tests"])
  await cp(folder, `${output}/${folder}`, { recursive: true });
for (const file of [
  "package.json",
  "package-lock.json",
  "vite.config.ts",
  "tsconfig.json",
  "tsconfig.worker.json",
  "index.html",
  "vina.html",
  "compare.html",
])
  await cp(file, `${output}/${file}`);
try {
  await symlink(`${root}/node_modules`, `${output}/node_modules`, "dir");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
}
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const original = await readFile(`${output}/public/LICENSE.txt`);
const modified = Buffer.concat([original, Buffer.from("\n")]);
await writeFile(`${output}/public/LICENSE.txt`, modified);
let changed = 0;
async function replace(folder) {
  for (const file of await readdir(folder, { withFileTypes: true })) {
    const path = `${folder}/${file.name}`;
    if (file.isDirectory()) await replace(path);
    else if (file.name.endsWith(".ts")) {
      const source = await readFile(path, "utf8");
      const next = source.replaceAll(hash(original), hash(modified));
      if (next !== source) {
        await writeFile(path, next);
        changed++;
      }
    }
  }
}
await replace(`${output}/src`);
if (!changed) throw new Error("The original retained license identity was not found.");
execFileSync("npm", ["run", "build"], { cwd: output, stdio: "pipe" });
await writeFile(
  `${output}/fixture.json`,
  JSON.stringify(
    {
      purpose:
        "Synthetic update: change only code-license whitespace and the corresponding expected identity.",
      originalSha256: hash(original),
      nextSha256: hash(modified),
      changedSourceFiles: changed,
    },
    null,
    2,
  ),
);
console.log(`${output}/dist`);

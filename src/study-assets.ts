import greek from "./fonts/gentium-book-plus-400-greek.woff2?url";
import greekExtended from "./fonts/gentium-book-plus-400-greek-ext.woff2?url";
import latin from "./fonts/gentium-book-plus-400-latin.woff2?url";
import latinExtended from "./fonts/gentium-book-plus-400-latin-ext.woff2?url";

export const FONTS = [
  {
    url: latin,
    hash: "dd5d2902dac9c11d3acc42b0e54a74b4f2db9bd4a7d6872c23338f70df29ca7e",
    range: "U+0000-00FF,U+2000-206F",
  },
  {
    url: latinExtended,
    hash: "46b8923c77eceb874e1b6a28ce08d56293641382ea0382f7043139bfff8f2383",
    range: "U+0100-02FF,U+1E00-1EFF",
  },
  {
    url: greek,
    hash: "cba273ba7a0fbe810e3531f5cc62fd4e963da7c5d32b4981c3f30fe562aea343",
    range: "U+0370-03FF",
  },
  {
    url: greekExtended,
    hash: "f4cbbee8404f7275cdece60d170d787d693df853452ef43a7b504d73eca2d658",
    range: "U+1F00-1FFF",
  },
] as const;

export async function verified(
  url: string,
  hash: string,
  signal?: AbortSignal,
): Promise<Uint8Array<ArrayBuffer>> {
  const bounded = AbortSignal.any([AbortSignal.timeout(60000), ...(signal ? [signal] : [])]);
  const response = await fetch(url, { signal: bounded });
  if (!response.ok)
    throw new Error("A source or font could not be loaded. Reconnect and try again.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  bounded.throwIfAborted();
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const actual = Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
  if (actual !== hash)
    throw new Error(
      "A source or font differs from the reviewed edition. Reload online before saving.",
    );
  return bytes;
}

export function dataUrl(bytes: Uint8Array, type: string): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return `data:${type};base64,${btoa(binary)}`;
}

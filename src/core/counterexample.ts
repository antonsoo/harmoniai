/** One modern pure-fourth/fifth preparation from Bel's family, with pramāṇa = 81/80.
 * These seven principal pitches and four total lowerings are NOT a 22-pitch table.
 * Bel, A mathematical discussion ... (1984, revised 2020), pp. 4–7, 16–17.
 */
export type Ratio = readonly [number, number];
export const PURE_PITCHES: readonly Ratio[] = [
  [1, 1],
  [10, 9],
  [32, 27],
  [4, 3],
  [3, 2],
  [5, 3],
  [16, 9],
];
export const PURE_LOWERINGS: readonly Ratio[] = [
  [1, 1],
  [81, 80],
  [16, 15],
  [10, 9],
  [9, 8],
];
export const ratioCents = ([n, d]: Ratio): number => 1200 * Math.log2(n / d);

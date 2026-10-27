/**
 * rekey-strings.ts — rewrite `src/...`-prefixed path strings inside a file
 * through the combined move maps (for audit-test key lists).
 * Usage: bun scripts/reorg/rekey-strings.ts <file>
 */
import { readFileSync, writeFileSync } from "fs";
import * as moves from "./moves";
import type { MoveEntry } from "./moves";

const file = process.argv[2];
const MAP: MoveEntry[] = [
  ...moves.P3A_MOVES,
  ...moves.P3B_MOVES,
].sort((a, b) => b[0].length - a[0].length);

const re = /["'`](src\/[^"'`:]+?)(?=["'`:])/g;
const s = readFileSync(file, "utf-8");
let changed = 0;
const out = s.replace(re, (match, p: string) => {
  for (const [oldP, newP] of MAP) {
    if (p === oldP || p.startsWith(oldP + "/")) {
      changed++;
      return match.replace(p, newP + p.slice(oldP.length));
    }
  }
  return match;
});
writeFileSync(file, out);
console.log(`rekeyed ${changed} path strings in ${file}`);

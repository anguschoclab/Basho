/**
 * apply-moves.ts — execute a phase's move map via `git mv`.
 *
 * Usage: bun scripts/reorg/apply-moves.ts <moves-export> [--dry-run]
 *   e.g.  bun scripts/reorg/apply-moves.ts P3B_MOVES --dry-run
 *
 * Refuses any path under PROTECTED_PREFIXES. Directory moves go through
 * `git mv <oldDir> <newDir>` (dest must not pre-exist); single-file moves
 * create parent dirs first.
 */
import { execFileSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { PROTECTED_PREFIXES, type MoveEntry } from "./moves";
import * as moves from "./moves";

const ROOT = join(import.meta.dirname, "..", "..");
const phase = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

const entries = (moves as unknown as Record<string, MoveEntry[]>)[phase];
if (!entries) {
  console.error(`unknown move set "${phase}". Available: ${Object.keys(moves).filter((k) => k.endsWith("_MOVES")).join(", ")}`);
  process.exit(1);
}

function protected_(p: string): boolean {
  const norm = p.replaceAll("\\", "/");
  return PROTECTED_PREFIXES.some((pre) => norm.startsWith(pre));
}

let moved = 0;
const skipped: string[] = [];
for (const [oldRel, newRel] of entries) {
  if (protected_(oldRel) || protected_(newRel)) {
    skipped.push(`PROTECTED ${oldRel} -> ${newRel}`);
    continue;
  }
  const oldAbs = join(ROOT, oldRel);
  const newAbs = join(ROOT, newRel);
  if (!existsSync(oldAbs)) {
    skipped.push(`MISSING  ${oldRel}`);
    continue;
  }
  if (existsSync(newAbs)) {
    skipped.push(`DEST-EXISTS ${newRel}`);
    continue;
  }
  if (dryRun) {
    console.log(`DRY  ${oldRel} -> ${newRel}`);
    moved++;
    continue;
  }
  mkdirSync(dirname(newAbs), { recursive: true });
  execFileSync("git", ["mv", oldRel, newRel], { cwd: ROOT });
  moved++;
}

console.log(`\n${dryRun ? "[dry-run] would move" : "moved"} ${moved}/${entries.length}`);
if (skipped.length) console.log(skipped.join("\n"));

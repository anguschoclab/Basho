/**
 * scan-strings.ts — find literal (non-import) path strings that reference
 * moved files, producing a manual-fix checklist.
 *
 * Usage: bun scripts/reorg/scan-strings.ts <MOVE_SET>
 * Scans .ts/.tsx/.json/.js/.yml/.md/.html/.json5 files (excluding
 * node_modules/dist/.git and the test-suite bodies already covered by the
 * specifier rewriter) for:
 *  1. exact old path strings ("src/engine/systems/health/BodyDefinitions.ts")
 *  2. old dir-prefix strings ("src/engine/systems")
 *  3. dirname-relative ROOT constants in moved files (depth changes)
 * Prints file:line + matched text. NEVER auto-rewrites — strings are code.
 */
import { readdirSync, readFileSync, existsSync, statSync } from "fs";
import { join } from "path";
import * as moves from "./moves";
import type { MoveEntry } from "./moves";

const ROOT = join(import.meta.dirname, "..", "..");
const phase = process.argv[2];
const ENTRIES: MoveEntry[] = (moves as unknown as Record<string, MoveEntry[]>)[phase];
if (!ENTRIES) {
  console.error(`unknown move set "${phase}"`);
  process.exit(1);
}

const SCAN_EXTS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".json5", ".yml", ".yaml", ".md", ".html", ".sh"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "out", "coverage", "bun_cache", "resources", "public"]);
const SCAN_ROOTS = ["src", "tests", "e2e", "scripts", "electron", ".github", ".", "docs/TESTING.md", "index.html", "vite.config.ts", "electron.vite.config.ts", "eslint.config.js", "playwright.config.ts", "components.json", "package.json", ".husky"];

function* walk(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) yield* walk(full);
    } else if (SCAN_EXTS.has(e.name.slice(e.name.lastIndexOf(".")))) {
      yield full;
    }
  }
}

const sorted = [...ENTRIES].sort((a, b) => b[0].length - a[0].length);
let hits = 0;
const seen = new Set<string>();
for (const root of SCAN_ROOTS) {
  const abs = join(ROOT, root);
  const files: string[] = statSync(abs, { throwIfNoEntry: false })?.isDirectory()
    ? [...walk(abs)]
    : existsSync(abs)
      ? [abs]
      : [];
  for (const f of files) {
    const rel = f.replaceAll("\\", "/").replace(ROOT.replaceAll("\\", "/") + "/", "");
    if (seen.has(f)) continue;
    seen.add(f);
    const lines = readFileSync(f, "utf-8").split("\n");
    lines.forEach((line, i) => {
      // exact path or dir-prefix strings
      for (const [oldP] of sorted) {
        if (line.includes(`"${oldP}`) || line.includes(`'${oldP}`) || line.includes(`"${oldP}/`) || line.includes(`'${oldP}/`) || line.includes(`"${oldP}.`) || line.includes(`'${oldP}.`)) {
          console.log(`${rel}:${i + 1}: ${line.trim().slice(0, 160)}`);
          hits++;
          break;
        }
      }
      // dirname-relative repo-root constants (depth-sensitive after moves)
      if (/dirname|REPO_ROOT|PROJECT_ROOT/.test(line) && /\.\.\/\.\.\/\.\./.test(line)) {
        console.log(`ROOTCONST ${rel}:${i + 1}: ${line.trim().slice(0, 140)}`);
        hits++;
      }
    });
  }
}
console.log(`\n${hits} manual-review hits`);

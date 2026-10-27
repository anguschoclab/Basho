/* eslint-disable @typescript-eslint/no-non-null-assertion -- temp reorg codemod */
/**
 * rewrite-imports.ts — rewrite module specifiers after git-mv moves.
 *
 * Usage: bun scripts/reorg/rewrite-imports.ts <MOVE_SET> [--dry-run]
 *
 * For every .ts/.tsx source file under src/, tests/, e2e/, scripts/,
 * electron/, finds specifier string literals in:
 *   import/export declarations, dynamic import(), import type nodes
 *   (`import("@/x").T`), and mock-call args (vi.mock/jest.mock/importActual).
 * Resolves each to a repo path (via @/ alias, @tests/ alias, or relative —
 * relative specifiers in MOVED source files resolve against the file's
 * PRE-move dir), applies the prefix move map, and emits:
 *   - `@/…`   for targets under src/
 *   - `@tests/…` for targets under tests/
 *   - relative for everything else (electron/, out-of-tree)
 * Normalizes .ts/.tsx/.d.ts suffixes away; keeps .json/.css/etc.
 */
import { Project, SyntaxKind, type Node } from "ts-morph";
import { existsSync } from "fs";
import { join, dirname, posix } from "path";
import * as moves from "./moves";
import type { MoveEntry } from "./moves";

const ROOT = join(import.meta.dirname, "..", "..").replaceAll("\\", "/");
const phase = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

const ENTRIES: MoveEntry[] = (moves as unknown as Record<string, MoveEntry[]>)[phase];
if (!ENTRIES) {
  console.error(`unknown move set "${phase}"`);
  process.exit(1);
}
// Longest-prefix-first matching.
const MAP = [...ENTRIES].sort((a, b) => b[0].length - a[0].length);

const ALIASES: [alias: string, dir: string][] = [
  ["@tests/", "tests/"],
  ["@/", "src/"],
];

const MOCK_CALLEES = new Set([
  "mock", "doMock", "importActual", "importMock", "unmock", "deepUnmock",
]);

/** repo-rel path → repo-rel path with move map applied (no match = same). */
function applyMap(p: string): string {
  for (const [oldP, newP] of MAP) {
    if (p === oldP || p.startsWith(oldP + "/")) return newP + p.slice(oldP.length);
  }
  return p;
}

/** Reverse: find the pre-move path of a file currently at `cur`. */
function preMovePath(cur: string): string | null {
  for (const [oldP, newP] of MAP) {
    if (cur === newP || cur.startsWith(newP + "/")) return oldP + cur.slice(newP.length);
  }
  return null;
}

function resolveSpecifier(spec: string, srcDirOld: string, _srcDirCur: string): string | null {
  let raw: string | null = null;
  for (const [alias, dir] of ALIASES) {
    if (spec.startsWith(alias)) {
      raw = dir + spec.slice(alias.length);
      break;
    }
  }
  if (raw === null) {
    if (!spec.startsWith(".")) return null; // package specifier
    // A specifier in a moved file was authored against its OLD dir.
    raw = posix.normalize(join(srcDirOld, spec).replaceAll("\\", "/"));
  }
  return raw.replace(/^\.\//, "");
}

function emitSpecifier(targetRepoRel: string, srcDirCur: string, allowAlias: boolean): string {
  if (allowAlias) {
    for (const [alias, dir] of ALIASES) {
      if (targetRepoRel.startsWith(dir)) {
        const rel = targetRepoRel.slice(dir.length).replace(/\.(d\.ts|tsx?)$/, "");
        return alias + rel;
      }
    }
  }
  let rel = posix.relative(srcDirCur, targetRepoRel);
  if (!rel.startsWith(".")) rel = "./" + rel;
  return rel.replace(/\.(d\.ts|tsx?)$/, "");
}

function isSpecifierLiteral(node: Node): boolean {
  if (node.getKind() !== SyntaxKind.StringLiteral) return false;
  const p = node.getParent();
  if (!p) return false;
  const k = p.getKind();
  // A StringLiteral whose direct parent is an import/export declaration is
  // the module specifier (named imports/exports use Identifiers/ExportSpecifiers).
  if (k === SyntaxKind.ImportDeclaration || k === SyntaxKind.ExportDeclaration)
    return true;
  if (k === SyntaxKind.ImportType || k === SyntaxKind.ExternalModuleReference)
    return true;
  if (k === SyntaxKind.CallExpression) {
    const ce = p.asKind(SyntaxKind.CallExpression)!;
    const expr = ce.getExpression();
    if (expr.getKind() === SyntaxKind.ImportKeyword) return true;
    // vi.mock("./x"), vi.importActual("./x"), jest.mock(...)
    if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
      const pa = expr.asKind(SyntaxKind.PropertyAccessExpression)!;
      const obj = pa.getExpression().getText();
      return (obj === "vi" || obj === "jest") && MOCK_CALLEES.has(pa.getName());
    }
    return false;
  }
  return false;
}

const project = new Project({ skipFileDependencyResolution: true });
project.addSourceFilesAtPaths([
  join(ROOT, "src/**/*.{ts,tsx}"),
  join(ROOT, "tests/**/*.{ts,tsx}"),
  join(ROOT, "e2e/**/*.ts"),
  join(ROOT, "scripts/**/*.ts"),
  join(ROOT, "electron/**/*.ts"),
]);

let filesChanged = 0;
let specifiersChanged = 0;
const unresolved: string[] = [];

for (const sf of project.getSourceFiles()) {
  const curRel = sf.getFilePath().replaceAll("\\", "/").replace(ROOT + "/", "");
  const oldRel = preMovePath(curRel);
  const srcDirCur = dirname(curRel);
  const srcDirOld = oldRel ? dirname(oldRel) : srcDirCur;
  let changed = false;

  for (const lit of sf.getDescendantsOfKind(SyntaxKind.StringLiteral)) {
    if (!isSpecifierLiteral(lit)) continue;
    const spec = lit.getLiteralValue();
    const raw = resolveSpecifier(spec, srcDirOld, srcDirCur);
    if (!raw) continue;
    // Find the on-disk file the specifier means — probe extension variants
    // THROUGH the move map so file-level moves (foo.ts -> dir/foo.ts) match
    // extensionless specifiers.
    // Extension probes first — a bare `raw` may collide with a NEW directory
    // (e.g. specifier "@/engine/events" meant the moved events.ts, not the
    // events/ dir that now exists).
    const candidates = [raw + ".ts", raw + ".tsx", raw + ".d.ts", raw + "/index.ts", raw + "/index.tsx", raw + ".json", raw + ".css", raw];
    let target: string | null = null;
    for (const c of candidates) {
      const mapped = applyMap(c);
      if (existsSync(join(ROOT, mapped))) {
        target = mapped;
        break;
      }
    }
    if (!target) {
      unresolved.push(`${curRel}: "${spec}" -> ${raw}`);
      continue;
    }
    // Alias emission only where `@/`/`@tests/` resolve: src/, tests/ (NOT
    // tests/e2e — Playwright can't rely on vite aliases), scripts/
    // (tsconfig.node paths). electron/ stays relative (no alias config).
    const allowAlias =
      curRel.startsWith("src/") ||
      curRel.startsWith("scripts/") ||
      (curRel.startsWith("tests/") && !curRel.startsWith("tests/e2e/"));
    const newSpec = emitSpecifier(target, srcDirCur, allowAlias);
    if (newSpec !== spec) {
      if (!dryRun) lit.setLiteralValue(newSpec);
      specifiersChanged++;
      changed = true;
    }
  }
  if (changed) {
    filesChanged++;
    if (!dryRun) sf.saveSync();
  }
}

console.log(`${dryRun ? "[dry-run]" : ""} changed ${specifiersChanged} specifiers in ${filesChanged} files`);
if (unresolved.length) {
  console.log(`\nUNRESOLVED (${unresolved.length}):`);
  for (const u of unresolved.slice(0, 50)) console.log("  " + u);
}

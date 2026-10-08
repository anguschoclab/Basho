/**
 * Shared filesystem-scan helpers for audit/gate tests.
 *
 * Historically ~15 test files each defined their own recursive `walk`,
 * `findTsFiles`, `collectFiles`, or `readFile(join(SRC, rel))` helper with
 * subtly different semantics. These are the canonical versions — use them
 * instead of writing another local walker (see docs/test-suite-optimization-plan.md).
 */
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

export const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");
export const SRC = join(REPO_ROOT, "src");

const DEFAULT_EXTS = [".ts", ".tsx"];
const DEFAULT_SKIP_DIRS = new Set(["node_modules", ".git", "dist", "coverage"]);

export interface FindFilesOptions {
  /** Extensions to include (with dot). Default: [".ts", ".tsx"]. */
  exts?: string[];
  /** Directory basenames to skip. Default: node_modules, .git, dist, coverage. */
  skipDirs?: ReadonlySet<string>;
  /** Basenames matching this regex are excluded (e.g. /\.(test|spec)\.|\.d\.ts$/). */
  exclude?: RegExp;
}

/** Recursively collect file paths under `dir` (absolute). Missing dirs → []. */
export function findFiles(dir: string, opts: FindFilesOptions = {}): string[] {
  const exts = opts.exts ?? DEFAULT_EXTS;
  const skipDirs = opts.skipDirs ?? DEFAULT_SKIP_DIRS;
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) out.push(...findFiles(full, opts));
    } else if (
      exts.some((e) => entry.name.endsWith(e)) &&
      !(opts.exclude && opts.exclude.test(entry.name))
    ) {
      out.push(full);
    }
  }
  return out;
}

/** Concatenated contents of all matching files under `dir` (each file + "\n"). */
export function collectSource(dir: string, opts: FindFilesOptions = {}): string {
  let source = "";
  for (const file of findFiles(dir, opts)) {
    try {
      source += readFileSync(file, "utf-8") + "\n";
    } catch {
      // skip unreadable files
    }
  }
  return source;
}

/** Read a file under `src/` by repo-relative-to-src path; "" if missing. */
export function readSrcFile(rel: string): string {
  const abs = join(SRC, rel);
  if (!existsSync(abs)) return "";
  return readFileSync(abs, "utf-8");
}

/** Read a file under the repo root by repo-relative path; "" if missing. */
export function readRepoFile(rel: string): string {
  const abs = join(REPO_ROOT, rel);
  if (!existsSync(abs)) return "";
  return readFileSync(abs, "utf-8");
}

/** Non-recursive list of filenames in `src/<dir>` ending with `ext`. */
export function listSrcDir(dir: string, ext: string): string[] {
  const abs = join(SRC, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs).filter((f) => f.endsWith(ext));
}

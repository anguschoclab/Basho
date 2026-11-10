import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";

const PROJECT_ROOT = join(import.meta.dirname, "../../../");
const SRC_DIR = join(PROJECT_ROOT, "src");

/**
 * Dead-file guard (replaces the knip gate — knip is not an installed dep and
 * `npx knip` never ran on this repo; the subprocess only passed via the old
 * fail-open catch). Self-contained import-graph scan: a src file is dead when
 * nothing imports it. Barrels (index.ts), entry points, tests, assets and
 * type-only islands are excluded.
 */

const IMPORT_RE =
  /(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g;

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      yield* walk(p);
    } else {
      yield p;
    }
  }
}

const SRC_EXTS = [".ts", ".tsx"];

function resolveSpecifier(spec: string, importer: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) {
    base = join(SRC_DIR, spec.slice(2));
  } else if (spec.startsWith("@tests/") || spec.startsWith("@assets/")) {
    return null; // test/asset aliases — not src files
  } else if (spec.startsWith(".")) {
    base = resolve(dirname(importer), spec);
  } else {
    return null; // package import
  }
  for (const ext of [...SRC_EXTS, ".json"]) {
    if (exists(base + ext)) return base + ext;
  }
  for (const ext of [...SRC_EXTS, ".json"]) {
    if (exists(join(base, "index" + ext))) return join(base, "index" + ext);
  }
  return null;
}

function exists(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

// Files reachable without an importer — entry points, barrels, declarations.
function isEntryPoint(rel: string): boolean {
  return (
    rel.endsWith("/index.ts") ||
    rel.endsWith("/index.tsx") ||
    rel === "src/main.tsx" ||
    rel === "src/app/main.tsx" ||
    rel === "src/engine.worker.ts" ||
    rel === "src/engine/worker/engine.worker.ts" ||
    rel === "src/engine/simulation/run.ts" || // headless auto-sim CLI (`bun src/engine/simulation/run.ts`)
    rel === "src/vite-env.d.ts" ||
    rel.endsWith(".d.ts") ||
    rel.endsWith(".json") ||
    rel.includes(".test.") ||
    rel.includes("/__tests__/")
  );
}

const KNOWN_STANDALONE = new Set([
  // Imported by electron/main.ts — the Electron boundary lives outside src/,
  // so the src-internal import graph never sees the reference.
  "src/lib/validatePath.ts",
  // Known barrel re-export retained as public component surface (carried
  // over from the original knip gate's allowlist).
  "src/components/ui/Sparkline.tsx",
]);

describe("knip dead code scan", () => {
  it("no unused source files in src/ (excluding barrel index.ts files)", () => {
    const files = Array.from(walk(SRC_DIR)).filter((f) => SRC_EXTS.some((e) => f.endsWith(e)));

    // Importers live in src/ AND tests/ — a file referenced only by tests is
    // still referenced (knip reported it under exports-used-in-tests, not
    // unused files).
    const importerFiles = [
      ...files,
      ...Array.from(walk(join(PROJECT_ROOT, "tests"))).filter((f) =>
        SRC_EXTS.some((e) => f.endsWith(e))
      ),
    ];

    const imported = new Set<string>();
    for (const file of importerFiles) {
      const content = readFileSync(file, "utf-8");
      IMPORT_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = IMPORT_RE.exec(content)) !== null) {
        const spec = m[1] ?? m[2] ?? m[3];
        if (!spec) continue;
        const target = resolveSpecifier(spec, file);
        if (target) imported.add(target);
      }
    }

    const dead = files
      .filter((f) => !imported.has(f))
      .map((f) => relative(PROJECT_ROOT, f).replaceAll("\\", "/"))
      .filter((rel) => !isEntryPoint(rel))
      .filter((rel) => !KNOWN_STANDALONE.has(rel))
      .sort();

    expect(dead, `Unused source files detected by import-graph scan:\n${dead.join("\n")}`).toEqual(
      []
    );
  }, 60000);
});

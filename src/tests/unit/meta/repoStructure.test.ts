/**
 * repoStructure.test.ts — Target-architecture contract test.
 *
 * Authored in Phase 0 of the reorganization BEFORE any moves (test-first
 * methodology). Each assertion encodes an invariant of the harmonized
 * layout defined in the reorg plan. While the reorg is in flight these
 * live under `it.fails` (expected-fail = green); once the phases land the
 * `.fails` markers flip to normal `it` and the suite permanently guards
 * the structure.
 *
 * Invariants:
 *  1. Zero loose source files at src/engine/ root — every engine file
 *     lives in a domain directory.
 *  2. Shadow hierarchies dissolved — engine/systems/, src/utils/,
 *     src/store/, src/contexts/, src/tests/, e2e/ no longer exist.
 *  3. No import specifier references a deleted compat barrel
 *     (engine/lifecycle, engine/shikona, engine/almanac, engine/kimarite).
 *  4. src/engine/_archive/ is manifest-gated — every archived .ts file is
 *     named in _archive/README.md, and no live file imports _archive/.
 *  5. package.json script entries that point at repo files resolve.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { findFiles, REPO_ROOT, SRC } from "@/tests/helpers/fsScan";

const ENGINE = join(SRC, "engine");
const ARCHIVE = join(ENGINE, "_archive");

/** Import/export specifier literals found in a source file. */
function specifiersOf(file: string): string[] {
  const content = readFileSync(file, "utf-8");
  return [...content.matchAll(/(?:from|import)\s*(?:\(\s*)?["']([^"']+)["']/g)].map(
    (m) => m[1]
  );
}

describe("repo structure — harmonized layout contract", () => {
  it.fails("no loose .ts/.tsx files at src/engine/ root", () => {
    const loose = existsSync(ENGINE)
      ? readdirSync(ENGINE, { withFileTypes: true })
          .filter((e) => e.isFile() && /\.(ts|tsx)$/.test(e.name))
          .map((e) => e.name)
      : [];
    expect(loose, `Loose engine files remaining: ${loose.join(", ")}`).toEqual([]);
  });

  it.fails("shadow hierarchies dissolved", () => {
    const remaining = [
      join(ENGINE, "systems"),
      join(ENGINE, "data"),
      join(SRC, "utils"),
      join(SRC, "store"),
      join(SRC, "contexts"),
      join(SRC, "tests"),
      join(REPO_ROOT, "e2e"),
    ].filter((p) => existsSync(p));
    expect(remaining, `Dirs still present: ${remaining.join(", ")}`).toEqual([]);
  });

  it.fails("no import specifier references a deleted compat barrel", () => {
    // Exact module specifiers that only resolve to the deleted root barrels.
    const deadSpecs = new Set([
      "@/engine/lifecycle",
      "@/engine/shikona",
      "@/engine/almanac",
      "@/engine/kimarite",
      "@/engine/npcAI",
      "@/engine/rivalries",
    ]);
    const violations: string[] = [];
    for (const f of findFiles(SRC)) {
      for (const spec of specifiersOf(f)) {
        if (deadSpecs.has(spec)) violations.push(`${f}: imports "${spec}"`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("_archive/ (if present) is manifest-gated and unimported by live code", () => {
    // Vacuous-safe: if the dead-code audit yields no retained modules the dir
    // may not exist — the gate only bites once archive entries land.
    if (!existsSync(ARCHIVE)) return;
    const archived = findFiles(ARCHIVE, { exclude: /README/ }).map((f) =>
      f.replaceAll("\\", "/").split("/").pop()!
    );

    const manifestPath = join(ARCHIVE, "README.md");
    expect(existsSync(manifestPath), "_archive/README.md manifest missing").toBe(true);
    const manifest = readFileSync(manifestPath, "utf-8");
    const undocumented = archived.filter((name) => !manifest.includes(name));
    expect(undocumented, `Archived files missing manifest rows`).toEqual([]);

    const liveImporters: string[] = [];
    for (const f of findFiles(SRC)) {
      if (f.replaceAll("\\", "/").includes("/_archive/")) continue;
      if (specifiersOf(f).some((s) => s.includes("_archive")))
        liveImporters.push(f);
    }
    expect(liveImporters, `Live files importing _archive/`).toEqual([]);
  });

  it("package.json script entries pointing at repo files resolve", () => {
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf-8"));
    const failures: string[] = [];
    for (const [name, raw] of Object.entries(pkg.scripts ?? {})) {
      if (typeof raw !== "string") continue;
      const first = String(raw).split("&&")[0]?.trim() ?? "";
      const match = first.match(/^bun\s+(?:run\s+)?(\S+)/);
      if (!match) continue;
      const entry = match[1];
      if (!entry.startsWith("src/") && !entry.startsWith("scripts/")) continue;
      if (!existsSync(resolve(REPO_ROOT, entry)))
        failures.push(`script "${name}" -> ${entry} not found`);
    }
    expect(failures).toEqual([]);
  });
});

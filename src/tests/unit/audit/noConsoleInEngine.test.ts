/**
 * V7-B08 — engine code must route logging through utils/Logger, not console.*.
 *
 * RED on pre-merge main (32 direct console.* calls across 14 files);
 * GREEN after the Logger codemod. `utils/Logger.ts` itself is exempt.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const ENGINE_DIR = join(__dirname, "../../../engine");
const EXEMPT = new Set([join(ENGINE_DIR, "utils", "Logger.ts")]);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith(".ts")) yield p;
  }
}

describe("V7-B08: no direct console.* calls in src/engine", () => {
  it("engine files use Logger instead of console", () => {
    const offenders: string[] = [];
    for (const file of walk(ENGINE_DIR)) {
      if (EXEMPT.has(file)) continue;
      const src = readFileSync(file, "utf-8");
      const hits = src.split("\n").filter((l) => /console\.(log|warn|error|info|debug)/.test(l));
      if (hits.length) offenders.push(`${file.replace(ENGINE_DIR, "src/engine")}: ${hits.length}`);
    }
    expect(offenders).toEqual([]);
  });
});

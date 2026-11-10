import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

const DIST_DIR = join(import.meta.dirname, "../../../", "dist", "assets");

/**
 * Bundle size budget — every emitted asset chunk under an explicit cap.
 *
 * The budget map keys on emitted filename prefixes (dist/assets/<prefix>-*.js).
 * Vite 8's rolldown pipeline applies its own code-splitting on top of
 * rollupOptions.manualChunks, so the emitted manifest is a mix of configured
 * names (engine-core, game-state) and rolldown groups (npc, combat, chains,
 * page-*). The gate enforces what the build ACTUALLY emits: any chunk not
 * matching a named entry must fit DEFAULT_BUDGET, so a new oversized chunk
 * can never slip through unbudgeted.
 */
const BUDGETS: Record<string, number> = {
  index: 2_500_000,
  "page-BashoPage": 1_500_000,
  "engine.worker": 1_000_000,
  "engine-bout": 1_000_000, // covers engine-bout-core / -support / -narrative prefixes
};
const DEFAULT_BUDGET = 500_000;

function budgetFor(file: string): number {
  // Longest matching prefix wins so "engine-bout-core" hits "engine-bout".
  let best = DEFAULT_BUDGET;
  let bestLen = -1;
  for (const [prefix, bytes] of Object.entries(BUDGETS)) {
    if (file.startsWith(prefix) && prefix.length > bestLen) {
      best = bytes;
      bestLen = prefix.length;
    }
  }
  return best;
}

describe("bundle size budget", () => {
  it("dist/assets exists (run `bun run build` before this test)", () => {
    expect(
      existsSync(DIST_DIR),
      "dist/assets directory not found — run `bun run build` first"
    ).toBe(true);
  });

  it("emits the structural chunks (index, engine.worker, page-*, engine-*)", () => {
    if (!existsSync(DIST_DIR)) return; // covered by the existence test
    const files = readdirSync(DIST_DIR).filter((f) => f.endsWith(".js"));
    for (const required of ["index-", "engine.worker-", "page-", "engine-"]) {
      expect(
        files.some((f) => f.startsWith(required)),
        `No ${required}*.js chunk in dist/assets — build manifest drifted`
      ).toBe(true);
    }
  });

  it("every emitted js chunk fits its budget", () => {
    if (!existsSync(DIST_DIR)) return; // covered by the existence test
    const files = readdirSync(DIST_DIR).filter((f) => f.endsWith(".js"));
    const violations: string[] = [];
    for (const file of files) {
      const size = statSync(join(DIST_DIR, file)).size;
      const budget = budgetFor(file);
      if (size > budget) {
        violations.push(
          `${file} is ${(size / 1_000_000).toFixed(2)} MB, exceeds budget of ${(budget / 1_000_000).toFixed(1)} MB`
        );
      }
    }
    expect(violations, `Over-budget chunks:\n${violations.join("\n")}`).toEqual([]);
  });
});

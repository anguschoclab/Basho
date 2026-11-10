import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

const DIST_DIR = join(import.meta.dirname, "../../../", "dist", "assets");

const BUDGETS: Record<string, number> = {
  index: 2_500_000,
  "engine-core": 500_000,
  "engine-systems": 500_000,
  "engine-tick": 500_000,
  "engine-bout": 1_000_000,
  "engine-npc": 500_000,
  "engine-narrative": 500_000,
  "game-state": 500_000,
  "ui-primitives": 500_000,
  "ui-game": 500_000,
  "ui-layout": 500_000,
  "ui-features": 500_000,
  "vendor-recharts": 500_000,
  "vendor-react": 500_000,
  "vendor-router": 500_000,
  "vendor-framer": 500_000,
  "vendor-radix": 500_000,
  "vendor-lucide": 500_000,
};

function findChunk(prefix: string): string | null {
  if (!existsSync(DIST_DIR)) return null;
  const files = readdirSync(DIST_DIR);
  return files.find((f) => f.startsWith(prefix) && f.endsWith(".js")) ?? null;
}

describe("bundle size budget", () => {
  it("dist/assets exists (run `bun run build` before this test)", () => {
    expect(
      existsSync(DIST_DIR),
      "dist/assets directory not found — run `bun run build` first"
    ).toBe(true);
  });

  for (const [prefix, maxBytes] of Object.entries(BUDGETS)) {
    it(`${prefix} chunk is under ${(maxBytes / 1_000_000).toFixed(1)} MB`, () => {
      const chunk = findChunk(prefix);
      // Fail-closed (S9-6): a missing chunk means the budget isn't being
      // enforced at all — either the build didn't emit it or the manifest
      // drifted. Both are findings, not skips.
      expect(
        chunk,
        `No ${prefix}-*.js chunk in dist/assets — budget not enforced for ${prefix}`
      ).not.toBeNull();
      if (!chunk) return; // unreachable — assertion above fails first
      const size = statSync(join(DIST_DIR, chunk)).size;
      expect(
        size,
        `${chunk} is ${(size / 1_000_000).toFixed(2)} MB, exceeds budget of ${(maxBytes / 1_000_000).toFixed(1)} MB`
      ).toBeLessThanOrEqual(maxBytes);
    });
  }
});

/**
 * T3.4 — wizard difficulty labels must reflect real mechanical
 * divergence. Design intent (measured): harder backstories trade fame/
 * network for raw cash — funds RISE with difficulty while prestige and
 * political capital fall. No backstory should strictly dominate another.
 */
import { describe, it, expect } from "vitest";
import { OYAKATA_BACKSTORIES } from "@/constants/ui/wizard";

const ORDER = ["Easy", "Normal", "Hard", "Very Hard"] as const satisfies readonly ("Easy" | "Normal" | "Hard" | "Very Hard")[];

describe("backstory difficulty bands diverge (T3.4)", () => {
  it("declares all four difficulty tiers", () => {
    const tiers = new Set(OYAKATA_BACKSTORIES.map((b) => b.difficulty));
    for (const t of ORDER) expect(tiers.has(t)).toBe(true);
  });

  it("no backstory strictly dominates another across the full package (funds normalized)", () => {
    // Funds are normalized to ¥1M units so they weigh comparably to ±point bonuses.
    const pkg = (b: (typeof OYAKATA_BACKSTORIES)[number]) => [
      b.bonuses.funds / 1_000_000,
      b.bonuses.prestige,
      b.bonuses.scouting,
      b.bonuses.training,
      b.bonuses.politics,
    ];
    for (const a of OYAKATA_BACKSTORIES) {
      for (const b of OYAKATA_BACKSTORIES) {
        if (a === b) continue;
        const av = pkg(a);
        const bv = pkg(b);
        const aDominates = av.every((v, i) => v >= bv[i]) && av.some((v, i) => v > bv[i]);
        expect(aDominates, `${a.id} strictly dominates ${b.id}`).toBe(false);
      }
    }
  });
});

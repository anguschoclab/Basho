import { describe, it, expect, beforeEach } from "vitest";
import { phase05_monthly_boundary } from "@/engine/tick/phases/phase05_monthly_boundary";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { DEBT_LIMIT } from "@/constants/engine/economic";
import { makeMockHeya, makeMockWorld, mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";

describe("phase05_monthly_boundary — debt limit clamping", () => {
  let world: WorldState;

  beforeEach(() => {
    // Near-insolvent heya with a yokozuna — overhead would push below DEBT_LIMIT
    const r1 = mockRikishi("r-yoko", { rank: "yokozuna", division: "makuuchi", heyaId: "heya-1" });
    const rikishiMap = new Map([["r-yoko", r1]]);

    const heya = makeMockHeya("heya-1", {
      funds: -19_000_000, // near DEBT_LIMIT (-20M)
      rikishiIds: ["r-yoko"],
      koenkaiBand: "none",
    });

    world = makeMockWorld({
      heyas: new Map([["heya-1", heya]]),
      rikishi: rikishiMap,
      transientContext: {
        boundaries: { monthBoundary: true, yearBoundary: false },
      },
    });
  });

  it("clamps heya funds to DEBT_LIMIT after monthly overhead", () => {
    const impact = phase05_monthly_boundary(world);
    const resolved = resolveImpacts(world, [impact]);
    const resolvedHeya = resolved.heyas.get("heya-1");

    // Overhead for 1 yokozuna = 1,500,000 → would push to -20,500,000
    // But DEBT_LIMIT is -20,000,000, so it should be clamped
    expect(resolvedHeya?.funds).toBeGreaterThanOrEqual(DEBT_LIMIT);
    expect(resolvedHeya?.funds).toBe(DEBT_LIMIT);
  });

  it("runway band reflects burn including overhead for a wealthy heya", () => {
    const r1 = mockRikishi("r-yoko2", { rank: "yokozuna", division: "makuuchi", heyaId: "heya-2" });
    const rikishiMap = new Map([["r-yoko2", r1]]);

    const wealthyHeya = makeMockHeya("heya-2", {
      funds: 10_000_000,
      rikishiIds: ["r-yoko2"],
      koenkaiBand: "none",
    });

    const w = makeMockWorld({
      heyas: new Map([["heya-2", wealthyHeya]]),
      rikishi: rikishiMap,
      transientContext: {
        boundaries: { monthBoundary: true, yearBoundary: false },
      },
    });

    const impact = phase05_monthly_boundary(w);
    const resolved = resolveImpacts(w, [impact]);
    const resolvedHeya = resolved.heyas.get("heya-2");

    // Funds should decrease (overhead + maintenance are deducted)
    expect(resolvedHeya?.funds).toBeLessThan(10_000_000);
    // Runway band should be set (not undefined) — burn includes overhead
    expect(resolvedHeya?.runwayBand).toBeDefined();
  });
});

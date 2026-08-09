import { describe, it, expect, beforeEach } from "vitest";
import { phase05_monthly_boundary } from "@/engine/tick/phases/phase05_monthly_boundary";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { DEBT_LIMIT } from "@/constants/engine/economic";
import { RUNWAY_BANDS } from "@/constants/engine/economy";
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

// ── Fix 1: JSA salaries decoupled from runway burn (test-first) ──────────────

describe("phase05_monthly_boundary — runway band excludes JSA salaries from burn", () => {
  it("produces a better runwayBand when JSA salary is excluded from burn", () => {
    // 1 yokozuna: salary=3,300,000, overhead=1,500,000
    // maintenance = (50+50+50) * 3000 = 450,000
    // Pre-fix burn = (3,300,000 + 1,500,000) + 450,000 = 5,250,000
    // Post-fix burn = 1,500,000 + 450,000 = 1,950,000
    // Funds after deductions = 20,000,000 - 1,500,000 - 450,000 = 18,050,000
    // Pre-fix runway = 18,050,000 / 5,250,000 ≈ 3.44 → TIGHT
    // Post-fix runway = 18,050,000 / 1,950,000 ≈ 9.26 → COMFORTABLE
    const r1 = mockRikishi("r-yoko", {
      rank: "yokozuna",
      division: "makuuchi",
      heyaId: "heya-fix1",
    });
    const rikishiMap = new Map([["r-yoko", r1]]);

    const heya = makeMockHeya("heya-fix1", {
      funds: 20_000_000,
      rikishiIds: ["r-yoko"],
      koenkaiBand: "none",
    });

    const w = makeMockWorld({
      heyas: new Map([["heya-fix1", heya]]),
      rikishi: rikishiMap,
      transientContext: {
        boundaries: { monthBoundary: true, yearBoundary: false },
      },
    });

    const impact = phase05_monthly_boundary(w);
    const resolved = resolveImpacts(w, [impact]);
    const resolvedHeya = resolved.heyas.get("heya-fix1");

    // Post-fix: runway ≈ 9.26 → COMFORTABLE (>= RUNWAY_THRESHOLDS.COMFORTABLE=6, < SECURE=12)
    expect(resolvedHeya?.runwayBand).toBe(RUNWAY_BANDS.COMFORTABLE);
  });
});

describe("phase05_monthly_boundary — NPC investment uses overhead-only burn", () => {
  it("NPC heya with high-salary sekitori invests in facilities when overhead-only burn gives runway > threshold", () => {
    // 1 yokozuna: salary=3,300,000, overhead=1,500,000
    // maintenance = (50+50+50) * 3000 = 450,000
    // Pre-fix burn = 5,250,000 → runway = 23,050,000 / 5,250,000 ≈ 4.39 → ≤ 6, no invest
    // Post-fix burn = 1,950,000 → runway = 23,050,000 / 1,950,000 ≈ 11.82 → > 6, invests
    const r1 = mockRikishi("r-yoko-npc", {
      rank: "yokozuna",
      division: "makuuchi",
      heyaId: "heya-npc",
    });
    const rikishiMap = new Map([["r-yoko-npc", r1]]);

    const heya = makeMockHeya("heya-npc", {
      funds: 25_000_000,
      rikishiIds: ["r-yoko-npc"],
      koenkaiBand: "none",
    });

    const w = makeMockWorld({
      heyas: new Map([["heya-npc", heya]]),
      rikishi: rikishiMap,
      playerHeyaId: "heya-player", // different from heya-npc so NPC path runs
      transientContext: {
        boundaries: { monthBoundary: true, yearBoundary: false },
      },
    });

    const impact = phase05_monthly_boundary(w);
    const resolved = resolveImpacts(w, [impact]);
    const resolvedHeya = resolved.heyas.get("heya-npc");

    // Post-fix: NPC should have invested — facilities should differ from original (50,50,50)
    expect(resolvedHeya?.facilities).toBeDefined();
    const fac = resolvedHeya!.facilities;
    // At least one axis should have increased from the base 50
    const anyIncreased = fac.training > 50 || fac.recovery > 50 || fac.nutrition > 50;
    expect(anyIncreased).toBe(true);
  });
});

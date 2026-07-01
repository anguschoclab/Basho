import { describe, it, expect } from "vitest";
import { distributeKoenkaiToSekitori } from "@/engine/systems/economy/TravelAllowanceService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";
import { KOENKAI_INCOME_SPLIT } from "@/constants/engine/economic";
import { KOENKAI_INCOME_MODERATE } from "@/constants/engine/economyExtended";

describe("distributeKoenkaiToSekitori", () => {
  it("distributes koenkai evenly among sekitori in a heya", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", division: "makuuchi" });
    const r2 = mockRikishi("r2", { heyaId: "h1", division: "makuuchi" });
    const r3 = mockRikishi("r3", { heyaId: "h1", division: "juryo" });
    const r4 = mockRikishi("r4", { heyaId: "h1", division: "makushita" });
    const r5 = mockRikishi("r5", { heyaId: "h1", division: "makushita" });

    const heya = makeMockHeya("h1", {
      koenkaiBand: "moderate",
      rikishiIds: ["r1", "r2", "r3", "r4", "r5"],
    });

    const world = makeMockWorld({
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
        ["r3", r3],
        ["r4", r4],
        ["r5", r5],
      ]),
      heyas: new Map([["h1", heya]]),
    });

    const impact = distributeKoenkaiToSekitori(world);
    const updated = resolveImpacts(world, [impact]);

    const expectedPerSekitori =
      (KOENKAI_INCOME_MODERATE * KOENKAI_INCOME_SPLIT.sekitoriPortion) / 3;

    for (const id of ["r1", "r2", "r3"]) {
      const r = updated.rikishi.get(id)!;
      const cashGain = r.economics?.cash ?? 0;
      expect(cashGain).toBeCloseTo(expectedPerSekitori, 0);
    }

    for (const id of ["r4", "r5"]) {
      const r = updated.rikishi.get(id)!;
      expect(r.economics?.cash ?? 0).toBe(0);
    }
  });

  it("skips heyas with no sekitori", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", division: "makushita" });
    const heya = makeMockHeya("h1", {
      koenkaiBand: "moderate",
      rikishiIds: ["r1"],
    });

    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });

    const impact = distributeKoenkaiToSekitori(world);
    const updated = resolveImpacts(world, [impact]);

    expect(updated.rikishi.get("r1")!.economics?.cash ?? 0).toBe(0);
  });

  it("skips heyas with zero koenkai income (none band)", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", division: "makuuchi" });
    const heya = makeMockHeya("h1", {
      koenkaiBand: "none",
      rikishiIds: ["r1"],
    });

    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });

    const impact = distributeKoenkaiToSekitori(world);
    const updated = resolveImpacts(world, [impact]);

    expect(updated.rikishi.get("r1")!.economics?.cash ?? 0).toBe(0);
  });

  it("handles undefined rikishiIds gracefully", () => {
    const heya = makeMockHeya("h1", {
      koenkaiBand: "moderate",
      rikishiIds: undefined as any,
    });

    const world = makeMockWorld({
      heyas: new Map([["h1", heya]]),
    });

    expect(() => {
      const impact = distributeKoenkaiToSekitori(world);
      resolveImpacts(world, [impact]);
    }).not.toThrow();
  });
});

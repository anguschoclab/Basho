import { describe, it, expect } from "vitest";
import { runGovernanceReview } from "@/engine/systems/governance/governanceReview";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";
import {
  CHRONIC_UNDERPERFORMANCE_BASHO,
  PRESTIGE_COLLAPSE_BAND,
  NON_FINANCIAL_MERGER_MAX_ROSTER,
} from "@/constants/engine/economic";

describe("non-financial merger — chronic underperformance + prestige collapse", () => {
  it("triggers merger for small struggling stable with chronic underperformance", () => {
    const world = makeMockWorld();

    // Target stable (healthy, has room, has enough rikishi to avoid low-roster merger)
    const target = makeMockHeya("heya-target", {
      prestigeBand: "respected",
      funds: 10_000_000,
      rikishiIds: ["rt1", "rt2", "rt3"],
    });
    world.heyas.set("heya-target", target);
    world.rikishi.set("rt1", mockRikishi("rt1", { heyaId: "heya-target" }));
    world.rikishi.set("rt2", mockRikishi("rt2", { heyaId: "heya-target" }));
    world.rikishi.set("rt3", mockRikishi("rt3", { heyaId: "heya-target" }));

    // Source stable: small roster, prestige collapsed, chronic underperformance,
    // but NOT in financial distress (funds positive)
    const source = makeMockHeya("heya-source", {
      prestigeBand: PRESTIGE_COLLAPSE_BAND as any,
      funds: 500_000,
      runwayBand: "secure",
      consecutiveUnderperformanceBasho: CHRONIC_UNDERPERFORMANCE_BASHO,
      rikishiIds: ["r1", "r2"],
    });
    world.heyas.set("heya-source", source);

    // Add rikishi to source
    world.rikishi.set("r1", mockRikishi("r1", { heyaId: "heya-source" }));
    world.rikishi.set("r2", mockRikishi("r2", { heyaId: "heya-source" }));

    // Player is not the source
    world.playerHeyaId = "heya-player";
    world.heyas.set(
      "heya-player",
      makeMockHeya("heya-player", { rikishiIds: ["rp1", "rp2", "rp3"] })
    );
    world.rikishi.set("rp1", mockRikishi("rp1", { heyaId: "heya-player" }));
    world.rikishi.set("rp2", mockRikishi("rp2", { heyaId: "heya-player" }));
    world.rikishi.set("rp3", mockRikishi("rp3", { heyaId: "heya-player" }));

    // Add filler heyas to exceed HEYA_FLOOR so merger is not blocked
    for (let i = 0; i < 8; i++) {
      const id = `heya-fill-${i}`;
      world.heyas.set(id, makeMockHeya(id, { rikishiIds: [`rf${i}1`, `rf${i}2`, `rf${i}3`] }));
      world.rikishi.set(`rf${i}1`, mockRikishi(`rf${i}1`, { heyaId: id }));
      world.rikishi.set(`rf${i}2`, mockRikishi(`rf${i}2`, { heyaId: id }));
      world.rikishi.set(`rf${i}3`, mockRikishi(`rf${i}3`, { heyaId: id }));
    }

    const initialHeyaCount = world.heyas.size;
    const impact = runGovernanceReview(world);
    const newWorld = resolveImpacts(world, [impact]);

    // Source heya should be removed (merged)
    expect(newWorld.heyas.has("heya-source")).toBe(false);
    expect(newWorld.heyas.size).toBe(initialHeyaCount - 1);
  });

  it("does NOT trigger non-financial merger when roster is too large", () => {
    const world = makeMockWorld();

    const target = makeMockHeya("heya-target", {
      prestigeBand: "respected",
      funds: 10_000_000,
    });
    world.heyas.set("heya-target", target);

    // Source has too many rikishi
    const rikishiIds: string[] = [];
    for (let i = 0; i < NON_FINANCIAL_MERGER_MAX_ROSTER + 1; i++) {
      rikishiIds.push(`r${i}`);
      world.rikishi.set(`r${i}`, mockRikishi(`r${i}`, { heyaId: "heya-source" }));
    }

    const source = makeMockHeya("heya-source", {
      prestigeBand: PRESTIGE_COLLAPSE_BAND as any,
      funds: 500_000,
      runwayBand: "secure",
      consecutiveUnderperformanceBasho: CHRONIC_UNDERPERFORMANCE_BASHO,
      rikishiIds,
    });
    world.heyas.set("heya-source", source);

    world.playerHeyaId = "heya-player";
    world.heyas.set("heya-player", makeMockHeya("heya-player"));

    const impact = runGovernanceReview(world);
    const newWorld = resolveImpacts(world, [impact]);

    expect(newWorld.heyas.has("heya-source")).toBe(true);
  });

  it("does NOT trigger non-financial merger when underperformance is below threshold", () => {
    const world = makeMockWorld();

    const target = makeMockHeya("heya-target", {
      prestigeBand: "respected",
      funds: 10_000_000,
    });
    world.heyas.set("heya-target", target);

    const source = makeMockHeya("heya-source", {
      prestigeBand: PRESTIGE_COLLAPSE_BAND as any,
      funds: 500_000,
      runwayBand: "secure",
      consecutiveUnderperformanceBasho: CHRONIC_UNDERPERFORMANCE_BASHO - 1,
      rikishiIds: ["r1", "r2"],
    });
    world.heyas.set("heya-source", source);

    world.rikishi.set("r1", mockRikishi("r1", { heyaId: "heya-source" }));
    world.rikishi.set("r2", mockRikishi("r2", { heyaId: "heya-source" }));

    world.playerHeyaId = "heya-player";
    world.heyas.set("heya-player", makeMockHeya("heya-player"));

    const impact = runGovernanceReview(world);
    const newWorld = resolveImpacts(world, [impact]);

    expect(newWorld.heyas.has("heya-source")).toBe(true);
  });
});

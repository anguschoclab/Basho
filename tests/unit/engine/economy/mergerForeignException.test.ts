import { describe, it, expect } from "vitest";
import { executeMerger } from "@/engine/economy/mergers";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya, mockRikishi } from "@tests/unit/engine/utils";
import { offerCandidate } from "@/engine/generation/TalentPoolOffers";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { Id } from "@/engine/types/common";

/**
 * Post-2010 JSA foreign-quota merger exception: when a stable closes and its
 * roster is absorbed, the receiving heya may temporarily hold TWO+
 * foreign-slot rikishi (e.g. Tamashoho joining Kataonami alongside Tamawashi,
 * Miyagino -> Isegahama). The receiving heya simply cannot recruit new
 * foreigners until all foreign-slot rikishi retire.
 *
 * Also covers the no-roster-cap change: real mergers transfer the whole
 * roster to the designated receiving stable — no capacity dispersal.
 */

function foreign(id: string, heyaId: string) {
  return mockRikishi(id, {
    heyaId,
    nationality: "Mongolia",
    citizenshipStatus: "foreign",
    joinedHeyaDate: "2025",
  });
}

function native(id: string, heyaId: string) {
  return mockRikishi(id, { heyaId, nationality: "Japan" });
}

describe("merger — foreign-slot exception (post-2010 JSA)", () => {
  it("a foreign rikishi from the closing stable stacks onto the receiving stable's occupied slot", () => {
    const world = makeMockWorld({ year: 2026 });
    world.playerHeyaId = "heya-player" as Id;

    const target = makeMockHeya("heya-target", { rikishiIds: ["f1", "t1"] });
    const source = makeMockHeya("heya-source", { rikishiIds: ["f2", "s1"] });
    const player = makeMockHeya("heya-player", { rikishiIds: ["p1"] });
    world.heyas.set("heya-target", target);
    world.heyas.set("heya-source", source);
    world.heyas.set("heya-player", player);

    world.rikishi.set("f1", foreign("f1", "heya-target"));
    world.rikishi.set("t1", native("t1", "heya-target"));
    world.rikishi.set("f2", foreign("f2", "heya-source"));
    world.rikishi.set("s1", native("s1", "heya-source"));
    world.rikishi.set("p1", native("p1", "heya-player"));

    const impact = executeMerger(world, "heya-source", "heya-target", "test merger");
    const next = resolveImpacts(world, [impact]);

    // The whole roster transfers to the designated receiving stable —
    // including the second foreigner (merger exception).
    expect(next.rikishi.get("f2")?.heyaId).toBe("heya-target");
    expect(next.rikishi.get("s1")?.heyaId).toBe("heya-target");
    expect(next.rikishi.get("f2")?.isRetired).toBeFalsy();
  });

  it("an over-cap stable from merger still cannot recruit new foreigners", () => {
    const world = makeMockWorld({ year: 2026 });
    world.playerHeyaId = "heya-player" as Id;

    const target = makeMockHeya("heya-target", { rikishiIds: ["f1", "t1"] });
    const source = makeMockHeya("heya-source", { rikishiIds: ["f2", "s1"] });
    const player = makeMockHeya("heya-player", { rikishiIds: ["p1"] });
    world.heyas.set("heya-target", target);
    world.heyas.set("heya-source", source);
    world.heyas.set("heya-player", player);

    world.rikishi.set("f1", foreign("f1", "heya-target"));
    world.rikishi.set("t1", native("t1", "heya-target"));
    world.rikishi.set("f2", foreign("f2", "heya-source"));
    world.rikishi.set("s1", native("s1", "heya-source"));
    world.rikishi.set("p1", native("p1", "heya-player"));

    const merged = resolveImpacts(world, [
      executeMerger(world, "heya-source", "heya-target", "test merger"),
    ]);

    // Post-merger the target holds two foreign-slot rikishi — so the
    // recruitment freeze applies (cannot sign another foreigner).
    const tp = MockFactory.createTalentPool({});
    const cand = MockFactory.createCandidate("cand-f" as Id, {
      nationality: "Georgia",
      availabilityState: "available",
      competingSuitors: [],
    });
    tp.candidates["cand-f"] = cand;
    tp.pools.foreign.candidatesVisible.push("cand-f");
    merged.talentPool = tp;

    const offer = offerCandidate(merged, "cand-f" as Id, "heya-target" as Id, "standard", "high");
    expect(offer.ok).toBe(false);
  });
});

describe("merger — whole-roster transfer (no roster cap)", () => {
  it("transfers the entire source roster to the receiving stable, even beyond 30", () => {
    const world = makeMockWorld({ year: 2026 });
    world.playerHeyaId = "heya-player" as Id;

    const sourceIds: string[] = [];
    for (let i = 0; i < 30; i++) sourceIds.push(`s${i}`);
    const source = makeMockHeya("heya-source", { rikishiIds: sourceIds });
    const target = makeMockHeya("heya-target", { rikishiIds: ["t1", "t2", "t3", "t4", "t5"] });
    const player = makeMockHeya("heya-player", { rikishiIds: ["p1"] });
    world.heyas.set("heya-source", source);
    world.heyas.set("heya-target", target);
    world.heyas.set("heya-player", player);

    for (const id of sourceIds) world.rikishi.set(id, native(id, "heya-source"));
    for (const id of ["t1", "t2", "t3", "t4", "t5"]) world.rikishi.set(id, native(id, "heya-target"));
    world.rikishi.set("p1", native("p1", "heya-player"));

    const impact = executeMerger(world, "heya-source", "heya-target", "test merger");
    const next = resolveImpacts(world, [impact]);

    for (const id of sourceIds) {
      expect(next.rikishi.get(id)?.heyaId).toBe("heya-target");
      expect(next.rikishi.get(id)?.isRetired).toBeFalsy();
    }
    expect(next.heyas.get("heya-target")?.rikishiIds?.length).toBe(35);
  });
});

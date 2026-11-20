import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import {
  listVisibleCandidates,
  resolveForeignRegionalPresence,
} from "@/engine/generation/talentPoolReads";
import { getScoutedCandidateView } from "@/engine/generation/talentPoolScoutingOps";
import { ensureTalentPoolState } from "@/engine/generation/TalentPoolStateService";

function buildForeignPresenceScenario(regionalPresence?: Record<string, number>) {
  const heya = MockFactory.createHeya("heya-player", {
    regionalPresence,
  });
  const world = MockFactory.createWorld({
    playerHeyaId: "heya-player",
    heyas: new Map([["heya-player", heya]]),
  });

  const tp = ensureTalentPoolState(world);
  const mongol = MockFactory.createCandidate("c-mongol", {
    originRegion: "Mongolia",
    nationality: "Mongolia",
    visibilityBand: "public",
  });
  const russian = MockFactory.createCandidate("c-russia", {
    originRegion: "Russia",
    nationality: "Russia",
    visibilityBand: "public",
  });
  const brazilian = MockFactory.createCandidate("c-brazil", {
    originRegion: "Brazil",
    nationality: "Brazil",
    visibilityBand: "public",
  });
  const kazakh = MockFactory.createCandidate("c-kazakh", {
    originRegion: "Kazakhstan",
    nationality: "Kazakhstan",
    visibilityBand: "public",
  });

  tp.candidates = {
    [mongol.candidateId]: mongol,
    [russian.candidateId]: russian,
    [brazilian.candidateId]: brazilian,
    [kazakh.candidateId]: kazakh,
  };
  tp.pools.foreign.candidatesVisible = [
    mongol.candidateId,
    russian.candidateId,
    brazilian.candidateId,
    kazakh.candidateId,
  ];
  world.talentPool = tp;
  return world;
}

describe("talentPoolReads — foreign regionalPresence resolution", () => {
  it("resolves direct keys and ExhibitionRegion mappings", () => {
    const presence = { Mongolia: 45, Europe: 60, Americas: 39, East_Asia: 80 };
    expect(resolveForeignRegionalPresence(presence, "Mongolia")).toBe(45);
    expect(resolveForeignRegionalPresence(presence, "Russia")).toBe(60);
    expect(resolveForeignRegionalPresence(presence, "Brazil")).toBe(39);
    expect(resolveForeignRegionalPresence(presence, "USA")).toBe(39);
    expect(resolveForeignRegionalPresence(presence, "Kazakhstan")).toBe(80);
    expect(resolveForeignRegionalPresence(undefined, "Mongolia")).toBe(0);
  });

  it("gates listVisibleCandidates(foreign) at >= 40 across mapped regions", () => {
    const world = buildForeignPresenceScenario({
      Mongolia: 40,
      Europe: 55,
      Americas: 39,
      East_Asia: 80,
    });
    const visibleIds = listVisibleCandidates(world, "foreign").map((c) => c.candidateId);
    expect(visibleIds).toContain("c-mongol");
    expect(visibleIds).toContain("c-russia");
    expect(visibleIds).toContain("c-kazakh");
    expect(visibleIds).not.toContain("c-brazil");
  });

  it("applies +30 academy scouting bonus in getScoutedCandidateView when mapped region >= 80", () => {
    const world = buildForeignPresenceScenario({ Europe: 85 });
    const viewEurope = getScoutedCandidateView(world, "c-russia");
    const viewAmericas = getScoutedCandidateView(world, "c-brazil");
    expect(viewEurope?.scoutingLevel).toBe(30);
    expect(viewAmericas?.scoutingLevel).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
import { makeMockWorld, makeMockHeya } from "../engine/utils";
import { buildAdvisorSection, buildWeeklyDigest } from "@/presenters/projections/digestProjections";

const PLAYER_HEYA_ID = "player-heya";

describe("buildAdvisorSection", () => {
  it("returns null when there is no player heya", () => {
    const world = makeMockWorld({ playerHeyaId: undefined });
    expect(buildAdvisorSection(world)).toBeNull();
  });

  it("returns null during autonomous simulation", () => {
    const world = makeMockWorld({ playerHeyaId: PLAYER_HEYA_ID, _autonomousSim: true });
    expect(buildAdvisorSection(world)).toBeNull();
  });

  it("renders recommendations as digest items", () => {
    const world = makeMockWorld({ playerHeyaId: PLAYER_HEYA_ID });
    const heya = makeMockHeya(PLAYER_HEYA_ID, { runwayBand: "critical" as const });
    world.heyas.set(PLAYER_HEYA_ID, heya);
    const section = buildAdvisorSection(world);
    expect(section).not.toBeNull();
    expect(section?.title).toBe("Advisor Report");
    expect(section?.items.length).toBeGreaterThan(0);
    expect(section?.items[0].kind).toBe("advisor");
  });
});

describe("buildWeeklyDigest advisor integration", () => {
  it("includes an advisor report section when recommendations exist", () => {
    const world = makeMockWorld({ playerHeyaId: PLAYER_HEYA_ID });
    const heya = makeMockHeya(PLAYER_HEYA_ID, { runwayBand: "critical" as const });
    world.heyas.set(PLAYER_HEYA_ID, heya);
    const digest = buildWeeklyDigest(world);
    expect(digest).not.toBeNull();
    const advisor = digest?.sections.find((s) => s.id === "advisor");
    expect(advisor).toBeDefined();
    expect(advisor?.items.length).toBeGreaterThan(0);
  });

  it("omits advisor section when no recommendations are generated", () => {
    const world = makeMockWorld({ playerHeyaId: PLAYER_HEYA_ID });
    const digest = buildWeeklyDigest(world);
    const advisor = digest?.sections.find((s) => s.id === "advisor");
    expect(advisor).toBeUndefined();
  });
});

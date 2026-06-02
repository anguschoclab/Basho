/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { clearQueryCaches } from "../../../engine/queries";
import { projectScoutingSummary } from "../../../presenters/projections/scoutingProjections";
import { createMockWorldState, createMockHeya } from "../../utils/testHelpers";

vi.mock("../../../presenters/uiDigest", () => ({
  buildPerceptionSnapshot: vi.fn(),
}));

import { buildPerceptionSnapshot } from "../../../presenters/uiDigest";

const mockBuildPerceptionSnapshot = buildPerceptionSnapshot as Mock;

function makeSnap(overrides: Partial<any> = {}): any {
  return {
    rosterStrengthBand: "competitive",
    statureBand: "established",
    stableMediaHeatBand: "warm",
    welfareRiskBand: "safe",
    ...overrides,
  };
}

beforeEach(() => {
  mockBuildPerceptionSnapshot.mockReturnValue(makeSnap());
  clearQueryCaches();
});

afterEach(() => {
  clearQueryCaches();
});

describe("projectScoutingSummary", () => {
  it("returns empty result when no heyas exist", () => {
    const world = createMockWorldState({ heyas: new Map() });
    const result = projectScoutingSummary(world as any);
    expect(result).toEqual({ opponentSnaps: [], totalHeyas: 0, dominantCount: 0, weakCount: 0 });
  });

  it("skips heyas with empty rikishiIds", () => {
    const heya = createMockHeya({ id: "h1", rikishiIds: [] });
    const world = createMockWorldState({ heyas: new Map([["h1", heya]]) });
    const result = projectScoutingSummary(world as any);
    expect(result.opponentSnaps).toHaveLength(0);
    expect(mockBuildPerceptionSnapshot).not.toHaveBeenCalled();
  });

  it("includes heya with non-empty rikishiIds and calls buildPerceptionSnapshot", () => {
    const heya = createMockHeya({ id: "h1", rikishiIds: ["r1"] });
    const world = createMockWorldState({ heyas: new Map([["h1", heya]]) });
    const result = projectScoutingSummary(world as any);
    expect(result.opponentSnaps).toHaveLength(1);
    expect(mockBuildPerceptionSnapshot).toHaveBeenCalledWith(world, "h1");
  });

  it("marks player heya with isPlayer: true", () => {
    const heya = createMockHeya({ id: "player", rikishiIds: ["r1"] });
    const world = createMockWorldState({
      playerHeyaId: "player",
      heyas: new Map([["player", heya]]),
    });
    const result = projectScoutingSummary(world as any);
    expect(result.opponentSnaps[0].isPlayer).toBe(true);
  });

  it("marks non-player heyas with isPlayer: false", () => {
    const npc = createMockHeya({ id: "npc1", rikishiIds: ["r1"] });
    const world = createMockWorldState({
      playerHeyaId: "player",
      heyas: new Map([["npc1", npc]]),
    });
    const result = projectScoutingSummary(world as any);
    expect(result.opponentSnaps[0].isPlayer).toBe(false);
  });

  it("player heya is always first in sorted output regardless of rosterStrengthBand", () => {
    mockBuildPerceptionSnapshot
      .mockReturnValueOnce(makeSnap({ rosterStrengthBand: "weak" }))
      .mockReturnValueOnce(makeSnap({ rosterStrengthBand: "dominant" }));

    const player = createMockHeya({ id: "player", rikishiIds: ["r1"] });
    const npc = createMockHeya({ id: "npc1", rikishiIds: ["r2"] });
    const world = createMockWorldState({
      playerHeyaId: "player",
      heyas: new Map([
        ["player", player],
        ["npc1", npc],
      ]),
    });
    const result = projectScoutingSummary(world as any);
    expect(result.opponentSnaps[0].heyaId).toBe("player");
  });

  it("sorts non-player heyas: dominant → strong → competitive → developing → weak", () => {
    const bands = ["weak", "developing", "competitive", "strong", "dominant"] as const;
    const heyaMap = new Map<string, any>();
    bands.forEach((b, i) => {
      const h = createMockHeya({ id: `h${i}`, rikishiIds: ["r"] });
      heyaMap.set(`h${i}`, h);
      mockBuildPerceptionSnapshot.mockReturnValueOnce(makeSnap({ rosterStrengthBand: b }));
    });
    const world = createMockWorldState({ playerHeyaId: "no-player", heyas: heyaMap });
    const result = projectScoutingSummary(world as any);
    const sortedBands = result.opponentSnaps.map((s) => s.rosterStrengthBand);
    expect(sortedBands).toEqual(["dominant", "strong", "competitive", "developing", "weak"]);
  });

  it("counts dominantCount and weakCount correctly", () => {
    mockBuildPerceptionSnapshot
      .mockReturnValueOnce(makeSnap({ rosterStrengthBand: "dominant" }))
      .mockReturnValueOnce(makeSnap({ rosterStrengthBand: "dominant" }))
      .mockReturnValueOnce(makeSnap({ rosterStrengthBand: "weak" }));

    const heyaMap = new Map<string, any>([
      ["h1", createMockHeya({ id: "h1", rikishiIds: ["r1"] })],
      ["h2", createMockHeya({ id: "h2", rikishiIds: ["r2"] })],
      ["h3", createMockHeya({ id: "h3", rikishiIds: ["r3"] })],
    ]);
    const world = createMockWorldState({ heyas: heyaMap });
    const result = projectScoutingSummary(world as any);
    expect(result.dominantCount).toBe(2);
    expect(result.weakCount).toBe(1);
  });

  it("totalHeyas equals filtered snap count (not raw heya count)", () => {
    const h1 = createMockHeya({ id: "h1", rikishiIds: ["r1"] });
    const h2 = createMockHeya({ id: "h2", rikishiIds: [] });
    const world = createMockWorldState({
      heyas: new Map([
        ["h1", h1],
        ["h2", h2],
      ]),
    });
    const result = projectScoutingSummary(world as any);
    expect(result.totalHeyas).toBe(1);
  });

  it("maps mediaHeatBand from snap.stableMediaHeatBand", () => {
    mockBuildPerceptionSnapshot.mockReturnValue(makeSnap({ stableMediaHeatBand: "blazing" }));
    const heya = createMockHeya({ id: "h1", rikishiIds: ["r1"] });
    const world = createMockWorldState({ heyas: new Map([["h1", heya]]) });
    const result = projectScoutingSummary(world as any);
    expect(result.opponentSnaps[0].mediaHeatBand).toBe("blazing");
  });
});

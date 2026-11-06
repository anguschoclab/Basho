import { describe, it, expect } from "vitest";
import { updateMediaFromBout } from "@/engine/media/MediaBoutService";
import { createDefaultMediaState } from "@/engine/media/MediaStateService";
import { makeMockWorld, mockRikishi, makeMockHeya } from "@tests/unit/engine/utils";
import type { BoutResult } from "@/engine/types/basho";

function makeResult(overrides: Partial<BoutResult>): BoutResult {
  return {
    boutId: "b-1",
    winner: "east",
    winnerRikishiId: "r1",
    loserRikishiId: "r2",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "migi",
    tachiaiWinner: "east",
    duration: 6,
    upset: false,
    kenshoEnvelopes: 0,
    log: [],
    momentumScore: 10,
    inBoutInjury: null,
    isTimeout: false,
    ...overrides,
  } as BoutResult;
}

function worldWithPairing(year: number) {
  const r1 = mockRikishi("r1", { heyaId: "h1" });
  const r2 = mockRikishi("r2", { heyaId: "h2" });
  return makeMockWorld({
    year,
    week: 10,
    rikishi: new Map([
      ["r1", r1],
      ["r2", r2],
    ]),
    heyas: new Map([
      ["h1", makeMockHeya("h1")],
      ["h2", makeMockHeya("h2")],
    ]),
    mediaState: createDefaultMediaState(),
  });
}

function headlineIds(impact: ReturnType<typeof updateMediaFromBout>): string[] {
  const media = impact.worldFields?.mediaState as
    | { headlines?: { id: string }[] }
    | undefined;
  return (media?.headlines ?? []).map((h) => h.id);
}

describe("media headline id uniqueness (V17-D01)", () => {
  it("same pairing on same week/day in different years yields distinct headline ids", () => {
    const worldY1 = worldWithPairing(2025);
    const worldY2 = worldWithPairing(2026);
    const state = createDefaultMediaState();

    const i1 = updateMediaFromBout({
      state,
      world: worldY1,
      result: makeResult({ boutId: "b-2025-hatsu-d5-r1-r2" }),
      day: 5,
      bashoName: "hatsu",
      division: "makuuchi",
    });
    const i2 = updateMediaFromBout({
      state,
      world: worldY2,
      result: makeResult({ boutId: "b-2026-hatsu-d5-r1-r2" }),
      day: 5,
      bashoName: "hatsu",
      division: "makuuchi",
    });

    const ids1 = headlineIds(i1);
    const ids2 = headlineIds(i2);
    expect(ids1.length).toBeGreaterThan(0);
    expect(ids2.length).toBeGreaterThan(0);
    expect(ids1[0]).not.toBe(ids2[0]);
  });

  it("same-day playoff rematch (same pairing, different boutId) yields distinct ids", () => {
    const world = worldWithPairing(2025);
    const state = createDefaultMediaState();

    const i1 = updateMediaFromBout({
      state,
      world,
      result: makeResult({ boutId: "b-2025-hatsu-d15-r1-r2" }),
      day: 15,
      bashoName: "hatsu",
      division: "makuuchi",
    });
    const i2 = updateMediaFromBout({
      state,
      world,
      result: makeResult({ boutId: "playoff-2025-hatsu-r1-r2-1" }),
      day: 15,
      bashoName: "hatsu",
      division: "makuuchi",
    });

    expect(headlineIds(i1)[0]).not.toBe(headlineIds(i2)[0]);
  });
});

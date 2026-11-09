import { describe, it, expect } from "vitest";
import { updateMediaFromBout } from "@/engine/media/MediaBoutService";
import { generateGovernanceHeadline } from "@/engine/media/MediaService";
import { reportScandal } from "@/engine/governance/services/ScandalService";
import { createDefaultMediaState } from "@/engine/media/MediaStateService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
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

/**
 * V18 — governance headline id collisions on identical labels.
 *
 * `generateGovernanceHeadline` builds the rng label as
 * `gov::${heyaId}::${templatePath}::${week}::${dayIndexGlobal}::${salt ?? ""}`
 * on a FRESH SeededRNG — `uuid("MH")` counters are per-instance, so two
 * calls with the same label on the same day mint the same MH id. Headlines
 * are written as a whole `mediaState` world-field (not via arrayAppends),
 * so the resolver-level `appendDeduped` remint does not protect them.
 */
describe("governance headline id uniqueness (V18)", () => {
  it("two same-label governance headlines on one day mint distinct ids", () => {
    const world = makeMockWorld({
      year: 2025,
      week: 10,
      heyas: new Map([["h1", makeMockHeya("h1")]]),
      mediaState: createDefaultMediaState(),
    });

    const w1 = resolveImpacts(world, [
      generateGovernanceHeadline({
        world,
        heyaId: "h1",
        templatePath: "institutional.governance.scandal",
        severity: "national",
      }),
    ]);
    const w2 = resolveImpacts(w1, [
      generateGovernanceHeadline({
        world: w1,
        heyaId: "h1",
        templatePath: "institutional.governance.scandal",
        severity: "national",
      }),
    ]);

    const headlines = w2.mediaState!.headlines;
    expect(headlines.length).toBe(2);
    expect(headlines[0].id).not.toBe(headlines[1].id);
  });

  it("two identical scandals through reportScandal mint distinct headline ids", () => {
    // The real production caller: reportScandal passes `salt: reason`, so
    // two identical misconduct reports share the exact same label.
    const world = makeMockWorld({
      year: 2025,
      week: 10,
      heyas: new Map([["h1", makeMockHeya("h1")]]),
      mediaState: createDefaultMediaState(),
    });

    const w1 = resolveImpacts(world, [
      reportScandal(world, "h1", "minor", "same misconduct"),
    ]);
    const w2 = resolveImpacts(w1, [
      reportScandal(w1, "h1", "minor", "same misconduct"),
    ]);

    const headlines = w2.mediaState!.headlines;
    expect(headlines.length).toBe(2);
    expect(headlines[0].id).not.toBe(headlines[1].id);
  });
});

import { describe, it, expect } from "vitest";
import { selectKeyBouts } from "@/presenters/projections/recapProjections";
import type { WorldState } from "@/engine/types/world";
import type { BashoResult, BoutResult, KeyBoutEntry, MatchSchedule } from "@/engine/types/basho";
import type { DramaContext } from "@/engine/matchmaking/DramaMatchmaker";
import { makeMockWorld, mockRikishi, makeMockBasho } from "../engine/utils";

function makeResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "bout-1",
    winner: "east",
    winnerRikishiId: "r-east",
    loserRikishiId: "r-west",
    kimarite: "oshidashi",
    kimariteName: "Oshidashi",
    stance: "push-dominant",
    tachiaiWinner: "east",
    duration: 10,
    upset: false,
    kenshoEnvelopes: 0,
    log: [],
    ...overrides,
  };
}

function makeMatch(
  boutId: string,
  day: number,
  eastId: string,
  westId: string,
  result: BoutResult | null,
  dramaticContext?: DramaContext
): MatchSchedule {
  return {
    boutId,
    day,
    eastRikishiId: eastId,
    westRikishiId: westId,
    result,
    dramaticContext,
  };
}

function makeWorldWithBasho(
  matches: MatchSchedule[],
  rikishiIds: { id: string; rank?: string; rankNumber?: number }[] = []
): WorldState {
  const world = makeMockWorld();
  for (const r of rikishiIds) {
    world.rikishi.set(
      r.id,
      mockRikishi(r.id, {
        rank: (r.rank as any) ?? "maegashira",
        rankNumber: r.rankNumber ?? 5,
      })
    );
  }
  const basho = makeMockBasho({ matches, bashoName: "hatsu" });
  world.currentBasho = basho;
  return world;
}

describe("selectKeyBouts", () => {
  it("returns empty array when currentBasho is null and no history keyBouts", () => {
    const world = makeMockWorld();
    world.currentBasho = undefined;
    world.history = [];
    expect(selectKeyBouts(world)).toEqual([]);
  });

  it("falls back to persisted keyBouts in world.history when currentBasho is null", () => {
    const world = makeMockWorld();
    world.currentBasho = undefined;
    const keyBoutEntry: KeyBoutEntry = {
      label: "yusho_decider",
      bout: makeResult({ boutId: "b-persisted" }),
      day: 15,
      eastRikishiId: "r1",
      westRikishiId: "r2",
    };
    const bashoResult: Partial<BashoResult> = {
      id: "h-1",
      year: 2026,
      bashoNumber: 1,
      bashoName: "hatsu",
      yusho: "r1",
      junYusho: [],
      prizes: { yushoAmount: 0, junYushoAmount: 0, specialPrizes: 0 },
      keyBouts: [keyBoutEntry],
    };
    world.history = [bashoResult as BashoResult];

    const moments = selectKeyBouts(world);
    expect(moments.length).toBe(1);
    expect(moments[0].label).toBe("yusho_decider");
    expect(moments[0].bout.boutId).toBe("b-persisted");
    expect(moments[0].day).toBe(15);
    expect(moments[0].bashoName).toBe("hatsu");
    expect(moments[0].eastRikishiId).toBe("r1");
    expect(moments[0].westRikishiId).toBe("r2");
  });

  it("returns empty array when no bouts are completed", () => {
    const matches = [makeMatch("b1", 1, "r1", "r2", null)];
    const world = makeWorldWithBasho(matches);
    expect(selectKeyBouts(world)).toEqual([]);
  });

  it("selects yusho decider by drama label", () => {
    const result = makeResult({ boutId: "b-yd" });
    const matches = [
      makeMatch("b1", 10, "r1", "r2", makeResult({ boutId: "b1" })),
      makeMatch("b-yd", 15, "r1", "r2", result, {
        label: "yusho_decider",
        score: 85,
        reason: "",
      }),
    ];
    const world = makeWorldWithBasho(matches);
    const moments = selectKeyBouts(world);
    expect(moments.length).toBeGreaterThanOrEqual(1);
    expect(moments[0].label).toBe("yusho_decider");
    expect(moments[0].bout.boutId).toBe("b-yd");
  });

  it("yusho decider falls back to highest drama score when no yusho_decider label", () => {
    const matches = [
      makeMatch("b-low", 15, "r1", "r2", makeResult({ boutId: "b-low" }), {
        label: "senshuraku_finale",
        score: 70,
        reason: "",
      }),
      makeMatch("b-high", 10, "r1", "r2", makeResult({ boutId: "b-high" }), {
        label: "make_or_break",
        score: 100,
        reason: "",
      }),
    ];
    const world = makeWorldWithBasho(matches);
    const moments = selectKeyBouts(world);
    expect(moments[0].label).toBe("yusho_decider");
    expect(moments[0].bout.boutId).toBe("b-high");
  });

  it("yusho decider falls back to last day-15 bout when no dramaticContext at all", () => {
    const matches = [
      makeMatch("b-d15-1", 15, "r1", "r2", makeResult({ boutId: "b-d15-1" })),
      makeMatch("b-d15-2", 15, "r3", "r4", makeResult({ boutId: "b-d15-2" })),
    ];
    const world = makeWorldWithBasho(matches);
    const moments = selectKeyBouts(world);
    expect(moments[0].label).toBe("yusho_decider");
    expect(moments[0].bout.boutId).toBe("b-d15-2");
  });

  it("selects biggest upset by rank tier differential", () => {
    const world = makeMockWorld();
    world.rikishi.set("r-maegashira", mockRikishi("r-maegashira", { rank: "maegashira", rankNumber: 5 }));
    world.rikishi.set("r-ozeki", mockRikishi("r-ozeki", { rank: "ozeki", rankNumber: 1 }));
    world.rikishi.set("r-juryo", mockRikishi("r-juryo", { rank: "juryo", rankNumber: 1 }));
    world.rikishi.set("r-yokozuna", mockRikishi("r-yokozuna", { rank: "yokozuna", rankNumber: 1 }));

    const matches = [
      makeMatch("b-upset-small", 5, "r-maegashira", "r-ozeki", makeResult({
        boutId: "b-upset-small",
        upset: true,
        winner: "east",
        winnerRikishiId: "r-maegashira",
        loserRikishiId: "r-ozeki",
      })),
      makeMatch("b-upset-big", 8, "r-juryo", "r-yokozuna", makeResult({
        boutId: "b-upset-big",
        upset: true,
        winner: "east",
        winnerRikishiId: "r-juryo",
        loserRikishiId: "r-yokozuna",
      })),
    ];
    const basho = makeMockBasho({ matches, bashoName: "hatsu", day: 15 });
    world.currentBasho = basho;

    const moments = selectKeyBouts(world);
    const upsetMoment = moments.find((m) => m.label === "biggest_upset");
    expect(upsetMoment).toBeDefined();
    expect(upsetMoment!.bout.boutId).toBe("b-upset-big");
  });

  it("biggest upset skipped if same bout already selected as yusho decider", () => {
    const world = makeMockWorld();
    world.rikishi.set("r-maegashira", mockRikishi("r-maegashira", { rank: "maegashira", rankNumber: 5 }));
    world.rikishi.set("r-ozeki", mockRikishi("r-ozeki", { rank: "ozeki", rankNumber: 1 }));
    world.rikishi.set("r-juryo", mockRikishi("r-juryo", { rank: "juryo", rankNumber: 1 }));
    world.rikishi.set("r-yokozuna", mockRikishi("r-yokozuna", { rank: "yokozuna", rankNumber: 1 }));

    const ydResult = makeResult({
      boutId: "b-yd-upset",
      upset: true,
      winner: "east",
      winnerRikishiId: "r-maegashira",
      loserRikishiId: "r-ozeki",
    });
    const otherUpsetResult = makeResult({
      boutId: "b-other-upset",
      upset: true,
      winner: "east",
      winnerRikishiId: "r-juryo",
      loserRikishiId: "r-yokozuna",
    });

    const matches = [
      makeMatch("b-yd-upset", 15, "r-maegashira", "r-ozeki", ydResult, {
        label: "yusho_decider",
        score: 85,
        reason: "",
      }),
      makeMatch("b-other-upset", 8, "r-juryo", "r-yokozuna", otherUpsetResult),
    ];
    const basho = makeMockBasho({ matches, bashoName: "hatsu", day: 15 });
    world.currentBasho = basho;

    const moments = selectKeyBouts(world);
    expect(moments[0].label).toBe("yusho_decider");
    expect(moments[0].bout.boutId).toBe("b-yd-upset");
    const upsetMoment = moments.find((m) => m.label === "biggest_upset");
    expect(upsetMoment).toBeDefined();
    expect(upsetMoment!.bout.boutId).toBe("b-other-upset");
  });

  it("selects first kinboshi bout", () => {
    const world = makeMockWorld();
    world.rikishi.set("r1", mockRikishi("r1", { rank: "maegashira", rankNumber: 5 }));
    world.rikishi.set("r2", mockRikishi("r2", { rank: "yokozuna", rankNumber: 1 }));
    world.rikishi.set("r3", mockRikishi("r3", { rank: "maegashira", rankNumber: 10 }));
    world.rikishi.set("r4", mockRikishi("r4", { rank: "ozeki", rankNumber: 1 }));

    const matches = [
      makeMatch("b-kin1", 5, "r1", "r2", makeResult({
        boutId: "b-kin1",
        isKinboshi: true,
        winner: "east",
        winnerRikishiId: "r1",
        loserRikishiId: "r2",
      })),
      makeMatch("b-kin2", 10, "r3", "r4", makeResult({
        boutId: "b-kin2",
        isKinboshi: true,
        winner: "east",
        winnerRikishiId: "r3",
        loserRikishiId: "r4",
      })),
    ];
    const basho = makeMockBasho({ matches, bashoName: "hatsu", day: 15 });
    world.currentBasho = basho;

    const moments = selectKeyBouts(world);
    const kinboshiMoment = moments.find((m) => m.label === "kinboshi");
    expect(kinboshiMoment).toBeDefined();
    expect(kinboshiMoment!.bout.boutId).toBe("b-kin1");
  });

  it("kinboshi skipped if already used as biggest upset", () => {
    const world = makeMockWorld();
    world.rikishi.set("r1", mockRikishi("r1", { rank: "maegashira", rankNumber: 5 }));
    world.rikishi.set("r2", mockRikishi("r2", { rank: "yokozuna", rankNumber: 1 }));
    world.rikishi.set("r3", mockRikishi("r3", { rank: "maegashira", rankNumber: 10 }));
    world.rikishi.set("r4", mockRikishi("r4", { rank: "ozeki", rankNumber: 1 }));

    const kinBoshiUpsetResult = makeResult({
      boutId: "b-kin-upset",
      upset: true,
      isKinboshi: true,
      winner: "east",
      winnerRikishiId: "r1",
      loserRikishiId: "r2",
    });
    const otherKinboshiResult = makeResult({
      boutId: "b-kin2",
      isKinboshi: true,
      winner: "east",
      winnerRikishiId: "r3",
      loserRikishiId: "r4",
    });

    const matches = [
      // Day 15 bout for yusho decider (no upset, no kinboshi)
      makeMatch("b-yd", 15, "r3", "r4", makeResult({ boutId: "b-yd" }), {
        label: "yusho_decider",
        score: 85,
        reason: "",
      }),
      // Kinboshi + upset bout (should be selected as biggest_upset, not kinboshi)
      makeMatch("b-kin-upset", 8, "r1", "r2", kinBoshiUpsetResult),
      // Another kinboshi (should be selected as kinboshi)
      makeMatch("b-kin2", 10, "r3", "r4", otherKinboshiResult),
    ];
    const basho = makeMockBasho({ matches, bashoName: "hatsu", day: 15 });
    world.currentBasho = basho;

    const moments = selectKeyBouts(world);
    const upsetMoment = moments.find((m) => m.label === "biggest_upset");
    expect(upsetMoment?.bout.boutId).toBe("b-kin-upset");
    const kinboshiMoment = moments.find((m) => m.label === "kinboshi");
    expect(kinboshiMoment?.bout.boutId).toBe("b-kin2");
  });

  it("caps at 3 moments", () => {
    const world = makeMockWorld();
    world.rikishi.set("r1", mockRikishi("r1", { rank: "maegashira", rankNumber: 5 }));
    world.rikishi.set("r2", mockRikishi("r2", { rank: "yokozuna", rankNumber: 1 }));
    world.rikishi.set("r3", mockRikishi("r3", { rank: "maegashira", rankNumber: 10 }));
    world.rikishi.set("r4", mockRikishi("r4", { rank: "ozeki", rankNumber: 1 }));
    world.rikishi.set("r5", mockRikishi("r5", { rank: "maegashira", rankNumber: 15 }));
    world.rikishi.set("r6", mockRikishi("r6", { rank: "sekiwake", rankNumber: 1 }));

    const matches = [
      makeMatch("b-yd", 15, "r1", "r2", makeResult({ boutId: "b-yd" }), {
        label: "yusho_decider",
        score: 85,
        reason: "",
      }),
      makeMatch("b-up1", 3, "r1", "r2", makeResult({
        boutId: "b-up1",
        upset: true,
        winner: "east",
        winnerRikishiId: "r1",
        loserRikishiId: "r2",
      })),
      makeMatch("b-up2", 5, "r3", "r4", makeResult({
        boutId: "b-up2",
        upset: true,
        winner: "east",
        winnerRikishiId: "r3",
        loserRikishiId: "r4",
      })),
      makeMatch("b-kin1", 7, "r5", "r6", makeResult({
        boutId: "b-kin1",
        isKinboshi: true,
        winner: "east",
        winnerRikishiId: "r5",
        loserRikishiId: "r6",
      })),
      makeMatch("b-kin2", 9, "r1", "r4", makeResult({
        boutId: "b-kin2",
        isKinboshi: true,
        winner: "east",
        winnerRikishiId: "r1",
        loserRikishiId: "r4",
      })),
    ];
    const basho = makeMockBasho({ matches, bashoName: "hatsu", day: 15 });
    world.currentBasho = basho;

    const moments = selectKeyBouts(world);
    expect(moments.length).toBe(3);
  });

  it("upset bout skipped when rikishi not in world.rikishi", () => {
    const world = makeMockWorld();
    // Only r1 and r2 exist; r3 and r4 do not
    world.rikishi.set("r1", mockRikishi("r1", { rank: "maegashira", rankNumber: 5 }));
    world.rikishi.set("r2", mockRikishi("r2", { rank: "ozeki", rankNumber: 1 }));

    const matches = [
      makeMatch("b-yd", 15, "r1", "r2", makeResult({ boutId: "b-yd" }), {
        label: "yusho_decider",
        score: 85,
        reason: "",
      }),
      // Upset with missing rikishi — should be skipped
      makeMatch("b-up-missing", 5, "r3", "r4", makeResult({
        boutId: "b-up-missing",
        upset: true,
        winner: "east",
        winnerRikishiId: "r3",
        loserRikishiId: "r4",
      })),
    ];
    const basho = makeMockBasho({ matches, bashoName: "hatsu", day: 15 });
    world.currentBasho = basho;

    const moments = selectKeyBouts(world);
    expect(moments.length).toBe(1);
    expect(moments[0].label).toBe("yusho_decider");
  });

  it("deduplication: same boutId cannot appear twice", () => {
    const world = makeMockWorld();
    world.rikishi.set("r1", mockRikishi("r1", { rank: "maegashira", rankNumber: 5 }));
    world.rikishi.set("r2", mockRikishi("r2", { rank: "yokozuna", rankNumber: 1 }));

    // One bout that is yusho decider, upset, AND kinboshi
    const superBout = makeResult({
      boutId: "b-super",
      upset: true,
      isKinboshi: true,
      winner: "east",
      winnerRikishiId: "r1",
      loserRikishiId: "r2",
    });

    const matches = [
      makeMatch("b-super", 15, "r1", "r2", superBout, {
        label: "yusho_decider",
        score: 85,
        reason: "",
      }),
    ];
    const basho = makeMockBasho({ matches, bashoName: "hatsu", day: 15 });
    world.currentBasho = basho;

    const moments = selectKeyBouts(world);
    const boutIds = moments.map((m) => m.bout.boutId);
    expect(new Set(boutIds).size).toBe(boutIds.length);
    expect(boutIds).toEqual(["b-super"]);
  });

  it("returns correct metadata: day, bashoName, eastRikishiId, westRikishiId", () => {
    const world = makeMockWorld();
    world.rikishi.set("r1", mockRikishi("r1", { rank: "maegashira", rankNumber: 5 }));
    world.rikishi.set("r2", mockRikishi("r2", { rank: "yokozuna", rankNumber: 1 }));

    const matches = [
      makeMatch("b-yd", 15, "r1", "r2", makeResult({ boutId: "b-yd" }), {
        label: "yusho_decider",
        score: 85,
        reason: "",
      }),
    ];
    const basho = makeMockBasho({ matches, bashoName: "nagoya", day: 15 });
    world.currentBasho = basho;

    const moments = selectKeyBouts(world);
    expect(moments[0].day).toBe(15);
    expect(moments[0].bashoName).toBe("nagoya");
    expect(moments[0].eastRikishiId).toBe("r1");
    expect(moments[0].westRikishiId).toBe("r2");
  });

  it("handles bout with no dramaticContext gracefully", () => {
    const world = makeMockWorld();
    world.rikishi.set("r1", mockRikishi("r1", { rank: "maegashira", rankNumber: 5 }));
    world.rikishi.set("r2", mockRikishi("r2", { rank: "ozeki", rankNumber: 1 }));

    const matches = [
      makeMatch("b-no-drama", 10, "r1", "r2", makeResult({ boutId: "b-no-drama" })),
      makeMatch("b-d15", 15, "r1", "r2", makeResult({ boutId: "b-d15" })),
    ];
    const basho = makeMockBasho({ matches, bashoName: "hatsu", day: 15 });
    world.currentBasho = basho;

    const moments = selectKeyBouts(world);
    expect(moments).toBeDefined();
    expect(moments.length).toBeGreaterThanOrEqual(1);
    // Should fall back to last day-15 bout
    expect(moments[0].bout.boutId).toBe("b-d15");
  });
});

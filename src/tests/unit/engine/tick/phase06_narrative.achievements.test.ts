import { describe, it, expect } from "vitest";
import { deriveRecentAchievements } from "@/engine/tick/phases/phase06_narrative";
import { makeMockWorld, mockRikishi, makeMockHeya } from "../utils";
import type { EngineEvent } from "@/engine/types/events";
import type { BashoResult, BoutResult, KeyBoutEntry } from "@/engine/types/basho";

/**
 * Characterization tests for `deriveRecentAchievements` (phase06_narrative).
 *
 * Pins CURRENT behavior ahead of the #1121 refactor (slice/reverse/find →
 * scanRecentEvents). Contract under test:
 *   - the event scan only looks at the LAST 20 entries of events.log
 *   - the most recent RETIREMENT_ANNOUNCED / PROMOTION_DELIBERATION win
 *   - subject id = `e.data?.rikishiId ?? e.rikishiId` for both event kinds
 *   - roster-scoped paths: lastBasho.yusho / keyBouts "kinboshi" only count
 *     when the subject is on the player's active roster; require playerHeyaId
 */

function ev(
  type: string,
  opts: { rikishiId?: string; dataRikishiId?: string; i?: number } = {}
): EngineEvent {
  return {
    id: `ev-${type}-${opts.i ?? 0}`,
    type: type as EngineEvent["type"],
    year: 2026,
    week: 1,
    phase: "weekly",
    category: "career",
    importance: "minor",
    scope: "world",
    rikishiId: opts.rikishiId,
    title: `${type} title`,
    summary: `${type} summary`,
    data: opts.dataRikishiId ? { rikishiId: opts.dataRikishiId } : {},
  } as EngineEvent;
}

function filler(i: number): EngineEvent {
  return ev("TRAINING_UPDATE", { i });
}

function worldWithLog(log: EngineEvent[]) {
  const world = makeMockWorld();
  world.events = { version: "1.0.0", log, dedupe: {} };
  return world;
}

describe("deriveRecentAchievements — event window", () => {
  it("returns empty list/subjects when the log has no matching events", () => {
    const world = worldWithLog([filler(1), filler(2)]);
    expect(deriveRecentAchievements(world)).toEqual({ list: [], subjects: {} });
  });

  it("finds retirement and deliberation events inside the last-20 window", () => {
    const log = [
      ...Array.from({ length: 15 }, (_, i) => filler(i)),
      ev("RETIREMENT_ANNOUNCED", { dataRikishiId: "ret-1" }),
      filler(15),
      ev("PROMOTION_DELIBERATION", { rikishiId: "delib-1" }),
      filler(16),
    ];
    const { list, subjects } = deriveRecentAchievements(worldWithLog(log));
    expect(list).toContain("retirement");
    expect(list).toContain("yokozuna_promotion");
    expect(subjects.retirement).toBe("ret-1");
    expect(subjects.yokozuna_promotion).toBe("delib-1");
  });

  it("ignores matching events older than the last-20 window", () => {
    const log = [
      ev("RETIREMENT_ANNOUNCED", { dataRikishiId: "old-ret" }),
      ev("PROMOTION_DELIBERATION", { rikishiId: "old-delib" }),
      ...Array.from({ length: 20 }, (_, i) => filler(i)),
    ];
    const { list, subjects } = deriveRecentAchievements(worldWithLog(log));
    expect(list).not.toContain("retirement");
    expect(list).not.toContain("yokozuna_promotion");
    expect(subjects.retirement).toBeUndefined();
    expect(subjects.yokozuna_promotion).toBeUndefined();
  });

  it("the most recent of each event type wins the subject", () => {
    const log = [
      ev("RETIREMENT_ANNOUNCED", { dataRikishiId: "first-ret" }),
      filler(1),
      ev("RETIREMENT_ANNOUNCED", { dataRikishiId: "last-ret" }),
      filler(2),
      ev("PROMOTION_DELIBERATION", { rikishiId: "first-delib" }),
      filler(3),
      ev("PROMOTION_DELIBERATION", { rikishiId: "last-delib" }),
    ];
    const { subjects } = deriveRecentAchievements(worldWithLog(log));
    expect(subjects.retirement).toBe("last-ret");
    expect(subjects.yokozuna_promotion).toBe("last-delib");
  });

  it("subject falls back to top-level rikishiId when data.rikishiId is absent", () => {
    const log = [
      ev("RETIREMENT_ANNOUNCED", { rikishiId: "top-ret" }),
      ev("PROMOTION_DELIBERATION", { dataRikishiId: "data-delib" }),
    ];
    const { subjects } = deriveRecentAchievements(worldWithLog(log));
    expect(subjects.retirement).toBe("top-ret");
    expect(subjects.yokozuna_promotion).toBe("data-delib");
  });

  it("data.rikishiId takes precedence over top-level rikishiId", () => {
    const log = [
      ev("RETIREMENT_ANNOUNCED", { rikishiId: "top-ret", dataRikishiId: "data-ret" }),
    ];
    const { subjects } = deriveRecentAchievements(worldWithLog(log));
    expect(subjects.retirement).toBe("data-ret");
  });
});

describe("deriveRecentAchievements — roster-scoped paths", () => {
  function worldWithLastBasho(lastBasho: Partial<BashoResult>) {
    const world = makeMockWorld();
    world.playerHeyaId = "heya-player";
    world.heyas.set(
      "heya-player",
      makeMockHeya("heya-player", { rikishiIds: ["r-mine"] })
    );
    world.rikishi.set("r-mine", mockRikishi("r-mine", { heyaId: "heya-player" }));
    world.rikishi.set("r-theirs", mockRikishi("r-theirs", { heyaId: "heya-other" }));
    world.history = [
      {
        id: "b1",
        year: 2026,
        bashoNumber: 1,
        bashoName: "hatsu",
        yusho: "r-mine",
        junYusho: [],
        prizes: { yushoAmount: 0, junYushoAmount: 0, specialPrizes: 0 },
        ...lastBasho,
      } as BashoResult,
    ];
    return world;
  }

  it("lists yusho only when the winner is on the player's active roster", () => {
    const mine = worldWithLastBasho({ yusho: "r-mine" });
    expect(deriveRecentAchievements(mine).list).toContain("yusho");
    expect(deriveRecentAchievements(mine).subjects.yusho).toBe("r-mine");

    const theirs = worldWithLastBasho({ yusho: "r-theirs" });
    expect(deriveRecentAchievements(theirs).list).not.toContain("yusho");
    expect(deriveRecentAchievements(theirs).subjects.yusho).toBeUndefined();
  });

  it("lists kinboshi only for a rostered winner of a bout labeled kinboshi", () => {
    const kinBout = (winner: string): KeyBoutEntry => ({
      label: "kinboshi",
      bout: { winnerRikishiId: winner } as BoutResult,
      day: 10,
      eastRikishiId: winner,
      westRikishiId: "yoko-1",
    });
    const mine = worldWithLastBasho({ yusho: "r-theirs", keyBouts: [kinBout("r-mine")] });
    const { list, subjects } = deriveRecentAchievements(mine);
    expect(list).toContain("kinboshi");
    expect(subjects.kinboshi).toBe("r-mine");

    const theirs = worldWithLastBasho({ yusho: "r-theirs", keyBouts: [kinBout("r-theirs")] });
    expect(deriveRecentAchievements(theirs).list).not.toContain("kinboshi");
  });

  it("skips roster-scoped achievements entirely without playerHeyaId", () => {
    const world = worldWithLastBasho({ yusho: "r-mine" });
    world.playerHeyaId = undefined;
    expect(deriveRecentAchievements(world).list).not.toContain("yusho");
  });

  it("returns empty achievements when there is no basho history", () => {
    const world = makeMockWorld();
    world.playerHeyaId = "heya-player";
    expect(deriveRecentAchievements(world)).toEqual({ list: [], subjects: {} });
  });
});

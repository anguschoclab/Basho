/**
 * v18Officiating.test.ts
 * ======================
 * V18 failing-first regression pins for bout-officiating bugs. Each
 * assertion FAILS against the current implementation.
 *
 * BUG V18-O1 — the announced mono-ii outcome is decorrelated from the
 *   recorded one. resolveBout runs enrichResult → generateBoutNarrative
 *   (boutResolver.ts:190) BEFORE applyGyojiOfficiation assigns
 *   `result.monoiiOutcome` (boutResolver.ts:199, resolution/gyoji.ts:57-59).
 *   Inside the narrative, postbout2.ts:454 re-rolls reversed/rematch/upheld
 *   on an independent RNG stream (`rngFromSeed(seed, "pbp", "mono-ii")`), so
 *   the outcome the commentary announces is a coin flip unrelated to the
 *   outcome actually recorded on the bout.
 *
 * BUG V18-O2 — phantom reversal credit. resolution/gyoji.ts:40 initializes
 *   `let reversed = !!result.monoii` and only corrects it inside the
 *   five-judge-panel branch. A mono-ii with no panelable shimpan pool
 *   (< 5 judges, or assembleShimpanPanel returns null) still records
 *   `callsReversed + 1` on the officiating gyoji.
 *
 * BUG V18-O3 — double-absent fusensho awards the win to east.
 *   boutResolver.ts:65 `westAbsent ? "east" : "west"` collapses the
 *   "both absent" case into an east walkover.
 *
 * BUG V18-O4 — yaocho `repeatedKimarite` fires on two consecutive identical
 *   kimarite (lastMatch + current) once total meetings ≥ 3, although the
 *   documented signal is "same kimarite repeated 3+ times"
 *   (yaocho.ts:44, 86-89). Rikishi.history (MatchResultLog[]) carries
 *   per-meeting kimarite, so the genuine 3+ check is representable.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { resolveBout } from "@/engine/bout/boutResolver";
import { applyGyojiOfficiation } from "@/engine/bout/resolution/gyoji";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { evaluateYaochoIndicators } from "@/engine/bout/yaocho";
import { generateGyoji, generateShimpan } from "@/engine/officials/GyojiService";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { BardEngine } from "@/engine/bard/BardEngine";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { BoutContext } from "@/engine/bout/boutUtils";
import type { BoutResult, BashoName } from "@/engine/types/basho";
import type { MonoiiOutcome, Gyoji } from "@/engine/types/gyoji";
import type { WorldState } from "@/engine/types/world";

function makeMonoiiResult(boutId: string): BoutResult {
  return {
    boutId,
    day: 5,
    winner: "east",
    winnerRikishiId: "r-east",
    loserRikishiId: "r-west",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "belt-dominant",
    tachiaiWinner: "east",
    duration: 14,
    upset: false,
    isKinboshi: false,
    log: [
      {
        phase: "edge_crisis",
        data: { side: "west", escaped: false, forced: true, controversial: true },
      },
      { phase: "finish", data: {} },
    ],
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
    monoii: true,
  };
}

function officialsWorld(overrides: Partial<WorldState> = {}): WorldState {
  const east = MockFactory.createRikishi("r-east", { shikona: "Alpha", side: "east" });
  const west = MockFactory.createRikishi("r-west", { shikona: "Beta", side: "west" });
  return MockFactory.createWorld({
    rikishi: new Map([
      [east.id, east],
      [west.id, west],
    ]),
    gyojiPool: [generateGyoji("v18-gy", "sanyaku", 0)],
    shimpanPool: [0, 1, 2, 3, 4].map((i) => generateShimpan("v18-sh", i)),
    ...overrides,
  });
}

/** Classify the outcome a mono_ii pbp line announces. */
function announcedOutcome(text: string): MonoiiOutcome | "unknown" {
  const t = text.toLowerCase();
  if (/rematch|torinaoshi|do it again/.test(t)) return "rematch";
  if (/revers|overturn|overrule|gunbai-chigai|incorrect|overrul/.test(t)) return "reversed";
  if (/upheld|stands|confirmed|officially|no change/.test(t)) return "upheld";
  return "unknown";
}

describe("V18-O1 — mono-ii narrative outcome matches the recorded outcome", () => {
  beforeEach(() => BardEngine.resetCache());

  it("announced outcome equals result.monoiiOutcome across seeds", () => {
    const world = officialsWorld();
    const east = world.rikishi.get("r-east")!;
    const west = world.rikishi.get("r-west")!;
    const basho = MockFactory.createBasho({ day: 5 });

    const mismatches: string[] = [];
    for (let i = 0; i < 12; i++) {
      const boutId = `v18-monoii-${i}`;
      const result = makeMonoiiResult(boutId);
      // Production order (boutResolver.ts:190-199): narrative first,
      // gyoji officiation second.
      generateBoutNarrative(
        result,
        east,
        west,
        "hatsu" as BashoName,
        5,
        `${boutId}-pbp`,
        world
      );
      const builder = createImpactBuilder("test-monoii");
      applyGyojiOfficiation(world, result, basho, builder);

      const monoiiLines = (result.pbpLines ?? []).filter((l) => l.phase === "mono_ii");
      expect(monoiiLines.length).toBeGreaterThan(0);
      expect(result.monoiiOutcome).toBeDefined();

      const announced = announcedOutcome(monoiiLines[monoiiLines.length - 1].text);
      if (announced !== result.monoiiOutcome) {
        mismatches.push(`${boutId}: announced=${announced} recorded=${result.monoiiOutcome}`);
      }
    }
    // The narrative re-rolls its own outcome, so ~2/3 of bouts disagree.
    // FAILS today on the first mismatched seed.
    expect(mismatches, mismatches.join("\n")).toEqual([]);
  });
});

describe("V18-O2 — mono-ii without a shimpan panel records no reversal", () => {
  it("mono-ii with < 5 shimpan does not increment callsReversed", () => {
    const gyoji: Gyoji = generateGyoji("v18-gy-np", "sanyaku", 0);
    const world = officialsWorld({
      gyojiPool: [gyoji],
      shimpanPool: [0, 1, 2].map((i) => generateShimpan("v18-sh-np", i)), // 3 < 5 — no panel
    });
    const result = makeMonoiiResult("v18-nopanel");
    const builder = createImpactBuilder("test-nopanel");

    applyGyojiOfficiation(world, result, MockFactory.createBasho({ day: 5 }), builder);

    const updatedPool = builder.build().worldFields?.gyojiPool as Gyoji[];
    expect(updatedPool[0].boutsOfficiated).toBe(1);
    // No panel could convene, so no call was reviewed — yet the gyoji is
    // credited a reversal because `reversed` defaults to !!result.monoii.
    // FAILS today: callsReversed === 1.
    expect(updatedPool[0].callsReversed).toBe(0);
    expect(result.monoiiOutcome).toBeUndefined();
  });

  it("mono-ii with a full panel records a reversal only when reversed (control)", () => {
    const world = officialsWorld();
    const result = makeMonoiiResult("v18-panel-ctrl");
    const builder = createImpactBuilder("test-panel");

    applyGyojiOfficiation(world, result, MockFactory.createBasho({ day: 5 }), builder);

    const updatedPool = builder.build().worldFields?.gyojiPool as Gyoji[];
    expect(result.monoiiOutcome).toBeDefined();
    expect(updatedPool[0].callsReversed).toBe(result.monoiiOutcome === "reversed" ? 1 : 0);
  });
});

describe("V18-O3 — double-absent bout must not award east a walkover", () => {
  it("resolveBout with both rikishi absent declares no winner", () => {
    const east = MockFactory.createRikishi("e", { injured: true, side: "east" });
    const west = MockFactory.createRikishi("w", { isKyujo: true, side: "west" });
    const basho = MockFactory.createBasho({ day: 3 });
    const bout: BoutContext = {
      id: "v18-double-kyujo",
      day: 3,
      rikishiEastId: "e",
      rikishiWestId: "w",
    };

    const { result } = resolveBout(bout, east, west, basho);

    // Both rikishi absent = double fusenpai — no legitimate winner exists.
    // tryFusensho picks east today (`westAbsent ? "east" : "west"`).
    // FAILS today: winnerRikishiId === "e".
    expect(result.kimarite).toBe("fusensho");
    expect([east.id, west.id]).not.toContain(result.winnerRikishiId);
  });
});

describe("V18-O4 — yaocho repeatedKimarite requires a genuine 3+ repeat", () => {
  function makeResult(kimarite: string): BoutResult {
    return {
      boutId: "v18-yaocho",
      day: 10,
      winner: "east",
      winnerRikishiId: "w1",
      loserRikishiId: "l1",
      kimarite: kimarite as BoutResult["kimarite"],
      kimariteName: kimarite,
      stance: "belt-dominant",
      tachiaiWinner: "east",
      duration: 40,
      upset: false,
      isKinboshi: false,
      log: [],
      kenshoEnvelopes: 0,
      momentumScore: 0,
      inBoutInjury: null,
      isTimeout: false,
    };
  }

  function fixtureWorld(historyKimarite: string[]): WorldState {
    const winner = MockFactory.createRikishi("w1", {
      heyaId: "heya-a",
      h2h: {
        l1: {
          wins: 2,
          losses: 1,
          streak: 3,
          lastMatch: {
            winnerId: "w1",
            kimarite: historyKimarite[historyKimarite.length - 1],
            bashoId: "aki-2024",
            day: 8,
            year: 2024,
          },
        },
      },
      history: historyKimarite.map((k, i) => ({
        opponentId: "l1",
        win: true,
        kimarite: k,
        bashoId: `b-${i}`,
        day: 8,
        year: 2024,
      })),
    });
    const loser = MockFactory.createRikishi("l1", { heyaId: "heya-b" });
    return MockFactory.createWorld({
      rikishi: new Map([
        [winner.id, winner],
        [loser.id, loser],
      ]),
    });
  }

  it("two consecutive identical kimarite at 3+ meetings does not flag", () => {
    // Meetings: yorikiri, uwatenage, yorikiri — the current bout is a second
    // consecutive yorikiri, i.e. exactly two in a row. Documented signal is
    // "repeated 3+ times" (yaocho.ts:44). FAILS today.
    const world = fixtureWorld(["yorikiri", "uwatenage", "yorikiri"]);
    const indicators = evaluateYaochoIndicators(
      world,
      makeResult("yorikiri"),
      MockFactory.createBasho({ day: 10 }),
      10
    );
    expect(indicators.repeatedKimarite).toBe(false);
  });

  it("three consecutive identical kimarite does flag (control)", () => {
    const world = fixtureWorld(["yorikiri", "yorikiri", "yorikiri"]);
    const indicators = evaluateYaochoIndicators(
      world,
      makeResult("yorikiri"),
      MockFactory.createBasho({ day: 10 }),
      10
    );
    expect(indicators.repeatedKimarite).toBe(true);
  });
});

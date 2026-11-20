/**
 * W O — Day-11 Kyushu Basho commentary & feature tests (O1–O8).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { applyBoutResult } from "@/engine/bout/boutResultApplier";
import { resolveBout } from "@/engine/bout/boutResolver";
import { BardEngine } from "@/engine/bard/BardEngine";
import { phase01_week_health } from "@/engine/tick/phases/phase01_week_health";
import { treatInjury } from "@/engine/health/HealthActions";
import { TREATMENT_COST_PER_WEEK } from "@/constants/engine/health";
import { buyPhysioSession, PHYSIO_SESSION_COST } from "@/engine/health/physioPurchase";
import { mockRikishi, makeMockHeya } from "@tests/unit/engine/utils";
import { makeBoutResult, makeBoutWorld } from "@tests/helpers/boutTestHelpers";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { BashoName, BoutResult, BashoState, MatchSchedule } from "@/engine/types/basho";
import type { WorldState as FullWorld } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { CareerSnapshot } from "@/engine/types/history";
import { RivalryService } from "@/engine/narrative/RivalryService";
import type { Rank } from "@/engine/types/banzuke";

const BASHO = "kyushu" as BashoName;

beforeEach(() => BardEngine.resetCache());

function narrate(
  east: Rikishi,
  west: Rikishi,
  world: FullWorld,
  result: BoutResult = makeBoutResult(),
  day = 11,
  seed = "seed-d11"
): BoutResult {
  generateBoutNarrative(result, east, west, BASHO, day, seed, world);
  return result;
}

const tagged = (r: BoutResult, tag: string) =>
  (r.pbpLines ?? []).filter((l) => l.tags?.includes(tag as never)).map((l) => l.text);

const interviewLines = (r: BoutResult) =>
  (r.pbpLines ?? []).filter((l) => l.phase === "interview").map((l) => l.text);

function interviewQuestionLine(
  east: Rikishi,
  west: Rikishi,
  world: FullWorld,
  result: BoutResult,
  day = 11
): string[] {
  for (let i = 0; i < 60; i++) {
    const r = narrate(
      east,
      west,
      world,
      { ...result, pbpLines: [] } as BoutResult,
      day,
      `seed-d11-int-${i}`
    );
    const q = interviewLines(r);
    if (q.length > 0) return q;
  }
  return [];
}

function snap(wins: number, losses: number, rank: Rank = "maegashira"): CareerSnapshot {
  return {
    id: `s-${wins}-${losses}`,
    bashoId: "aki-2026",
    year: 2026,
    month: 9,
    bashoName: "aki",
    rank,
    division: "makuuchi",
    rankNumber: 5,
    side: "east",
    wins,
    losses,
    absences: 0,
    isYusho: false,
    isJunYusho: false,
    specialPrizes: { shukunsho: false, kantosho: false, ginosho: false },
    weight: 150,
    momentum: 0,
  };
}

function rivalryOf(
  aId: string,
  bId: string,
  aWins: number,
  bWins: number,
  meetings = aWins + bWins
): FullWorld["rivalriesState"] {
  const key = RivalryService.makeRivalryKey(aId, bId);
  return {
    version: "1.0.0",
    pairs: {
      [key]: {
        key,
        aId,
        bId,
        aWins,
        bWins,
        meetings,
        heat: 40,
        closeness: 10,
        spite: 20,
        tone: "public_hype",
        triggers: {},
        sameHeya: false,
        lastMetWeek: 5,
      },
    },
  };
}

// ─── O1: H2H Breakthroughs, Underdogs & Recent Surges ────────────────────────

describe("O1 — H2H breakthroughs, giant-killer H2H & recent surge", () => {
  it("fires first_breakthrough (not domination) when a 0-5 underdog finally wins", () => {
    const east = mockRikishi("r-east", { division: "makuuchi" });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    world.rivalriesState = rivalryOf(east.id, west.id, 0, 5, 5);
    const result = narrate(east, west, world, makeBoutResult({ winner: "east" }));
    const rivalryTexts = tagged(result, "rivalry");
    expect(rivalryTexts.some((t) => /first|monkey|breakthrough|skid/i.test(t))).toBe(true);
    expect(rivalryTexts.some((t) => /extends the dominance|owns this matchup/i.test(t))).toBe(
      false
    );
  });

  it("fires chipped_away (not domination) when a 1-5 trailer wins", () => {
    const east = mockRikishi("r-east", { division: "makuuchi" });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    world.rivalriesState = rivalryOf(east.id, west.id, 1, 5, 6);
    const result = narrate(east, west, world, makeBoutResult({ winner: "east" }));
    const rivalryTexts = tagged(result, "rivalry");
    expect(rivalryTexts.some((t) => /chips away|pull back|measure of pride/i.test(t))).toBe(true);
    expect(rivalryTexts.some((t) => /extends the dominance|owns this matchup/i.test(t))).toBe(
      false
    );
  });

  it("still fires domination when the 5-0 leader extends to 6-0", () => {
    const east = mockRikishi("r-east", { division: "makuuchi" });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    world.rivalriesState = rivalryOf(east.id, west.id, 5, 0, 5);
    const result = narrate(east, west, world, makeBoutResult({ winner: "east" }));
    const rivalryTexts = tagged(result, "rivalry");
    expect(rivalryTexts.some((t) => /dominance|owns this matchup|beaten .* 6 times/i.test(t))).toBe(
      true
    );
  });

  it("fires giant_killer_h2h when a maegashira leads a yokozuna/ozeki 2-1", () => {
    const east = mockRikishi("r-east", { rank: "maegashira", division: "makuuchi" });
    const west = mockRikishi("r-west", { rank: "yokozuna", division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    world.rivalriesState = rivalryOf(east.id, west.id, 2, 1, 3);
    const result = narrate(east, west, world);
    expect(tagged(result, "upset").some((t) => /2.*1/.test(t))).toBe(true);
  });

  it("fires h2h_recent_surge when career trailer won 5 of last 6 mutual meetings", () => {
    const history = [
      { opponentId: "r-west", win: false, kimarite: "yorikiri", bashoId: "b1", day: 1, year: 2024 },
      { opponentId: "r-west", win: true, kimarite: "oshidashi", bashoId: "b2", day: 2, year: 2025 },
      { opponentId: "r-west", win: true, kimarite: "oshidashi", bashoId: "b3", day: 3, year: 2025 },
      { opponentId: "r-west", win: true, kimarite: "yorikiri", bashoId: "b4", day: 4, year: 2025 },
      { opponentId: "r-west", win: false, kimarite: "yorikiri", bashoId: "b5", day: 5, year: 2026 },
      {
        opponentId: "r-west",
        win: true,
        kimarite: "hatakikomi",
        bashoId: "b6",
        day: 6,
        year: 2026,
      },
      { opponentId: "r-west", win: true, kimarite: "oshidashi", bashoId: "b7", day: 7, year: 2026 },
    ];
    const east = mockRikishi("r-east", { division: "makuuchi", history });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    world.rivalriesState = rivalryOf(east.id, west.id, 5, 8, 13);
    const result = narrate(east, west, world);
    const lines = tagged(result, "rivalry");
    expect(lines.some((t) => /5 of (?:the |their )?last 6|5 wins in their past 6/i.test(t))).toBe(
      true
    );
  });
});

// ─── O2: Post-Henka Scrutiny & lastHenkaDay Tracking ─────────────────────────

describe("O2 — post_henka_scrutiny & lastHenkaDay tracking", () => {
  it("fires post_henka_scrutiny when lastHenkaDay === day - 1 and is silent otherwise", () => {
    const east = mockRikishi("r-east", { division: "makuuchi" });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const bashoYesterday = MockFactory.createBasho({
      day: 11,
      boutMetrics: {
        "r-east": {
          kimariteUsed: {},
          upsetCount: 0,
          boutDurations: [],
          edgeCrisisSurvived: 0,
          comebackWins: 0,
          opponentTiers: [],
          lastHenkaDay: 10,
        },
      },
    }) as BashoState;
    const worldYest = makeBoutWorld(east, west, { currentBasho: bashoYesterday }) as FullWorld;
    expect(
      tagged(narrate(east, west, worldYest, makeBoutResult(), 11), "post_henka_scrutiny").length
    ).toBeGreaterThan(0);
    expect(
      tagged(narrate(east, west, worldYest, makeBoutResult(), 10), "post_henka_scrutiny")
    ).toEqual([]);
    expect(
      tagged(narrate(east, west, worldYest, makeBoutResult(), 12), "post_henka_scrutiny")
    ).toEqual([]);
  });

  it("records lastHenkaDay in applyBoutResult on declared HENKA and spontaneous henka_success", () => {
    const east = mockRikishi("east", { division: "makuuchi" });
    const west = mockRikishi("west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west, {
      currentBasho: MockFactory.createBasho({
        id: "b1",
        day: 10,
        bashoName: BASHO,
        standings: new Map([
          ["east", { wins: 5, losses: 4 }],
          ["west", { wins: 5, losses: 4 }],
        ]),
      }) as BashoState,
    }) as FullWorld;
    const match: MatchSchedule = {
      boutId: "b-1",
      day: 10,
      eastRikishiId: "east",
      westRikishiId: "west",
    };

    const impDeclared = applyBoutResult(
      world,
      match,
      makeBoutResult({
        day: 10,
        winnerRikishiId: "east",
        loserRikishiId: "west",
        tactics: { east: "HENKA", west: "STANDARD" },
      })
    );
    const basho1 = impDeclared.worldFields?.currentBasho as BashoState;
    expect(basho1.boutMetrics?.["east"]?.lastHenkaDay).toBe(10);
    expect(basho1.boutMetrics?.["west"]?.lastHenkaDay).toBeUndefined();

    const impSpontaneous = applyBoutResult(
      world,
      match,
      makeBoutResult({
        day: 10,
        winner: "west",
        winnerRikishiId: "west",
        loserRikishiId: "east",
        tactics: { east: "STANDARD", west: "STANDARD" },
        log: [
          { phase: "tachiai", clock: 0, data: { event: "henka_success", attackerSide: "west" } },
        ],
      })
    );
    const basho2 = impSpontaneous.worldFields?.currentBasho as BashoState;
    expect(basho2.boutMetrics?.["west"]?.lastHenkaDay).toBe(10);
  });
});

// ─── O3: Oldest Makuuchi Kachi-Koshi & Earliest Kachi-Koshi Fix ──────────────

describe("O3 — oldest_kachi_record & earliest_kachi day-11 fix", () => {
  it("fires oldest_kachi_record with PREV_HOLDER when 42yo breaks prior record on win #8", () => {
    const east = mockRikishi("r-east", {
      division: "makuuchi",
      rank: "maegashira",
      age: 42,
      currentBashoWins: 7,
      currentBashoLosses: 3,
    });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east, west) as FullWorld;
    world.records.allTime.oldestMakuuchiKachiKoshi = [
      {
        rikishiId: "kyokutenho",
        shikona: "Kyokutenho",
        value: 40,
        achievedDate: { year: 2014, month: 11 },
      },
    ];
    const result = narrate(east, west, world);
    const lines = tagged(result, "oldest_kachi_record");
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]).toContain("Kyokutenho");
    expect(lines[0]).toContain("42");
  });

  it("fires oldest_kachi_milestone when no prior record exists, and stays silent on win #9 or young age", () => {
    const east42 = mockRikishi("r-east", {
      division: "makuuchi",
      rank: "maegashira",
      age: 42,
      currentBashoWins: 7,
      currentBashoLosses: 3,
    });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const world = makeBoutWorld(east42, west) as FullWorld;
    world.records.allTime.oldestMakuuchiKachiKoshi = [];
    const lines = tagged(narrate(east42, west, world), "oldest_kachi_record");
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]).toContain("42");

    // Non-clinch win #9
    const east9 = mockRikishi("r-east", {
      division: "makuuchi",
      rank: "maegashira",
      age: 42,
      currentBashoWins: 8,
      currentBashoLosses: 3,
    });
    expect(
      tagged(narrate(east9, west, makeBoutWorld(east9, west) as FullWorld), "oldest_kachi_record")
    ).toEqual([]);

    // Under age 38
    const east30 = mockRikishi("r-east", {
      division: "makuuchi",
      rank: "maegashira",
      age: 30,
      currentBashoWins: 7,
      currentBashoLosses: 3,
    });
    expect(
      tagged(narrate(east30, west, makeBoutWorld(east30, west) as FullWorld), "oldest_kachi_record")
    ).toEqual([]);
  });

  it("interview picks oldest_kachi over kachi_koshi for 42yo clinch, and earliest_kachi fires on day 11", () => {
    const eastOld = mockRikishi("r-east", {
      division: "makuuchi",
      rank: "maegashira",
      age: 42,
      currentBashoWins: 7,
      currentBashoLosses: 3,
      careerHistory: [snap(8, 7), snap(8, 7)],
    });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const worldOld = makeBoutWorld(eastOld, west) as FullWorld;
    const qOld = interviewQuestionLine(eastOld, west, worldOld, makeBoutResult(), 11);
    expect(qOld.length).toBeGreaterThan(0);
    expect(qOld[0]).toContain("42");

    const eastFast = mockRikishi("r-east", {
      division: "makuuchi",
      rank: "maegashira",
      age: 26,
      currentBashoWins: 7,
      currentBashoLosses: 3,
      careerHistory: [snap(8, 7), snap(8, 7)],
    });
    const worldFast = makeBoutWorld(eastFast, west) as FullWorld;
    const qFast = interviewQuestionLine(eastFast, west, worldFast, makeBoutResult(), 11);
    expect(qFast.length).toBeGreaterThan(0);
    expect(qFast[0].toLowerCase()).toMatch(
      /earliest|day 11|what's been going well|approach the rest/
    );
  });
});

// ─── O4: Kachi-Koshi & Make-Koshi Stakes ─────────────────────────────────────

describe("O4 — battle_for_kachi, kachi_drought, make_koshi_staved_off, kachi_denied, pride_win_after_mk", () => {
  it("fires battle_for_kachi for 7-3 vs 7-3 and skips 7-7 vs 7-7", () => {
    const east = mockRikishi("r-east", { currentBashoWins: 7, currentBashoLosses: 3 });
    const west = mockRikishi("r-west", { currentBashoWins: 7, currentBashoLosses: 3 });
    const r = narrate(east, west, makeBoutWorld(east, west) as FullWorld);
    expect(
      tagged(r, "kachi_koshi").some((t) =>
        /battle for kachi-koshi|winner gets kachi-koshi|one win away/i.test(t)
      )
    ).toBe(true);

    const e77 = mockRikishi("r-east", { currentBashoWins: 7, currentBashoLosses: 7 });
    const w77 = mockRikishi("r-west", { currentBashoWins: 7, currentBashoLosses: 7 });
    const r77 = narrate(e77, w77, makeBoutWorld(e77, w77) as FullWorld, makeBoutResult(), 15);
    expect(
      tagged(r77, "kachi_koshi").some((t) =>
        /battle for kachi-koshi|winner gets kachi-koshi/i.test(t)
      )
    ).toBe(false);
  });

  it("fires kachi_drought pre-bout and kachi_drought_broken on clinch after 2+ non-KK basho", () => {
    const east = mockRikishi("r-east", {
      currentBashoWins: 7,
      currentBashoLosses: 3,
      careerHistory: [snap(10, 5), snap(6, 9), snap(7, 8)],
    });
    const west = mockRikishi("r-west");
    const r = narrate(east, west, makeBoutWorld(east, west) as FullWorld);
    expect(tagged(r, "kachi_drought").length).toBe(2); // pre-bout + post-bout broken
    expect(tagged(r, "kachi_drought")[0]).toContain("3");
  });

  it("fires make_koshi_staved_off, kachi_denied, and pride_win_after_mk cleanly", () => {
    const east37 = mockRikishi("r-east", { currentBashoWins: 3, currentBashoLosses: 7 });
    const west73 = mockRikishi("r-west", { currentBashoWins: 7, currentBashoLosses: 3 });
    const res1 = narrate(east37, west73, makeBoutWorld(east37, west73) as FullWorld);
    expect(tagged(res1, "make_koshi_staved_off").length).toBe(1);
    expect(tagged(res1, "kachi_denied").length).toBe(1);
    expect(tagged(res1, "pride_win")).toEqual([]);

    const east28 = mockRikishi("r-east", { currentBashoWins: 2, currentBashoLosses: 8 });
    const west55 = mockRikishi("r-west", { currentBashoWins: 5, currentBashoLosses: 5 });
    const res2 = narrate(east28, west55, makeBoutWorld(east28, west55) as FullWorld);
    expect(tagged(res2, "pride_win").length).toBe(1);
    expect(tagged(res2, "make_koshi_staved_off")).toEqual([]);
  });
});

// ─── O5: Streak Snaps, Giants, Prefecture Derbies, Young Giant-Killers, Sibling Kyujo ─

describe("O5 — losing_skid, skid_snapped, giants, prefecture showdown, proven_giant_killer, sibling_kyujo", () => {
  it("fires losing_skid and skid_snapped when winner had 4+ losses and >=1 basho win", () => {
    const east = mockRikishi("r-east", {
      currentBashoWins: 2,
      currentBashoLosses: 8,
      currentLossStreak: 6,
    });
    const west = mockRikishi("r-west", { currentBashoWins: 4, currentBashoLosses: 6 });
    const r = narrate(east, west, makeBoutWorld(east, west) as FullWorld);
    expect(tagged(r, "losing_skid").length).toBe(1);
    expect(tagged(r, "skid_snapped").length).toBe(1);
  });

  it("fires battle_of_giants for 195cm vs 191cm (when heightDiff < threshold)", () => {
    const east = mockRikishi("r-east", { height: 195, weight: 155 });
    const west = mockRikishi("r-west", { height: 191, weight: 152 });
    const r = narrate(east, west, makeBoutWorld(east, west) as FullWorld);
    expect(tagged(r, "battle_of_giants").length).toBe(1);
    expect(tagged(r, "battle_of_giants")[0]).toContain("195");
    expect(tagged(r, "battle_of_giants")[0]).toContain("191");
  });

  it("fires prefecture_showdown_local in host region and prefecture_showdown outside, plus win beat", () => {
    const east = mockRikishi("r-east", { origin: "Kumamoto" });
    const west = mockRikishi("r-west", { origin: "Kumamoto" });
    const rKyushu = narrate(east, west, makeBoutWorld(east, west) as FullWorld);
    const preKyushu = tagged(rKyushu, "prefecture_showdown");
    expect(preKyushu.length).toBe(2); // pre-bout + post-bout win
    expect(preKyushu[0]).toContain("Kumamoto");
    expect(preKyushu[0]).toContain("Kyūshū");

    const eastHokkaido = mockRikishi("r-east", { origin: "Hokkaido" });
    const westHokkaido = mockRikishi("r-west", { origin: "Hokkaido" });
    const rAway = narrate(
      eastHokkaido,
      westHokkaido,
      makeBoutWorld(eastHokkaido, westHokkaido) as FullWorld
    );
    expect(tagged(rAway, "prefecture_showdown").length).toBe(2);
    expect(tagged(rAway, "prefecture_showdown")[0]).toContain("Hokkaido");
  });

  it("fires proven_giant_killer for young maegashira with >=1 kinboshi", () => {
    const east = mockRikishi("r-east", {
      rank: "maegashira",
      age: 22,
      stats: {
        ...mockRikishi("tmp").stats,
        achievements: {
          kinboshiEarned: 1,
          ginboshiEarned: 0,
          kinboshiConceded: 0,
          ginboshiConceded: 0,
          mochikyukinPoints: 0,
          specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
        },
      },
    });
    const west = mockRikishi("r-west", { age: 29 });
    const r = narrate(east, west, makeBoutWorld(east, west) as FullWorld);
    expect(tagged(r, "kinboshi").some((t) => /22|kinboshi|yokozuna/i.test(t))).toBe(true);
  });

  it("fires sibling_kyujo when sibling is withdrawn and sibling_lead did not fire", () => {
    const sib = mockRikishi("sib-1", { division: "makuuchi", isKyujo: true });
    const east = mockRikishi("r-east", { division: "makuuchi", siblingIds: ["sib-1"] });
    const west = mockRikishi("r-west", { division: "makuuchi" });
    const basho = MockFactory.createBasho({ day: 11, standings: new Map() }) as BashoState;
    const world = makeBoutWorld(east, west, { currentBasho: basho }) as FullWorld;
    world.rikishi.set(sib.id, sib);
    const r = narrate(east, west, world);
    expect(tagged(r, "sibling_kyujo").length).toBe(1);
    expect(tagged(r, "sibling_kyujo")[0]).toContain(sib.shikona);
  });
});

// ─── O6: Mid-Basho Re-Entry & Injury-Specific Fusensho ──────────────────────

describe("O6 — mid-basho kyujo re-entry & fusensho_injury", () => {
  it("fires mid_basho_return (not missing-1-basho) and return_win / back_to_back beats", () => {
    const east = mockRikishi("r-east", { recentlyReturnedFromInjury: true, currentWinStreak: 0 });
    const west = mockRikishi("r-west");
    const basho10 = MockFactory.createBasho({
      day: 10,
      reenteredOnDay: { "r-east": 10 },
    }) as BashoState;
    const w10 = makeBoutWorld(east, west, { currentBasho: basho10 }) as FullWorld;
    const r10 = narrate(east, west, w10, makeBoutResult(), 10);
    expect(tagged(r10, "mid_basho_return").length).toBe(2); // pre-bout + return_win
    expect(r10.pbpLines?.some((l) => /1 basho/i.test(l.text))).toBe(false);

    const east11 = mockRikishi("r-east", { currentWinStreak: 1 });
    const basho11 = MockFactory.createBasho({
      day: 11,
      reenteredOnDay: { "r-east": 10 },
    }) as BashoState;
    const w11 = makeBoutWorld(east11, west, { currentBasho: basho11 }) as FullWorld;
    const r11 = narrate(east11, west, w11, makeBoutResult(), 11);
    expect(
      tagged(r11, "mid_basho_return").some((t) => /back-to-back|two wins in two days/i.test(t))
    ).toBe(true);
  });

  it("emits fusensho_injury naming the body area when absent opponent is kyujo due to injury", () => {
    const east = mockRikishi("r-east", { isKyujo: false });
    const west = mockRikishi("r-west", {
      isKyujo: true,
      kyujoReason: "injury",
      injuryStatus: {
        type: "sprain",
        severity: "moderate",
        location: "shoulder",
        weeksRemaining: 3,
      },
    });
    const basho = MockFactory.createBasho({ day: 11 }) as BashoState;
    const world = makeBoutWorld(east, west, { currentBasho: basho }) as FullWorld;
    const { result } = resolveBout(
      { id: "b-fus", day: 11, rikishiEastId: east.id, rikishiWestId: west.id },
      east,
      west,
      basho,
      undefined,
      world
    );
    const lines = result.pbpLines ?? [];
    expect(lines.length).toBe(1);
    expect(lines[0].text.toLowerCase()).toContain("shoulder");
    expect(lines[0].tags).toContain("injury");
  });

  it("records reenteredOnDay across phase01_week_health, treatInjury, and buyPhysioSession", () => {
    const baseStats = mockRikishi("tmp").stats;
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      injured: true,
      isKyujo: true,
      injuryWeeksRemaining: 1,
      injuryStatus: { type: "sprain", severity: "minor", location: "ankle", weeksRemaining: 1 },
      stats: baseStats,
    });
    const heya = makeMockHeya("h1", {
      funds: Math.max(PHYSIO_SESSION_COST, TREATMENT_COST_PER_WEEK) * 5,
      rikishiIds: ["r1"],
    });
    const basho = MockFactory.createBasho({ day: 10 }) as BashoState;
    const world = makeBoutWorld(r1, mockRikishi("r2"), {
      cyclePhase: "active_basho",
      currentBasho: basho,
      heyas: new Map([["h1", heya]]),
      activeRikishiIds: new Set(["r1"]),
    }) as FullWorld;

    const impWeek = phase01_week_health(world);
    expect((impWeek.worldFields?.currentBasho as BashoState)?.reenteredOnDay?.["r1"]).toBe(10);

    const impTreat = treatInjury(world, "r1", 1);
    expect((impTreat.worldFields?.currentBasho as BashoState)?.reenteredOnDay?.["r1"]).toBe(10);

    const impPhysio = buyPhysioSession(world, "r1");
    expect((impPhysio.worldFields?.currentBasho as BashoState)?.reenteredOnDay?.["r1"]).toBe(10);
  });
});

// ─── O7: Live Action & Tactical Beats ────────────────────────────────────────

describe("O7 — thrust_to_belt, plan_b_grip, morozashi_escape & rank_pride", () => {
  it("fires thrust_to_belt on clinch_to_belt log frame and plan_b_grip on off-hand inside shift", () => {
    const east = mockRikishi("r-east", {
      combatProfile: {
        ...mockRikishi("tmp").combatProfile,
        preferredGrip: "migi",
      },
    });
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(
      east,
      west,
      world,
      makeBoutResult({
        log: [
          { phase: "tachiai", data: { tick: 0, tachiaiWinner: "east", margin: 10 } },
          { phase: "engagement", clock: 4, data: { event: "clinch_to_belt" } },
          {
            phase: "grip_transition",
            clock: 6,
            data: {
              type: "grip_class_shift",
              eastGripFrom: "outside",
              eastGripTo: "shitate",
              westGripFrom: "outside",
              westGripTo: "outside",
              eastRightInside: false,
              eastLeftInside: true,
              westRightInside: false,
              westLeftInside: false,
            },
          },
          { phase: "finish", data: {} },
        ] as BoutResult["log"],
      })
    );
    expect(tagged(result, "thrust_to_belt").length).toBe(1);
    expect(tagged(result, "plan_b_grip").length).toBe(1);
  });

  it("fires morozashi_escape when loser gained morozashi yet winner prevailed", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(
      east,
      west,
      world,
      makeBoutResult({
        winner: "east",
        log: [
          { phase: "tachiai", data: { tick: 0, tachiaiWinner: "west", margin: 8 } },
          {
            phase: "grip_transition",
            clock: 4,
            data: {
              type: "grip_class_shift",
              eastGripFrom: "outside",
              eastGripTo: "outside",
              westGripFrom: "shitate",
              westGripTo: "morozashi",
            },
          },
          { phase: "finish", data: {} },
        ] as BoutResult["log"],
      })
    );
    expect(tagged(result, "morozashi_escape").length).toBe(1);
  });

  it("fires rank_pride when an injured/struggling ozeki or yokozuna defeats a hot challenger", () => {
    const east = mockRikishi("r-east", {
      rank: "ozeki",
      injured: true,
      currentBashoWins: 5,
      currentBashoLosses: 5,
    });
    const west = mockRikishi("r-west", {
      rank: "sekiwake",
      currentBashoWins: 9,
      currentBashoLosses: 1,
    });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world, makeBoutResult({ winner: "east" }));
    const lines = tagged(result, "rank_pride");
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain("Ozeki");
  });
});

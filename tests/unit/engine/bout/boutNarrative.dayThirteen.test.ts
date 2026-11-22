/**
 * W Z — Day-13 Kyushu Basho commentary & feature tests.
 * Transcript items: title pedigree (Z1), rare finish callout (Z2), H2H
 * finish recall (Z3), grip no-contest (Z7), shared foreign origin (Z9),
 * tachiai ritual + clean call (Z11).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi } from "@tests/unit/engine/utils";
import { makeBoutResult, makeBoutWorld } from "@tests/helpers/boutTestHelpers";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { BashoName, BoutResult, BashoState } from "@/engine/types/basho";
import type { WorldState as FullWorld } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { MatchResultLog } from "@/engine/types/records";

const BASHO = "kyushu" as BashoName;

beforeEach(() => BardEngine.resetCache());

function narrate(
  east: Rikishi,
  west: Rikishi,
  world: FullWorld,
  result: BoutResult = makeBoutResult(),
  day = 13,
  seed = "seed-d13"
): BoutResult {
  generateBoutNarrative(result, east, west, BASHO, day, seed, world);
  return result;
}

const tagged = (r: BoutResult, tag: string) =>
  (r.pbpLines ?? []).filter((l) => l.tags?.includes(tag as never)).map((l) => l.text);

const allText = (r: BoutResult) => (r.pbpLines ?? []).map((l) => l.text).join("\n");

/** Prior-meeting log entry against this bout's loser. */
function h2hEntry(overrides: Partial<MatchResultLog> = {}): MatchResultLog {
  return {
    opponentId: "r-west",
    win: true,
    kimarite: "yorikiri",
    bashoId: "aki-2026",
    day: 12,
    year: 2026,
    division: "makuuchi",
    ...overrides,
  } as MatchResultLog;
}

/** Standings world — makuuchi leader at 11-1 unless overridden. */
function standingsWorld(
  east: Rikishi,
  west: Rikishi,
  extra: Array<[string, number, number]> = [],
  leaderWins = 11
): FullWorld {
  const leader = mockRikishi("leader", { division: "makuuchi" });
  const standings: Array<[string, { wins: number; losses: number }]> = [
    ["leader", { wins: leaderWins, losses: 2 }],
    [east.id, { wins: east.currentBashoWins ?? 0, losses: east.currentBashoLosses ?? 0 }],
    [west.id, { wins: west.currentBashoWins ?? 0, losses: west.currentBashoLosses ?? 0 }],
    ...extra.map(
      ([id, w, l]) => [id, { wins: w, losses: l }] as [string, { wins: number; losses: number }]
    ),
  ];
  const basho = MockFactory.createBasho({
    id: "kyushu-2026",
    bashoName: "kyushu",
    day: 13,
    standings: new Map(standings),
  }) as BashoState;
  const world = makeBoutWorld(east, west, { currentBasho: basho }) as FullWorld;
  world.rikishi.set(leader.id, leader);
  return world;
}

// ─── Z1: Title-race pedigree ────────────────────────────────────────────────

describe("Z1 — title pedigree (back-to-back vs first title bid)", () => {
  it("fires title_defense for a defending champion in contention", () => {
    const east = mockRikishi("r-east", {
      consecutiveYusho: 1,
      careerRecord: { wins: 200, losses: 100, yusho: 6 },
      currentBashoWins: 10,
      currentBashoLosses: 2,
    });
    const west = mockRikishi("r-west", { currentBashoWins: 9, currentBashoLosses: 3 });
    const world = standingsWorld(east, west);
    const result = narrate(east, west, world);
    expect(tagged(result, "title_stakes").some((t) => /back-to-back|defending/i.test(t))).toBe(
      true
    );
  });

  it("fires first_title_bid for a contender with no career yusho", () => {
    const east = mockRikishi("r-east", {
      careerRecord: { wins: 120, losses: 60, yusho: 0 },
      currentBashoWins: 10,
      currentBashoLosses: 2,
    });
    const west = mockRikishi("r-west", { currentBashoWins: 8, currentBashoLosses: 4 });
    const world = standingsWorld(east, west);
    const result = narrate(east, west, world);
    expect(allText(result)).toMatch(/first.*(yusho|title|championship)/i);
  });

  it("does NOT fire outside the contention window or without the pedigree", () => {
    const east = mockRikishi("r-east", {
      consecutiveYusho: 1,
      careerRecord: { wins: 200, losses: 100, yusho: 6 },
      currentBashoWins: 6,
      currentBashoLosses: 6,
    });
    const west = mockRikishi("r-west", { currentBashoWins: 5, currentBashoLosses: 7 });
    const world = standingsWorld(east, west);
    const result = narrate(east, west, world);
    expect(allText(result)).not.toMatch(/back-to-back/i);
    // And no first-title bid for a career multi-yusho man
    expect(allText(result)).not.toMatch(/first.*(yusho|title|championship)/i);
  });

  it("tolerates missing careerRecord (treated as unknown, no crash)", () => {
    const east = mockRikishi("r-east", { currentBashoWins: 10, currentBashoLosses: 2 });
    const west = mockRikishi("r-west", { currentBashoWins: 8, currentBashoLosses: 4 });
    const world = standingsWorld(east, west);
    expect(() => narrate(east, west, world)).not.toThrow();
  });
});

// ─── Z2: Rare finish callout ────────────────────────────────────────────────

describe("Z2 — rare_technique finish callout", () => {
  it("calls out a rare-tier kimarite finish", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world, makeBoutResult({ kimarite: "utchari" }));
    expect(tagged(result, "rare_technique").length).toBeGreaterThan(0);
  });

  it("stays silent for a common kimarite", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world, makeBoutResult({ kimarite: "yorikiri" }));
    expect(tagged(result, "rare_technique")).toHaveLength(0);
  });
});

// ─── Z3: H2H finish recall ─────────────────────────────────────────────────

describe("Z3 — deja_vu / h2h_adaptation finish recall", () => {
  it("fires deja_vu when the winner beat this opponent with the same kimarite before", () => {
    const east = mockRikishi("r-east", {
      history: [h2hEntry({ kimarite: "uwatenage" })],
    });
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world, makeBoutResult({ kimarite: "uwatenage" }));
    expect(tagged(result, "deja_vu").length).toBeGreaterThan(0);
  });

  it("prefers the playoff-recall variant when a playoff_win names the opponent", () => {
    const east = mockRikishi("r-east", {
      history: [h2hEntry({ kimarite: "uchigake" })],
      careerHighlights: [
        {
          type: "playoff_win",
          basho: "kyushu-2025",
          opponent: "r-west",
          description: "playoff",
        },
      ],
    });
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world, makeBoutResult({ kimarite: "uchigake" }));
    expect(allText(result)).toMatch(/playoff/i);
  });

  it("fires h2h_adaptation when prior wins over this opponent used different kimarite", () => {
    const east = mockRikishi("r-east", {
      history: [
        h2hEntry({ kimarite: "yorikiri" }),
        h2hEntry({ kimarite: "oshidashi" }),
      ],
    });
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world, makeBoutResult({ kimarite: "hatakikomi" }));
    expect(tagged(result, "h2h_adaptation").length).toBeGreaterThan(0);
  });

  it("stays silent with no prior meetings, and ignores draws", () => {
    const east = mockRikishi("r-east", { history: [] });
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world);
    expect(tagged(result, "deja_vu")).toHaveLength(0);
    expect(tagged(result, "h2h_adaptation")).toHaveLength(0);

    const eastDraw = mockRikishi("r-east", {
      history: [h2hEntry({ draw: true, kimarite: "yorikiri" })],
    });
    const world2 = makeBoutWorld(eastDraw, west) as FullWorld;
    const result2 = narrate(eastDraw, west, world2);
    expect(tagged(result2, "deja_vu")).toHaveLength(0);
  });
});

// ─── Z7: Grip no-contest ────────────────────────────────────────────────────

describe("Z7 — grip_conceded post-bout", () => {
  function pref(g: "migi" | "hidari" | "none") {
    return {
      archetype: "hybrid" as const,
      familyPreferences: { push: 25, belt: 25, trick: 25, speed: 25 },
      preferredGrip: g,
      preferredGripDepth: "standard" as const,
      statModifiers: {},
      counterFamily: "push" as const,
      archetypeBehavior: {
        tachiaiSpeedBonus: 0,
        lateralMovementBonus: 0,
        edgeEscapeBonus: 0,
        beltTorqueBonus: 0,
        pushVelocityBonus: 0,
      },
    };
  }

  it("fires when the loser declared a preferred grip but never secured it", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west", { combatProfile: pref("migi") });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(
      east,
      west,
      world,
      makeBoutResult({ gripSecured: { east: false, west: false } })
    );
    expect(tagged(result, "grip_conceded").length).toBeGreaterThan(0);
  });

  it("fires the homework variant when the winner lost the previous meeting", () => {
    const east = mockRikishi("r-east", {
      history: [h2hEntry({ win: false })],
    });
    const west = mockRikishi("r-west", { combatProfile: pref("hidari") });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(
      east,
      west,
      world,
      makeBoutResult({ gripSecured: { east: false, west: false } })
    );
    expect(allText(result)).toMatch(/homework|figured|worked out/i);
  });

  it("stays silent when the loser has no declared grip or secured it", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west", { combatProfile: pref("none") });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(
      east,
      west,
      world,
      makeBoutResult({ gripSecured: { east: true, west: false } })
    );
    expect(tagged(result, "grip_conceded")).toHaveLength(0);

    const westSecured = mockRikishi("r-west", { combatProfile: pref("migi") });
    const world2 = makeBoutWorld(east, westSecured) as FullWorld;
    const result2 = narrate(
      east,
      westSecured,
      world2,
      makeBoutResult({ gripSecured: { east: false, west: true } })
    );
    expect(tagged(result2, "grip_conceded")).toHaveLength(0);
  });
});

// ─── Z9: Shared foreign origin ──────────────────────────────────────────────

describe("Z9 — shared_origin for shared foreign origins", () => {
  it("uses the shared-origin line (not 'prefecture derby') for a foreign pair", () => {
    const east = mockRikishi("r-east", { origin: "Philippines" });
    const west = mockRikishi("r-west", { origin: "Philippines" });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world);
    const home = tagged(result, "hometown").join("\n");
    expect(home.length).toBeGreaterThan(0);
    expect(home).not.toMatch(/prefecture derby/i);
  });

  it("uses shared-origin post-bout copy for a foreign pair (post-bout twin fix)", () => {
    const east = mockRikishi("r-east", { origin: "Philippines" });
    const west = mockRikishi("r-west", { origin: "Philippines" });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world);
    // pre-bout shared_origin + post-bout shared_origin_win
    expect(tagged(result, "shared_origin").length).toBeGreaterThanOrEqual(2);
    expect(tagged(result, "prefecture_showdown")).toHaveLength(0);
  });

  it("keeps prefecture_showdown copy for same-prefecture Japanese pairs", () => {
    const east = mockRikishi("r-east", { origin: "Kagoshima" });
    const west = mockRikishi("r-west", { origin: "Kagoshima" });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world);
    expect(tagged(result, "prefecture_showdown").length).toBeGreaterThan(0);
    expect(tagged(result, "shared_origin")).toHaveLength(0);
  });
});

// ─── Z11: Tachiai ritual + clean call ───────────────────────────────────────

describe("Z11 — matta narration, mutual consent flavor, clean_call", () => {
  it("narrates a matta false start from the log entry", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(
      east,
      west,
      world,
      makeBoutResult({
        log: [
          { phase: "tachiai", data: { tick: 0, tachiaiWinner: "east", margin: 10 } },
          { phase: "tachiai", clock: 0, data: { event: "matta" } },
          { phase: "finish", data: {} },
        ],
      })
    );
    expect(allText(result)).toMatch(/false start|reset/i);
  });

  it("eventually emits the mutual-consent tachiai flavor line", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west) as FullWorld;
    let found = false;
    for (let i = 0; i < 200 && !found; i++) {
      const r = narrate(
        east,
        west,
        world,
        { ...makeBoutResult(), pbpLines: [] } as BoutResult,
        13,
        `seed-d13-mc-${i}`
      );
      if (/mutual consent|gunbai/i.test(allText(r))) found = true;
    }
    expect(found).toBe(true);
  });

  it("fires clean_call on a down-type finish with no mono-ii", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(
      east,
      west,
      world,
      makeBoutResult({ kimarite: "hatakikomi", hairDown: true })
    );
    expect(tagged(result, "close_call").length).toBeGreaterThan(0);
  });

  it("does NOT fire clean_call when a mono-ii happened or no down finish", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west) as FullWorld;
    const withMonoii = narrate(
      east,
      west,
      world,
      makeBoutResult({ kimarite: "hatakikomi", hairDown: true, monoii: true })
    );
    expect(tagged(withMonoii, "close_call")).toHaveLength(0);

    const cleanResult = narrate(
      east,
      west,
      world,
      { ...makeBoutResult({ kimarite: "yorikiri" }), pbpLines: [] } as BoutResult
    );
    expect(tagged(cleanResult, "close_call")).toHaveLength(0);
  });
});

// ─── W Z stretch: marketability fan-favorite line ───────────────────────────

describe("W Z stretch — fan_favorite marketability line", () => {
  it("fires for the more popular man when his score clears the bar", () => {
    const east = mockRikishi("r-east", { marketability: 90 });
    const west = mockRikishi("r-west", { marketability: 55 });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world);
    const lines = tagged(result, "fan_favorite");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("Wrestler-r-east");
  });

  it("also fires on economics.popularity alone", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west", {
      economics: {
        cash: 0,
        retirementFund: 0,
        careerKenshoWon: 0,
        kinboshiCount: 0,
        totalEarnings: 0,
        currentBashoEarnings: 0,
        popularity: 88,
      },
    });
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world);
    const lines = tagged(result, "fan_favorite");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("Wrestler-r-west");
  });

  it("stays silent at default popularity", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west) as FullWorld;
    const result = narrate(east, west, world);
    expect(tagged(result, "fan_favorite")).toHaveLength(0);
  });
});

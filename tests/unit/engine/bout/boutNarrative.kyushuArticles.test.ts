/**
 * W Q — Kyushu 2026 Japan-Times article commentary tests (B1–B6).
 * Mined via the sumo-transcript audit workflow from the Kyushu previews:
 * best-start-in-years, consecutive elite scalps, ozeki bid, last-basho
 * collapse shadow, unbeatens dream showdown, all-stars-healthy note.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi } from "@tests/unit/engine/utils";
import { makeBoutResult, makeBoutWorld } from "@tests/helpers/boutTestHelpers";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { BashoName, BashoState, BoutResult } from "@/engine/types/basho";
import type { WorldState as FullWorld } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { CareerSnapshot } from "@/engine/types/history";
import type { MatchResultLog } from "@/engine/types/records";
import type { Rank } from "@/engine/types/banzuke";

const BASHO = "kyushu" as BashoName;

beforeEach(() => BardEngine.resetCache());

function narrate(
  east: Rikishi,
  west: Rikishi,
  world: FullWorld,
  result: BoutResult = makeBoutResult(),
  day = 11,
  seed = "seed-art"
): BoutResult {
  generateBoutNarrative(result, east, west, BASHO, day, seed, world);
  return result;
}

const tagged = (r: BoutResult, tag: string) =>
  (r.pbpLines ?? []).filter((l) => l.tags?.includes(tag as never)).map((l) => l.text);

function snap(
  wins: number,
  losses: number,
  overrides: Partial<CareerSnapshot> = {}
): CareerSnapshot {
  return {
    id: `s-${wins}-${losses}-${overrides.rank ?? "maegashira"}`,
    bashoId: `prev-${wins}-${losses}`,
    year: 2026,
    month: 9,
    bashoName: "aki",
    rank: "maegashira" as Rank,
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
    ...overrides,
  } as CareerSnapshot;
}

function log(bashoId: string, day: number, win: boolean, opponentId = "opp"): MatchResultLog {
  return { opponentId, win, kimarite: "yorikiri", bashoId, day, year: 2026, division: "makuuchi" };
}

/** World carrying the current basho (id matches log() bashoIds) + optional extras. */
function worldWithBasho(east: Rikishi, west: Rikishi, extras: Rikishi[] = [], day = 11): FullWorld {
  const basho = MockFactory.createBasho({
    id: "kyushu-2026",
    day,
    standings: new Map([
      [east.id, { wins: east.currentBashoWins ?? 0, losses: east.currentBashoLosses ?? 0 }],
      [west.id, { wins: west.currentBashoWins ?? 0, losses: west.currentBashoLosses ?? 0 }],
    ]),
  }) as BashoState;
  const world = makeBoutWorld(east, west, { currentBasho: basho }) as FullWorld;
  for (const r of extras) world.rikishi.set(r.id, r);
  return world;
}

describe("Kyushu article commentary", () => {
  // ── B1: "off to his best start in over three years" ──────────────────
  it("B1 best_start: post-bout line when current wins top every recent basho", () => {
    const east = mockRikishi("r-east", {
      currentBashoWins: 8,
      currentBashoLosses: 1,
      careerHistory: [snap(8, 7), snap(7, 8), snap(6, 9), snap(8, 7), snap(7, 8), snap(5, 10)],
    });
    const west = mockRikishi("r-west", { currentBashoWins: 5, currentBashoLosses: 5 });
    const world = makeBoutWorld(east, west);
    const r = narrate(east, west, world, makeBoutResult(), 10);
    expect(tagged(r, "best_start").length).toBeGreaterThan(0);
  });

  it("B1 best_start stays silent when a recent basho matched it", () => {
    const east = mockRikishi("r-east", {
      currentBashoWins: 8,
      currentBashoLosses: 1,
      careerHistory: [snap(11, 4), snap(7, 8), snap(6, 9), snap(8, 7)],
    });
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west);
    const r = narrate(east, west, world, makeBoutResult(), 10);
    expect(tagged(r, "best_start").length).toBe(0);
  });

  // ── B2: "consecutive wins over yokozuna" ──────────────────────────────
  it("B2 elite_scalp_streak: back-to-back wins over sanyaku+", () => {
    const prevElite = mockRikishi("yoko-1", { rank: "yokozuna" });
    const east = mockRikishi("r-east", {
      rank: "sekiwake",
      currentBashoWins: 9,
      history: [log("kyushu-2026", 9, true, "yoko-1")],
    });
    const west = mockRikishi("r-west", { rank: "yokozuna" });
    const world = worldWithBasho(east, west, [prevElite], 10);
    const result = makeBoutResult({ kimarite: "oshidashi" });
    const r = narrate(east, west, world, result, 10);
    expect(tagged(r, "elite_scalp_streak").length).toBeGreaterThan(0);
  });

  it("B2 elite_scalp_streak stays silent without a prior elite win", () => {
    const journeyman = mockRikishi("journeyman", { rank: "maegashira" });
    const east = mockRikishi("r-east", {
      rank: "sekiwake",
      currentBashoWins: 9,
      history: [log("kyushu-2026", 9, true, "journeyman")],
    });
    const west = mockRikishi("r-west", { rank: "yokozuna" });
    const world = worldWithBasho(east, west, [journeyman], 10);
    const r = narrate(east, west, world, makeBoutResult(), 10);
    expect(tagged(r, "elite_scalp_streak").length).toBe(0);
  });

  // ── B3: "possibly even earn promotion to ozeki" ───────────────────────
  it("B3 ozeki_bid: sekiwake with consecutive strong bashos in contention", () => {
    const east = mockRikishi("r-east", {
      rank: "sekiwake",
      consecutiveStrongSekiwake: 2,
      currentBashoWins: 9,
      currentBashoLosses: 1,
    });
    const west = mockRikishi("r-west", { currentBashoWins: 5, currentBashoLosses: 5 });
    const world = makeBoutWorld(east, west);
    const r = narrate(east, west, world, makeBoutResult(), 11);
    expect(tagged(r, "ozeki_bid").length).toBeGreaterThan(0);
  });

  it("B3 ozeki_bid stays silent without the strong-basho run", () => {
    const east = mockRikishi("r-east", {
      rank: "sekiwake",
      consecutiveStrongSekiwake: 0,
      currentBashoWins: 9,
      currentBashoLosses: 1,
    });
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west);
    const r = narrate(east, west, world, makeBoutResult(), 11);
    expect(tagged(r, "ozeki_bid").length).toBe(0);
  });

  // ── B4: "doubts that lingered from the September collapse" ───────────
  it("B4 collapse_shadow: previous basho ended in a losing skid, now strong", () => {
    const east = mockRikishi("r-east", {
      currentBashoWins: 8,
      currentBashoLosses: 1,
      history: [
        log("aki-2026", 9, true),
        log("aki-2026", 10, false),
        log("aki-2026", 11, false),
        log("aki-2026", 12, false),
        log("aki-2026", 13, false),
        log("aki-2026", 14, false),
        log("kyushu-2026", 1, true),
        log("kyushu-2026", 2, true),
      ],
    });
    const west = mockRikishi("r-west");
    const world = worldWithBasho(east, west, [], 10);
    const r = narrate(east, west, world, makeBoutResult(), 10);
    expect(tagged(r, "collapse_shadow").length).toBeGreaterThan(0);
  });

  it("B4 collapse_shadow stays silent without the trailing skid", () => {
    const east = mockRikishi("r-east", {
      currentBashoWins: 8,
      currentBashoLosses: 1,
      history: [
        log("aki-2026", 13, false),
        log("aki-2026", 14, true),
        log("aki-2026", 15, true),
        log("kyushu-2026", 1, true),
      ],
    });
    const west = mockRikishi("r-west");
    const world = worldWithBasho(east, west, [], 10);
    const r = narrate(east, west, world, makeBoutResult(), 10);
    expect(tagged(r, "collapse_shadow").length).toBe(0);
  });

  // ── B5: "two yokozuna going into the final day unbeaten" ─────────────
  it("B5 dream_showdown: both sides unbeaten late in the basho", () => {
    const east = mockRikishi("r-east", {
      rank: "yokozuna",
      currentBashoWins: 12,
      currentBashoLosses: 0,
    });
    const west = mockRikishi("r-west", {
      rank: "yokozuna",
      currentBashoWins: 12,
      currentBashoLosses: 0,
    });
    const world = makeBoutWorld(east, west);
    const r = narrate(east, west, world, makeBoutResult(), 13);
    expect(tagged(r, "dream_showdown").length).toBeGreaterThan(0);
  });

  it("B5 dream_showdown stays silent once either has a loss", () => {
    const east = mockRikishi("r-east", {
      rank: "yokozuna",
      currentBashoWins: 12,
      currentBashoLosses: 0,
    });
    const west = mockRikishi("r-west", {
      rank: "yokozuna",
      currentBashoWins: 12,
      currentBashoLosses: 1,
    });
    const world = makeBoutWorld(east, west);
    const r = narrate(east, west, world, makeBoutResult(), 13);
    expect(tagged(r, "dream_showdown").length).toBe(0);
  });

  // ── B6: "all the sport's big names healthy and ready to compete" ─────
  it("B6 stars_align: day 1 with zero sanyaku+ kyujo", () => {
    const yokozuna = mockRikishi("yoko", { rank: "yokozuna", isKyujo: false, injured: false });
    const ozeki = mockRikishi("ozeki", { rank: "ozeki", isKyujo: false, injured: false });
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const world = worldWithBasho(east, west, [yokozuna, ozeki], 1);
    const r = narrate(east, west, world, makeBoutResult(), 1);
    expect(tagged(r, "stars_align").length).toBeGreaterThan(0);
  });

  it("B6 stars_align stays silent when a big name is out", () => {
    const yokozuna = mockRikishi("yoko", { rank: "yokozuna", isKyujo: true });
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const world = worldWithBasho(east, west, [yokozuna], 1);
    const r = narrate(east, west, world, makeBoutResult(), 1);
    expect(tagged(r, "stars_align").length).toBe(0);
  });
});

describe("hair-down incident (deferred registry)", () => {
  // Deferred: "hair-down automatic loss" — a loose topknot whose hair touched
  // the clay counts as a body part down. Flags down-type finishes only.
  it("flags hairDown and narrates on a down-type finish (seeded sweep)", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west);
    let hits = 0;
    for (let i = 0; i < 1200; i++) {
      const r = narrate(
        east,
        west,
        world,
        makeBoutResult({ kimarite: "tsukiotoshi" }),
        10,
        `hd-${i}`
      );
      const lines = tagged(r, "hair_down");
      if (lines.length) {
        hits++;
        expect(r.hairDown).toBe(true);
      }
    }
    expect(hits).toBeGreaterThan(0);
  });

  it("never flags upright step-out finishes", () => {
    const east = mockRikishi("r-east");
    const west = mockRikishi("r-west");
    const world = makeBoutWorld(east, west);
    let hits = 0;
    for (let i = 0; i < 1200; i++) {
      const r = narrate(east, west, world, makeBoutResult({ kimarite: "yorikiri" }), 10, `hd-${i}`);
      hits += tagged(r, "hair_down").length;
      expect(r.hairDown ?? false).toBe(false);
    }
    expect(hits).toBe(0);
  });
});

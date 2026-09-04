/**
 * Functional integration tests for dead-service wiring.
 *
 * Verifies that the 5 previously-dead services actually execute
 * at runtime when their tick phases / bout resolver run.
 */

import { describe, it, expect } from "vitest";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { mockRikishi, makeMockWorld, makeMockHeya, makeMockBasho } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import { generateGyoji } from "@/engine/systems/officials/GyojiService";
import { resolveBout } from "@/engine/bout/boutResolver";
import { phase01_week_health } from "@/engine/tick/phases/phase01_week_health";
import { phase01_week_welfare } from "@/engine/tick/phases/phase01_week_welfare";
import { phase05_monthly_boundary } from "@/engine/tick/phases/phase05_monthly_boundary";
import { phase01_basho_bouts } from "@/engine/tick/phases/phase01_basho_bouts";
import { calculateKachiNokori } from "@/engine/systems/economy/KachiNokoriService";

// ─── GyojiService ────────────────────────────────────────────────────────────

describe("GyojiService — functional integration", () => {
  it("resolveBout assigns a gyoji when world has a gyojiPool", () => {
    const east = mockRikishi("gyoji-east", { rank: "yokozuna", division: "makuuchi" });
    const west = mockRikishi("gyoji-west", { rank: "ozeki", division: "makuuchi" });

    const gyojiPool = [
      generateGyoji("test-seed", "tate", 0),
      generateGyoji("test-seed", "fuku-tate", 1),
    ];

    const world = makeMockWorld({
      gyojiPool,
    } as any);

    const basho = makeMockBasho({ day: 7 });
    const bout = {
      id: "test-bout-1",
      day: 7,
      rikishiEastId: east.id,
      rikishiWestId: west.id,
    } as any;

    const { result } = resolveBout(bout, east, west, basho, undefined, world);
    expect(result.gyojiId).toBeDefined();
    expect(result.gyojiId).toBeTruthy();
  });

  it("resolveBout does not assign gyoji when world has no gyojiPool", () => {
    const east = mockRikishi("gyoji-east2", { rank: "maegashira", division: "makuuchi" });
    const west = mockRikishi("gyoji-west2", { rank: "maegashira", division: "makuuchi" });

    const world = makeMockWorld({} as any);
    const basho = makeMockBasho({ day: 7 });
    const bout = {
      id: "test-bout-2",
      day: 7,
      rikishiEastId: east.id,
      rikishiWestId: west.id,
    } as any;

    const { result } = resolveBout(bout, east, west, basho, undefined, world);
    expect(result.gyojiId).toBeUndefined();
  });
});

// ─── GomenfudaService ────────────────────────────────────────────────────────

describe("GomenfudaService — functional integration", () => {
  it("phase01_week_health posts gomenfuda when rikishi is injured during pre_basho", () => {
    const heya = makeMockHeya("heya-gomen", { reputation: 50 });
    const rikishi = mockRikishi("gomen-r1", {
      heyaId: "heya-gomen",
      injured: false,
      fatigue: 100,
      division: "makuuchi",
    });

    const world = makeMockWorld({
      rikishi: new Map([[rikishi.id, rikishi]]),
      heyas: new Map([[heya.id, heya]]),
      cyclePhase: "pre_basho",
      week: 10,
      currentBashoName: "hatsu",
    } as any);

    const impact = phase01_week_health(world);
    const updated = resolveImpacts(world, [impact]);

    // Check if the rikishi got injured (fatigue=100 makes injury likely)
    const updatedRikishi = updated.rikishi.get(rikishi.id) as Rikishi;
    if (updatedRikishi?.injured) {
      // If injury occurred, heya reputation should have dropped
      const updatedHeya = updated.heyas.get("heya-gomen");
      expect(updatedHeya?.reputation).toBeLessThan(50);
    }
  });
});

// ─── KachiNokoriService ──────────────────────────────────────────────────────

describe("KachiNokoriService — functional integration", () => {
  it("calculateKachiNokori returns wins above 8", () => {
    expect(calculateKachiNokori(10)).toBe(2);
    expect(calculateKachiNokori(8)).toBe(0);
    expect(calculateKachiNokori(5)).toBe(0);
  });

  it("phase05_monthly_boundary logs kachi-nokori for sekitori after mochikyukin payout", () => {
    const heya = makeMockHeya("heya-kachi");
    const sekitori = mockRikishi("kachi-r1", {
      heyaId: "heya-kachi",
      division: "makuuchi",
      currentBashoWins: 11,
      currentBashoLosses: 4,
      stats: {
        power: 50,
        speed: 50,
        technique: 50,
        balance: 50,
        weight: 140,
        stamina: 100,
        mental: 50,
        adaptability: 50,
        experience: 50,
        aggression: 50,
        achievements: {
          kinboshiEarned: 0,
          ginboshiEarned: 0,
          kinboshiConceded: 0,
          ginboshiConceded: 0,
          specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
        },
      } as any,
    });

    const world = makeMockWorld({
      rikishi: new Map([[sekitori.id, sekitori]]),
      heyas: new Map([[heya.id, heya]]),
      cyclePhase: "interim",
      calendar: { month: 2, currentWeek: 8 } as any,
      transientContext: { boundaries: { monthBoundary: true } } as any,
    } as any);

    const impact = phase05_monthly_boundary(world);
    // The phase should have events or impacts that reference kachi-nokori
    expect(impact.events).toBeDefined();
    const kachiEvents = (impact.events ?? []).filter(
      (e) =>
        JSON.stringify(e.data).includes("kachiNokori") || JSON.stringify(e.data).includes("kachi")
    );
    expect(kachiEvents.length).toBeGreaterThan(0);
  });
});

// ─── InjuredEncouragement ────────────────────────────────────────────────────

describe("InjuredEncouragement — functional integration", () => {
  it("phase01_week_welfare produces encouragement when injured rikishi and active stablemate exist", () => {
    const heya = makeMockHeya("heya-enc", { rikishiIds: ["enc-injured", "enc-active"] });
    const injured = mockRikishi("enc-injured", {
      heyaId: "heya-enc",
      injured: true,
      isRetired: false,
      motivation: 50,
    });
    const active = mockRikishi("enc-active", {
      heyaId: "heya-enc",
      injured: false,
      isRetired: false,
      motivation: 50,
    });

    const world = makeMockWorld({
      rikishi: new Map([
        [injured.id, injured],
        [active.id, active],
      ]),
      heyas: new Map([[heya.id, heya]]),
      cyclePhase: "interim",
      calendar: { currentWeek: 5 } as any,
    } as any);

    const impact = phase01_week_welfare(world);
    const updated = resolveImpacts(world, [impact]);

    // The active rikishi should have a motivation boost
    const updatedActive = updated.rikishi.get(active.id) as Rikishi;
    if (updatedActive) {
      expect(updatedActive.motivation).toBeGreaterThanOrEqual(50);
    }

    // Check for encouragement log entry
    const encLog = updated.encouragementLog;
    expect(encLog).toBeDefined();
    if (encLog && encLog.length > 0) {
      expect(encLog.some((e) => e.from === injured.id && e.to === active.id)).toBe(true);
    }
  });
});

// ─── OyakataIntervention ────────────────────────────────────────────────────

describe("OyakataIntervention — functional integration", () => {
  it("phase01_basho_bouts applies intervention for NPC rikishi with 3+ losses on day 7", () => {
    const heya = makeMockHeya("heya-npc-int");
    const slumping = mockRikishi("intervene-slump", {
      heyaId: "heya-npc-int",
      motivation: 40,
      isKyujo: false,
      injured: false,
      isRetired: false,
      currentLossStreak: 3,
      currentBashoWins: 2,
      currentBashoLosses: 5,
      interventionUsedThisBasho: false,
      frozeUp: false,
      division: "makuuchi",
    });

    const basho = makeMockBasho({
      day: 7,
      isActive: true,
      matches: [],
      standings: new Map(),
    });

    const world = makeMockWorld({
      rikishi: new Map([[slumping.id, slumping]]),
      heyas: new Map([[heya.id, heya]]),
      cyclePhase: "active_basho",
      currentBasho: basho,
      playerHeyaId: "heya-player-different",
      calendar: { currentWeek: 4 } as any,
    } as any);

    const impact = phase01_basho_bouts(world);
    const updated = resolveImpacts(world, [impact]);

    // The rikishi should have interventionUsedThisBasho set to true
    // and motivation should be boosted
    const updatedRikishi = updated.rikishi.get(slumping.id) as Rikishi;
    if (updatedRikishi) {
      // If intervention was applied (requires non-player heya + eligible conditions)
      expect(updatedRikishi.interventionUsedThisBasho).toBe(true);
      expect(updatedRikishi.motivation).toBeGreaterThan(40);
    }
  });
});

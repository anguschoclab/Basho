import { describe, it, expect } from "vitest";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { resolveBout } from "@/engine/bout/boutResolver";
import type { BoutContext } from "@/engine/bout/boutPhysics";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BashoState, BoutResult, MatchSchedule } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import type { BoutTactic } from "@/engine/types/combat";

/**
 * WS1 contract tests — per-side NPC bout tactics.
 *
 * RED phase contract being pinned here:
 * - resolveBout records the resolved tactic for EACH side on result.tactics.
 * - NPC-vs-NPC bouts get a real contextual tactic on both sides (via
 *   BoutAI.chooseTactic fed by standings/rivalry/fatigue/opponent model).
 * - The player's chosen tactic always wins on the player side.
 * - cpuTacticOverride keeps its legacy mapping (non-player side; east when
 *   no playerSide exists).
 * - Tactic aftermath (fatigue/momentum) applies to BOTH rikishi in an
 *   NPC-vs-NPC bout — previously the non-player side update was dropped.
 */

type TacticsMap = { east?: BoutTactic; west?: BoutTactic };

function tacticsOf(result: BoutResult): TacticsMap {
  return (
    (result as BoutResult & { tactics?: TacticsMap }).tactics ?? {}
  );
}

function makeRikishi(id: string, heyaId: string, overrides: Partial<Rikishi> = {}): Rikishi {
  return MockFactory.createRikishi(id, {
    heyaId,
    division: "makuuchi",
    rank: "maegashira",
    rankNumber: 1,
    style: "oshi",
    fatigue: 0,
    momentum: 50,
    stats: {
      power: 60,
      speed: 60,
      technique: 60,
      weight: 140,
      stamina: 60,
      mental: 60,
      adaptability: 60,
      balance: 60,
      aggression: 60,
      experience: 20,
    },
    ...overrides,
  });
}

interface FixtureOptions {
  eastRecord?: { wins: number; losses: number };
  westRecord?: { wins: number; losses: number };
  day?: number;
  playerHeyaId?: string;
}

function makeFixture(opts: FixtureOptions = {}): {
  world: WorldState;
  east: Rikishi;
  west: Rikishi;
  basho: BashoState;
  bout: BoutContext;
} {
  const east = makeRikishi("east", "heya-a");
  const west = makeRikishi("west", "heya-b", { style: "yotsu" });
  const day = opts.day ?? 5;
  const matches: MatchSchedule[] = [
    { boutId: "npc-bout", day, eastRikishiId: "east", westRikishiId: "west" },
  ];
  const basho = MockFactory.createBasho({
    id: "basho-1",
    day,
    matches,
    standings: new Map([
      ["east", opts.eastRecord ?? { wins: 4, losses: 4 }],
      ["west", opts.westRecord ?? { wins: 4, losses: 4 }],
    ]),
  });
  const world = MockFactory.createWorld({
    rikishi: new Map([
      ["east", east],
      ["west", west],
    ]),
    heyas: new Map([
      ["heya-a", MockFactory.createHeya("heya-a", { rikishiIds: ["east"] })],
      ["heya-b", MockFactory.createHeya("heya-b", { rikishiIds: ["west"] })],
      ["player-heya", MockFactory.createHeya("player-heya", { rikishiIds: [] })],
    ]),
    oyakata: new Map([
      ["oyakata_heya-a", MockFactory.createOyakata("oyakata_heya-a", { heyaId: "heya-a" })],
      ["oyakata_heya-b", MockFactory.createOyakata("oyakata_heya-b", { heyaId: "heya-b" })],
    ]),
    playerHeyaId: opts.playerHeyaId ?? "player-heya",
    currentBasho: basho,
    cyclePhase: "active_basho",
  });
  const bout: BoutContext = {
    id: "npc-bout",
    day,
    rikishiEastId: "east",
    rikishiWestId: "west",
  };
  return { world, east, west, basho, bout };
}

describe("resolveBout — per-side NPC tactics (WS1)", () => {
  it("assigns explicit tactics to BOTH sides of an NPC-vs-NPC bout", () => {
    const { world, east, west, basho, bout } = makeFixture();
    const { result } = resolveBout(bout, east, west, basho, undefined, world);
    const tactics = tacticsOf(result);
    expect(tactics.east, "east side must have a resolved tactic").toBeDefined();
    expect(tactics.west, "west side must have a resolved tactic").toBeDefined();
  });

  it("is deterministic: identical seeded worlds produce identical results", () => {
    const a = makeFixture();
    const b = makeFixture();
    const r1 = resolveBout(a.bout, a.east, a.west, a.basho, undefined, a.world).result;
    const r2 = resolveBout(b.bout, b.east, b.west, b.basho, undefined, b.world).result;
    expect(r1).toEqual(r2);
  });

  it("player-selected tactic always wins on the player side", () => {
    const { world, east, west, basho } = makeFixture();
    const bout: BoutContext = {
      id: "player-bout",
      day: 5,
      rikishiEastId: "east",
      rikishiWestId: "west",
      playerSide: "east",
    };
    const { result } = resolveBout(bout, east, west, basho, "HENKA", world);
    const tactics = tacticsOf(result);
    expect(tactics.east).toBe("HENKA");
    expect(tactics.west, "NPC side still gets its own tactic").toBeDefined();
  });

  it("cpuTacticOverride still maps to the non-player side", () => {
    const { world, east, west, basho } = makeFixture();
    const bout: BoutContext = {
      id: "override-bout",
      day: 5,
      rikishiEastId: "east",
      rikishiWestId: "west",
      playerSide: "east",
      cpuTacticOverride: "YOTSU_BELT",
    };
    const { result } = resolveBout(bout, east, west, basho, "STANDARD", world);
    expect(tacticsOf(result).west).toBe("YOTSU_BELT");
  });

  it("cpuTacticOverride maps to east for NPC-vs-NPC (legacy semantics)", () => {
    const { world, east, west, basho } = makeFixture();
    const bout: BoutContext = {
      id: "legacy-override",
      day: 5,
      rikishiEastId: "east",
      rikishiWestId: "west",
      cpuTacticOverride: "HENKA",
    };
    const { result } = resolveBout(bout, east, west, basho, undefined, world);
    expect(tacticsOf(result).east).toBe("HENKA");
  });

  it("final-day make-koshi precipice forces ALL_OUT on the endangered side", () => {
    const { world, east, west, basho, bout } = makeFixture({
      day: 15,
      eastRecord: { wins: 6, losses: 7 },
      westRecord: { wins: 7, losses: 7 },
    });
    const { result } = resolveBout(bout, east, west, basho, undefined, world);
    expect(tacticsOf(result).east).toBe("ALL_OUT");
  });

  it("applies tactic aftermath to the NPC side of an NPC-vs-NPC bout", () => {
    // East is on the final-day make-koshi precipice → ALL_OUT → fatigueCost.
    // Before WS1 this update was silently dropped because cpuRikishiId was
    // derived only when playerSide existed.
    const { world, east, west, basho, bout } = makeFixture({
      day: 15,
      eastRecord: { wins: 6, losses: 7 },
    });
    const { impact } = resolveBout(bout, east, west, basho, undefined, world);
    const eastUpdate = impact.entities?.rikishiUpdates?.get("east");
    expect(
      eastUpdate?.fatigue,
      "east rikishi must receive ALL_OUT fatigue cost"
    ).toBeGreaterThan(east.fatigue ?? 0);
  });
});

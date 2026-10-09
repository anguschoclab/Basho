/**
 * Golden-master characterization for publishBanzukeUpdate — a 691-LOC
 * orchestrator targeted by Phase-2 decomposition into banzuke/publish/
 * modules. Pins the raw StateImpact digest across fixture matrices —
 * existing tests assert resolved world state, not impact shape/ordering.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { publishBanzukeUpdate } from "@/engine/banzuke/BanzukePublisher";
import { BardEngine } from "@/engine/bard/BardEngine";
import { makeMockWorld, makeMockBasho, mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";

/** Deterministic digest — Maps serialize sorted, preserving field order. */
function digest(impact: unknown): string {
  return JSON.stringify(
    impact,
    (_k, v) => (v instanceof Map ? { __map: [...v.entries()].sort(([a], [b]) => String(a).localeCompare(String(b))) } : v),
    2,
  );
}

const YEAR = 2025;

function makeResultFixture(yusho: string, extras: Record<string, unknown> = {}) {
  return {
    id: `res-${YEAR}-1`,
    year: YEAR,
    bashoNumber: 1,
    bashoName: "hatsu",
    yusho,
    junYusho: [],
    prizes: { yushoAmount: 10_000_000, junYushoAmount: 0, specialPrizes: 0 },
    ...extras,
  } as never;
}

function postBashoWorld(): WorldState {
  const rikishi = [
    mockRikishi("r_yoko", { rank: "yokozuna" }),
    mockRikishi("r_ozeki", { rank: "ozeki" }),
    mockRikishi("r_sek", { rank: "sekiwake" }),
    mockRikishi("r_m5", { rank: "maegashira", rankNumber: 5 }),
    mockRikishi("r_m10", { rank: "maegashira", rankNumber: 10 }),
  ];
  return makeMockWorld({
    year: YEAR,
    cyclePhase: "post_basho",
    rikishi: new Map(rikishi.map((r) => [r.id, r])),
    activeRikishiIds: new Set(rikishi.map((r) => r.id)),
    history: [makeResultFixture("r_m5")],
    currentBasho: makeMockBasho({
      year: YEAR,
      bashoNumber: 1,
      bashoName: "hatsu",
      day: 15,
      standings: new Map([
        ["r_yoko", { wins: 8, losses: 7, absences: 0 }],
        ["r_ozeki", { wins: 9, losses: 6, absences: 0 }],
        ["r_sek", { wins: 7, losses: 8, absences: 0 }],
        ["r_m5", { wins: 14, losses: 1, absences: 0 }],
        ["r_m10", { wins: 3, losses: 12, absences: 0 }],
      ]),
    }),
  });
}

describe("publishBanzukeUpdate — golden master", () => {
  beforeEach(() => BardEngine.resetCache());

  it("guard: non-post_basho phase and missing basho produce empty impacts", () => {
    const inter = makeMockWorld({ cyclePhase: "interim" });
    const noBasho = makeMockWorld({ cyclePhase: "post_basho", currentBasho: undefined });
    expect(digest(publishBanzukeUpdate(inter))).toMatchSnapshot();
    expect(digest(publishBanzukeUpdate(noBasho))).toMatchSnapshot();
  });

  it("standard post_basho world — full impact digest", () => {
    expect(digest(publishBanzukeUpdate(postBashoWorld()))).toMatchSnapshot();
  });

  it("ozeki with consecutive yusho → promotion path", () => {
    const world = postBashoWorld();
    const ozeki = world.rikishi.get("r_ozeki")!;
    ozeki.careerHistory = [
      { bashoId: "prev", isYusho: true, wins: 13, rank: "ozeki" },
    ] as never;
    world.currentBasho!.standings.set("r_ozeki", { wins: 14, losses: 1, absences: 0 });
    world.history = [makeResultFixture("r_ozeki")];
    expect(digest(publishBanzukeUpdate(world))).toMatchSnapshot();
  });

  it("yokozuna with make-koshi → council pressure events", () => {
    const world = postBashoWorld();
    world.currentBasho!.standings.set("r_yoko", { wins: 5, losses: 10, absences: 0 });
    expect(digest(publishBanzukeUpdate(world))).toMatchSnapshot();
  });
});

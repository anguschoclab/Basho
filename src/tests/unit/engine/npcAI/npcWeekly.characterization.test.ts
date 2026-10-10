/**
 * Golden-master characterization for makeNPCWeeklyDecision — a 306-LOC
 * orchestrator targeted by Phase-2 decomposition (~4 prior tests pin only
 * injury-risk and plan-awareness slices). Pins the full NPCWeeklyDecision
 * across representative world shapes.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { makeNPCWeeklyDecision } from "@/engine/npcAI/weekly";
import { BardEngine } from "@/engine/bard/BardEngine";
import { makeMockWorld, mockRikishi, makeMockHeya } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { Oyakata } from "@/engine/types/oyakata";

function mockOyakata(id: string, overrides: Partial<Oyakata> = {}): Oyakata {
  return {
    id,
    heyaId: "heya-1",
    name: `Oyakata-${id}`,
    shikona: `Shikona-${id}`,
    age: 55,
    archetype: "technician",
    traits: {},
    yearsInCharge: 5,
    ...overrides,
  } as Oyakata;
}

/** Deterministic digest — Maps serialize sorted, reasoning preserved. */
function digest(decision: unknown): string {
  return JSON.stringify(
    decision,
    (_k, v) => (v instanceof Map ? { __map: [...v.entries()].sort() } : v),
    2
  );
}

function worldWithHeya(
  rikishi: Array<ReturnType<typeof mockRikishi>> = [],
  heyaOverrides: Parameters<typeof makeMockHeya>[1] = {},
  oyakata?: Oyakata
): WorldState {
  const heya = makeMockHeya("heya-1", {
    oyakataId: oyakata?.id,
    rikishiIds: rikishi.map((r) => r.id),
    ...heyaOverrides,
  });
  const world = makeMockWorld({
    heyas: new Map([[heya.id, heya]]),
    rikishi: new Map(rikishi.map((r) => [r.id, r])),
    activeRikishiIds: new Set(rikishi.map((r) => r.id)),
    week: 6,
    year: 2026,
  });
  if (oyakata) world.oyakata.set(oyakata.id, oyakata);
  return world;
}

describe("makeNPCWeeklyDecision — golden master", () => {
  beforeEach(() => BardEngine.resetCache());

  it("missing heya → minimal decision (no agent layer)", () => {
    const world = makeMockWorld();
    expect(digest(makeNPCWeeklyDecision(world, "ghost-heya"))).toMatchSnapshot();
  });

  it("heya without oyakata → workers only, no agentDecisions", () => {
    const world = worldWithHeya();
    expect(digest(makeNPCWeeklyDecision(world, "heya-1"))).toMatchSnapshot();
  });

  it("heya + oyakata + empty roster → full agent layer", () => {
    const world = worldWithHeya([], {}, mockOyakata("oya-1"));
    expect(digest(makeNPCWeeklyDecision(world, "heya-1"))).toMatchSnapshot();
  });

  it("ozeki roster → promotion-aware pushes", () => {
    const ozeki = mockRikishi("r-oz", { shikona: "Ozesho", rank: "ozeki", heyaId: "heya-1" });
    const world = worldWithHeya([ozeki], {}, mockOyakata("oya-1"));
    expect(digest(makeNPCWeeklyDecision(world, "heya-1"))).toMatchSnapshot();
  });

  it("kadoban ozeki → protect instead of push", () => {
    const ozeki = mockRikishi("r-kad", { shikona: "Kadoban", rank: "ozeki", heyaId: "heya-1" });
    const world = worldWithHeya([ozeki], {}, mockOyakata("oya-1"));
    world.ozekiKadoban = { "r-kad": { isKadoban: true } } as never;
    expect(digest(makeNPCWeeklyDecision(world, "heya-1"))).toMatchSnapshot();
  });

  it("yokozuna with 2+ council warnings → intensity reduced", () => {
    const yoko = mockRikishi("r-yoko", {
      shikona: "Yokoyama",
      rank: "yokozuna",
      heyaId: "heya-1",
      councilWarnings: 2,
    });
    const world = worldWithHeya([yoko], {}, mockOyakata("oya-1"));
    expect(digest(makeNPCWeeklyDecision(world, "heya-1"))).toMatchSnapshot();
  });

  it("high-risk roster → injury-risk reduction fires", () => {
    const rs = [1, 2, 3, 4].map((i) =>
      mockRikishi(`r-hr${i}`, {
        shikona: `Risky${i}`,
        heyaId: "heya-1",
        condition: 20,
        fatigue: 90,
      })
    );
    const world = worldWithHeya(rs, {}, mockOyakata("oya-1"));
    expect(digest(makeNPCWeeklyDecision(world, "heya-1"))).toMatchSnapshot();
  });

  it("sekiwake + komusubi → develop list", () => {
    const rs = [
      mockRikishi("r-sek", { shikona: "Sekitori", rank: "sekiwake", heyaId: "heya-1" }),
      mockRikishi("r-kom", { shikona: "Komusubi", rank: "komusubi", heyaId: "heya-1" }),
    ];
    const world = worldWithHeya(rs, {}, mockOyakata("oya-1"));
    expect(digest(makeNPCWeeklyDecision(world, "heya-1"))).toMatchSnapshot();
  });

  it("furious oyakata → punishing override", () => {
    const oya = mockOyakata("oya-fury", { mood: "furious" } as Partial<Oyakata>);
    const world = worldWithHeya([], {}, oya);
    expect(digest(makeNPCWeeklyDecision(world, "heya-1"))).toMatchSnapshot();
  });
});

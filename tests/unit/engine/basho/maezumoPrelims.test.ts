import { describe, it, expect } from "vitest";
import {
  graduateMaezumoRikishi,
  initMaezumoState,
  isEphemeralMaezumoEntrant,
  scheduleMaezumoDay,
  tallyMaezumo,
} from "@/engine/basho/maezumoPrelims";
import { scheduleAllDivisionsDay } from "@/engine/calendar/schedule";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { mockRikishi, makeMockBasho, makeMockWorld } from "@tests/unit/engine/utils";
import type { BanzukeEntry } from "@/engine/types/banzuke";
import type { BashoState, MatchSchedule } from "@/engine/types/basho";
import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";

/**
 * §3 maezumo — shin-deshi fight a real 3-bout preliminary on days 3/5/7
 * (done after two wins) and debut at the foot of the next jonokuchi banzuke.
 */

function shinDeshi(id: string, heyaId: string, overrides: Partial<Rikishi> = {}): Rikishi {
  return mockRikishi(id, {
    division: "jonokuchi",
    rank: "jonokuchi",
    rankNumber: 30,
    heyaId,
    isMaezumo: true,
    maezumoCompleted: false,
    ...overrides,
  } as Partial<Rikishi>);
}

function jk(id: string, rankNumber: number, side: "east" | "west" = "east"): Rikishi {
  return mockRikishi(id, { division: "jonokuchi", rank: "jonokuchi", rankNumber, side });
}

function worldWith(list: Rikishi[]): WorldState {
  const world = makeMockWorld({ seed: "maezumo-prelims" });
  for (const r of list) world.rikishi.set(r.id, r);
  return world;
}

function resolved(day: number, east: string, west: string, winner: string): MatchSchedule {
  return {
    boutId: `mz-${day}-${east}-${west}`,
    day,
    eastRikishiId: east,
    westRikishiId: west,
    isMaezumoBout: true,
    result: {
      boutId: `mz-${day}-${east}-${west}`,
      winner: winner === east ? "east" : "west",
      winnerRikishiId: winner,
      loserRikishiId: winner === east ? west : east,
      kimarite: "oshidashi",
    } as MatchSchedule["result"],
  };
}

describe("maezumo preliminary — enrollment", () => {
  it("enrolls only pending shin-deshi (not fillers, graduates, or retirees)", () => {
    const world = worldWith([
      shinDeshi("sd-b", "h1"),
      shinDeshi("sd-a", "h2"),
      shinDeshi("done", "h1", { maezumoCompleted: true }),
      shinDeshi("gone", "h1", { isRetired: true }),
      mockRikishi("maezumo-x-0", { isMaezumo: true, heyaId: "" } as Partial<Rikishi>),
      jk("jk-1", 1),
    ]);
    expect(initMaezumoState(world)?.entrantIds).toEqual(["sd-a", "sd-b"]);
  });

  it("allocates no state when nobody is enrolled", () => {
    expect(initMaezumoState(worldWith([jk("jk-1", 1)]))).toBeUndefined();
  });

  it("treats legacy id-prefixed fillers as ephemeral", () => {
    expect(isEphemeralMaezumoEntrant(shinDeshi("maezumo-b-1", ""))).toBe(true);
    expect(isEphemeralMaezumoEntrant(shinDeshi("sd-1", "h1"))).toBe(false);
  });
});

describe("maezumo preliminary — pairing", () => {
  it("pairs only on days 3/5/7, preferring opponents from another heya", () => {
    const world = worldWith([
      shinDeshi("a", "h1"),
      shinDeshi("b", "h1"),
      shinDeshi("c", "h2"),
      shinDeshi("d", "h2"),
    ]);
    const basho = makeMockBasho({ maezumo: { entrantIds: ["a", "b", "c", "d"] } });
    expect(scheduleMaezumoDay(world, basho, 2)).toEqual([]);
    const day3 = scheduleMaezumoDay(world, basho, 3);
    expect(day3).toHaveLength(2);
    for (const m of day3) {
      expect(m.isMaezumoBout).toBe(true);
      const e = world.rikishi.get(m.eastRikishiId)!;
      const w = world.rikishi.get(m.westRikishiId)!;
      expect(e.heyaId).not.toBe(w.heyaId);
    }
  });

  it("an entrant with two wins is finished and sits out", () => {
    const world = worldWith([shinDeshi("a", "h1"), shinDeshi("b", "h2"), shinDeshi("c", "h3")]);
    const basho = makeMockBasho({
      maezumo: { entrantIds: ["a", "b", "c"] },
      matches: [resolved(3, "a", "b", "a"), resolved(5, "a", "c", "a")],
    });
    expect(tallyMaezumo(basho).get("a")).toEqual({ wins: 2, losses: 0, bouts: 2 });
    const day7 = scheduleMaezumoDay(world, basho, 7);
    expect(day7).toHaveLength(1);
    expect(new Set([day7[0].eastRikishiId, day7[0].westRikishiId])).toEqual(new Set(["b", "c"]));
  });

  it("shin-deshi stay off the jonokuchi card and are never used as odd-card fillers", () => {
    const world = worldWith([
      jk("jk-1", 1),
      jk("jk-2", 2),
      jk("jk-3", 3),
      shinDeshi("sd-1", "h1"),
      shinDeshi("sd-2", "h2"),
    ]);
    const basho = makeMockBasho({ day: 3, maezumo: { entrantIds: ["sd-1", "sd-2"] } });
    const { scheduled, impact } = scheduleAllDivisionsDay({
      world,
      basho,
      day: 3,
      seed: "s",
      divisions: ["jonokuchi"],
    });
    const mz = scheduled.filter((m) => m.isMaezumoBout);
    expect(mz).toHaveLength(1);
    const regular = scheduled.filter((m) => !m.isMaezumoBout);
    for (const m of regular) {
      expect(["sd-1", "sd-2"]).not.toContain(m.eastRikishiId);
      expect(["sd-1", "sd-2"]).not.toContain(m.westRikishiId);
    }
    // The odd jonokuchi card is balanced by a minted ephemeral filler.
    const minted = impact.collections?.rikishiToAdd ?? [];
    expect(minted.every((r) => r.isEphemeralMaezumo === true)).toBe(true);
  });
});

describe("maezumo preliminary — graduation", () => {
  it("seats graduates at the foot of jonokuchi ordered by maezumo record", () => {
    const world = worldWith([
      shinDeshi("a", "h1"),
      shinDeshi("b", "h2"),
      shinDeshi("c", "h3"),
      shinDeshi("hurt", "h4", { injured: true }),
    ]);
    const basho: BashoState = makeMockBasho({
      maezumo: { entrantIds: ["a", "b", "c", "hurt"] },
      matches: [
        resolved(3, "a", "b", "b"),
        resolved(5, "b", "c", "b"),
        resolved(5, "a", "c", "a"),
        resolved(7, "a", "c", "a"),
      ],
    });
    const newBanzuke: BanzukeEntry[] = [
      {
        rikishiId: "jk-1",
        division: "jonokuchi",
        position: { rank: "jonokuchi", rankNumber: 24, side: "east" },
      },
    ];
    const builder = createImpactBuilder("test");
    const grads = graduateMaezumoRikishi(world, basho, newBanzuke, builder);
    expect(grads.map((g) => g.rikishiId)).toEqual(["b", "a", "c"]);
    expect(grads[0].position).toEqual({ rank: "jonokuchi", rankNumber: 25, side: "east" });
    expect(grads[1].position).toEqual({ rank: "jonokuchi", rankNumber: 25, side: "west" });
    expect(grads[2].position).toEqual({ rank: "jonokuchi", rankNumber: 26, side: "east" });
    const updates = builder.build().entities?.rikishiUpdates;
    expect(updates?.get("b")).toMatchObject({ isMaezumo: false, maezumoCompleted: true });
    expect(updates?.has("hurt")).toBe(false);
  });

  it("is a no-op for exhibition basho or when nobody enrolled", () => {
    const world = worldWith([shinDeshi("a", "h1")]);
    const builder = createImpactBuilder("test");
    expect(graduateMaezumoRikishi(world, makeMockBasho(), [], builder)).toEqual([]);
    expect(
      graduateMaezumoRikishi(
        world,
        makeMockBasho({ isExhibition: true, maezumo: { entrantIds: ["a"] } }),
        [],
        builder
      )
    ).toEqual([]);
  });
});

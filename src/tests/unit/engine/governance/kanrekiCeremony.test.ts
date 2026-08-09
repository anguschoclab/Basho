 
import { describe, it, expect } from "vitest";
import {
  isEligibleForKanreki,
  hasHadKanrekiCeremony,
  performKanrekiCeremony,
  KANREKI_AGE,
  KANREKI_POPULARITY_BOOST,
} from "@/engine/governance/kanrekiCeremony";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { mockRikishi, makeMockWorld } from "../utils";
import type { Rikishi } from "@/engine/types/rikishi";

function makeYokozuna(age: number): Rikishi {
  const world = makeMockWorld({});
  const birthYear = world.year - age;
  return mockRikishi("yoko-1", {
    shikona: "Yokozuna Test",
    heyaId: "heya-1",
    rank: "yokozuna",
    birthYear,
    dohyoIriStyle: "unryu",
    economics: {
      cash: 1000,
      retirementFund: 500,
      mochikyukinPoints: 100,
      kinboshiCount: 0,
      totalEarnings: 0,
      currentBashoEarnings: 0,
      popularity: 70,
    } as any,
  });
}

describe("isEligibleForKanreki", () => {
  it("returns true for a 60-year-old yokozuna", () => {
    const yoko = makeYokozuna(60);
    const world = makeMockWorld({});
    expect(isEligibleForKanreki(yoko, world)).toBe(true);
  });

  it("returns false for a 59-year-old", () => {
    const yoko = makeYokozuna(59);
    const world = makeMockWorld({});
    expect(isEligibleForKanreki(yoko, world)).toBe(false);
  });

  it("returns false for a 61-year-old", () => {
    const yoko = makeYokozuna(61);
    const world = makeMockWorld({});
    expect(isEligibleForKanreki(yoko, world)).toBe(false);
  });

  it("returns true for a 60-year-old former yokozuna with dohyoIriStyle", () => {
    const yoko = makeYokozuna(60);
    yoko.rank = "ozeki"; // demoted but still has style
    const world = makeMockWorld({});
    expect(isEligibleForKanreki(yoko, world)).toBe(true);
  });

  it("returns false for a 60-year-old non-yokozuna without dohyoIriStyle", () => {
    const yoko = makeYokozuna(60);
    yoko.rank = "ozeki";
    yoko.dohyoIriStyle = undefined;
    const world = makeMockWorld({});
    expect(isEligibleForKanreki(yoko, world)).toBe(false);
  });
});

describe("hasHadKanrekiCeremony", () => {
  it("returns false when no prior ceremony", () => {
    const world = makeMockWorld({});
    expect(hasHadKanrekiCeremony(world, "yoko-1")).toBe(false);
  });

  it("returns true when prior ceremony exists", () => {
    const world = makeMockWorld({});
    (world as any).events = {
      version: "1.0.0",
      log: [
        {
          type: "BASHO_STATUS",
          category: "milestone",
          data: { status: "kanreki_dohyo_iri", rikishiId: "yoko-1" },
        },
      ],
      dedupe: {},
    };
    expect(hasHadKanrekiCeremony(world, "yoko-1")).toBe(true);
  });
});

describe("performKanrekiCeremony", () => {
  it("applies popularity boost to yokozuna", () => {
    const yoko = makeYokozuna(60);
    const world = makeMockWorld({
      rikishi: new Map([[yoko.id, yoko]]),
    });

    const impact = performKanrekiCeremony(world, yoko);
    const updated = resolveImpacts(world, [impact]);

    const updatedYoko = updated.rikishi.get("yoko-1");
    expect(updatedYoko?.economics?.popularity).toBe(70 + KANREKI_POPULARITY_BOOST);
  });

  it("caps popularity at 100", () => {
    const yoko = makeYokozuna(60);
    yoko.economics!.popularity = 90;
    const world = makeMockWorld({
      rikishi: new Map([[yoko.id, yoko]]),
    });

    const impact = performKanrekiCeremony(world, yoko);
    const updated = resolveImpacts(world, [impact]);

    const updatedYoko = updated.rikishi.get("yoko-1");
    expect(updatedYoko?.economics?.popularity).toBe(100);
  });

  it("logs a milestone event", () => {
    const yoko = makeYokozuna(60);
    const world = makeMockWorld({
      rikishi: new Map([[yoko.id, yoko]]),
    });

    const impact = performKanrekiCeremony(world, yoko);
    expect(impact.events!.length).toBe(1);
    const event = impact.events![0] as any;
    expect(event.type).toBe("BASHO_STATUS");
    expect(event.data.status).toBe("kanreki_dohyo_iri");
    expect(event.data.rikishiId).toBe("yoko-1");
    expect(event.data.age).toBe(KANREKI_AGE);
  });

  it("does nothing for ineligible rikishi", () => {
    const yoko = makeYokozuna(50);
    const world = makeMockWorld({
      rikishi: new Map([[yoko.id, yoko]]),
    });

    const impact = performKanrekiCeremony(world, yoko);
    expect((impact.events! ?? []).length).toBe(0);
  });

  it("does nothing if ceremony already performed", () => {
    const yoko = makeYokozuna(60);
    const world = makeMockWorld({
      rikishi: new Map([[yoko.id, yoko]]),
    });
    (world as any).events = {
      version: "1.0.0",
      log: [
        {
          type: "BASHO_STATUS",
          category: "milestone",
          data: { status: "kanreki_dohyo_iri", rikishiId: "yoko-1" },
        },
      ],
      dedupe: {},
    };

    const impact = performKanrekiCeremony(world, yoko);
    expect((impact.events! ?? []).length).toBe(0);
  });

  it("KANREKI_AGE is 60", () => {
    expect(KANREKI_AGE).toBe(60);
  });

  it("KANREKI_POPULARITY_BOOST is 30", () => {
    expect(KANREKI_POPULARITY_BOOST).toBe(30);
  });
});

import { describe, it, expect } from "vitest";
import { projectManagerCareer } from "@/presenters/projections/careerProjections";
import { makeMockWorld, makeMockHeya } from "@tests/unit/engine/utils";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";

function worldWith(heyas: Heya[], oyakataTenure?: Record<string, unknown>): WorldState {
  const world = makeMockWorld({ year: 2030 });
  for (const h of heyas) world.heyas.set(h.id, h);
  if (oyakataTenure !== undefined) {
    const heyaId = heyas[0].id;
    const heya = world.heyas.get(heyaId)!;
    heya.oyakataId = "oya-1" as never;
    world.oyakata.set("oya-1" as never, { id: "oya-1", name: "Boss", heyaId, tenure: oyakataTenure } as never);
  }
  return world;
}

describe("projectManagerCareer", () => {
  it("missing tenure → zeroed scorecard, no crash", () => {
    const world = worldWith([makeMockHeya("h1")]);
    const p = projectManagerCareer(world, "h1" as never);
    expect(p.tenure.bashoServed).toBe(0);
    expect(p.tenure.sekitoriProduced).toBe(0);
    expect(p.tenure.boardSeatsWon).toBe(0);
    expect(p.milestones.length).toBeGreaterThan(0);
  });

  it("populated tenure → counters surfaced exactly", () => {
    const world = worldWith(
      [makeMockHeya("h1")],
      { bashoServed: 12, championships: 2, sekitoriProduced: 4, boardSeatsWon: 1 }
    );
    const p = projectManagerCareer(world, "h1" as never);
    expect(p.tenure.bashoServed).toBe(12);
    expect(p.tenure.championships).toBe(2);
    expect(p.tenure.sekitoriProduced).toBe(4);
    expect(p.tenure.boardSeatsWon).toBe(1);
  });

  it("election standing: top-5 → boardSeat; rank-1 → chairman; outside → gapToBoard", () => {
    const player = makeMockHeya("h1", { politicalCapital: 100, reputation: 60 });
    const npc = makeMockHeya("h2", { politicalCapital: 10, reputation: 10 });
    const world = worldWith([player, npc]);
    const p = projectManagerCareer(world, "h1" as never);
    expect(p.election.rank).toBe(1);
    expect(p.election.boardSeat).toBe(true);
    expect(p.election.chairman).toBe(true);

    const world2 = worldWith([
      makeMockHeya("me", { politicalCapital: 0, reputation: 0 }),
      makeMockHeya("n1", { politicalCapital: 90 }),
      makeMockHeya("n2", { politicalCapital: 80 }),
      makeMockHeya("n3", { politicalCapital: 70 }),
      makeMockHeya("n4", { politicalCapital: 60 }),
      makeMockHeya("n5", { politicalCapital: 50 }),
    ]);
    const p2 = projectManagerCareer(world2, "me" as never);
    expect(p2.election.boardSeat).toBe(false);
    expect(p2.election.gapToBoard).toBeCloseTo(75);
  });

  it("milestones: achieved flags at thresholds, in-progress fractions, deterministic order", () => {
    const world = worldWith(
      [makeMockHeya("h1", { prestigeBand: "elite" as never })],
      { bashoServed: 20, championships: 3, sekitoriProduced: 5, boardSeatsWon: 1 }
    );
    const p = projectManagerCareer(world, "h1" as never);
    const byId = Object.fromEntries(p.milestones.map((m) => [m.id, m]));
    expect(byId["first-sekitori"].achieved).toBe(true);
    expect(byId["first-yusho"].achieved).toBe(true);
    expect(byId["board-seat"].achieved).toBe(true);
    expect(byId["ten-sekitori"].achieved).toBe(false);
    expect(byId["ten-sekitori"].progress).toBeCloseTo(0.5);
    const ids = p.milestones.map((m) => m.id);
    expect([...ids].sort()).toEqual(ids);
  });

  it("world without hallOfFame/globalCups → derived zeros, no throw", () => {
    const world = worldWith([makeMockHeya("h1")]);
    delete (world as never)["hallOfFame"];
    delete (world as never)["globalCups"];
    expect(() => projectManagerCareer(world, "h1" as never)).not.toThrow();
  });
});

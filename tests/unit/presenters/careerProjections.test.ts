import { describe, it, expect } from "vitest";
import { projectManagerCareer } from "@/presenters/projections/careerProjections";
import { runElections } from "@/engine/governance/services/ScandalService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import {
  SUCCESSION_INSOLVENCY_EVENTS,
  SUCCESSION_MAJOR_SCANDALS,
  SUCCESSION_UNDERPERFORMANCE_BASHO,
} from "@/constants/engine/succession";
import { CAREER_MILESTONES } from "@/constants/ui/career";
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
    expect(ids).toEqual(CAREER_MILESTONES.map((d) => d.id));
  });

  it("world without hallOfFame/globalCups → derived zeros, no throw", () => {
    const world = worldWith([makeMockHeya("h1")]);
    delete (world as never)["hallOfFame"];
    delete (world as never)["globalCups"];
    expect(() => projectManagerCareer(world, "h1" as never)).not.toThrow();
  });

  // T2-G1: successionRisk fractions must be sourced from the SUCCESSION_*
  // constants, not hardcoded divisors — this assertion goes stale-and-RED if
  // the constants retune while the projector keeps literals.
  it("successionRisk fractions derive from SUCCESSION_* thresholds", () => {
    const world = worldWith(
      [makeMockHeya("h1", { consecutiveUnderperformanceBasho: 4 } as never)],
      {
        bashoServed: 10,
        insolvencyEvents: 2,
        majorScandals: 1,
      }
    );
    const p = projectManagerCareer(world, "h1" as never);
    expect(p.successionRisk.insolvency).toBeCloseTo(2 / SUCCESSION_INSOLVENCY_EVENTS);
    expect(p.successionRisk.scandals).toBeCloseTo(1 / SUCCESSION_MAJOR_SCANDALS);
    expect(p.successionRisk.underperformance).toBeCloseTo(
      4 / SUCCESSION_UNDERPERFORMANCE_BASHO
    );
  });

  // T2-G1/tiebreak: on an exact score tie the projector must agree with
  // runElections. The projector breaks ties by heya id; runElections currently
  // relies on Map insertion order — pinning the intended deterministic-id
  // outcome here is expected RED until runElections gains the same tiebreak.
  it("election standing matches runElections on an exact-score tie", () => {
    const tied = (id: string) =>
      makeMockHeya(id, { politicalCapital: 80, reputation: 40 });
    // Insert "z-heya" first so insertion order ≠ id order on the tie.
    const world = worldWith([tied("z-heya"), tied("a-heya")]);
    const p = projectManagerCareer(world, "a-heya" as never);
    expect(p.election.chairman).toBe(true); // deterministic id tiebreak: a < z

    const impact = runElections(world);
    const next = resolveImpacts(world, [impact]);
    // The chairman announcement names elected[0] — must match the id-tiebreak
    // winner the projector reports.
    const winnerName = world.heyas.get("a-heya")!.name;
    expect(JSON.stringify(next.events?.log ?? [])).toContain(
      `${winnerName} has been appointed as Chairman`
    );
  });

  // T2-G1: <5 heyas — board semantics mirror runElections' slice(0,5):
  // every heya in a short field sits on the board.
  it("boardSeat is true for rank ≤ board size even with fewer than 5 heyas", () => {
    const world = worldWith([
      makeMockHeya("me", { politicalCapital: 1 }),
      makeMockHeya("n1", { politicalCapital: 90 }),
      makeMockHeya("n2", { politicalCapital: 80 }),
    ]);
    const p = projectManagerCareer(world, "me" as never);
    expect(p.election.rank).toBe(3);
    expect(p.election.boardSeat).toBe(true);
  });

  // T2: milestone order is presentation-meaningful — honor CAREER_MILESTONES
  // declaration order (career progression), not alphabetical. Expected RED
  // until the projector stops sorting by id.
  it("milestones follow CAREER_MILESTONES declaration order", () => {
    const world = worldWith([makeMockHeya("h1")]);
    const p = projectManagerCareer(world, "h1" as never);
    expect(p.milestones.map((m) => m.id)).toEqual(
      CAREER_MILESTONES.map((d) => d.id)
    );
  });
});

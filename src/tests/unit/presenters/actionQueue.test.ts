import { describe, it, expect } from "vitest";
import { buildActionQueue } from "@/presenters/projections/actionQueue";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { TrainingSummary } from "@/presenters/projections/trainingProjections";
import type { FinanceSummary } from "@/presenters/projections/financeProjections";

function makeWorld(overrides: Partial<WorldState> = {}): WorldState {
  return {
    seed: "test",
    year: 1,
    week: 1,
    cyclePhase: "interim",
    heyas: new Map(),
    rikishi: new Map(),
    oyakata: new Map(),
    events: { log: [], byWeek: {}, headlines: [] },
    ...overrides,
  } as WorldState;
}

function makeTraining(overrides: Partial<TrainingSummary> = {}): TrainingSummary {
  return {
    intensity: "normal",
    focus: "general",
    recovery: "normal",
    injuredCount: 0,
    avgFatigue: 30,
    avgFatigueBand: "fresh",
    injuryRiskHighCount: 0,
    rosterStatuses: [],
    hasHighRisk: false,
    ...overrides,
  } as TrainingSummary;
}

function makeFinance(overrides: Partial<FinanceSummary> = {}): FinanceSummary {
  return {
    weeklyRevenue: 100000,
    weeklyExpenses: 50000,
    runwayMonths: 12,
    runwayBand: "comfortable",
    balance: 500000,
    isInsolventRisk: false,
    ...overrides,
  } as FinanceSummary;
}

describe("buildActionQueue", () => {
  it("returns empty queue when nothing is pending", () => {
    const world = makeWorld();
    const queue = buildActionQueue(world, null, makeTraining(), makeFinance());
    expect(queue).toEqual([]);
  });

  it("emits critical alert when funds are desperate", () => {
    const world = makeWorld();
    const finance = makeFinance({ runwayBand: "desperate", runwayMonths: 0.5 });
    const queue = buildActionQueue(world, null, makeTraining(), finance);
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      severity: "critical",
      title: "Funds critical — insolvency risk",
      link: "/office/finances",
    });
  });

  it("emits critical alert when funds are critical", () => {
    const world = makeWorld();
    const finance = makeFinance({ runwayBand: "critical", runwayMonths: 2 });
    const queue = buildActionQueue(world, null, makeTraining(), finance);
    expect(queue[0]).toMatchObject({
      severity: "critical",
      title: "Funds critical — insolvency risk",
    });
  });

  it("emits warning when >2 wrestlers at high injury risk", () => {
    const world = makeWorld();
    const training = makeTraining({ injuryRiskHighCount: 3 });
    const queue = buildActionQueue(world, null, training, makeFinance());
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      severity: "warning",
      title: "3 wrestlers at high injury risk",
      link: "/stable/medical",
    });
  });

  it("does not emit injury warning when <=2 wrestlers at high risk", () => {
    const world = makeWorld();
    const training = makeTraining({ injuryRiskHighCount: 2 });
    const queue = buildActionQueue(world, null, training, makeFinance());
    expect(queue).toHaveLength(0);
  });

  it("emits info for pending exhibitions", () => {
    const world = makeWorld({
      pendingExhibitions: [
        { id: "e1", heyaId: "h1", region: "Mongolia", prestige: 5, expiresAtWeek: 10 },
        { id: "e2", heyaId: "h1", region: "East_Asia", prestige: 3, expiresAtWeek: 10 },
      ],
    });
    const queue = buildActionQueue(world, null, makeTraining(), makeFinance());
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      severity: "info",
      title: "2 exhibition invitations pending",
      link: "/world-circuit",
    });
  });

  it("emits info for promotion deliberation event", () => {
    const world = makeWorld({
      events: {
        log: [{ type: "PROMOTION_DELIBERATION", context: { rikishiId: "r1" } } as never],
        headlines: [],
      } as unknown as WorldState["events"],
    });
    const queue = buildActionQueue(world, null, makeTraining(), makeFinance());
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      severity: "info",
      title: "Promotion deliberation available",
      link: "/stable/roster",
    });
  });

  it("emits info for pre-basho phase", () => {
    const world = makeWorld({ cyclePhase: "pre_basho" });
    const queue = buildActionQueue(world, null, makeTraining(), makeFinance());
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      severity: "info",
      title: "Basho starts soon — review your roster",
      link: "/basho",
    });
  });

  it("sorts by severity (critical > warning > info)", () => {
    const world = makeWorld({
      cyclePhase: "pre_basho",
      pendingExhibitions: [{ id: "e1", heyaId: "h1", region: "Mongolia", prestige: 5, expiresAtWeek: 10 }],
    });
    const training = makeTraining({ injuryRiskHighCount: 3 });
    const finance = makeFinance({ runwayBand: "critical", runwayMonths: 1 });
    const queue = buildActionQueue(world, null, training, finance);

    expect(queue).toHaveLength(4);
    expect(queue[0].severity).toBe("critical");
    expect(queue[1].severity).toBe("warning");
    expect(queue[2].severity).toBe("info");
    expect(queue[3].severity).toBe("info");
  });
});

import { describe, it, expect, vi } from "vitest";
import { shouldBlockTick, shouldHaltAdvance } from "@/engine/npc/decision/shouldHaltAdvance";
import { resolveLoopDecision } from "@/engine/npc/decision/LoopDecisionEngine";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { advanceOneDay } from "@/engine/tick/tickDaily";
import { makeMockWorld, makeMockBasho, mockRikishi, makeMockHeya } from "@tests/unit/engine/utils";
import type { WorldState } from "@/engine/types/world";
import type { MatchSchedule, BoutResult } from "@/engine/types/basho";
import type { Rikishi } from "@/engine/types/rikishi";

// Mock the world engine functions used by phase01_basho_bouts so the
// regression test can observe whether the tick was swallowed.
vi.mock("@/engine/core/world", () => ({
  simulateBoutsForDay: vi.fn((w: WorldState) => ({ world: w, results: [] })),
  advanceBashoDay: vi.fn((w: WorldState) => ({
    ...w,
    currentBasho: w.currentBasho
      ? { ...w.currentBasho, day: (w.currentBasho.day ?? 0) + 1 }
      : w.currentBasho,
  })),
}));
import * as worldEngine from "@/engine/core/world";

const base = { pendingCrisis: undefined, pendingDecisions: [] } as unknown as WorldState;

describe("shouldHaltAdvance", () => {
  it("does not halt when there is no blocking decision", () => {
    expect(shouldHaltAdvance(base)).toBe(false);
  });
  it("halts when a pendingCrisis exists", () => {
    const w = {
      ...base,
      pendingCrisis: { id: "c1", type: "loop_decision", title: "x", description: "x", options: [] },
    } as unknown as WorldState;
    expect(shouldHaltAdvance(w)).toBe(true);
  });
  it("halts when a required pendingDecision exists even without a crisis", () => {
    const w = {
      ...base,
      pendingDecisions: [
        { id: "d1", type: "x", description: "x", deadlineWeek: 1, required: true, options: [] },
      ],
    } as unknown as WorldState;
    expect(shouldHaltAdvance(w)).toBe(true);
  });

  // P1.4: Accumulated decisions while crisis is pending must also halt.
  it("halts when pendingDecisions has a required decision AND pendingCrisis is already set", () => {
    const w = {
      ...base,
      pendingCrisis: { id: "c1", type: "loop_decision", title: "x", description: "x", options: [] },
      pendingDecisions: [
        { id: "d2", type: "y", description: "y", deadlineWeek: 2, required: true, options: [] },
      ],
    } as unknown as WorldState;
    expect(shouldHaltAdvance(w)).toBe(true);
  });

  it("does not halt when pendingDecisions has only non-required decisions", () => {
    const w = {
      ...base,
      pendingDecisions: [
        { id: "d1", type: "x", description: "x", deadlineWeek: 1, required: false, options: [] },
      ],
    } as unknown as WorldState;
    expect(shouldHaltAdvance(w)).toBe(false);
  });

  it("does not halt when pendingDecisions is empty and no pendingCrisis", () => {
    const w = {
      ...base,
      pendingDecisions: [],
      pendingCrisis: undefined,
    } as unknown as WorldState;
    expect(shouldHaltAdvance(w)).toBe(false);
  });

  it("resolved decisions (removed from pendingDecisions) do not halt", () => {
    const w = {
      ...base,
      pendingDecisions: [],
      pendingCrisis: undefined,
    } as unknown as WorldState;
    expect(shouldHaltAdvance(w)).toBe(false);
  });
});

describe("advanceOneDay halt behavior", () => {
  it("does not halt on pendingCrisis when _autonomousSim is true", () => {
    const world = makeMockWorld({
      _autonomousSim: true,
      pendingCrisis: {
        id: "c1",
        type: "loop_decision",
        title: "x",
        description: "x",
        options: [],
      } as any,
    });
    // Should run the full pipeline without early-return since _autonomousSim is true.
    const result = advanceOneDay(world);
    // The world should have advanced (dayIndexGlobal incremented by preflight)
    expect(result.dayIndexGlobal).toBe((world.dayIndexGlobal ?? 0) + 1);
  });

  it("halts early (returns before main phases) when pendingCrisis is set and not autonomous", () => {
    const world = makeMockWorld({
      pendingCrisis: {
        id: "c1",
        type: "loop_decision",
        title: "x",
        description: "x",
        options: [],
      } as any,
      _daysSinceLastWeeklyTick: 6, // Not a weekly tick, so no weekly phases would run anyway
    });
    const result = advanceOneDay(world);
    // Preflight still runs (advances calendar), but main phases should be skipped.
    // The day should advance but the weekly tick counter should NOT reset (no weekly phases ran).
    expect(result.dayIndexGlobal).toBe((world.dayIndexGlobal ?? 0) + 1);
    // _daysSinceLastWeeklyTick should be incremented by preflight but not reset to 0
    // (since no weekly pipeline ran). The preflight increments it, and the halt
    // happens before the weekly tick counter update at line 131-134.
    // Actually, the halt returns before the counter update, so the counter is
    // whatever preflight set it to.
    // The key assertion: the world didn't go through the full pipeline (no transientContext.lastReport).
    expect(result.transientContext?.lastReport).toBeUndefined();
  });

  /**
   * Regression (golden-path stall): "advance until interesting" conditions are
   * loop-break signals for multi-day advances, NOT day-swallowing conditions.
   * A this-week major/headline world event must not make advanceOneDay return
   * before the bout-resolution phase — otherwise every world event freezes the
   * basho for the rest of the week while calendar days burn.
   */
  it("a this-week major world event does NOT swallow the basho-day tick", () => {
    const heya = makeMockHeya("heya-1", { rikishiIds: ["r-east", "r-west"] });
    const east = mockRikishi("r-east", { heyaId: "heya-1", division: "makuuchi" });
    const west = mockRikishi("r-west", { heyaId: "heya-1", division: "makuuchi" });
    const matches: MatchSchedule[] = [
      { boutId: "d1-b0", day: 1, eastRikishiId: "r-east", westRikishiId: "r-west" } as MatchSchedule,
    ];
    const world = makeMockWorld({
      year: 2030,
      week: 5,
      cyclePhase: "active_basho",
      currentBasho: makeMockBasho({ day: 1, matches, isActive: true }) as never,
      playerHeyaId: "heya-1",
      heyas: new Map([["heya-1", heya]]),
      rikishi: new Map([
        ["r-east", east as unknown as Rikishi],
        ["r-west", west as unknown as Rikishi],
      ]),
      events: {
        version: "1.0.0",
        dedupe: {},
        log: [
          {
            id: "e1",
            type: "BASHO_RESULT",
            year: 2030,
            week: 5,
            phase: "interim",
            category: "basho",
            importance: "headline",
            scope: "world",
            title: "t",
            summary: "s",
          },
        ],
      } as never,
    });

    // The event still halts multi-day advance loops…
    expect(shouldHaltAdvance(world)).toBe(true);
    // …but must not block a single day-tick.
    expect(shouldBlockTick(world)).toBe(false);

    const result = advanceOneDay(world);
    expect(worldEngine.simulateBoutsForDay).toHaveBeenCalled();
    expect(worldEngine.advanceBashoDay).toHaveBeenCalled();
    expect(result.currentBasho?.day).toBe(2);
  });

  /**
   * Regression (year-of-bashos e2e stall): an insolvency decision resolved
   * with "austerity" leaves runwayBand critical — detectDueDecisions then
   * re-issued the SAME period-deterministic id on the very next tick,
   * re-setting pendingCrisis and re-freezing the basho. Each blocked tick
   * burned a calendar day while bashoDay stayed frozen (day 9 for 10+
   * days). A resolved id must not re-fire within its own period — but a
   * week rollover mints a NEW id, which still must fire.
   */
  it("a resolved insolvency id does not re-fire and re-freeze the basho", () => {
    const heya = makeMockHeya("heya-1", {
      rikishiIds: ["r-east"],
      runwayBand: "critical",
    });
    const east = mockRikishi("r-east", { heyaId: "heya-1", division: "makuuchi" });
    const world = makeMockWorld({
      year: 2026,
      week: 10,
      calendar: { currentWeek: 10, month: 3, currentDay: 9 },
      _daysSinceLastWeeklyTick: 2,
      cyclePhase: "active_basho",
      currentBasho: makeMockBasho({ day: 9, isActive: true }) as never,
      playerHeyaId: "heya-1",
      heyas: new Map([["heya-1", heya]]),
      rikishi: new Map([["r-east", east as unknown as Rikishi]]),
    });

    // First advance: insolvency fires → pendingCrisis → the calendar day
    // is consumed but the basho-day tick is swallowed.
    const blocked = advanceOneDay(world);
    expect(blocked.pendingCrisis?.type).toBe("loop_decision");
    expect(blocked.currentBasho?.day).toBe(9);
    const decisionId = blocked.pendingCrisis?.id as string;
    expect(decisionId).toBe("insolvency-test-seed-y2026-w10");

    // Player picks "austerity" — injects no cash, so the trigger (critical
    // runway) is still live on the next tick.
    const resolved = resolveImpacts(blocked, [
      resolveLoopDecision(blocked, decisionId, "austerity"),
    ]);
    expect(resolved.pendingCrisis).toBeUndefined();
    expect(resolved.resolvedDecisionIds).toContain(decisionId);

    // Next advance: trigger still live, but the resolved id must not
    // re-issue — the basho proceeds instead of freezing again.
    const next = advanceOneDay(resolved);
    expect(next.pendingCrisis).toBeUndefined();
    expect(next.currentBasho?.day).toBe(10);

    // …but a week rollover mints a NEW id, which still fires — suppression
    // is scoped to the resolved period, not the underlying trigger. The
    // roll takes two ticks: detectDueDecisions reads world.week from the
    // incoming world, so the first rolled tick writes week: 11 (and stays
    // unblocked — the w10 id is resolved), the second mints w11.
    const rolled = advanceOneDay({ ...next, _daysSinceLastWeeklyTick: 6 });
    expect(rolled.week).toBe(11);
    expect(rolled.pendingCrisis).toBeUndefined();
    const reblocked = advanceOneDay(rolled);
    expect(reblocked.pendingCrisis?.type).toBe("loop_decision");
    expect(reblocked.pendingCrisis?.id).toBe("insolvency-test-seed-y2026-w11");
    expect(reblocked.currentBasho?.day).toBe(11);
  });

  /**
   * Regression (year-of-bashos e2e stall, second signature): preflight merges
   * evaluatePendingDecisions and applyExpiredQueueDefaults into one impact.
   * Both compute pendingDecisions from the pre-tick world — so when an
   * expired queue decision fires its default in the SAME tick that a new
   * blocking decision is detected, the expired-defaults write lands second
   * and drops the new decision while pendingCrisis keeps its id. The crisis
   * then has no backing decision: resolveLoopDecision can't find it, the
   * modal is unresolvable, and shouldBlockTick swallows every tick.
   */
  it("a same-tick expired queue default must not orphan the promoted crisis decision", () => {
    const heya = makeMockHeya("heya-1", {
      rikishiIds: ["r-east"],
      runwayBand: "critical",
    });
    const east = mockRikishi("r-east", { heyaId: "heya-1", division: "makuuchi" });
    const world = makeMockWorld({
      year: 2026,
      week: 10,
      calendar: { currentWeek: 10, month: 3, currentDay: 9 },
      _daysSinceLastWeeklyTick: 2,
      cyclePhase: "active_basho",
      currentBasho: makeMockBasho({ day: 9, isActive: true }) as never,
      playerHeyaId: "heya-1",
      heyas: new Map([["heya-1", heya]]),
      rikishi: new Map([["r-east", east as unknown as Rikishi]]),
      pendingDecisions: [
        {
          id: "training-y2026-w9",
          type: "weekly_training_emphasis",
          description: "expired queue decision",
          deadlineWeek: 9, // week 10 > 9 → expired this tick
          required: false,
          options: [],
        },
      ],
    });

    const next = advanceOneDay(world);
    const crisisId = next.pendingCrisis?.id;
    expect(crisisId).toBe("insolvency-test-seed-y2026-w10");
    // The expired queue decision is consumed…
    expect((next.pendingDecisions ?? []).some((d) => d.id === "training-y2026-w9")).toBe(false);
    // …but the promoted crisis decision must still be queued — the modal
    // resolves it via resolveLoopDecision's pendingDecisions lookup.
    expect((next.pendingDecisions ?? []).some((d) => d.id === crisisId)).toBe(true);
  });

  /**
   * Regression (year-of-bashos e2e stall, third signature): a blocked tick
   * incremented _daysSinceLastWeeklyTick but never consumed the weekly gate —
   * once the counter crossed 7 it stayed ≥7 forever, so preflight rolled the
   * calendar week EVERY blocked tick (~1 week/day). Each tick then minted a
   * NEW period-scoped crisis id that resolvedDecisionIds could not suppress:
   * insolvency re-fired daily and bashoDay froze at 1 for 20+ world-days.
   *
   * Fix invariant: the week rolls exactly once per 7 real days (=== crossing
   * only), and a blocked gate day HOLDS the counter at the threshold so the
   * first unblocked tick still runs the weekly pipeline. Resetting the
   * counter would starve weekly phases forever under a chronic crisis —
   * weekly decisions mint on the gate day itself (fourth signature: the
   * e2e year-of-bashos stall where pendingYearBoundary never consumed and
   * world.year froze at 2026 through the new-year basho).
   */
  it("a blocked weekly-gate tick holds the gate — week rolls once, weekly pipeline runs on first unblocked tick", () => {
    const heya = makeMockHeya("heya-1", {
      rikishiIds: ["r-east"],
      runwayBand: "critical",
    });
    const east = mockRikishi("r-east", { heyaId: "heya-1", division: "makuuchi" });
    const world = makeMockWorld({
      year: 2026,
      week: 10,
      calendar: { currentWeek: 10, month: 3, currentDay: 9 },
      _daysSinceLastWeeklyTick: 6, // one day from the weekly gate
      cyclePhase: "active_basho",
      currentBasho: makeMockBasho({ day: 1, isActive: true }) as never,
      playerHeyaId: "heya-1",
      heyas: new Map([["heya-1", heya]]),
      rikishi: new Map([["r-east", east as unknown as Rikishi]]),
      transientContext: { pendingYearBoundary: true } as never,
    });

    // Gate day, blocked: the week rolls once (11) and the crisis mints with
    // the PRE-roll week id (w10 — detection reads the incoming world). The
    // counter must HOLD at the threshold so the weekly pipeline can still
    // run — and the deferred year boundary stays pending.
    const gateDay = advanceOneDay(world);
    expect(gateDay.week).toBe(11);
    expect(gateDay.pendingCrisis?.id).toBe("insolvency-test-seed-y2026-w10");
    expect(gateDay._daysSinceLastWeeklyTick).toBe(7);
    expect(gateDay.year).toBe(2026);
    expect(gateDay.currentBasho?.day).toBe(1);

    // Player resolves the w10 crisis. The runway is still critical — and
    // the week genuinely rolled — so the NEXT tick legitimately mints the
    // new-week id (w11). The held gate must NOT re-roll the week.
    const afterW10 = resolveImpacts(gateDay, [
      resolveLoopDecision(gateDay, gateDay.pendingCrisis!.id as string, "austerity"),
    ]);
    const w11Day = advanceOneDay(afterW10);
    expect(w11Day.week).toBe(11); // no free-run — still the rolled week
    expect(w11Day.pendingCrisis?.id).toBe("insolvency-test-seed-y2026-w11");
    expect(w11Day._daysSinceLastWeeklyTick).toBe(7);
    const afterW11 = resolveImpacts(w11Day, [
      resolveLoopDecision(w11Day, w11Day.pendingCrisis!.id as string, "austerity"),
    ]);

    // First unblocked tick: the held gate fires — weekly pipeline runs, the
    // deferred year boundary is consumed (world.year rolls to 2027), the
    // counter resets, and the basho day advances.
    const debtDay = advanceOneDay(afterW11);
    expect(debtDay.pendingCrisis).toBeUndefined();
    expect(debtDay._daysSinceLastWeeklyTick).toBe(0);
    expect(debtDay.year).toBe(2027);
    expect(debtDay.transientContext?.pendingYearBoundary).toBeFalsy();
    expect(debtDay.currentBasho?.day).toBe(2);

    // The year roll makes the resolved -y2026-w11 id period-stale: a still-
    // critical stable legitimately mints the same crisis under the new
    // year's tag on the next tick (one extra swallow, not a loop).
    const y27Day = advanceOneDay(debtDay);
    expect(y27Day.pendingCrisis?.id).toBe("insolvency-test-seed-y2027-w11");
    expect(y27Day.currentBasho?.day).toBe(2);
    const afterY27 = resolveImpacts(y27Day, [
      resolveLoopDecision(y27Day, y27Day.pendingCrisis!.id as string, "austerity"),
    ]);

    // The basho then marches on clean ticks for the rest of the week.
    let marching = afterY27;
    for (let i = 0; i < 5; i++) {
      marching = advanceOneDay(marching);
      expect(marching.pendingCrisis).toBeUndefined();
    }
    expect(marching.week).toBe(11);
    expect(marching.currentBasho?.day).toBe(7);

    // Next gate crossing: preflight rolls to week 12, detection mints w11 —
    // already resolved → the tick proceeds instead of blocking.
    const crossed = advanceOneDay(marching);
    expect(crossed.week).toBe(12);
    expect(crossed.pendingCrisis).toBeUndefined();
    expect(crossed.currentBasho?.day).toBe(8);

    // …and the week-12 crisis fires on the following tick — exactly once.
    const w12Day = advanceOneDay(crossed);
    expect(w12Day.pendingCrisis?.id).toBe("insolvency-test-seed-y2027-w12");
  });

  /**
   * Regression (year-of-bashos soak wedge, fifth signature): with several
   * required decisions queued, promotion ran once per tick inside
   * evaluatePendingDecisions — and each blocked tick burned a calendar day
   * (preflight consumes before shouldBlockTick swallows). A backlog of N
   * required decisions cost N silent days and N modal round-trips: the e2e
   * churned crisis modals with near-zero sim progress for ~2h. Resolution
   * must chain-promote the next required decision in the same impact.
   */
  it("resolving a blocking decision promotes the next required one without burning a day", () => {
    const mkDecision = (id: string) => ({
      id,
      type: "weekly_training_emphasis",
      description: `decision ${id}`,
      deadlineWeek: 10,
      required: true,
      options: [{ id: "opt", label: "Opt", impact: "do it" }],
    });
    const world = makeMockWorld({
      pendingCrisis: {
        id: "d1",
        type: "loop_decision",
        title: "decision d1",
        description: "decision d1",
        options: [{ id: "opt", label: "Opt", description: "do it" }],
      } as any,
      pendingDecisions: [mkDecision("d1"), mkDecision("d2"), mkDecision("d3")],
    });

    const afterFirst = resolveImpacts(world, [resolveLoopDecision(world, "d1", "opt")]);
    // d1 consumed; the next required decision promotes immediately —
    // no intervening tick, no burned day.
    expect(afterFirst.pendingCrisis?.id).toBe("d2");
    expect((afterFirst.pendingDecisions ?? []).map((d) => d.id)).toEqual(["d2", "d3"]);

    const afterSecond = resolveImpacts(afterFirst, [
      resolveLoopDecision(afterFirst, "d2", "opt"),
    ]);
    expect(afterSecond.pendingCrisis?.id).toBe("d3");

    const afterThird = resolveImpacts(afterSecond, [
      resolveLoopDecision(afterSecond, "d3", "opt"),
    ]);
    // Queue drained — nothing required left, crisis clears for real.
    expect(afterThird.pendingCrisis).toBeUndefined();
    expect(afterThird.pendingDecisions).toEqual([]);
    // …and the very next tick is unblocked.
    expect(shouldBlockTick(afterThird)).toBe(false);
  });
});

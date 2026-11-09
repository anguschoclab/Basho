import { describe, it, expect } from "vitest";
import { runHoliday } from "@/engine/calendar/holiday";
import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import type { HolidayConfig } from "@/engine/calendar/holiday";
import type { WorldState } from "@/engine/types/world";
import type { MatchSchedule } from "@/engine/types/basho";
import { logEventImpact } from "@/engine/core/ImpactBuilder";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { selectHolidayDigest } from "@/presenters/projections/holidayDigestProjections";
import { advanceOneDay } from "@/engine/tick/tickDaily";
import {
  makeMockWorld,
  makeMockBasho,
  mockRikishi,
  makeMockHeya,
} from "@tests/unit/engine/utils";

describe("GO_ON_HOLIDAY worker command — runHoliday integration", () => {
  it("runHoliday advances the world state", () => {
    const world = generateInitialWorld("holiday-test-1");
    const startDay = world.dayIndexGlobal ?? 0;
    const config: HolidayConfig = {
      target: "nextWeek",
      gates: [],
      delegationPolicy: "balanced",
      playerHeyaId: world.playerHeyaId,
    };
    const result = runHoliday(world, config);
    expect(result.daysAdvanced).toBeGreaterThan(0);
    expect(result.reports.length).toBeGreaterThan(0);
    // The last report should have advanced dayIndexGlobal
    const finalWorld = result.reports[result.reports.length - 1];
    expect(finalWorld.dayIndexGlobal).toBeGreaterThan(startDay);
  });

  it("runHoliday returns a digest with a headline", () => {
    const world = generateInitialWorld("holiday-test-2");
    const config: HolidayConfig = {
      target: "nextDay",
      gates: [],
      delegationPolicy: "balanced",
      playerHeyaId: world.playerHeyaId,
    };
    const result = runHoliday(world, config);
    expect(result.digest).toBeDefined();
    expect(result.digest.headline).toBeDefined();
    expect(typeof result.digest.headline).toBe("string");
  });

  it("runHoliday with nextDay target advances at least 1 day", () => {
    const world = generateInitialWorld("holiday-test-3");
    const config: HolidayConfig = {
      target: "nextDay",
      gates: [],
      delegationPolicy: "balanced",
      playerHeyaId: world.playerHeyaId,
    };
    const result = runHoliday(world, config);
    expect(result.daysAdvanced).toBeGreaterThanOrEqual(1);
  });

  it("runHoliday returns phaseOnExit", () => {
    const world = generateInitialWorld("holiday-test-4");
    const config: HolidayConfig = {
      target: "nextDay",
      gates: [],
      delegationPolicy: "balanced",
      playerHeyaId: world.playerHeyaId,
    };
    const result = runHoliday(world, config);
    expect(result.phaseOnExit).toBeDefined();
    expect(typeof result.phaseOnExit).toBe("string");
  });

  it("logging holiday_return event makes selectHolidayDigest return the digest", () => {
    // Regression: the GO_ON_HOLIDAY worker handler previously dropped result.digest
    // and never logged a holiday_return event, so the Dashboard "Holiday Return
    // Digest" section could never render. This test mirrors the worker handler's
    // event-logging path and verifies the projection picks it up.
    const world = generateInitialWorld("holiday-digest-test");
    const config: HolidayConfig = {
      target: "nextDay",
      gates: [],
      delegationPolicy: "balanced",
      playerHeyaId: world.playerHeyaId,
    };
    const result = runHoliday(world, config);
    expect(result).toBeDefined();

    let finalWorld: WorldState = result.reports[result.reports.length - 1];
    const incidents = result.digest.categories.flatMap((c) =>
      c.items.map((item) => ({ type: c.id, description: item }))
    );
    const holidayEventImpact = logEventImpact(
      "MANAGEMENT_DECISION",
      "ai_decision",
      {
        status: "holiday_return",
        eventId: "holiday_return",
        target: config.target,
        daysAdvanced: result.daysAdvanced,
        summary: result.digest.headline,
        incidents,
      },
      "GO_ON_HOLIDAY",
      { importance: "headline" }
    );
    finalWorld = resolveImpacts(finalWorld, [holidayEventImpact]);

    const digest = selectHolidayDigest(finalWorld);
    expect(digest).not.toBeNull();
    expect(digest?.returnEventId).toBe("holiday_return");
    expect(digest?.target).toBe("nextDay");
    expect(digest?.daysAdvanced).toBe(result.daysAdvanced);
    expect(digest?.summary).toBe(result.digest.headline);
  });
});

// ── V18 consolidation pins — holiday autonomous-state hygiene ──────────────
// Each test is authored failing-first against confirmed defects:
//   V18-B01  `_autonomousSim` leaks into the live world after a holiday
//            (holiday.ts:396 flags startWorld; advanceWithGates.ts:40 re-flags
//            each report; worker commands/meta.ts:75 assigns the last report
//            verbatim to rt.world; nothing ever un-flags).
//   V18-B02  HolidayConfig.delegationPolicy is never read — runHoliday never
//            sets `_autonomousPolicy`, so phase00_preflight.ts:73 always falls
//            back to "balanced".
//   V18-B03  `endOfBasho`/`postBasho` targets are unreachable — the pipeline
//            never leaves `active_basho` (interactive termination only), and
//            computeTargetDays undershoots by one (`15 - day` where day is the
//            next UNPLAYED day; a day-15 holiday computes 0 remaining).

/** A world whose player heya is in `interim`, far from any phase transition. */
function interimWorldWithPlayer(rikishi: import("@/engine/types/rikishi").Rikishi[]): WorldState {
  const heya = makeMockHeya("h-player", { rikishiIds: rikishi.map((r) => r.id) });
  return makeMockWorld({
    playerHeyaId: "h-player",
    heyas: new Map([["h-player", heya]]),
    rikishi: new Map(rikishi.map((r) => [r.id, r])),
    cyclePhase: "interim",
    _interimDaysRemaining: 30,
    calendar: { month: 3, currentDay: 5, currentWeek: 10 } as never,
  });
}

/** A world mid-basho with real scheduled bouts for `day` (and day+1). */
function activeBashoWorldAtDay(day: number): WorldState {
  const ids = ["r-e1", "r-w1", "r-e2", "r-w2"];
  const rikishi = ids.map((id) =>
    mockRikishi(id, { heyaId: "h-npc", division: "makuuchi", side: id.endsWith("1") ? "east" : "west" })
  );
  const matches: MatchSchedule[] = [];
  for (const d of [day, day + 1]) {
    if (d > 15) continue;
    matches.push(
      { boutId: `b-d${d}-1`, day: d, eastRikishiId: "r-e1", westRikishiId: "r-w1" },
      { boutId: `b-d${d}-2`, day: d, eastRikishiId: "r-e2", westRikishiId: "r-w2" }
    );
  }
  const basho = makeMockBasho({
    day,
    matches,
    standings: new Map(ids.map((id) => [id, { wins: 0, losses: 0 }])),
  });
  return makeMockWorld({
    rikishi: new Map(rikishi.map((r) => [r.id, r])),
    heyas: new Map([["h-npc", makeMockHeya("h-npc", { rikishiIds: ids })]]),
    currentBasho: basho,
    cyclePhase: "active_basho",
    currentBashoName: "hatsu",
  });
}

describe("V18-B01 — _autonomousSim must not leak into the live world", () => {
  it("the world returned by runHoliday does not carry the run-mode flag", () => {
    const world = interimWorldWithPlayer([mockRikishi("r1", { heyaId: "h-player" })]);
    const result = runHoliday(world, {
      target: "nextDay",
      gates: [],
      delegationPolicy: "balanced",
      playerHeyaId: "h-player",
    });
    // The GO_ON_HOLIDAY worker handler assigns `result.reports.at(-1)` verbatim
    // to rt.world (commands/meta.ts:75). `_autonomousSim` is a run-mode flag —
    // NON_PERSISTED_WORLD_FIELDS (types/save.ts) strips it from saves, but the
    // worker puts the report into the LIVE world where it must not survive:
    // while set it auto-resolves pending decisions (phase00_preflight:72-77)
    // and bypasses the day>15 + shouldBlockTick guards (tickDaily:122-128,145).
    const finalWorld = result.reports[result.reports.length - 1];
    expect(finalWorld).toBeDefined();
    expect(finalWorld._autonomousSim).toBeUndefined();
  });

  it("a blocking loop decision still halts the next tick after a holiday", () => {
    const world = interimWorldWithPlayer([mockRikishi("r1", { heyaId: "h-player" })]);
    const result = runHoliday(world, {
      target: "nextDay",
      gates: [],
      delegationPolicy: "balanced",
      playerHeyaId: "h-player",
    });
    const afterHoliday = result.reports[result.reports.length - 1];

    // The player returns from holiday with a required decision pending. On the
    // interactive path evaluatePendingDecisions promotes it to pendingCrisis
    // and shouldBlockTick swallows the rest of the tick (no daily report).
    const ticked = advanceOneDay({
      ...afterHoliday,
      pendingDecisions: [
        {
          id: "d-blocking",
          type: "insolvency_response",
          description: "Stable finances are desperate.",
          deadlineWeek: 99,
          options: [
            { id: "loan", label: "Take Emergency Loan", impact: "Cash now; repayments." },
            { id: "austerity", label: "Austerity Diet", impact: "Cut costs." },
          ],
          required: true,
        },
      ],
    });

    // With the leaked flag the decision is never promoted and the halt is skipped.
    expect(ticked.pendingCrisis).toBeDefined();
    expect(ticked.transientContext?.lastReport).toBeUndefined();
  });
});

describe("V18-B02 — HolidayConfig.delegationPolicy must drive auto-resolution", () => {
  it("aggressive policy resolves pre_basho_readiness with 'push', not balanced 'rest'", () => {
    // A fatigued rikishi in pre_basho makes pre_basho_readiness due every tick.
    const world = {
      ...interimWorldWithPlayer([
        mockRikishi("r-fat", { heyaId: "h-player", fatigue: 80 }),
      ]),
      cyclePhase: "pre_basho" as const,
      _interimDaysRemaining: 30,
    };
    const result = runHoliday(world, {
      target: "nextDay",
      gates: [],
      delegationPolicy: "aggressive",
      playerHeyaId: "h-player",
    });
    const after = result.reports[result.reports.length - 1];

    // The aggressive policy table picks "push" for pre_basho_readiness
    // (LoopDecisionEngine DELEGATION_DEFAULTS); "balanced" picks "rest".
    const auto = (after.events?.log ?? []).find(
      (e) =>
        e.type === "DECISION_AUTO_RESOLVED" &&
        (e.data as { decisionType?: string } | undefined)?.decisionType === "pre_basho_readiness"
    );
    expect(auto).toBeDefined();
    expect((auto!.data as { optionId?: string }).optionId).toBe("push");
    // The policy must be carried on the run-mode world so preflight uses it
    // (phase00_preflight:73 reads world._autonomousPolicy ?? "balanced").
    expect(after._autonomousPolicy).toBe("aggressive");
  });
});

describe("V18-B03 — endOfBasho holiday target must reach the basho end", () => {
  it("from senshuraku (day 15) the holiday is not a no-op", () => {
    const world = activeBashoWorldAtDay(15);
    const result = runHoliday(world, {
      target: "endOfBasho",
      gates: [],
      delegationPolicy: "balanced",
      playerHeyaId: "h-player",
    });
    // currentBasho.day is the next UNPLAYED day — day 15 still needs a tick.
    // computeTargetDays returns 15 - 15 = 0, so today nothing advances.
    expect(result.daysAdvanced).toBeGreaterThan(0);
  });

  it("from day 14 the holiday leaves active_basho (basho terminates)", () => {
    const world = activeBashoWorldAtDay(14);
    const result = runHoliday(world, {
      target: "endOfBasho",
      gates: [],
      delegationPolicy: "balanced",
      playerHeyaId: "h-player",
    });
    // isTargetReached for endOfBasho is post_basho|interim — but the pipeline
    // has no active_basho exit arm (phase00_preflight:193-196) and the off-by-
    // one target (15 - day) doesn't even play through senshuraku. The world is
    // left mid-basho instead of reaching the tournament's end.
    expect(result.phaseOnExit).toBe("post_basho");
  });
});

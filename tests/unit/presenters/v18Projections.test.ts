import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { applyImpact, resolveImpacts } from "@/engine/core/ImpactResolver";
import { handleMediaEvent } from "@/engine/media/MediaEventService";
import { issueGovernanceRuling } from "@/engine/governance/services/ScandalService";
import { calculateHeyaWeeklyFinances } from "@/engine/economy/FinanceCalculator";
import { processAllRetirements } from "@/engine/lifecycle/processRetirements";
import { projectGovernanceDerived } from "@/presenters/projections/governanceProjections";
import { projectHeya } from "@/presenters/projections/heyaUI";
import { selectCohortSummaries } from "@/presenters/projections/historyCohortProjections";
import type { WorldState } from "@/engine/types/world";
import type { GovernanceRuling } from "@/engine/types/economy";

/**
 * V18 presenters-wave failing-first regression pins.
 *
 * A) Governance ruling surfaces disagree after media resolution (S3-2).
 *    `projectGovernanceDerived` exposes two "actionable" lists computed from
 *    different resolved-markers:
 *      - unresolvedRulings: `heyaId === playerHeyaId && !r.playerChoice`
 *      - pendingRulings:    `heyaId === heya.id       && !r.playerSeverity`
 *    `issueGovernanceRuling` (ISSUE_RULING) stamps BOTH fields; `handleMediaEvent`
 *    (HANDLE_MEDIA_EVENT — the MediaPage resolution path) stamps ONLY
 *    `playerChoice`. A ruling resolved on the Media page therefore stays
 *    "pending" on the Governance rulings tab forever — the player can
 *    double-resolve it (re-applying scandal/political-capital effects).
 *
 * B) selectCohortSummaries drops retired cohort members (HistoryDashboard
 *    undercount). `getAllRikishi` (presenters/worldAccess.ts:39) is
 *    active-only — it never reads `world.historicalRikishi`, which is where
 *    `retireRikishiFully` puts the FULL Rikishi record (with
 *    `recruitmentCohortId` intact) until year-end summarization. Retired
 *    cohort members are invisible to `getCohortSummary`, and a cohort whose
 *    last member retires vanishes from HistoryDashboard entirely.
 *    Signature note for the fix: `RetiredRikishiSummary` (types/history.ts:115)
 *    carries no `recruitmentCohortId`, so only the full-record form of a
 *    retiree (the state this pin reproduces) can be cohort-attributed —
 *    the summary schema needs the field if summarized careers must count too.
 *
 * C) projectHeya (projections/heyaUI.ts) fabricated fields.
 *    Verified against real WorldState sources:
 *      - achievements.yushoCount: hardcoded 0; canonical source heya.historicalYusho
 *        (read by DynastyService — types/heya.ts:89).
 *      - achievements.specialPrizeCount: hardcoded 0; real source is roster
 *        rikishi stats.achievements.specialPrizes.
 *      - rivalStableIds: hardcoded []; real source is
 *        world.rivalriesState.heyaRivalryPairs (heyaAId/heyaBId).
 *      - monthlyExpense: hardcoded 0; real source is the heya's computed burn,
 *        calculateHeyaWeeklyFinances(heya, world).totalBurn * 4.
 *    NOT pinned (verified non-fabrications): rosterLimit happens to equal
 *    HARD_CAP_ROSTER_SIZE (30); recruitment.targetStyle/"neutral" and
 *    location have no richer engine source to pin against.
 */

function worldWithRuling(): { world: WorldState; ruling: GovernanceRuling } {
  const ruling: GovernanceRuling = {
    id: "ruling-1",
    date: "2025-12",
    heyaId: "player-heya",
    type: "fine",
    severity: "medium",
    reason: "curfew violation",
    effects: { scandalScoreDelta: 10 },
  };
  const world = MockFactory.createWorld({
    playerHeyaId: "player-heya",
    heyas: new Map([["player-heya", MockFactory.createHeya("player-heya", { scandalScore: 40 })]]),
    governanceLog: [ruling],
  });
  return { world, ruling };
}

describe("governance projection — media-resolved ruling must leave BOTH surfaces (V18-S3-2)", () => {
  it("a ruling resolved via HANDLE_MEDIA_EVENT is no longer actionable anywhere", () => {
    const { world, ruling } = worldWithRuling();
    const heya = world.heyas.get("player-heya")!;

    // Sanity: unresolved ruling is actionable on both surfaces pre-resolution.
    const before = projectGovernanceDerived(world, heya);
    expect(before.unresolvedRulings.map((r) => r.id)).toContain(ruling.id);
    expect(before.pendingRulings.map((r) => r.id)).toContain(ruling.id);

    // The MediaPage path: HANDLE_MEDIA_EVENT → handleMediaEvent stamps
    // playerChoice only — never playerSeverity.
    const resolved = applyImpact(world, handleMediaEvent(world, ruling.id, "apologize"));
    const heyaAfter = resolved.heyas.get("player-heya")!;
    const after = projectGovernanceDerived(resolved, heyaAfter);

    expect(
      after.unresolvedRulings.map((r) => r.id),
      "resolved ruling must leave the overview surface (playerChoice-based)"
    ).not.toContain(ruling.id);
    expect(
      after.pendingRulings.map((r) => r.id),
      "resolved ruling must leave the rulings tab (playerSeverity-based) — " +
        "media resolution stamps only playerChoice, so this surface still " +
        "offers the player resolve actions on an already-resolved ruling"
    ).not.toContain(ruling.id);
  });

  it("CONTROL: a ruling resolved via ISSUE_RULING leaves both surfaces", () => {
    // Documents that the governance-page path is already healthy —
    // issueGovernanceRuling stamps playerChoice AND playerSeverity
    // (ScandalService.ts:244-245). This test is expected GREEN; the fix for
    // the media path should mirror this write shape.
    const { world, ruling } = worldWithRuling();
    const resolved = applyImpact(world, issueGovernanceRuling(world, ruling.id, "standard"));
    const after = projectGovernanceDerived(resolved, resolved.heyas.get("player-heya")!);

    expect(after.unresolvedRulings.map((r) => r.id)).not.toContain(ruling.id);
    expect(after.pendingRulings.map((r) => r.id)).not.toContain(ruling.id);
  });
});

describe("projectHeya — fabricated fields must reflect real world state (V18-S8-1)", () => {
  it("achievements.yushoCount reflects heya.historicalYusho", () => {
    const heya = MockFactory.createHeya("heya-1", { historicalYusho: 4 });
    const world = MockFactory.createWorld({ heyas: new Map([["heya-1", heya]]) });
    expect(
      projectHeya(heya, world).achievements.yushoCount,
      "yushoCount is hardcoded 0 — must come from heya.historicalYusho"
    ).toBe(4);
  });

  it("achievements.specialPrizeCount reflects roster sansho totals", () => {
    const r1 = MockFactory.createRikishi("r1", { heyaId: "heya-1" });
    r1.stats.achievements = {
      kinboshiEarned: 0,
      ginboshiEarned: 0,
      kinboshiConceded: 0,
      ginboshiConceded: 0,
      specialPrizes: { shukunSho: 1, kantoSho: 2, ginoSho: 1 },
      mochikyukinPoints: 0,
    };
    const heya = MockFactory.createHeya("heya-1", { rikishiIds: ["r1"] });
    const world = MockFactory.createWorld({
      heyas: new Map([["heya-1", heya]]),
      rikishi: new Map([["r1", r1]]),
    });
    expect(
      projectHeya(heya, world).achievements.specialPrizeCount,
      "specialPrizeCount is hardcoded 0 — must aggregate the stable's sansho (1+2+1)"
    ).toBe(4);
  });

  it("rivalStableIds reflects world.rivalriesState.heyaRivalryPairs", () => {
    const heyaA = MockFactory.createHeya("heya-a");
    const heyaB = MockFactory.createHeya("heya-b");
    const world = MockFactory.createWorld({
      heyas: new Map([
        ["heya-a", heyaA],
        ["heya-b", heyaB],
      ]),
      rivalriesState: {
        version: "1.0.0",
        pairs: {},
        heyaRivalryPairs: {
          "heya-a|heya-b": {
            id: "heya-a|heya-b",
            heyaAId: "heya-a",
            heyaBId: "heya-b",
            heat: 60,
            aWins: 2,
            bWins: 3,
          },
        },
      },
    });
    expect(
      projectHeya(heyaA, world).rivalStableIds,
      "rivalStableIds is a hardcoded [] — heya-b is a live rival per rivalriesState"
    ).toContain("heya-b");
    expect(projectHeya(heyaB, world).rivalStableIds).toContain("heya-a");
  });

  it("monthlyExpense reflects the heya's real computed burn, not a hardcoded 0", () => {
    const heya = MockFactory.createHeya("heya-1", {
      funds: 5_000_000,
      facilities: { training: 30, recovery: 20, nutrition: 15 },
      staffIds: ["s1", "s2"],
    });
    const world = MockFactory.createWorld({ heyas: new Map([["heya-1", heya]]) });

    const expectedMonthlyBurn = Math.round(
      calculateHeyaWeeklyFinances(heya, world).totalBurn * 4
    );
    expect(expectedMonthlyBurn, "fixture must carry real upkeep").toBeGreaterThan(0);
    expect(
      projectHeya(heya, world).monthlyExpense,
      "monthlyExpense is hardcoded 0 — must project the stable's actual monthly burn"
    ).toBe(expectedMonthlyBurn);
  });
});

describe("selectCohortSummaries — retired cohort members (V18-S8-3)", () => {
  const YEAR = 2050;

  function cohortWorld(): WorldState {
    // r-retired is 50 → checkRetirement fires "Mandatory Age Retirement"
    // deterministically; r-active is 20 → continues. Both entered via the
    // same recruitment cohort.
    const active = MockFactory.createRikishi("r-active", {
      heyaId: "h1",
      recruitmentCohortId: "2025-hatsu",
      division: "makuuchi",
      rank: "maegashira",
      rankNumber: 5,
      birthYear: 2030,
    });
    const retiree = MockFactory.createRikishi("r-retired", {
      heyaId: "h1",
      recruitmentCohortId: "2025-hatsu",
      division: "juryo",
      rank: "juryo",
      rankNumber: 10,
      birthYear: 2000,
      careerWins: 50,
    });
    return MockFactory.createWorld({
      year: YEAR,
      rikishi: new Map([
        ["r-active", active],
        ["r-retired", retiree],
      ]),
      heyas: new Map([
        ["h1", MockFactory.createHeya("h1", { rikishiIds: ["r-active", "r-retired"] })],
      ]),
      playerHeyaId: "h1",
    });
  }

  it("counts the retiree living in world.historicalRikishi as a cohort member", () => {
    const world = cohortWorld();
    // The canonical retirement path (every caller delegates here).
    const { impact } = processAllRetirements(world);
    const next = resolveImpacts(world, [impact]);

    // Controls: retirement really happened through the production path —
    // full record parked in historicalRikishi, id dropped from the active set.
    expect(next.activeRikishiIds.has("r-retired")).toBe(false);
    expect(next.historicalRikishi.has("r-retired")).toBe(true);

    const cohort = selectCohortSummaries(next).find((c) => c.cohortId === "2025-hatsu");
    expect(cohort, "the 2025-hatsu cohort still has a surviving member — it must appear").toBeDefined();
    expect(
      cohort!.totalMembers,
      "two rikishi entered via 2025-hatsu (one now retired) — the retiree is " +
        "dropped because getAllRikishi is active-only"
    ).toBe(2);
    expect(cohort!.activeMembers).toBe(1);
    expect(cohort!.retiredMembers).toBe(1);
  });

  it("keeps a cohort visible after its last member retires", () => {
    // Only member of 2024-kyushu retires — the cohort must not vanish
    // from HistoryDashboard.
    const retiree = MockFactory.createRikishi("r-last", {
      heyaId: "h1",
      recruitmentCohortId: "2024-kyushu",
      division: "juryo",
      rank: "juryo",
      birthYear: 2000,
      careerWins: 40,
    });
    const world = MockFactory.createWorld({
      year: YEAR,
      rikishi: new Map([["r-last", retiree]]),
      heyas: new Map([["h1", MockFactory.createHeya("h1", { rikishiIds: ["r-last"] })]]),
      playerHeyaId: "h1",
    });
    const next = resolveImpacts(world, [processAllRetirements(world).impact]);
    expect(next.historicalRikishi.has("r-last")).toBe(true);

    const cohort = selectCohortSummaries(next).find((c) => c.cohortId === "2024-kyushu");
    expect(
      cohort,
      "a fully-retired cohort must still be listed — its members live in " +
        "historicalRikishi, which the projection never reads"
    ).toBeDefined();
    expect(cohort!.totalMembers).toBe(1);
    expect(cohort!.retiredMembers).toBe(1);
  });
});

import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { processDramaTick, checkTriggeredDrama } from "@/engine/bard/dramaGenerator";
import { resolveNPCCrisis } from "@/engine/npc/handlers";
import { resolveCrisis } from "@/engine/governance/services/GovernanceService";
import { applyImpact } from "@/engine/core/ImpactResolver";
import { hasPendingCrisis } from "@/presenters/projections/crisisProjections";
import type { WorldState } from "@/engine/types/world";

/**
 * V18-S7-2 failing-first regression pins — player financial_insolvency is a dead end.
 *
 * Canonical player-crisis path (read of the UI + resolution code):
 *   - `useCrisisDetection` (src/hooks/useCrisisDetection.ts:62) reads ONLY
 *     `world.pendingCrisis` to open CrisisModal.
 *   - `shouldBlockTick` (src/engine/npc/decision/shouldHaltAdvance.ts:32, the
 *     gate `shouldHaltAdvance` delegates to) halts the sim on
 *     `world.pendingCrisis` — `heya.activeCrisis` is never checked.
 *   - CrisisModal → RESOLVE_CRISIS → `governance.resolveCrisis`
 *     (src/engine/governance/services/GovernanceService.ts:21) resolves via the
 *     weekly-crisis registry (`crisisRegistry.ts`) or `world.pendingCrisis`.
 *     `financial_insolvency` is NOT in the registry and its generated id never
 *     matches `world.pendingCrisis` — resolution is a silent no-op.
 *   - `heya.activeCrisis` is the NPC-autonomous surface: only the weekly NPC AI
 *     phase resolves it (phase01_week_npc_ai.ts:643 → resolveNPCCrisis), and it
 *     iterates `getNPCHeyas` which excludes `world.playerHeyaId`.
 *
 * So: `checkTriggeredDrama`/`triggerCrisis` writes the player's insolvency crisis
 * to `heya.activeCrisis`, where it is invisible, unhalting, and unresolvable.
 *
 * These pins encode the required vertical slice: the triggered crisis must be
 * visible through `world.pendingCrisis`, must resolve through `resolveCrisis`
 * with a real effect applied and all crisis state cleared, and `emergency_loan`
 * must record a real Loan entity (the option copy promises repayment at
 * "exorbitant interest rates") rather than granting free funds.
 */

function worldWithInsolventPlayer(): WorldState {
  const player = MockFactory.createHeya("player-heya", {
    funds: -1_000_000,
    riskIndicators: { financial: false, governance: false, rivalry: false },
  });
  return MockFactory.createWorld({
    playerHeyaId: "player-heya",
    heyas: new Map([["player-heya", player]]),
    week: 5,
    dayIndexGlobal: 40,
  });
}

describe("player financial_insolvency — canonical pendingCrisis path (V18-S7-2)", () => {
  it("an insolvency trigger on the player heya surfaces through world.pendingCrisis", () => {
    const world = worldWithInsolventPlayer();
    const triggered = applyImpact(world, processDramaTick(world));

    // The player-crisis gate used by CrisisModal (useCrisisDetection),
    // shouldHaltAdvance, and resolveCrisis. `heya.activeCrisis` is the NPC
    // surface — writing the player's crisis there leaves it invisible.
    expect(
      triggered.pendingCrisis,
      "player insolvency must surface via world.pendingCrisis — the only field " +
        "the CrisisModal gate, sim halt, and RESOLVE_CRISIS resolution all read"
    ).toBeDefined();
    expect(hasPendingCrisis(triggered)).toBe(true);
  });

  it("the triggered crisis resolves through resolveCrisis: effect applied, all crisis state cleared", () => {
    const world = worldWithInsolventPlayer();
    const triggered = applyImpact(world, checkTriggeredDrama(world));

    const stored =
      triggered.pendingCrisis ?? triggered.heyas.get("player-heya")?.activeCrisis;
    expect(stored, "trigger must produce a crisis object somewhere").toBeDefined();
    expect(stored!.type).toBe("financial_insolvency");

    // What CrisisModal dispatches: RESOLVE_CRISIS → governance.resolveCrisis.
    const resolved = applyImpact(
      triggered,
      resolveCrisis(triggered, stored!.id, "emergency_loan")
    );

    const heya = resolved.heyas.get("player-heya")!;
    expect(
      heya.funds,
      "emergency_loan's effect must actually run — ¥10,000,000 wired to the " +
        "player heya (resolveCrisis currently finds neither the registry entry " +
        "nor a pendingCrisis, so the choice is a silent no-op)"
    ).toBe(9_000_000);
    expect(resolved.pendingCrisis, "resolution must clear the world crisis gate").toBeUndefined();
    expect(
      heya.activeCrisis,
      "resolution must clear heya.activeCrisis — a stuck value re-triggers nothing " +
        "but blocks every future crisis for this heya forever"
    ).toBeUndefined();
  });

  it("emergency_loan records a real Loan entity on heya.activeLoans", () => {
    // resolveNPCCrisis is the only production path that currently resolves a
    // stored activeCrisis (weekly NPC AI sweep). A risk-taking oyakata picks
    // "emergency_loan" — whose copy reads "Borrow ¥10,000,000 from loan sharks
    // at exorbitant interest rates". A loan implies repayment: it must create
    // a Loan entry (principal + interest), not just inject free funds.
    const oyakata = MockFactory.createOyakata("oya-npc", {
      heyaId: "npc-heya",
      traits: { ambition: 50, patience: 50, risk: 80, tradition: 50, compassion: 50 },
    });
    const npc = MockFactory.createHeya("npc-heya", {
      oyakataId: "oya-npc",
      funds: -1_000_000,
    });
    const world = MockFactory.createWorld({
      playerHeyaId: "player-heya",
      heyas: new Map([
        ["npc-heya", npc],
        ["player-heya", MockFactory.createHeya("player-heya")],
      ]),
      oyakata: new Map([["oya-npc", oyakata]]),
      week: 5,
      dayIndexGlobal: 40,
    });

    const triggered = applyImpact(world, checkTriggeredDrama(world));
    const crisis = triggered.heyas.get("npc-heya")!.activeCrisis!;
    const resolved = applyImpact(triggered, resolveNPCCrisis(triggered, "npc-heya", crisis));

    const heya = resolved.heyas.get("npc-heya")!;
    // Guard that the intended option actually ran (funds land today — that part works).
    expect(heya.funds, "emergency_loan must add the borrowed principal to funds").toBe(9_000_000);

    const loans = heya.activeLoans ?? [];
    expect(
      loans.length,
      "the predatory loan must leave a repayable debt record on heya.activeLoans " +
        "(currently: +¥10M funds and NO loan entity — free money, no interest)"
    ).toBe(1);
    expect(loans[0]?.principal, "loan principal must equal the wired ¥10,000,000").toBe(10_000_000);
    expect(
      loans[0]?.interestRate ?? 0,
      "'exorbitant interest' promised by the option copy requires a positive rate"
    ).toBeGreaterThan(0);
  });
});

/**
 * execution.ts
 * ============
 * Executes the weekly NPC agent decisions (`AgentDecisions`) into real
 * world-state changes. This replaces the old log-only cosmetic layer —
 * every flag here produces a measurable StateImpact.
 *
 * Cooldowns are persisted on `OyakataMemory.lastExecutedAt` so the same
 * domain can't fire on consecutive ticks.
 */

import type { WorldState } from "../types/world";
import type { Id } from "../types/common";
import type { Heya } from "../types/heya";
import type { Oyakata } from "../types/oyakata";
import type { StateImpact } from "../core/StateImpact";
import type { AgentDecisions } from "./types";
import { createImpactBuilder } from "../core/ImpactBuilder";
import { getHeya, getRikishiAnywhere } from "../queries";
import { buyMyoseki } from "../myosekiMarket";
import { hireStaff } from "../staff";
import type { StaffRole } from "../types/staff";
import { buildYouthAcademy, upgradeYouthAcademy } from "../systems/recruitment/YouthAcademyService";
import {
  PoliticalFavorsService,
  POLITICAL_FAVORS,
} from "../systems/governance/PoliticalFavorsService";
import { narrativeEventMap } from "../bard/narrativeEventMap";
import { BardEngine } from "../bard/BardEngine";
import { rngForWorld } from "../rng";
import { getMemory } from "./MemoryStore";
import { issueBailoutLoanIfNeeded } from "../loans";
import { FACTION_BAILOUT_AMOUNT } from "../../constants/engine/economic";

/** Minimum weeks between executions of the same domain for one heya. */
const DOMAIN_COOLDOWN_WEEKS: Record<string, number> = {
  myoseki: 12,
  facilities: 8,
  scandal: 2,
  favor: 4,
  rivalry: 2,
  narrative: 4,
  staff: 8,
  academy: 12,
  rescue: 4,
};

/** Funds cost for a PR-driven scandal reduction when political capital is short. */
const SCANDAL_PR_COST = 5_000_000;
const SCANDAL_PR_REDUCTION = 8;

/** Funds cost for one facility level. */
const FACILITY_UPGRADE_COST = 20_000_000;
const FACILITY_MAX_LEVEL = 5;

/**
 * Minimum operating cash the AI must leave after any discretionary spend.
 * Sized at roughly one month of burn for a mid-size stable — prevents agent
 * spending from driving a heya to zero or below between weekly finance ticks.
 */
const MIN_OPERATING_RESERVE = 5_000_000;

const RIVALRY_HEAT_DELTA = 6;

/** Player-facing surface text per executed decision domain. */
const DOMAIN_SURFACE: Record<string, [string, string]> = {
  myoseki: ["economy", "Purchased a Myoseki stock"],
  facilities: ["economy", "Upgraded stable facilities"],
  scandal: ["governance", "Moved to reduce scandal pressure"],
  favor: ["governance", "Called in a political favor"],
  rivalry: ["rivalry", "Shifted posture toward a rival stable"],
  staff: ["strategy", "Hired new staff"],
  academy: ["recruitment", "Invested in the youth academy"],
  narrative: ["media", "Issued a public statement"],
  rescue: ["economy", "Sought emergency financial rescue"],
};

function currentWeek(world: WorldState): number {
  return world.calendar?.currentWeek ?? world.week ?? 0;
}

function onCooldown(memory: Oyakata["memory"], domain: string, week: number): boolean {
  const last = memory?.lastExecutedAt?.[domain];
  const cd = DOMAIN_COOLDOWN_WEEKS[domain] ?? 1;
  return last !== undefined && week - last < cd;
}

/** Spend-guarded facility upgrade — raises the weakest of the three tracks. */
function applyFacilityUpgrade(
  heya: Heya,
  heyaId: Id,
  canSpend: (cost: number) => boolean,
  builder: ReturnType<typeof createImpactBuilder>
): boolean {
  if (!canSpend(FACILITY_UPGRADE_COST)) return false;
  const facilities = { ...heya.facilities };
  const keys = ["training", "recovery", "nutrition"] as const;
  const target = keys
    .filter((k) => facilities[k] < FACILITY_MAX_LEVEL)
    .sort((a, b) => facilities[a] - facilities[b])[0];
  if (!target) return false;
  facilities[target] += 1;
  builder.updateHeya(heyaId, { facilities, funds: heya.funds - FACILITY_UPGRADE_COST });
  return true;
}

/** Finance: myoseki purchase honoring the agent's prioritized pick. */
function tryMyosekiPurchase(
  world: WorldState,
  heyaId: Id,
  decisions: AgentDecisions,
  oyakata: Oyakata,
  week: number,
  canSpend: (cost: number) => boolean,
  builder: ReturnType<typeof createImpactBuilder>
): boolean {
  if (!decisions.finance.shouldBuyMyoseki || onCooldown(oyakata.memory, "myoseki", week)) {
    return false;
  }
  const stocks = Object.values(world.myosekiMarket?.stocks ?? {})
    .filter(
      (s) =>
        s.status === "available" &&
        s.askingPrice !== undefined &&
        s.askingPrice > 0 &&
        canSpend(s.askingPrice)
    )
    .sort((a, b) => (a.askingPrice ?? 0) - (b.askingPrice ?? 0));
  // Honor the agent's prioritized pick when it is still available and
  // affordable; otherwise fall back to the cheapest eligible stock.
  const target = stocks.find((s) => s.id === decisions.finance.myosekiId) ?? stocks[0];
  if (target) {
    builder.merge(buyMyoseki(world, oyakata.id, heyaId, target.id));
    return true;
  }
  return false;
}

/** Governance: scandal reduction via political pardon or PR spend. */
function tryScandalReduction(
  world: WorldState,
  heyaId: Id,
  heya: Heya,
  decisions: AgentDecisions,
  oyakata: Oyakata,
  week: number,
  canSpend: (cost: number) => boolean,
  builder: ReturnType<typeof createImpactBuilder>
): boolean {
  if (
    !decisions.governance.shouldReduceScandal ||
    onCooldown(oyakata.memory, "scandal", week) ||
    (heya.scandalScore ?? 0) <= 0
  ) {
    return false;
  }
  const pardonCost = POLITICAL_FAVORS.find((f) => f.id === "governance_pardon")?.cost ?? Infinity;
  if ((heya.politicalCapital ?? 0) >= pardonCost) {
    builder.merge(PoliticalFavorsService.requestFavor(world, heyaId, "governance_pardon"));
  } else if (canSpend(SCANDAL_PR_COST)) {
    builder.updateHeya(heyaId, {
      scandalScore: Math.max(0, (heya.scandalScore ?? 0) - SCANDAL_PR_REDUCTION),
      funds: heya.funds - SCANDAL_PR_COST,
    });
  }
  return true;
}

/** Governance: political favor — pardon under scandal pressure, payout when
 *  tight on funds, otherwise matchmaking influence. */
function tryPoliticalFavor(
  world: WorldState,
  heyaId: Id,
  heya: Heya,
  decisions: AgentDecisions,
  oyakata: Oyakata,
  week: number,
  builder: ReturnType<typeof createImpactBuilder>
): boolean {
  if (!decisions.governance.shouldUsePoliticalFavor || onCooldown(oyakata.memory, "favor", week)) {
    return false;
  }
  const favorId =
    (heya.scandalScore ?? 0) > 15
      ? "governance_pardon"
      : heya.funds < SCANDAL_PR_COST
        ? "advance_payout"
        : "matchmaking_avoid";
  const impact = PoliticalFavorsService.requestFavor(world, heyaId, favorId);
  // Only count it as executed if the favor actually went through
  // (requestFavor returns an empty impact when capital is insufficient).
  const didApply =
    (impact.entities?.heyaUpdates?.size ?? 0) > 0 ||
    Object.keys(impact.worldFields ?? {}).length > 0;
  if (didApply) {
    builder.merge(impact);
    return true;
  }
  return false;
}

/** Rivalry: shift heat on the hottest heya rivalry involving this heya. */
function tryRivalryShift(
  world: WorldState,
  heyaId: Id,
  decisions: AgentDecisions,
  oyakata: Oyakata,
  week: number,
  builder: ReturnType<typeof createImpactBuilder>
): boolean {
  if (
    !(decisions.rivalry.escalateRivalry || decisions.rivalry.deescalateRivalry) ||
    onCooldown(oyakata.memory, "rivalry", week)
  ) {
    return false;
  }
  const delta = decisions.rivalry.escalateRivalry ? RIVALRY_HEAT_DELTA : -RIVALRY_HEAT_DELTA;
  const rivalriesState = world.rivalriesState;
  const heyaPairs = rivalriesState?.heyaRivalryPairs;
  if (!rivalriesState || !heyaPairs) return false;

  // Hottest heya rivalry involving this heya.
  const top = Object.values(heyaPairs)
    .filter((p) => p.heyaAId === heyaId || p.heyaBId === heyaId)
    .sort((a, b) => b.heat - a.heat)[0];
  if (!top) return false;

  const updated = {
    ...heyaPairs,
    [top.id]: { ...top, heat: Math.min(100, Math.max(0, top.heat + delta)) },
  };
  builder.updateWorldField("rivalriesState", {
    version: rivalriesState.version,
    pairs: rivalriesState.pairs,
    heyaRivalryPairs: updated,
  });
  builder.logEvent(
    "RIVAL_POSTURE",
    "ai_rival_posture",
    {
      heyaId,
      posture: delta > 0 ? "aggressive" : "conciliatory",
      rivalHeyaId: top.heyaAId === heyaId ? top.heyaBId : top.heyaAId,
      heat: updated[top.id].heat,
      vendetta: delta > 0 && decisions.rivalry.vendetta === true,
    },
    { heyaId, importance: "minor" }
  );
  return true;
}

/** Infrastructure: staff hires and youth-academy build/upgrade. */
function tryInfrastructure(
  world: WorldState,
  heyaId: Id,
  heya: Heya,
  decisions: AgentDecisions,
  oyakata: Oyakata,
  week: number,
  spendConstrained: boolean,
  executedDomains: string[],
  builder: ReturnType<typeof createImpactBuilder>
): void {
  const infra = decisions.infrastructure;
  if (!infra) return;

  // Staff hires and academy work are small discretionary spends — require
  // the heya to hold the full operating reserve before committing them.
  const hasReserveForSmallSpend = !spendConstrained && heya.funds >= MIN_OPERATING_RESERVE;
  if (
    infra.shouldHireStaff &&
    !onCooldown(oyakata.memory, "staff", week) &&
    hasReserveForSmallSpend
  ) {
    const impact = hireStaff(world, heyaId, (infra.staffRole ?? "scout") as StaffRole);
    if ((impact.collections?.staffToAdd?.length ?? 0) > 0) {
      builder.merge(impact);
      executedDomains.push("staff");
    }
  }

  const wantsAcademy = infra.shouldBuildAcademy || infra.shouldUpgradeAcademy;
  if (wantsAcademy && !onCooldown(oyakata.memory, "academy", week) && hasReserveForSmallSpend) {
    const hasAcademy = !!heya.youthAcademy;
    const impact = hasAcademy
      ? upgradeYouthAcademy(world, heyaId)
      : buildYouthAcademy(world, heyaId);
    if ((impact.entities?.heyaUpdates?.size ?? 0) > 0) {
      builder.merge(impact);
      executedDomains.push("academy");
    }
  }
}

/** Narrative: agent-triggered public event via the Bard event map. */
function tryNarrativeEvent(
  world: WorldState,
  heyaId: Id,
  heya: Heya,
  decisions: AgentDecisions,
  oyakata: Oyakata,
  week: number,
  builder: ReturnType<typeof createImpactBuilder>
): boolean {
  // WS6 — sanctioned/probation heyas keep low visibility: no public-facing
  // narrative pushes while under governance sanction (canon: sanctioned
  // stables suppress media activity until status restores).
  const lowVisibility =
    heya.governanceStatus === "sanctioned" || heya.governanceStatus === "probation";
  if (
    !decisions.narrative.shouldTriggerEvent ||
    !decisions.narrative.eventType ||
    lowVisibility ||
    onCooldown(oyakata.memory, "narrative", week)
  ) {
    return false;
  }
  const mapEntry = narrativeEventMap[decisions.narrative.eventType];
  // Every mapped template requires %SHIKONA% — without a resolved rikishi
  // the event would render [MISSING: SHIKONA]; skip rather than emit a
  // broken headline.
  const subject = decisions.narrative.rikishiId
    ? getRikishiAnywhere(world, decisions.narrative.rikishiId)
    : undefined;
  if (!mapEntry || !subject) return false;

  const rng = rngForWorld(
    world,
    "narrative",
    `npc-event-${decisions.narrative.eventType}-${heyaId}-${week}`
  );
  const ctx = {
    heya: heya.name,
    heyaId,
    shikona: subject.shikona,
    rikishiId: subject.id,
    SHIKONA: subject.shikona,
    HEYA: heya.name,
  };
  const titleRes = BardEngine.resolve(rng, mapEntry.titlePath, ctx);
  const summaryRes = BardEngine.resolve(rng, mapEntry.summaryPath, ctx);
  builder.logEvent(
    mapEntry.eventType,
    "narrative",
    { ...ctx, title: titleRes.text, summary: summaryRes.text },
    { heyaId, importance: mapEntry.importance }
  );
  return true;
}

/** Persist per-domain cooldowns and emit one NPC_MANAGER_DECISION event each. */
function persistCooldownsAndSurface(
  oyakata: Oyakata,
  heyaId: Id,
  week: number,
  executedDomains: string[],
  builder: ReturnType<typeof createImpactBuilder>
): void {
  if (executedDomains.length === 0) return;
  const memory = getMemory(oyakata, week);
  const lastExecutedAt = { ...(memory.lastExecutedAt ?? {}) };
  for (const d of executedDomains) lastExecutedAt[d] = week;
  builder.updateOyakata(oyakata.id, {
    memory: { ...memory, lastExecutedAt },
  });
  // One canonical decision event per executed domain — feeds the NPC agent
  // feed and keeps the NPC_MANAGER_DECISION audit contract.
  for (const d of executedDomains) {
    const [category, decision] = DOMAIN_SURFACE[d] ?? ["strategy", `Acted on ${d}`];
    builder.logEvent(
      "NPC_MANAGER_DECISION",
      "ai_decision",
      { heyaId, category, decision, domain: d, executed: true },
      { heyaId }
    );
  }
}

export function executeAgentDecisions(
  world: WorldState,
  heyaId: Id,
  decisions: AgentDecisions,
  oyakata: Oyakata
): StateImpact {
  const builder = createImpactBuilder("executeAgentDecisions");
  const heya = getHeya(world, heyaId);
  if (!heya) return builder.build();

  const week = currentWeek(world);
  const executedDomains: string[] = [];

  // Discretionary spending guard: never execute a spend that would push the
  // heya below the operating reserve or that fires while the runway band is
  // already critical/desperate.
  const spendConstrained = heya.runwayBand === "desperate" || heya.runwayBand === "critical";
  const canSpend = (cost: number) =>
    !spendConstrained && heya.funds - cost >= MIN_OPERATING_RESERVE;

  // ── Finance ────────────────────────────────────────────────────────────
  // WS5 — crisis rescue: a desperate stable proactively pursues its elected
  // rescue path instead of waiting for the basho-end governance review.
  if (decisions.finance.shouldSeekRescue && !onCooldown(oyakata.memory, "rescue", week)) {
    applyCrisisRescue(world, builder, heya, decisions.finance.rescueMenu ?? "bailout_loan");
    executedDomains.push("rescue");
  }

  if (tryMyosekiPurchase(world, heyaId, decisions, oyakata, week, canSpend, builder)) {
    executedDomains.push("myoseki");
  }

  if (
    decisions.finance.shouldInvestInFacilities &&
    !onCooldown(oyakata.memory, "facilities", week) &&
    applyFacilityUpgrade(heya, heyaId, canSpend, builder)
  ) {
    executedDomains.push("facilities");
  }

  // ── Governance ─────────────────────────────────────────────────────────
  if (tryScandalReduction(world, heyaId, heya, decisions, oyakata, week, canSpend, builder)) {
    executedDomains.push("scandal");
  }

  if (tryPoliticalFavor(world, heyaId, heya, decisions, oyakata, week, builder)) {
    executedDomains.push("favor");
  }

  // ── Rivalry ────────────────────────────────────────────────────────────
  if (tryRivalryShift(world, heyaId, decisions, oyakata, week, builder)) {
    executedDomains.push("rivalry");
  }

  // ── Infrastructure: staff + youth academy ──────────────────────────────
  tryInfrastructure(
    world,
    heyaId,
    heya,
    decisions,
    oyakata,
    week,
    spendConstrained,
    executedDomains,
    builder
  );

  // ── Recruitment policy handoff ─────────────────────────────────────────
  // Standing policy consumed by fillVacanciesForNPCWithBidding at both call
  // sites (weekly gap controller + monthly NPC tick).
  {
    const policies = { ...(world.npcBidPolicies ?? {}) };
    policies[heyaId] = {
      shouldBid: decisions.recruitment.shouldBid,
      maxBid: decisions.recruitment.maxBid,
      bidStrategy: decisions.recruitment.bidStrategy,
    };
    builder.updateWorldField("npcBidPolicies", policies);
  }

  // ── Narrative ──────────────────────────────────────────────────────────
  if (tryNarrativeEvent(world, heyaId, heya, decisions, oyakata, week, builder)) {
    executedDomains.push("narrative");
  }

  // ── Cooldown persistence + decision surfacing ──────────────────────────
  persistCooldownsAndSurface(oyakata, heyaId, week, executedDomains, builder);

  return builder.build();
}

/**
 * WS5 — apply a persona-chosen crisis rescue path (canon §14.8) through
 * canonical systems only:
 *   - bailout_loan    → issueBailoutLoanIfNeeded (real loan, real terms)
 *   - faction_appeal  → ichimon solidarity event + request for the
 *     basho-end benefactor path (marks the appeal; governance review
 *     resolves the actual gift)
 *   - sponsor_drive   → sponsor-seeking pressure: an immediate small cash
 *     injection representing an emergency koenkai drive, plus event.
 * All paths are deterministic; none grant free money without a trace.
 */
export function applyCrisisRescue(
  world: WorldState,
  builder: ReturnType<typeof createImpactBuilder>,
  heya: NonNullable<ReturnType<typeof getHeya>>,
  menu: "sponsor_drive" | "bailout_loan" | "faction_appeal"
): void {
  if (menu === "bailout_loan") {
    const loanImpact = issueBailoutLoanIfNeeded(world, heya.id);
    builder.merge(loanImpact);
    // Dead band: the formal loan only issues below LOAN_ISSUANCE_THRESHOLD
    // (-5M). A desperate stable in the [-5M, warn-line] band gets nothing,
    // which is how insolvency WARNs recurred yearly with no rescue. The NPC
    // rescue path exists precisely to catch stables before terminal debt, so
    // cover the gap with a scaled association bridge grant.
    const loanIssued = (loanImpact.entities?.heyaUpdates?.size ?? 0) > 0;
    if (!loanIssued) {
      const grant = Math.min(FACTION_BAILOUT_AMOUNT, Math.max(2_000_000, -heya.funds + 2_000_000));
      builder.updateHeya(heya.id, { funds: heya.funds + grant });
      builder.logEvent(
        "FINANCIAL_ALERT",
        "economy",
        {
          incident: "association_bridge_grant",
          heyaId: heya.id,
          money: grant,
          reason: "Association bridge grant covers the operating deficit.",
          status: heya.runwayBand,
        },
        { heyaId: heya.id, importance: "notable" }
      );
    }
    return;
  }
  if (menu === "faction_appeal") {
    // Ichimon benefactor support — a real injection, not just a press release.
    // Carries governance scrutiny (same terms as a supporter loan).
    builder.updateHeya(heya.id, {
      funds: heya.funds + FACTION_BAILOUT_AMOUNT,
      reputation: Math.max(0, (heya.reputation ?? 50) - 10),
      scandalScore: Math.min(100, (heya.scandalScore ?? 0) + 10),
    });
    builder.logEvent(
      "GOVERNANCE_RULING",
      "economy",
      {
        incident: "faction_appeal",
        heyaId: heya.id,
        heyaname: heya.name,
        money: FACTION_BAILOUT_AMOUNT,
        reason: "Stable appeals to its ichimon for emergency support.",
        status: heya.runwayBand,
      },
      { heyaId: heya.id, importance: "notable" }
    );
    return;
  }
  // sponsor_drive: emergency koenkai drive — a modest injection scaled to
  // existing koenkai strength, never exceeding one month of operating burn.
  const koenkaiMembers = world.sponsorPool?.koenkais.get(heya.id)?.members.length ?? 100;
  const boost = Math.min(2_000_000, Math.max(250_000, Math.floor(koenkaiMembers * 2000)));
  builder.updateHeya(heya.id, { funds: heya.funds + boost });
  builder.logEvent(
    "FINANCIAL_ALERT",
    "economy",
    {
      incident: "emergency_sponsor_drive",
      heyaId: heya.id,
      money: boost,
      reason: "Emergency supporter drive raises stopgap funds.",
      status: heya.runwayBand,
    },
    { heyaId: heya.id, importance: "notable" }
  );
}

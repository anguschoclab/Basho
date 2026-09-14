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
import type { Oyakata } from "../types/oyakata";
import type { StateImpact } from "../core/StateImpact";
import type { AgentDecisions } from "./types";
import { createImpactBuilder } from "../core/ImpactBuilder";
import { getHeya } from "../queries";
import { buyMyoseki } from "../myosekiMarket";
import { hireStaff } from "../staff";
import type { StaffRole } from "../types/staff";
import {
  buildYouthAcademy,
  upgradeYouthAcademy,
} from "../systems/recruitment/YouthAcademyService";
import { PoliticalFavorsService, POLITICAL_FAVORS } from "../systems/governance/PoliticalFavorsService";
import { narrativeEventMap } from "../bard/narrativeEventMap";
import { BardEngine } from "../bard/BardEngine";
import { rngForWorld } from "../rng";
import { getMemory } from "./MemoryStore";

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
};

/** Funds cost for a PR-driven scandal reduction when political capital is short. */
const SCANDAL_PR_COST = 5_000_000;
const SCANDAL_PR_REDUCTION = 8;

/** Funds cost for one facility level. */
const FACILITY_UPGRADE_COST = 20_000_000;
const FACILITY_MAX_LEVEL = 5;

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
};

function currentWeek(world: WorldState): number {
  return world.calendar?.currentWeek ?? world.week ?? 0;
}

function onCooldown(
  memory: Oyakata["memory"],
  domain: string,
  week: number
): boolean {
  const last = memory?.lastExecutedAt?.[domain];
  const cd = DOMAIN_COOLDOWN_WEEKS[domain] ?? 1;
  return last !== undefined && week - last < cd;
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

  // ── Finance ────────────────────────────────────────────────────────────
  if (decisions.finance.shouldBuyMyoseki && !onCooldown(oyakata.memory, "myoseki", week)) {
    const stocks = Object.values(world.myosekiMarket?.stocks ?? {})
      .filter(
        (s) =>
          s.status === "available" &&
          s.askingPrice !== undefined &&
          s.askingPrice > 0 &&
          s.askingPrice <= heya.funds
      )
      .sort((a, b) => (a.askingPrice ?? 0) - (b.askingPrice ?? 0));
    const target = stocks[0];
    if (target) {
      builder.merge(buyMyoseki(world, oyakata.id, heyaId, target.id));
      executedDomains.push("myoseki");
    }
  }

  if (
    decisions.finance.shouldInvestInFacilities &&
    !onCooldown(oyakata.memory, "facilities", week) &&
    heya.funds >= FACILITY_UPGRADE_COST
  ) {
    const facilities = { ...heya.facilities };
    const keys = ["training", "recovery", "nutrition"] as const;
    const target = keys
      .filter((k) => facilities[k] < FACILITY_MAX_LEVEL)
      .sort((a, b) => facilities[a] - facilities[b])[0];
    if (target) {
      facilities[target] += 1;
      builder.updateHeya(heyaId, {
        facilities,
        funds: heya.funds - FACILITY_UPGRADE_COST,
      });
      executedDomains.push("facilities");
    }
  }

  // ── Governance ─────────────────────────────────────────────────────────
  if (
    decisions.governance.shouldReduceScandal &&
    !onCooldown(oyakata.memory, "scandal", week) &&
    (heya.scandalScore ?? 0) > 0
  ) {
    const pardonCost =
      POLITICAL_FAVORS.find((f) => f.id === "governance_pardon")?.cost ?? Infinity;
    if ((heya.politicalCapital ?? 0) >= pardonCost) {
      builder.merge(PoliticalFavorsService.requestFavor(world, heyaId, "governance_pardon"));
    } else if (heya.funds >= SCANDAL_PR_COST) {
      builder.updateHeya(heyaId, {
        scandalScore: Math.max(0, (heya.scandalScore ?? 0) - SCANDAL_PR_REDUCTION),
        funds: heya.funds - SCANDAL_PR_COST,
      });
    }
    executedDomains.push("scandal");
  }

  if (
    decisions.governance.shouldUsePoliticalFavor &&
    !onCooldown(oyakata.memory, "favor", week)
  ) {
    // Pick the favor matching current pressure: scandal → pardon,
    // tight funds → advance, otherwise matchmaking influence.
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
      executedDomains.push("favor");
    }
  }

  // ── Rivalry ────────────────────────────────────────────────────────────
  if (
    (decisions.rivalry.escalateRivalry || decisions.rivalry.deescalateRivalry) &&
    !onCooldown(oyakata.memory, "rivalry", week)
  ) {
    const delta = decisions.rivalry.escalateRivalry ? RIVALRY_HEAT_DELTA : -RIVALRY_HEAT_DELTA;
    const rivalriesState = world.rivalriesState;
    const heyaPairs = rivalriesState?.heyaRivalryPairs;
    if (rivalriesState && heyaPairs) {
      // Hottest heya rivalry involving this heya.
      const top = Object.values(heyaPairs)
        .filter((p) => p.heyaAId === heyaId || p.heyaBId === heyaId)
        .sort((a, b) => b.heat - a.heat)[0];
      if (top) {
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
          },
          { heyaId, importance: "minor" }
        );
        executedDomains.push("rivalry");
      }
    }
  }

  // ── Infrastructure: staff + youth academy ──────────────────────────────
  const infra = decisions.infrastructure;
  if (infra) {
    if (infra.shouldHireStaff && !onCooldown(oyakata.memory, "staff", week)) {
      const impact = hireStaff(world, heyaId, (infra.staffRole ?? "scout") as StaffRole);
      if ((impact.collections?.staffToAdd?.length ?? 0) > 0) {
        builder.merge(impact);
        executedDomains.push("staff");
      }
    }

    const wantsAcademy = infra.shouldBuildAcademy || infra.shouldUpgradeAcademy;
    if (wantsAcademy && !onCooldown(oyakata.memory, "academy", week)) {
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
  if (
    decisions.narrative.shouldTriggerEvent &&
    decisions.narrative.eventType &&
    !onCooldown(oyakata.memory, "narrative", week)
  ) {
    const mapEntry = narrativeEventMap[decisions.narrative.eventType];
    if (mapEntry) {
      const rng = rngForWorld(
        world,
        "narrative",
        `npc-event-${decisions.narrative.eventType}-${heyaId}-${week}`
      );
      const rikishi = decisions.narrative.rikishiId
        ? world.rikishi.get(decisions.narrative.rikishiId)
        : undefined;
      const ctx = {
        heya: heya.name,
        heyaId,
        shikona: rikishi?.shikona,
        rikishiId: rikishi?.id,
      };
      const titleRes = BardEngine.resolve(rng, mapEntry.titlePath, ctx);
      const summaryRes = BardEngine.resolve(rng, mapEntry.summaryPath, ctx);
      builder.logEvent(
        mapEntry.eventType,
        "narrative",
        { ...ctx, title: titleRes.text, summary: summaryRes.text },
        { heyaId, importance: mapEntry.importance }
      );
      executedDomains.push("narrative");
    }
  }

  // ── Cooldown persistence + decision surfacing ──────────────────────────
  if (executedDomains.length > 0) {
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

  return builder.build();
}

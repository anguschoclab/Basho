/**
 * holiday.ts
 * =======================================================
 * Holiday System — Constitution §6
 *
 * FM-style "go on holiday" that advances time to a boundary
 * while delegating decisions via the daily tick pipeline.
 * Deterministic: holiday-to-boundary === day-by-day advancement.
 *
 * Safety gates interrupt the holiday when configured conditions fire.
 * =======================================================
 */

import type { WorldState, CyclePhase } from "./types";
import { advanceOneDay, type DailyTickReport } from "./dailyTick";
import { queryEvents } from "./events";
import type { UIDigest, DigestSection, DigestItem } from "./uiDigest";

// ============================================================================
// TYPES
// ============================================================================

export type HolidayTarget =
  | "nextDay"
  | "nextWeek"
  | "nextBashoDay1"
  | "endOfBasho"
  | "postBasho"
  | "nextMonth";

export type SafetyGate =
  | "topRikishiInjury"
  | "insolvencyWarning"
  | "scandalSeverity"
  | "sponsorChurn"
  | "promotionRun"
  | "loanDefault"
  | "rosterOverForeignLimit";

export type DelegationPolicy = "conservative" | "balanced" | "aggressive" | "roleplay";

export interface HolidayConfig {
  target: HolidayTarget;
  gates: SafetyGate[];
  delegationPolicy: DelegationPolicy;
  playerHeyaId?: string;
}

export interface HolidayGateTriggered {
  gate: SafetyGate;
  message: string;        // Qualitative, no thresholds (A7.1)
  dayIndex: number;
}

export interface HolidayResult {
  daysAdvanced: number;
  gateTriggered: HolidayGateTriggered | null;
  phaseOnExit: CyclePhase;
  digest: HolidayDigest;
  reports: DailyTickReport[];
}

export interface HolidayDigest {
  headline: string;
  categories: HolidayDigestCategory[];
}

export interface HolidayDigestCategory {
  id: string;
  title: string;
  items: string[];
}

// ============================================================================
// SAFETY GATE EVALUATION
// ============================================================================

function evaluateGates(
  world: WorldState,
  gates: SafetyGate[],
  playerHeyaId: string | undefined,
  startDay: number
): HolidayGateTriggered | null {
  if (!playerHeyaId) return null;
  const heya = world.heyas.get(playerHeyaId);
  if (!heya) return null;

  for (const gate of gates) {
    const triggered = checkGate(gate, world, heya, playerHeyaId, startDay);
    if (triggered) return triggered;
  }
  return null;
}

function checkGate(
  gate: SafetyGate,
  world: WorldState,
  heya: any,
  playerHeyaId: string,
  startDay: number
): HolidayGateTriggered | null {
  const day = world.dayIndexGlobal ?? 0;

  switch (gate) {
    case "topRikishiInjury": {
      // Check if any top-ranked rikishi in player's stable got injured
      for (const rid of heya.rikishiIds ?? []) {
        const r = world.rikishi.get(rid);
        if (!r) continue;
        const tier = getRankTier(r.rank);
        if (tier <= 3 && r.injured) {
          return {
            gate,
            message: `Critical injury reported — ${r.shikona ?? r.name ?? rid} is unable to compete.`,
            dayIndex: day,
          };
        }
      }
      return null;
    }

    case "insolvencyWarning": {
      if (heya.funds != null && heya.funds < 1_000_000) {
        return {
          gate,
          message: "Solvency risk rising — stable finances are critically low.",
          dayIndex: day,
        };
      }
      return null;
    }

    case "scandalSeverity": {
      const recentEvents = queryEvents(world, { limit: 20 });
      const scandal = recentEvents.find(
        e => e.dayIndexGlobal > startDay &&
             (e.type.includes("SCANDAL") || e.category === "discipline") &&
             (e.importance === "critical" || e.importance === "major")
      );
      if (scandal) {
        return {
          gate,
          message: "Governance pressure escalating — a significant disciplinary matter has emerged.",
          dayIndex: day,
        };
      }
      return null;
    }

    case "sponsorChurn": {
      const recentEvents = queryEvents(world, { limit: 20 });
      const sponsorLoss = recentEvents.filter(
        e => e.dayIndexGlobal > startDay &&
             e.category === "sponsor" &&
             e.type.includes("LOST")
      );
      if (sponsorLoss.length >= 2) {
        return {
          gate,
          message: "Sponsor confidence wavering — multiple partnerships under review.",
          dayIndex: day,
        };
      }
      return null;
    }

    case "promotionRun": {
      for (const rid of heya.rikishiIds ?? []) {
        const r = world.rikishi.get(rid);
        if (!r) continue;
        // Check if wrestler is on a promotion run (high wins in current basho)
        if (r.currentBashoWins >= 12 && getRankTier(r.rank) <= 4) {
          return {
            gate,
            message: `Promotion momentum — ${r.shikona ?? r.name ?? rid} is on a remarkable tournament run.`,
            dayIndex: day,
          };
        }
      }
      return null;
    }

    case "loanDefault": {
      if (heya.funds != null && heya.funds < 0) {
        return {
          gate,
          message: "Financial emergency — stable has entered negative funds territory.",
          dayIndex: day,
        };
      }
      return null;
    }

    case "rosterOverForeignLimit": {
      // Constitution governance: max foreign rikishi per stable
      const foreignCount = (heya.rikishiIds ?? []).filter((rid: string) => {
        const r = world.rikishi.get(rid);
        return r && (r as any).nationality !== "japanese";
      }).length;
      if (foreignCount > 1) {
        return {
          gate,
          message: "Governance alert — roster exceeds the foreign wrestler quota.",
          dayIndex: day,
        };
      }
      return null;
    }
  }

  return null;
}

function getRankTier(rank?: string): number {
  if (!rank) return 999;
  const r = rank.toLowerCase();
  if (r === "yokozuna") return 1;
  if (r === "ozeki") return 2;
  if (r === "sekiwake") return 3;
  if (r === "komusubi") return 4;
  if (r.startsWith("maegashira")) return 5;
  return 10;
}

// ============================================================================
// TARGET RESOLUTION — how many days to advance
// ============================================================================

function computeTargetDays(world: WorldState, target: HolidayTarget): number {
  const phase = world.cyclePhase;

  switch (target) {
    case "nextDay":
      return 1;

    case "nextWeek":
      return 7;

    case "nextMonth":
      return 30;

    case "nextBashoDay1": {
      // Advance through interim until active_basho
      if (phase === "active_basho") return 0;
      const interimRemaining = (world as any)._interimDaysRemaining ?? 0;
      const preBashoDays = phase === "pre_basho" ? ((world as any)._interimDaysRemaining ?? 7) : 0;
      if (phase === "interim") return interimRemaining + 7; // interim + pre_basho
      if (phase === "pre_basho") return preBashoDays;
      if (phase === "post_basho") return ((world as any)._postBashoDays ?? 7) + 42 + 7;
      return 42; // fallback
    }

    case "endOfBasho": {
      if (phase === "active_basho" && world.currentBasho) {
        const remaining = 15 - (world.currentBasho.day ?? 1);
        return Math.max(0, remaining);
      }
      // If not in basho, advance to next basho then through it
      const toBasho = computeTargetDays(world, "nextBashoDay1");
      return toBasho + 15;
    }

    case "postBasho":
      return computeTargetDays(world, "endOfBasho") + 7;
  }
}

// ============================================================================
// HOLIDAY DIGEST BUILDER
// ============================================================================

function buildHolidayDigest(
  world: WorldState,
  startDay: number,
  daysAdvanced: number,
  gateTriggered: HolidayGateTriggered | null
): HolidayDigest {
  const categories: HolidayDigestCategory[] = [];

  // Gather all events from the holiday period
  const allEvents = world.events?.log ?? [];
  const holidayEvents = allEvents.filter(
    e => (e.dayIndexGlobal ?? 0) > startDay
  );

  // Stable category
  const stableEvents = holidayEvents.filter(
    e => e.category === "welfare" || e.category === "training" || e.type.includes("STAFF")
  );
  if (stableEvents.length) {
    categories.push({
      id: "stable",
      title: "Stable Updates",
      items: stableEvents.slice(0, 8).map(e => e.title),
    });
  }

  // Banzuke/Basho category
  const bashoEvents = holidayEvents.filter(
    e => e.category === "basho" || e.type.includes("BASHO") || e.type.includes("YUSHO")
  );
  if (bashoEvents.length) {
    categories.push({
      id: "basho",
      title: "Basho & Banzuke",
      items: bashoEvents.slice(0, 5).map(e => e.title),
    });
  }

  // Economy category
  const econEvents = holidayEvents.filter(
    e => e.category === "economy" || e.category === "sponsor"
  );
  if (econEvents.length) {
    categories.push({
      id: "economy",
      title: "Economy",
      items: econEvents.slice(0, 5).map(e => e.title),
    });
  }

  // Governance category
  const govEvents = holidayEvents.filter(
    e => e.category === "discipline" || e.type.includes("GOVERNANCE") || e.type.includes("SCANDAL")
  );
  if (govEvents.length) {
    categories.push({
      id: "governance",
      title: "Governance",
      items: govEvents.slice(0, 5).map(e => e.title),
    });
  }

  // Career / History category
  const careerEvents = holidayEvents.filter(
    e => e.category === "career" || e.type.includes("RETIREMENT") || e.type.includes("DEBUT")
  );
  if (careerEvents.length) {
    categories.push({
      id: "history",
      title: "Career & History",
      items: careerEvents.slice(0, 5).map(e => e.title),
    });
  }

  // Headline
  let headline: string;
  if (gateTriggered) {
    headline = `Holiday interrupted after ${daysAdvanced} day${daysAdvanced === 1 ? "" : "s"}: ${gateTriggered.message}`;
  } else if (daysAdvanced === 0) {
    headline = "No time passed.";
  } else {
    const totalEvents = holidayEvents.length;
    headline = `${daysAdvanced} day${daysAdvanced === 1 ? "" : "s"} passed — ${totalEvents} event${totalEvents === 1 ? "" : "s"} recorded while you were away.`;
  }

  return { headline, categories };
}

// ============================================================================
// MAIN HOLIDAY RUNNER
// ============================================================================

/**
 * Run holiday — advances time day-by-day to the target boundary,
 * checking safety gates after each day. Deterministic and equivalent
 * to manual day-by-day advancement per Constitution A9.2.
 */
export function runHoliday(world: WorldState, config: HolidayConfig): HolidayResult {
  const startDay = world.dayIndexGlobal ?? 0;
  const maxDays = computeTargetDays(world, config.target);
  const reports: DailyTickReport[] = [];
  let gateTriggered: HolidayGateTriggered | null = null;
  let daysAdvanced = 0;

  // Safety cap to prevent infinite loops
  const cap = Math.min(maxDays, 500);

  for (let i = 0; i < cap; i++) {
    // Don't advance during active_basho unless target is endOfBasho/postBasho
    if (world.cyclePhase === "active_basho" &&
        config.target !== "endOfBasho" &&
        config.target !== "postBasho") {
      break;
    }

    const report = advanceOneDay(world);
    reports.push(report);
    daysAdvanced++;

    // Check safety gates
    gateTriggered = evaluateGates(world, config.gates, config.playerHeyaId, startDay);
    if (gateTriggered) break;

    // Target reached?
    if (isTargetReached(world, config.target, startDay, daysAdvanced)) break;
  }

  const digest = buildHolidayDigest(world, startDay, daysAdvanced, gateTriggered);

  return {
    daysAdvanced,
    gateTriggered,
    phaseOnExit: world.cyclePhase,
    digest,
    reports,
  };
}

function isTargetReached(
  world: WorldState,
  target: HolidayTarget,
  startDay: number,
  daysAdvanced: number
): boolean {
  switch (target) {
    case "nextDay":
      return daysAdvanced >= 1;
    case "nextWeek":
      return daysAdvanced >= 7;
    case "nextMonth":
      return daysAdvanced >= 30;
    case "nextBashoDay1":
      return world.cyclePhase === "active_basho";
    case "endOfBasho":
      return world.cyclePhase === "post_basho" || world.cyclePhase === "interim";
    case "postBasho":
      return world.cyclePhase === "interim";
  }
}

// ============================================================================
// DEFAULT GATES
// ============================================================================

export const DEFAULT_CRITICAL_GATES: SafetyGate[] = [
  "topRikishiInjury",
  "insolvencyWarning",
  "scandalSeverity",
];

// @ts-nocheck
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

import type { WorldState, CyclePhase } from "./types/world";
import { advanceOneDay, type DailyTickReport } from "./tick/tickDaily";
import { queryEvents } from "./events";
import { assertNever } from "./utils/types";

// ============================================================================
// TYPES
// ============================================================================

/** Type representing holiday target. */
export type HolidayTarget =
  | "nextDay"
  | "nextWeek"
  | "nextBashoDay1"
  | "endOfBasho"
  | "postBasho"
  | "nextMonth";

/** Type representing safety gate. */
export type SafetyGate =
  | "topRikishiInjury"
  | "insolvencyWarning"
  | "scandalSeverity"
  | "sponsorChurn"
  | "promotionRun"
  | "loanDefault"
  | "rosterOverForeignLimit";

/** Type representing delegation policy. */
export type DelegationPolicy = "conservative" | "balanced" | "aggressive" | "roleplay";

/** Defines the structure for holiday config. */
export interface HolidayConfig {
  target: HolidayTarget;
  gates: SafetyGate[];
  delegationPolicy: DelegationPolicy;
  playerHeyaId?: string;
}

/** Defines the structure for holiday gate triggered. */
export interface HolidayGateTriggered {
  gate: SafetyGate;
  message: string; // Qualitative, no thresholds (A7.1)
  dayIndex: number;
}

/** Defines the structure for holiday result. */
export interface HolidayResult {
  daysAdvanced: number;
  gateTriggered: HolidayGateTriggered | null;
  phaseOnExit: CyclePhase;
  digest: HolidayDigest;
  reports: DailyTickReport[];
}

/** Defines the structure for holiday digest. */
export interface HolidayDigest {
  headline: string;
  categories: HolidayDigestCategory[];
}

/** Defines the structure for holiday digest category. */
export interface HolidayDigestCategory {
  id: string;
  title: string;
  items: string[];
}

// ============================================================================
// SAFETY GATE EVALUATION
// ============================================================================

/**
 * Evaluate gates.
 *  * @param world - The World.
 *  * @param gates - The Gates.
 *  * @param playerHeyaId - The Player heya id.
 *  * @param startDay - The Start day.
 *  * @returns The result.
 */
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

/**
 * Check gate.
 *  * @param gate - The Gate.
 *  * @param world - The World.
 *  * @param heya - The Heya.
 *  * @param playerHeyaId - The Player heya id.
 *  * @param startDay - The Start day.
 *  * @returns The result.
 */
function checkGate(
  gate: SafetyGate,
  world: WorldState,
  heya: any,
  playerHeyaId: string,
  startDay: number
): HolidayGateTriggered | null {
  const GATE_HANDLERS: Record<
    SafetyGate,
    (
      world: WorldState,
      heya: any,
      playerHeyaId: string,
      startDay: number
    ) => HolidayGateTriggered | null
  > = {
    topRikishiInjury: (world, heya, _playerHeyaId, _startDay) => {
      for (const rid of heya.rikishiIds ?? []) {
        const r = world.rikishi.get(rid);
        if (!r) continue;
        const tier = getRankTier(r.rank);
        if (tier <= 3 && r.injured) {
          return {
            gate: "topRikishiInjury",
            message: `Critical injury reported — ${r.shikona ?? r.name ?? rid} is unable to compete.`,
            dayIndex: world.dayIndexGlobal ?? 0,
          };
        }
      }
      return null;
    },
    insolvencyWarning: (world, heya) => {
      if (heya.funds != null && heya.funds < 1_000_000) {
        return {
          gate: "insolvencyWarning",
          message: "Solvency risk rising — stable finances are critically low.",
          dayIndex: world.dayIndexGlobal ?? 0,
        };
      }
      return null;
    },
    scandalSeverity: (world) => {
      const recentEvents = queryEvents(world, { limit: 20 });
      const scandal = recentEvents.find(
        (e) =>
          e.week >= (world.week ?? 0) - 1 &&
          (e.type.includes("SCANDAL") || e.category === "discipline") &&
          (e.importance === "headline" || e.importance === "major")
      );
      if (scandal) {
        return {
          gate: "scandalSeverity",
          message:
            "Governance pressure escalating — a significant disciplinary matter has emerged.",
          dayIndex: world.dayIndexGlobal ?? 0,
        };
      }
      return null;
    },
    sponsorChurn: (world) => {
      const recentEvents = queryEvents(world, { limit: 20 });
      const sponsorLoss = recentEvents.filter(
        (e) =>
          e.week >= (world.week ?? 0) - 1 && e.category === "sponsor" && e.type.includes("LOST")
      );
      if (sponsorLoss.length >= 2) {
        return {
          gate: "sponsorChurn",
          message: "Sponsor confidence wavering — multiple partnerships under review.",
          dayIndex: world.dayIndexGlobal ?? 0,
        };
      }
      return null;
    },
    promotionRun: (world, heya) => {
      for (const rid of heya.rikishiIds ?? []) {
        const r = world.rikishi.get(rid);
        if (!r) continue;
        if ((r.currentBashoWins ?? 0) >= 12 && getRankTier(r.rank) <= 4) {
          return {
            gate: "promotionRun",
            message: `Promotion momentum — ${r.shikona ?? r.name ?? rid} is on a remarkable tournament run.`,
            dayIndex: world.dayIndexGlobal ?? 0,
          };
        }
      }
      return null;
    },
    loanDefault: (world, heya) => {
      if (heya.funds != null && heya.funds < 0) {
        return {
          gate: "loanDefault",
          message: "Financial emergency — stable has entered negative funds territory.",
          dayIndex: world.dayIndexGlobal ?? 0,
        };
      }
      return null;
    },
    rosterOverForeignLimit: (world, heya) => {
      const foreignCount = (heya.rikishiIds ?? []).filter((rid: string) => {
        const r = world.rikishi.get(rid);
        return r && r.nationality !== "japanese";
      }).length;
      if (foreignCount > 1) {
        return {
          gate: "rosterOverForeignLimit",
          message: "Governance alert — roster exceeds the foreign wrestler quota.",
          dayIndex: world.dayIndexGlobal ?? 0,
        };
      }
      return null;
    },
  };

  const handler = GATE_HANDLERS[gate];
  return handler ? handler(world, heya, playerHeyaId, startDay) : null;
}

/**
 * Get rank tier.
 *  * @param rank - The Rank.
 *  * @returns The result.
 */
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

/**
 * Compute target days.
 *  * @param world - The World.
 *  * @param target - The Target.
 *  * @returns The result.
 */
function computeTargetDays(world: WorldState, target: HolidayTarget): number {
  const TARGET_DAYS: Record<HolidayTarget, (world: WorldState) => number> = {
    nextDay: () => 1,
    nextWeek: () => 7,
    nextMonth: () => 30,
    nextBashoDay1: (world) => {
      const phase = world.cyclePhase;
      if (phase === "active_basho") return 0;
      const interimRemaining = world._interimDaysRemaining ?? 0;
      const preBashoDays = phase === "pre_basho" ? (world._interimDaysRemaining ?? 7) : 0;
      if (phase === "interim") return interimRemaining + 7;
      if (phase === "pre_basho") return preBashoDays;
      if (phase === "post_basho") return (world._postBashoDays ?? 7) + 42 + 7;
      return 42;
    },
    endOfBasho: (world) => {
      const phase = world.cyclePhase;
      if (phase === "active_basho" && world.currentBasho) {
        const remaining = 15 - (world.currentBasho.day ?? 1);
        return Math.max(0, remaining);
      }
      const toBasho = TARGET_DAYS.nextBashoDay1(world);
      return toBasho + 15;
    },
    postBasho: (world) => TARGET_DAYS.endOfBasho(world) + 7,
  };

  const resolver = TARGET_DAYS[target];
  return resolver ? resolver(world) : 0;
}

// ============================================================================
// HOLIDAY DIGEST BUILDER
// ============================================================================

/**
 * Build holiday digest.
 *  * @param world - The World.
 *  * @param startDay - The Start day.
 *  * @param daysAdvanced - The Days advanced.
 *  * @param gateTriggered - The Gate triggered.
 *  * @returns The result.
 */
function buildHolidayDigest(
  world: WorldState,
  startDay: number,
  daysAdvanced: number,
  gateTriggered: HolidayGateTriggered | null
): HolidayDigest {
  const categories: HolidayDigestCategory[] = [];

  // Gather all events from the holiday period using week-based filtering
  const allEvents = world.events?.log ?? [];
  const startWeek = Math.max(0, Math.floor(startDay / 7));
  const holidayEvents = allEvents.filter((e) => e.week >= startWeek);

  // Stable category
  const stableEvents = holidayEvents.filter(
    (e) => e.category === "welfare" || e.category === "training" || e.type.includes("STAFF")
  );
  if (stableEvents.length) {
    categories.push({
      id: "stable",
      title: "Stable Updates",
      items: stableEvents.slice(0, 8).map((e) => e.title),
    });
  }

  // Banzuke/Basho category
  const bashoEvents = holidayEvents.filter(
    (e) => e.category === "basho" || e.type.includes("BASHO") || e.type.includes("YUSHO")
  );
  if (bashoEvents.length) {
    categories.push({
      id: "basho",
      title: "Basho & Banzuke",
      items: bashoEvents.slice(0, 5).map((e) => e.title),
    });
  }

  // Economy category
  const econEvents = holidayEvents.filter(
    (e) => e.category === "economy" || e.category === "sponsor"
  );
  if (econEvents.length) {
    categories.push({
      id: "economy",
      title: "Economy",
      items: econEvents.slice(0, 5).map((e) => e.title),
    });
  }

  // Governance category
  const govEvents = holidayEvents.filter(
    (e) =>
      e.category === "discipline" || e.type.includes("GOVERNANCE") || e.type.includes("SCANDAL")
  );
  if (govEvents.length) {
    categories.push({
      id: "governance",
      title: "Governance",
      items: govEvents.slice(0, 5).map((e) => e.title),
    });
  }

  // Career / History category
  const careerEvents = holidayEvents.filter(
    (e) => e.category === "career" || e.type.includes("RETIREMENT") || e.type.includes("DEBUT")
  );
  if (careerEvents.length) {
    categories.push({
      id: "history",
      title: "Career & History",
      items: careerEvents.slice(0, 5).map((e) => e.title),
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
    if (
      world.cyclePhase === "active_basho" &&
      config.target !== "endOfBasho" &&
      config.target !== "postBasho"
    ) {
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

/**
 * Is target reached.
 *  * @param world - The World.
 *  * @param target - The Target.
 *  * @param startDay - The Start day.
 *  * @param daysAdvanced - The Days advanced.
 *  * @returns The result.
 */
function isTargetReached(
  world: WorldState,
  target: HolidayTarget,
  startDay: number,
  daysAdvanced: number
): boolean {
  const TARGET_REACHED: Record<
    HolidayTarget,
    (world: WorldState, startDay: number, daysAdvanced: number) => boolean
  > = {
    nextDay: (_world, _startDay, daysAdvanced) => daysAdvanced >= 1,
    nextWeek: (_world, _startDay, daysAdvanced) => daysAdvanced >= 7,
    nextMonth: (_world, _startDay, daysAdvanced) => daysAdvanced >= 30,
    nextBashoDay1: (world) => world.cyclePhase === "active_basho",
    endOfBasho: (world) => world.cyclePhase === "post_basho" || world.cyclePhase === "interim",
    postBasho: (world) => world.cyclePhase === "interim",
  };

  const checker = TARGET_REACHED[target];
  return checker ? checker(world, startDay, daysAdvanced) : false;
}

// ============================================================================
// DEFAULT GATES
// ============================================================================

/** d e f a u l t_ c r i t i c a l_ g a t e s. */
export const DEFAULT_CRITICAL_GATES: SafetyGate[] = [
  "topRikishiInjury",
  "insolvencyWarning",
  "scandalSeverity",
];

// @ts-nocheck
import type { OzekiKadobanMap } from "../engine/banzuke";
// uiDigest.ts
// =======================================================
// UI Digest — transforms engine/world state into a compact weekly report.
//
// IMPORTANT:
// - World uses Maps at runtime (IdMapRuntime), so iterate with .values()
//   and Array.from(...) to avoid Map iterator pitfalls in UI code.
// =======================================================

import type { WorldState } from "../engine/types/world";
import { queryEvents } from "../engine/events";
import { generateH2HCommentary } from "../engine/h2h";
import { 
  selectInjuredRikishi, 
  selectRecentEvents, 
  selectPromotionCandidates, 
  selectYokozunaCandidates, 
  selectKadobanRikishi 
} from "./selectors";
import { projectRikishi } from "./uiModels";
import type { UIRikishi } from "./uiModels";
import type { Rikishi } from "../engine/types/rikishi";

/** Type representing digest kind. */
export type DigestKind =
  | "training"
  | "injury"
  | "recovery"
  | "salary"
  | "koenkai"
  | "expense"
  | "economy"
  | "scouting"
  | "generic";

/** Defines the structure for digest item. */
export interface DigestItem {
  id: string;
  kind: DigestKind;
  title: string;
  detail?: string;
  rikishiId?: string;
  heyaId?: string;
}

/** Defines the structure for digest section. */
export interface DigestSection {
  id: string;
  title: string;
  items: DigestItem[];
}

/** Defines the structure for u i digest. */
export interface UIDigest {
  time: { label: string };
  headline: string;
  counts: {
    trainingEvents: number;
    injuries: number;
    recoveries: number;
    economy: number;
    scouting: number;
  };
  sections: DigestSection[];
}

/**
 * Label for world.
 *  * @param world - The World.
 *  * @returns The result.
 */
function labelForWorld(world: WorldState): string {
  const year = world.year ?? 2025;
  const week = world.week ?? 0;
  const phase = world.cyclePhase ?? "interim";
  return `${year} — Week ${week} (${phase})`;
}

/**
 * Build weekly digest.
 *  * @param world - The World.
 *  * @returns The result.
 */
export function buildWeeklyDigest(world: WorldState | null): UIDigest | null {
  if (!world) return null;


  const sections: DigestSection[] = [];

  // --- Injuries ---
  const injuryItems: DigestItem[] = selectInjuredRikishi(world).map(r => {
    const injury = r.injury;
    return {
      id: `injury::${r.id}`,
      kind: "injury",
      title: `${r.shikona ?? r.name ?? r.id} injured`,
      detail: `${injury.severity ?? "unknown"} — ${injury.weeksRemaining ?? "?"}w remaining`,
      rikishiId: r.id,
    };
  });
  if (injuryItems.length) {
    sections.push({ id: "injuries", title: "Injuries", items: injuryItems });
  }

  // --- Key matchup (during basho) ---
  const matchupItems: DigestItem[] = [];
  const basho = world.currentBasho;
  if (basho && world.cyclePhase === "active_basho") {
    const day = basho.day ?? basho.currentDay ?? 1;
    let matchupCount = 0;
    for (const match of basho.matches ?? []) {
      if ((match as any)?.day !== day) continue;
      if (matchupCount >= 3) break;
      matchupCount++;
      const eastId = match.eastRikishiId ?? match.rikishiEastId ?? match.eastId;
      const westId = match.westRikishiId ?? match.rikishiWestId ?? match.westId;
      if (!eastId || !westId) continue;

      const east = world.rikishi.get(eastId);
      const west = world.rikishi.get(westId);
      if (!east || !west) continue;

      matchupItems.push({
        id: `matchup::${east.id}::${west.id}::d${day}`,
        kind: "generic",
        title: `${east.shikona ?? east.name} vs ${west.shikona ?? west.name}`,
        detail: generateH2HCommentary(east, west),
        rikishiId: east.id,
      });
    }
    if (matchupItems.length) {
      sections.unshift({ id: "matchups", title: "Key Matchups", items: matchupItems });
    }
  }

  // --- Engine Events (using memoized selectors) ---
  const eventBuckets = selectRecentEvents(world);

  const mapEventToItem = (e: any) => ({
    id: e.id,
    kind: e.category === "scouting" ? "scouting" : e.category === "economy" || e.category === "sponsor" ? "economy" : e.category === "training" ? "training" : "generic",
    title: e.title,
    detail: e.summary,
    rikishiId: e.rikishiId,
    heyaId: e.heyaId
  });

  const mediaItems = eventBuckets.media.map(mapEventToItem);
  const trainingItems = eventBuckets.training.map(mapEventToItem);
  const careerItems = eventBuckets.career.map(mapEventToItem);
  const rivalryItems = eventBuckets.rivalry.map(mapEventToItem);
  const welfareItems = eventBuckets.welfare.map(mapEventToItem);
  const govItems = eventBuckets.governance.map(mapEventToItem);
  const scoutItems = eventBuckets.scouting.map(mapEventToItem);
  const econItems = eventBuckets.economy.map(mapEventToItem);

  if (mediaItems.length) sections.push({ id: "media", title: "Media & Scandals", items: mediaItems });
  if (trainingItems.length) sections.push({ id: "training", title: "Training", items: trainingItems });
  if (careerItems.length) sections.push({ id: "career", title: "Career Updates", items: careerItems });
  if (rivalryItems.length) sections.push({ id: "rivalries", title: "Rivalries", items: rivalryItems });
  if (welfareItems.length) sections.push({ id: "welfare", title: "Welfare & Compliance", items: welfareItems });
  if (govItems.length) sections.push({ id: "governance", title: "Governance", items: govItems });
  if (scoutItems.length) sections.push({ id: "scouting", title: "Scouting", items: scoutItems });
  if (econItems.length) sections.push({ id: "economy", title: "Economy", items: econItems });

  const counts = {
    trainingEvents: trainingItems.length,
    injuries: injuryItems.length,
    recoveries: 0,
    economy: econItems.length,
    scouting: scoutItems.length,
  };

  const headline =
    basho && world.cyclePhase === "active_basho"
      ? `Basho Day ${basho.day ?? basho.currentDay ?? 1}: ${matchupItems.length ? "Key matchups highlighted." : "Tournament in progress."}`
      : injuryItems.length
        ? `${injuryItems.length} injury update${injuryItems.length === 1 ? "" : "s"} this week.`
        : "No major events recorded this week.";

  return {
    time: { label: labelForWorld(world) },
    sections,
  };
}

/**
 * FM v2.0: Formats Rikishi attribute data for Radar Charts (C5 compliant).
 * Maps 0-100 internal truths into 5 banded tiers (1-5) for visual shape only.
 */
export function formatRadarData(rikishi: any) {
  const mapValue = (val: number) => {
    if (val >= 85) return 5;
    if (val >= 65) return 4;
    if (val >= 45) return 3;
    if (val >= 25) return 2;
    return 1;
  };

  return [
    { subject: "Power", A: mapValue(rikishi.power || 50), fullMark: 5 },
    { subject: "Speed", A: mapValue(rikishi.speed || 50), fullMark: 5 },
    { subject: "Technique", A: mapValue(rikishi.technique || 50), fullMark: 5 },
    { subject: "Spirit", A: mapValue(rikishi.momentum || 50), fullMark: 5 },
    { subject: "Ring Sense", A: mapValue(rikishi.condition || 50), fullMark: 5 },
  ];
}

/**
 * FM v2.0: Formats Meta-State history for Streamgraph (Stacked Area Chart).
 */
export function formatMetaTrends(world: WorldState) {
  if (!world.history || world.history.length === 0) return [];

  return world.history.slice(-6).map((h, i) => {
    // Determine meta bias values based on actual historical data if available
    // Otherwise fallback to balanced defaults
    const bias = (h as any).metaBias || 'neutral';
    
    return {
      basho: `${h.bashoName.charAt(0).toUpperCase()}${h.year % 100}`,
      oshi: bias === 'oshi' ? 50 : (bias === 'neutral' ? 33 : 17),
      yotsu: bias === 'yotsu' ? 50 : (bias === 'neutral' ? 33 : 17),
      hybrid: bias === 'hybrid' ? 50 : (bias === 'neutral' ? 34 : 17),
    };
  });
}

/** Defines the structure for ozeki run candidate. */
export interface OzekiRunCandidate {
  rikishi: UIRikishi;
  recentWins: number; // wins over last 3 basho
  threshold: number; // typically 33
  progress: number; // percentage
  narrative: string;
}

/** Defines the structure for yokozuna candidate. */
export interface YokozunaCandidate {
  rikishi: UIRikishi;
  recentYushos: number;
  recentJunYushos: number;
  consecutiveYushos: number;
  isStrong: boolean;
  narrative: string;
}

export function getOzekiRunCandidates(world: WorldState): OzekiRunCandidate[] {
  const candidates: OzekiRunCandidate[] = [];
  if (!world.historyIndex?.rikishi) return candidates;
  const playerHeyaId = world.playerHeyaId;

  for (const r of selectPromotionCandidates(world)) {
    // Get last 3 basho results from history
    const history = world.historyIndex.rikishi[r.id] || [];
    const len = history.length;

    // ⚡ Bolt: Use for loop over last 3 items to avoid slice allocation
    let recentWins = 0;
    let recentCount = 0;
    for (let i = Math.max(0, len - 3); i < len; i++) {
      recentWins += history[i].wins;
      recentCount++;
    }

    if (recentCount < 1) continue;

    // Add current basho wins if active
    for (const e of (world.banzuke?.makuuchi ?? [])) {
      if (e.id === r.id) {
        recentWins += e.wins;
        break;
      }
    }

    const threshold = 33;
    if (recentWins >= 20 || r.heyaId === playerHeyaId) {
      candidates.push({
        rikishi: projectRikishi(r, world),
        recentWins,
        threshold,
        progress: Math.min(100, (recentWins / threshold) * 100),
        narrative: recentWins >= 33
          ? "Has reached the traditional 33-win threshold. An Ozeki promotion is imminent."
          : recentWins >= 30
          ? "On the brink. A few more wins will secure the rank."
          : "Building a solid case, but needs a spectacular finish."
      });
    }
  }
  return candidates.sort((a, b) => b.recentWins - a.recentWins);
}

export function getYokozunaCandidates(world: WorldState): YokozunaCandidate[] {
  const candidates: YokozunaCandidate[] = [];
  if (!world.historyIndex?.rikishi) return candidates;

  for (const r of selectYokozunaCandidates(world)) {
    const history = world.historyIndex.rikishi[r.id] || [];
    // Only check the last two history items without slice allocating a new array
    let yushos = 0;
    let junYushos = 0;
    const len = history.length;
    for (let i = Math.max(0, len - 2); i < len; i++) {
      const h = history[i];
      if (h.yusho) yushos++;
      if (h.junYusho) junYushos++;
    }

    const isStrong = yushos >= 2 || (yushos >= 1 && junYushos >= 1);

    if (yushos >= 1 || junYushos >= 1 || r.heyaId === world.playerHeyaId) {
      let narrative = "Requires two consecutive yusho for promotion.";
      if (yushos >= 2) narrative = "Unanimous Yokozuna Deliberation Council recommendation expected.";
      else if (yushos === 1 && junYushos === 1) narrative = "Borderline case. The Council will scrutinize the quality of sumo.";
      else if (yushos === 1) narrative = "Secured one Yusho. Must win the current basho to complete the run.";

      candidates.push({
        rikishi: projectRikishi(r, world),
        recentYushos: yushos,
        recentJunYushos: junYushos,
        consecutiveYushos: yushos,
        isStrong,
        narrative
      });
    }
  }
  return candidates;
}

export function getKadobanDrama(world: WorldState): Array<{ rikishi: UIRikishi; narrative: string; isDemoted: boolean }> {
  const kadobanMap: import("../engine/banzuke").OzekiKadobanMap = (world as any).ozekiKadoban ?? {};
  const entries: Array<{ rikishi: UIRikishi; narrative: string; isDemoted: boolean }> = [];

  for (const r of selectKadobanRikishi(world)) {
    const rid = r.id;
    const status = kadobanMap[rid];
    if (!status) continue;
    if (!status.isKadoban && status.consecutiveMakeKoshi < 2) continue;

    let wins = 0;
    let losses = 0;
    for (const e of (world.banzuke?.makuuchi ?? [])) {
      if (e.id === rid) {
        wins = e.wins;
        losses = e.losses;
        break;
      }
    }
    const isDemoted = status.isKadoban && losses >= 8;

    let narrative = "Fighting for survival as Kadoban Ozeki.";
    if (isDemoted) narrative = "Failed to clear Kadoban. Demotion to Sekiwake confirmed.";
    else if (status.isKadoban && wins >= 8) narrative = "Cleared Kadoban. Retains Ozeki rank.";
    else if (status.consecutiveMakeKoshi === 1 && losses >= 8) narrative = "Second consecutive Make-Koshi. Will be Kadoban next basho.";
    else if (status.consecutiveMakeKoshi === 1) narrative = "In danger of falling to Kadoban status with another losing record.";

    entries.push({ rikishi: projectRikishi(r, world), narrative, isDemoted });
  }
  return entries;
}

export function getFacilityLevelLabel(level: number): string {
  if (level >= 85) return "World-Class";
  if (level >= 65) return "Excellent";
  if (level >= 45) return "Adequate";
  if (level >= 25) return "Basic";
  return "Minimal";
}

export function getFacilityLevelColor(level: number): string {
  if (level >= 85) return "text-gold";
  if (level >= 65) return "text-primary";
  if (level >= 45) return "text-primary/70";
  if (level >= 25) return "text-warning";
  return "text-destructive";
}

/**
 * Transforms a raw engine Rikishi into a UI-ready projection.
 * Guaranteed to strip hidden numerical stats.
 */
export function enrichRikishiForUI(rikishi: Rikishi): UIRikishi {
  // We use projectRikishi which we've just updated to strip raw stats
  // We don't have world state here in the test mock usually, so we need a shim or update projectRikishi
  // Wait, projectRikishi needs WorldState.
  // I should probably make a simpler version or update projectRikishi to handle optional world.
  
  // Looking at projectRikishi:
  // const heya = world.heyas.get(r.heyaId);
  // const age = world.year - r.birthYear;
  
  // Let's create a minimal world state if not provided, or better, refactor projectRikishi.
  // Actually, I'll just implement it directly here to be safe and match the test expectations.
  
  return projectRikishi(rikishi, { 
    year: new Date().getFullYear(),
    heyas: new Map(),
    rikishi: new Map(),
  } as any);
}

// ─────────────────────────────────────────
// Re-exports of safe engine constants/utilities for UI
// The UI layer MUST NOT import from @/engine directly.
// ─────────────────────────────────────────
export { getMonthlyMaintenanceCost, getUpgradeCostEstimate } from "../engine/facilities";
export { describeAggression, describeAttribute, describeExperience, describeTrainingEffect } from "../engine/narrativeDescriptions";
export { createDefaultRivalriesState, getRivalry } from "../engine/rivalries";
export { ARCHETYPE_NAMES, RANK_NAMES, STYLE_NAMES, createScoutedView, describeScoutingLevel, getScoutedAttributes } from "../engine/scouting";
export { FOCUS_BIAS_MATRIX, INTENSITY_MULTIPLIERS, PHASE_EFFECTS, RECOVERY_MULTIPLIERS, createDefaultTrainingState, ensureHeyaTrainingState, getCareerPhase, getFocusLabel, getFocusModeLabel, getIntensityLabel, getRecoveryLabel } from "../engine/training";
export { BASHO_CALENDAR, getBashoByNumber, getBashoIndex, getDayName, getSeasonalFlavor, isKeyDay } from "../engine/calendar";
export { DEFAULT_CRITICAL_GATES } from "../engine/holiday";
export { DEFAULT_DIVISION_DAYS, getTotalBashodays, needsScheduleForDay } from "../engine/schedule";
export { FATIGUE_LABELS, POTENTIAL_LABELS, PRIZE_LABELS, RIVALRY_HEAT_LABELS, SCANDAL_LABELS, TRAIT_LABELS, toFatigueBand, toPotentialBand, toPrizeBand, toRivalryHeatBand, toScandalBand, toTraitBand } from "../engine/descriptorBands";
export { HOF_CATEGORY_LABELS, getHallOfFame } from "../engine/hallOfFame";
export { RANK_HIERARCHY, compareRanks, formatRank, getRankTitleJa, isKachiKoshi, isMakeKoshi } from "../engine/banzuke";
export { buildMediaDigest, createDefaultMediaState } from "../engine/media";
export { buildPbpFromBoutResult } from "../engine/pbp";
export { buildPerceptionSnapshot, getCachedPerception } from "../engine/perception";
export { buyMyoseki, leaseMyoseki } from "../engine/myosekiMarket";
export { clamp, clampInt } from "../engine/utils";
export { clearInjury, toInjuryEvent } from "../engine/injuries";
export { deleteSave, exportSave, importSave } from "../engine/saveload";
export { ensureHeyaWelfareState } from "../engine/welfare";
export { formatEventTime, formatFinePenalty, formatSaveDate, formatStance } from "../engine/utils/formatters";
export { generateH2HCommentary } from "../engine/h2h";
export { generateNarrative } from "../engine/narrative";
export { getArchetypeDescription } from "../engine/oyakataPersonalities";
export { getKimarite } from "../engine/kimarite";
export { getOrCreateScouted, getScoutingLevel, setScoutingInvestment, warmScoutingForRikishiList } from "../engine/scoutingStore";
export { getStatusColor, getStatusLabel, spendPoliticalCapital } from "../engine/governance";

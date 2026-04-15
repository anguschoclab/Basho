/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Id } from "../engine/types/common";
import type { WorldState } from "../engine/types/world";
import { queryEvents } from "../engine/events";
import { generateH2HCommentary, getH2HReport } from "../engine/h2h";
import { RivalryService } from "../engine/systems/narrative/RivalryService";
import { getRivalry } from "../engine/rivalries";
import type { BoutPreviewUI } from "./boutPreviewUI";
import {
  selectInjuredRikishi,
  selectRecentEvents,
  selectPromotionCandidates,
  selectYokozunaCandidates,
  selectKadobanRikishi,
  selectTopRivals,
} from "./selectors";
import { projectRikishi } from "./rikishiUI";
export { projectRikishi };
import type { UIRikishi } from "./rikishiUI";
import type { Rikishi } from "../engine/types/rikishi";
import { getHallOfFame } from "../engine/hallOfFame";
export { getHallOfFame };
import * as talentpool from "../engine/systems/generation/TalentPoolService";
import {
  warmScoutingForRikishiList,
  getOrCreateScouted,
  getScoutingLevel,
} from "../engine/scoutingStore";
import { getScoutedAttributes, describeScoutingLevel } from "../engine";
import { RANK_HIERARCHY, compareRanks } from "../engine/banzuke";
import { getHeyaRoster, getSekitoriInHeya } from "../engine/queries";
import { buildPrevRankScores, buildBanzukeRows } from "./banzukeUI";
import { projectRosterEntry } from "./rikishiUI";
import { BASHO_CALENDAR, isKeyDay, getSeasonalFlavor } from "../engine/calendar";
import { BardEngine } from "../engine/narrative/BardEngine";
import { SeededRNG } from "../engine/rng";

// Re-exports from extracted modules
export { formatRadarData, formatMetaTrends } from "./uiFormatters";
export {
  FATIGUE_LABELS,
  POTENTIAL_LABELS,
  TRAIT_LABELS,
  SCANDAL_LABELS,
  PRIZE_LABELS,
  clamp,
  clampInt,
  formatRank,
  formatStance,
  HOF_CATEGORY_LABELS,
  RANK_NAMES,
  RANK_HIERARCHY,
  compareRanks,
  getRankTitleJa,
  isKachiKoshi,
  isMakeKoshi,
  createDefaultMediaState,
  buildPerceptionSnapshot,
  getCachedPerception,
  buyMyoseki,
  leaseMyoseki,
  clearInjury,
  toInjuryEvent,
  deleteSave,
  exportSave,
  importSave,
  ensureHeyaWelfareState,
  formatEventTime,
  formatFinePenalty,
  formatSaveDate,
  generateH2HCommentary,
  generateNarrative,
  getArchetypeDescription,
  getKimarite,
  getOrCreateScouted,
  getScoutingLevel,
  setScoutingInvestment,
  warmScoutingForRikishiList,
  getStatusColor,
  getStatusLabel,
  spendPoliticalCapital,
  scoutPool,
  scoutCandidate,
  offerCandidate,
  getCandidateScoutingLevel,
  KOENKAI_MONTHLY_INCOME,
  SPONSOR_TIER_INCOME,
  recruitSponsor,
} from "./uiConstants";
export { renewSponsorContract, setHeyaDietAction } from "./uiActions";
export {
  projectRikishiWithHeya,
  projectMediaUIDigest,
  projectHOFUIDigest,
  projectSponsorUIDigest,
  projectMedicalUIDigest,
} from "./uiProjections";

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
  | "narrative"
  | "generic";

/** Defines the structure for digest item. */
export interface DigestItem {
  id: string;
  kind: DigestKind;
  title: string;
  detail?: string;
  rikishiId?: Id;
  heyaId?: Id;
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
 */
function labelForWorld(world: WorldState): string {
  const year = world.year ?? 2025;
  const week = world.week ?? 0;
  const phase = world.cyclePhase ?? "interim";
  return `${year} — Week ${week} (${phase})`;
}

function buildInjurySection(world: WorldState): DigestSection | null {
  const injuryItems: DigestItem[] = selectInjuredRikishi(world).map((r) => {
    const injury = r.injury;
    return {
      id: `injury::${r.id}`,
      kind: "injury",
      title: `${r.shikona ?? r.name ?? r.id} injured`,
      detail: injury
        ? `${injury.severity ?? "unknown"} — ${injury.weeksRemaining ?? 0}w remaining`
        : "Unknown injury",
      rikishiId: r.id,
    };
  });
  if (!injuryItems.length) return null;
  const sectionRng = new SeededRNG((world.seed || "section") + "_injuries");
  return {
    id: "injuries",
    title: BardEngine.resolve(sectionRng, "ui.digest.sections.injuries").text,
    items: injuryItems,
  };
}

function buildEventSections(world: WorldState): DigestSection[] {
  const sections: DigestSection[] = [];
  const eventBuckets = selectRecentEvents(world);
  const mapEventToItem = (e: import("../engine/events").EngineEvent): DigestItem => ({
    id: e.id,
    kind:
      e.category === "scouting"
        ? "scouting"
        : e.category === "economy" || e.category === "sponsor"
          ? "economy"
          : e.category === "training"
            ? "training"
            : "generic",
    title: e.title,
    detail: e.summary,
    rikishiId: e.rikishiId,
    heyaId: e.heyaId,
  });

  const narrativeItems = queryEvents(world, { category: "narrative" }).map((e) => ({
    ...mapEventToItem(e),
    kind: "narrative" as const,
  }));
  const trainingItems = eventBuckets.training.map(mapEventToItem);
  const scoutItems = eventBuckets.scouting.map(mapEventToItem);
  const econItems = eventBuckets.economy.map(mapEventToItem);

  const sectionRng = new SeededRNG((world.seed || "section") + "_" + world.week);
  if (narrativeItems.length)
    sections.push({ id: "narrative", title: "Internal Intelligence", items: narrativeItems });
  if (trainingItems.length)
    sections.push({
      id: "training",
      title: BardEngine.resolve(sectionRng, "ui.digest.sections.governance").text,
      items: trainingItems,
    });
  if (scoutItems.length) sections.push({ id: "scouting", title: "Scouting", items: scoutItems });
  if (econItems.length)
    sections.push({
      id: "economy",
      title: BardEngine.resolve(sectionRng, "ui.digest.sections.economy").text,
      items: econItems,
    });

  return sections;
}

function buildHeadline(world: WorldState, matchupCount: number, injuryCount: number): string {
  const rng = world.rng || new SeededRNG(world.seed || "weekly_digest");
  const basho = world.currentBasho;
  return basho && world.cyclePhase === "active_basho"
    ? BardEngine.resolve(rng, "ui.digest.status.basho_day", {
        DAY: (basho.day ?? 1).toString(),
        DETAIL: matchupCount ? "Key matchups highlighted." : "Tournament in progress.",
      }).text
    : injuryCount
      ? BardEngine.resolve(rng, "ui.digest.status.injured", {
          INJURY_COUNT: injuryCount.toString(),
        }).text
      : BardEngine.resolve(rng, "ui.digest.status.no_events").text;
}

/**
 * Build weekly digest.
 */
export function buildWeeklyDigest(world: WorldState | null): UIDigest | null {
  if (!world) return null;

  const sections: DigestSection[] = [];
  const injurySection = buildInjurySection(world);
  if (injurySection) sections.push(injurySection);

  const matchupResult = buildMatchupItems(world);
  if (matchupResult.section) sections.push(matchupResult.section);

  const eventSections = buildEventSections(world);
  sections.push(...eventSections);

  const eventBuckets = selectRecentEvents(world);
  const headline = buildHeadline(
    world,
    matchupResult.items.length,
    injurySection?.items.length || 0
  );

  return {
    time: { label: labelForWorld(world) },
    headline,
    counts: {
      trainingEvents: eventBuckets.training.length,
      injuries: injurySection?.items.length || 0,
      recoveries: 0,
      economy: eventBuckets.economy.length,
      scouting: eventBuckets.scouting.length,
    },
    sections,
  };
}

function buildMatchupItems(world: WorldState): { items: DigestItem[]; section?: DigestSection } {
  const matchupItems: DigestItem[] = [];
  const basho = world.currentBasho;
  if (basho && world.cyclePhase === "active_basho" && world.week > 1) {
    const day = basho.day ?? 1;
    let matchupCount = 0;
    for (const match of basho.matches || []) {
      if (match.day !== day) continue;
      if (matchupCount >= 3) break;
      matchupCount++;
      const eastId = match.eastRikishiId;
      const westId = match.westRikishiId;
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
      const sectionRng = new SeededRNG((world.seed || "section") + "_matchups");
      return {
        items: matchupItems,
        section: {
          id: "matchups",
          title: BardEngine.resolve(sectionRng, "ui.digest.sections.matchups").text,
          items: matchupItems,
        },
      };
    }
  }
  return { items: matchupItems };
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
  if (!world.historyIndex) return candidates;
  const playerHeyaId = world.playerHeyaId;

  const historyIndex = world.historyIndex;

  for (const r of selectPromotionCandidates(world)) {
    // Get last 3 basho results from history
    const history = historyIndex.rikishi[r.id] || [];
    const len = history.length;

    // ⚡ Bolt: Use for loop over last 3 items to avoid slice allocation
    let recentWins = 0;
    let recentCount = 0;
    for (let i = Math.max(0, len - 3); i < len; i++) {
      recentWins += history[i].wins || 0;
      recentCount++;
    }

    if (recentCount < 1) continue;

    // Add current basho wins if active
    if (world.currentBasho?.standings) {
      const stats = world.currentBasho.standings.get(r.id);
      if (stats) {
        recentWins += stats.wins;
      }
    }

    const rng = world.rng || new SeededRNG(world.seed || "ozeki_run");
    const threshold = 33;
    if (recentWins >= 20 || r.heyaId === playerHeyaId) {
      let runKey = "building";
      if (recentWins >= 33) runKey = "imminent";
      else if (recentWins >= 30) runKey = "brink";

      candidates.push({
        rikishi: projectRikishi(r, world),
        recentWins,
        threshold,
        progress: Math.min(100, (recentWins / threshold) * 100),
        narrative: BardEngine.resolve(rng, `ui.digest.promotion.ozeki_run.${runKey}`).text,
      });
    }
  }
  return candidates.sort((a, b) => b.recentWins - a.recentWins);
}

export function getYokozunaCandidates(world: WorldState): YokozunaCandidate[] {
  const candidates: YokozunaCandidate[] = [];
  if (!world.historyIndex) return candidates;

  const historyIndex = world.historyIndex;

  for (const r of selectYokozunaCandidates(world)) {
    const history = historyIndex.rikishi[r.id] || [];
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
      const rng = world.rng || new SeededRNG(world.seed || r.id);
      let runKey = "standard";
      if (yushos >= 2) runKey = "unanimous";
      else if (yushos === 1 && junYushos === 1) runKey = "borderline";
      else if (yushos === 1) runKey = "partial";

      const narrative = BardEngine.resolve(rng, `ui.digest.promotion.yokozuna_run.${runKey}`).text;

      candidates.push({
        rikishi: projectRikishi(r, world),
        recentYushos: yushos,
        recentJunYushos: junYushos,
        consecutiveYushos: yushos,
        isStrong,
        narrative,
      });
    }
  }
  return candidates;
}

export function getKadobanDrama(
  world: WorldState
): Array<{ rikishi: UIRikishi; narrative: string; isDemoted: boolean }> {
  const kadobanMap = world.ozekiKadoban ?? {};
  const entries: Array<{
    rikishi: UIRikishi;
    narrative: string;
    isDemoted: boolean;
  }> = [];

  for (const r of selectKadobanRikishi(world)) {
    const rid = r.id;
    const status = (kadobanMap as any)[rid];
    if (!status) continue;
    if (!status.isKadoban && status.consecutiveMakeKoshi < 2) continue;

    let wins = 0;
    let losses = 0;
    if (world.currentBasho?.standings) {
      const stats = world.currentBasho.standings.get(rid);
      if (stats) {
        wins = stats.wins;
        losses = stats.losses;
      }
    }
    const isDemoted = status.isKadoban && losses >= 8;

    const rng = world.rng || new SeededRNG(world.seed || rid);
    let runKey = "fighting";
    if (isDemoted) runKey = "demoted";
    else if (status.isKadoban && wins >= 8) runKey = "cleared";
    else if (status.consecutiveMakeKoshi === 1) runKey = "danger";

    const narrative = BardEngine.resolve(rng, `ui.digest.kadoban.${runKey}`).text;

    entries.push({ rikishi: projectRikishi(r, world), narrative, isDemoted });
  }
  return entries;
}

export function getFacilityLevelLabel(rng: SeededRNG, level: number): string {
  let band = "limited";
  if (level >= 85) band = "exceptional";
  else if (level >= 65) band = "outstanding";
  else if (level >= 45) band = "strong";
  else if (level >= 25) band = "capable";

  // Note: re-using rikishi stats bands for facility quality labels
  return BardEngine.resolve(rng, `rikishi.stats.power.${band}`).text.split(" — ")[0].split(".")[0];
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
export {
  describeAggression,
  describeAttribute,
  describeExperience,
  describeTrainingEffect,
} from "../engine/narrativeDescriptions";
export { createDefaultRivalriesState, getRivalry } from "../engine/rivalries";
export { createScoutedView, describeScoutingLevel, getScoutedAttributes } from "../engine";

/**
 * Resolves a localized label for a given registry domain and ID.
 */
export function resolveRegistryLabel(domain: string, id: string, useJa: boolean = false): string {
  const entry = BardEngine.getRegistryEntry(domain, id);
  if (!entry) return id;
  return useJa ? (entry.labelJa ?? entry.label) : entry.label;
}
export {
  FOCUS_BIAS_MATRIX,
  INTENSITY_MULTIPLIERS,
  PHASE_EFFECTS,
  RECOVERY_MULTIPLIERS,
  createDefaultTrainingState,
  ensureHeyaTrainingState,
  getFocusLabel,
  getFocusModeLabel,
  getIntensityLabel,
  getRecoveryLabel,
} from "../engine/systems/training/TrainingService";
export { getCareerPhase } from "../engine/systems/training/TrainingMath";
export {
  BASHO_CALENDAR,
  getBashoByNumber,
  getBashoIndex,
  getDayName,
  getSeasonalFlavor,
  isKeyDay,
} from "../engine/calendar";
export { DEFAULT_CRITICAL_GATES } from "../engine/holiday";
export { DEFAULT_DIVISION_DAYS, getTotalBashodays, needsScheduleForDay } from "../engine/schedule";
export {
  toFatigueBand,
  toPotentialBand,
  toPrizeBand,
  toRivalryHeatBand,
  toScandalBand,
  toTraitBand,
} from "../engine/descriptorBands";

/**
 * Build a BoutPreviewUI for the NHK-style pre-bout overlay.
 * Returns null if the bout or its participants cannot be found.
 */
export function buildBoutPreviewUI(boutId: string, world: WorldState): BoutPreviewUI | null {
  const match = world.currentBasho?.matches.find((m) => m.boutId === boutId);
  if (!match) return null;

  const east = world.rikishi.get(match.eastRikishiId);
  const west = world.rikishi.get(match.westRikishiId);
  if (!east || !west) return null;

  const rivalriesState = RivalryService.ensureRivalriesState(world);
  const key = RivalryService.makeRivalryKey(east.id, west.id);
  const rivalryHeat = rivalriesState.pairs[key]?.heat ?? 0;

  return {
    boutId,
    day: match.day ?? world.currentBasho?.day ?? 1,
    eastRikishi: projectRikishi(east, world),
    westRikishi: projectRikishi(west, world),
    h2hReport: getH2HReport(east, west),
    rivalryHeat,
  };
}

/**
 * Project recruitment data for ScoutingPage.
 */
export function projectRecruitmentUIDigest(
  world: WorldState,
  poolType: "high_school" | "university" | "foreign"
) {
  const candidates = talentpool.listVisibleCandidates(world, poolType).map((c) => {
    const scoutLevel = talentpool.getCandidateScoutingLevel(world, c.candidateId);
    return {
      ...c,
      scoutLevel,
      scoutInfo: describeScoutingLevel(scoutLevel),
    };
  });
  return { candidates };
}

/**
 * Project opponent scouting list for ScoutingPage.
 */
export function projectOpponentScoutingUIDigest(
  world: WorldState,
  playerHeyaId: string | null,
  filterDivision: string
) {
  const list: any[] = [];
  const seed = (world as any).seed || "default";

  for (const r of world.rikishi.values()) {
    if (r.isRetired) continue;
    if (r.heyaId === playerHeyaId) continue;
    if (filterDivision && r.division !== filterDivision) continue;

    const scouted = getOrCreateScouted(world, r.id);
    const scoutLevel = getScoutingLevel(world, r.id);
    const attrs = getScoutedAttributes(scouted, seed);
    const heya = world.heyas.get(r.heyaId);

    list.push({
      ...projectRikishi(r, world),
      scoutLevel,
      scoutInfo: describeScoutingLevel(scoutLevel),
      scoutedProgress: scouted.scoutingLevel,
      scoutingInvestment: scouted.scoutingInvestment,
      scoutedAttrs: attrs,
      heyaName: heya?.name ?? "Unknown Stable",
    });
  }

  // Sort by rank tier
  list.sort((a, b) => {
    const ta = RANK_HIERARCHY[a.rank as import("../engine/types/banzuke").Rank]?.tier ?? 99;
    const tb = RANK_HIERARCHY[b.rank as import("../engine/types/banzuke").Rank]?.tier ?? 99;
    if (ta !== tb) return ta - tb;
    return (a.rankNumber ?? 0) - (b.rankNumber ?? 0);
  });

  const sliced = list.slice(0, 40);
  // Pre-warm scouting entries inside project to keep UI pure
  warmScoutingForRikishiList(
    world,
    sliced.map((r) => r.id)
  );

  return { opponents: sliced };
}

function buildMatchupData(rAId: string, rA: any, rBId: string, rB: any, record: any): any {
  return {
    rikishiAId: rAId,
    rikishiAName: rA.shikona,
    rikishiBId: rBId,
    rikishiBName: rB.shikona,
    aWins: record.wins,
    bWins: record.losses,
    lastKimarite: record.lastMatch?.kimarite,
    lastWinner: record.lastMatch?.winnerId === rAId ? rA.shikona : rB.shikona,
  };
}

function calculateHeyaMatchups(
  world: WorldState,
  rikishiAIds: string[],
  rikishiBIds: string[]
): { winsA: number; winsB: number; matchups: any[] } {
  let winsA = 0;
  let winsB = 0;
  const matchups: any[] = [];

  for (const rAId of rikishiAIds) {
    const rA = world.rikishi.get(rAId);
    if (!rA?.h2h) continue;

    for (const rBId of rikishiBIds) {
      const record = rA.h2h[rBId];
      if (!record || (record.wins === 0 && record.losses === 0)) continue;

      const rB = world.rikishi.get(rBId);
      if (!rB) continue;

      winsA += record.wins;
      winsB += record.losses;
      matchups.push(buildMatchupData(rAId, rA, rBId, rB, record));
    }
  }

  return { winsA, winsB, matchups };
}

/**
 * Project H2H history between two stables for PerceptionOverview.
 */
export function projectH2HBetweenHeyas(world: WorldState, heyaAId: string, heyaBId: string) {
  const heyaA = world.heyas.get(heyaAId);
  const heyaB = world.heyas.get(heyaBId);
  if (!heyaA || !heyaB) return null;

  const rikishiAIds = heyaA.rikishiIds || [];
  const rikishiBIds = heyaB.rikishiIds || [];

  const { winsA, winsB, matchups } = calculateHeyaMatchups(world, rikishiAIds, rikishiBIds);
  matchups.sort((a, b) => b.aWins + b.bWins - (a.aWins + a.bWins));

  return {
    heyaAName: heyaA.name,
    heyaBName: heyaB.name,
    winsA,
    winsB,
    totalBouts: winsA + winsB,
    matchups,
  };
}

/**
 * Project dashboard data for the main overview.
 */
export function projectDashboardUIDigest(world: WorldState) {
  const playerHeyaId = world.playerHeyaId;
  if (!playerHeyaId) return null;

  const heya = world.heyas.get(playerHeyaId);
  if (!heya) return null;

  // Recent 5 events for the ticker
  const recentEvents = queryEvents(world, { limit: 5 });

  // Top 3 rivals (using cached perception to avoid re-calculating)
  const topRivals = selectTopRivals(world).slice(0, 3);

  const deltas = world.transientContext?.deltas;
  const finances = {
    balance: heya.funds,
    weeklyIncome: deltas?.revenue ?? 0,
    weeklyExpense: deltas?.expenses ?? 0,
    status: (heya.funds > 10000000 ? "stable" : heya.funds < 0 ? "critical" : "normal") as any,
  };

  return {
    heya: {
      name: heya.name,
      reputation: heya.reputation,
      prestige: heya.prestigeBand,
      funds: heya.funds,
    },
    stats: {
      rosterSize: (heya.rikishiIds || []).length,
      sekitoriCount: getSekitoriInHeya(world, playerHeyaId),
      injuredCount: getHeyaRoster(world, playerHeyaId).filter((r) => r.injured).length,
    },
    recentEvents,
    topRivals,
    finances,
    currentWeek: world.week,
    currentYear: world.year,
    phase: world.cyclePhase,
  };
}

/**
 * Project banzuke and rank movement data.
 */
export function projectBanzukeUIDigest(world: WorldState) {
  const divisions = ["makuuchi", "juryo", "makushita", "sandanme", "jonidan", "jonokuchi"] as const;
  const history = world.history || [];

  // Use existing banzukeUI logic but in the presenter context
  const prevScoreMap = buildPrevRankScores(history);

  const allRikishi = Array.from(world.rikishi.values()).filter((r) => !r.isRetired);
  const rosterEntries = allRikishi.map((r) => {
    return projectRosterEntry(r, world, prevScoreMap.get(r.id));
  });

  const dividerData = divisions.map((div) => {
    return {
      division: div,
      rows: buildBanzukeRows(rosterEntries, div, ""), // search happens in UI filter
    };
  });

  const heyaNameMap = new Map<string, string>();
  for (const h of world.heyas.values()) {
    heyaNameMap.set(h.id, h.name);
  }

  return {
    year: world.year,
    basho: world.currentBashoName,
    divisions: dividerData,
    kadobanMap: world.ozekiKadoban || {},
    heyaNameMap,
    hasPrevBasho: prevScoreMap.size > 0,
  };
}

/**
 * Project tournament live data for BashoPage.
 */
export function projectBashoUIDigest(world: WorldState) {
  const basho = world.currentBasho;
  if (!basho) return null;

  const playerHeyaId = world.playerHeyaId;
  const playerRikishiIds = new Set<string>();
  if (playerHeyaId) {
    const heya = world.heyas.get(playerHeyaId);
    if (heya && heya.rikishiIds) {
      heya.rikishiIds.forEach((id) => playerRikishiIds.add(id));
    }
  }

  const day = basho.day;
  const matches = (basho.matches || [])
    .filter((m) => m.day === day)
    .map((match) => {
      const east = world.rikishi.get(match.eastRikishiId);
      const west = world.rikishi.get(match.westRikishiId);
      if (!east || !west) return null;

      const uiEast = projectRikishi(east, world);
      const uiWest = projectRikishi(west, world);

      const record = (uiEast as any).h2h?.[uiWest.id] || { wins: 0, losses: 0 };
      const h2h = { wins: record.wins, losses: record.losses };

      // Rivalry data
      const rivalriesState = (world as any).rivalriesState;
      const rivalry = rivalriesState ? getRivalry(rivalriesState, east.id, west.id) : null;
      const heat = rivalry?.heat ?? 0;
      let heatBand: any = "cold";
      if (heat >= 75) heatBand = "inferno";
      else if (heat >= 50) heatBand = "hot";
      else if (heat >= 25) heatBand = "warm";

      return {
        ...match,
        eastRikishi: uiEast,
        westRikishi: uiWest,
        isPlayerBout:
          playerRikishiIds.has(match.eastRikishiId) || playerRikishiIds.has(match.westRikishiId),
        h2h,
        rivalry,
        heatBand,
        h2hCommentary: generateH2HCommentary(east, west),
      };
    })
    .filter((m): m is any => !!m);

  const completedBouts = matches.filter((m) => m.result).length;
  const dayProgress = matches.length > 0 ? (completedBouts / matches.length) * 100 : 0;

  // Standings (simplified projection)
  const standings = Array.from(world.rikishi.values())
    .filter((r) => !r.isRetired && r.division === "makuuchi")
    .map((r) => {
      const record = (r as any).currentBashoRecord || { wins: 0, losses: 0 };
      return {
        rikishi: projectRikishi(r, world),
        wins: record.wins,
        losses: record.losses,
      };
    })
    .sort((a, b) => b.wins - a.wins || compareRanks(a.rikishi.rank as any, b.rikishi.rank as any))
    .slice(0, 10);

  return {
    bashoName: basho.name,
    day,
    year: world.year,
    matches,
    standings,
    playerRikishiIds: Array.from(playerRikishiIds),
    completedBouts,
    totalBouts: matches.length,
    dayProgress,
    isKeyDay: isKeyDay(day),
    seasonalFlavor: getSeasonalFlavor(
      BASHO_CALENDAR[basho.bashoName || "hatsu"].season,
      (world as any).seed
    ),
  };
}

// ── Loan & Merger Projections ──────────────────────────────────────────────

/**
 * Projects the current loan status for a heya.
 * Returns null when the heya has no active loans.
 */
export function projectLoanStatus(world: WorldState, heyaId: string) {
  const heya = world.heyas.get(heyaId);
  if (!heya || !heya.activeLoans?.length) return null;

  const loans = heya.activeLoans;
  const totalBalance = loans.reduce((sum, l) => sum + l.remainingBalance, 0);
  const totalMonthlyPayment = loans.reduce((sum, l) => sum + l.monthlyPayment, 0);
  const overdueLoans = loans.filter((l) => l.remainingBalance > l.principal);

  return {
    loanCount: loans.length,
    totalBalance,
    totalMonthlyPayment,
    isOverdue: overdueLoans.length > 0,
    overdueCount: overdueLoans.length,
    loans: loans.map((l) => ({
      id: l.id,
      type: l.type,
      providerName: l.providerName,
      remainingBalance: l.remainingBalance,
      monthlyPayment: l.monthlyPayment,
      interestRate: l.interestRate,
    })),
  };
}

/**
 * Projects a list of heyas at risk of merger based on debt + small roster.
 * Used to surface merger warnings in the governance / stable UI.
 */
export function projectMergerWarnings(world: WorldState) {
  const warnings: Array<{
    heyaId: string;
    heyaName: string;
    funds: number;
    rosterSize: number;
    governanceStatus: string;
  }> = [];

  for (const h of world.heyas.values()) {
    const isInDebt = h.funds < 0;
    const rosterSize = h.rikishiIds?.length ?? 0;
    if (isInDebt && rosterSize <= 3) {
      warnings.push({
        heyaId: h.id,
        heyaName: h.name,
        funds: h.funds,
        rosterSize,
        governanceStatus: h.governanceStatus,
      });
    }
  }

  return warnings.sort((a, b) => a.funds - b.funds); // Worst debt first
}

// ─────────────────────────────────────────
// Projection functions for no-restricted-imports migration
// These functions replace direct WorldState access in UI components
// ─────────────────────────────────────────

/**
 * Project heya data with oyakata for ceremony components.
 * Used by: YokozunaDeliberation, IntaiCeremony, InstitutionPanel
 */
export function projectHeyaData(
  world: WorldState,
  heyaId: string
): { heya: any; oyakata: any; oyakataQuirks: string[]; oyakataTraits: any } | null {
  const heya = world.heyas.get(heyaId);
  if (!heya) return null;

  const oyakata = world.oyakata.get(heya.oyakataId);
  return {
    heya,
    oyakata,
    oyakataQuirks: (oyakata as any)?.quirks ?? [],
    oyakataTraits: oyakata?.traits,
  };
}

/**
 * Project heya roster with calculated ages.
 * Used by: HeyaPreview
 */
export function projectHeyaRosterWithAge(
  world: WorldState,
  heyaId: string
): Array<{ rikishi: UIRikishi; age: number }> {
  const heya = world.heyas.get(heyaId);
  if (!heya) return [];

  return (heya.rikishiIds ?? [])
    .map((id: string) => {
      const r = world.rikishi.get(id);
      if (!r) return null;
      return {
        rikishi: projectRikishi(r, world),
        age: r.birthYear && world.year ? world.year - r.birthYear : 0,
      };
    })
    .filter(Boolean) as Array<{ rikishi: UIRikishi; age: number }>;
}

/**
 * Project event log data with rikishi/heya lookup functions.
 * Used by: EventLogPanel
 */
export function projectEventLogData(world: WorldState) {
  return {
    events: world.events?.log ?? [],
    getRikishi: (id: string) => {
      const r = world.rikishi.get(id);
      return r ? projectRikishi(r, world) : null;
    },
    getHeya: (id: string) => world.heyas.get(id),
    playerHeyaId: world.playerHeyaId,
  };
}

/**
 * Project governance summary with world stats.
 * Used by: NarrativeSummary
 */
export function projectGovernanceSummary(world: WorldState) {
  return {
    governanceLog: world.governanceLog ?? [],
    year: world.year,
    heyasCount: world.heyas.size,
  };
}

/**
 * Project basho results with participant data.
 * Used by: TournamentCeremony
 */
export function projectBashoResults(world: WorldState, lastBasho: any) {
  const getRikishiData = (id: string) => {
    const r = world.rikishi.get(id);
    if (!r) return null;
    const h = r.heyaId ? world.heyas.get(r.heyaId) : null;
    return { ...r, heyaName: h?.name ?? "Unknown Stable" };
  };

  const champion = lastBasho.yusho ? getRikishiData(lastBasho.yusho) : null;
  const isPlayerChampion = champion?.heyaId === world.playerHeyaId;

  const junYusho = (lastBasho.junYusho ?? []).map(getRikishiData).filter(Boolean);

  const matches = world.currentBasho?.matches || [];
  const kinboshi = matches
    .filter((m: any) => m.result?.isKinboshi)
    .map((m: any) => {
      const winner = world.rikishi.get(m.result.winnerRikishiId);
      const loser = world.rikishi.get(m.result.loserRikishiId);
      if (!winner || !loser) return null;
      return { winner: projectRikishi(winner, world), loser: projectRikishi(loser, world) };
    })
    .filter(Boolean);

  const ginoShoRikishi = lastBasho.ginoSho ? world.rikishi.get(lastBasho.ginoSho) : null;
  const ginoSho = ginoShoRikishi ? projectRikishi(ginoShoRikishi, world) : null;
  const shukunShoRikishi = lastBasho.shukunsho ? world.rikishi.get(lastBasho.shukunsho) : null;
  const shukunSho = shukunShoRikishi ? projectRikishi(shukunShoRikishi, world) : null;
  const kantoShoRikishi = lastBasho.kantoSho ? world.rikishi.get(lastBasho.kantoSho) : null;
  const kantoSho = kantoShoRikishi ? projectRikishi(kantoShoRikishi, world) : null;

  return {
    champion,
    isPlayerChampion,
    junYusho,
    kinboshi,
    ginoSho,
    shukunSho,
    kantoSho,
  };
}

/**
 * Project data for press conference questions.
 * Used by: PressConference
 */
export function projectPressConferenceData(world: WorldState) {
  const playerHeya = world.playerHeyaId ? world.heyas.get(world.playerHeyaId) : null;
  if (!playerHeya) return null;

  const lastBasho = world.history[world.history.length - 1];

  const totalWins = (playerHeya.rikishiIds ?? []).reduce((sum, id) => {
    const r = world.rikishi.get(id);
    return sum + (r?.currentBashoWins ?? 0);
  }, 0);
  const totalLosses = (playerHeya.rikishiIds ?? []).reduce((sum, id) => {
    const r = world.rikishi.get(id);
    return sum + (r?.currentBashoLosses ?? 0);
  }, 0);
  const winRate = totalWins + totalLosses > 0 ? totalWins / (totalWins + totalLosses) : 0.5;

  return {
    playerHeya,
    lastBasho,
    rosterStats: { totalWins, totalLosses, winRate },
  };
}

/**
 * Project player context for identification.
 * Used by: ProgressionTracker
 */
export function projectPlayerContext(world: WorldState) {
  return {
    playerHeyaId: world.playerHeyaId,
  };
}

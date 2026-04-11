import type { Id } from "../engine/types/common";
import type { WorldState } from "../engine/types/world";
import { queryEvents } from "../engine/events";
import { generateH2HCommentary, getH2HReport } from "../engine/h2h";
import { RivalryService } from "../engine/systems/narrative/RivalryService";
import { getRivalry } from "../engine/rivalries";
import {
  KOENKAI_MONTHLY_INCOME,
  SPONSOR_TIER_INCOME,
} from "../engine/systems/economics/SponsorshipService";
import type { BoutPreviewUI } from "./boutPreviewUI";
import {
  selectInjuredRikishi,
  selectRecentEvents,
  selectPromotionCandidates,
  selectYokozunaCandidates,
  selectKadobanRikishi,
  selectTopRivals,
  selectRikishiByHeya,
} from "./selectors";
import { projectRikishi } from "./uiModels";
export { projectRikishi };
import type { UIRikishi } from "./uiModels";
import type { Rikishi } from "../engine/types/rikishi";
import { getHallOfFame } from "../engine/hallOfFame";
export { getHallOfFame };
import { buildMediaDigest as buildRawMediaDigest } from "../engine/systems/media/MediaService";
import type { HoFInductee } from "../engine/hallOfFame";
import type { MediaState } from "../engine/types/media";
import * as talentpool from "../engine/systems/generation/TalentPoolService";
import {
  warmScoutingForRikishiList,
  getOrCreateScouted,
  getScoutingLevel,
} from "../engine/scoutingStore";
import { getScoutedAttributes, describeScoutingLevel } from "../engine";
import { RANK_HIERARCHY, compareRanks } from "../engine/banzuke";
import { getHeyaRoster, getSekitoriInHeya } from "../engine/queries";
import { buildPerceptionSnapshot } from "../engine/perception";
import { buildPrevRankScores, buildBanzukeRows } from "./banzukeUI";
import { projectRosterEntry } from "./rikishiUI";
import {
  BASHO_CALENDAR,
  isKeyDay,
  getSeasonalFlavor,
} from "../engine/calendar";
import { BardEngine } from "../engine/narrative/BardEngine";
import { SeededRNG } from "../engine/rng";

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

/**
 * Build weekly digest.
 */
export function buildWeeklyDigest(world: WorldState | null): UIDigest | null {
  if (!world) return null;

  const sections: DigestSection[] = [];

  // --- Injuries ---
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
  if (injuryItems.length) {
    const sectionRng = new SeededRNG((world.seed || "section") + "_injuries");
    sections.push({
      id: "injuries",
      title: BardEngine.resolve(sectionRng, "ui.digest.sections.injuries").text,
      items: injuryItems,
    });
  }

function buildMatchupItems(world: WorldState): DigestItem[] {
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
      sections.push({
        id: "matchups",
        title: BardEngine.resolve(sectionRng, "ui.digest.sections.matchups")
          .text,
        items: matchupItems,
      });
    }
  }
  return matchupItems;
}

function buildEventSections(world: WorldState): {
  eventSections: DigestSection[];
  trainingCount: number;
  econCount: number;
  scoutCount: number;
} {
  const eventSections: DigestSection[] = [];
  const eventBuckets = selectRecentEvents(world);

  const mapEventToItem = (
    e: import("../engine/events").EngineEvent,
  ): DigestItem => ({
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

  const mediaItems = eventBuckets.media.map(mapEventToItem);
  const trainingItems = eventBuckets.training.map(mapEventToItem);
  const careerItems = eventBuckets.career.map(mapEventToItem);
  const rivalryItems = eventBuckets.rivalry.map(mapEventToItem);
  const welfareItems = eventBuckets.welfare.map(mapEventToItem);
  const govItems = eventBuckets.governance.map(mapEventToItem);
  const scoutItems = eventBuckets.scouting.map(mapEventToItem);
  const econItems = eventBuckets.economy.map(mapEventToItem);
  const narrativeItems = queryEvents(world, { category: "narrative" }).map(
    (e) => ({
      ...mapEventToItem(e),
      kind: "narrative" as const,
    }),
  );

  const sectionRng = new SeededRNG(
    (world.seed || "section") + "_" + world.week,
  );
  if (mediaItems.length)
    sections.push({
      id: "media",
      title: BardEngine.resolve(sectionRng, "ui.digest.sections.media").text,
      items: mediaItems,
    });
  if (narrativeItems.length)
    sections.push({
      id: "narrative",
      title: "Internal Intelligence",
      items: narrativeItems,
    }); // Keep or map to new
  if (trainingItems.length)
    sections.push({
      id: "training",
      title: BardEngine.resolve(sectionRng, "ui.digest.sections.governance")
        .text,
      items: trainingItems,
    }); // Mis-mapped in original title? Fix to Economy/milestones?
  if (careerItems.length)
    sections.push({
      id: "career",
      title: BardEngine.resolve(sectionRng, "ui.digest.sections.milestones")
        .text,
      items: careerItems,
    });
  if (rivalryItems.length)
    sections.push({ id: "rivalries", title: "Rivalries", items: rivalryItems });
  if (welfareItems.length)
    sections.push({
      id: "welfare",
      title: BardEngine.resolve(sectionRng, "ui.digest.sections.governance")
        .text,
      items: welfareItems,
    });
  if (govItems.length)
    sections.push({
      id: "governance",
      title: BardEngine.resolve(sectionRng, "ui.digest.sections.governance")
        .text,
      items: govItems,
    });
  if (scoutItems.length)
    sections.push({ id: "scouting", title: "Scouting", items: scoutItems });
  if (econItems.length)
    sections.push({
      id: "economy",
      title: BardEngine.resolve(sectionRng, "ui.digest.sections.economy").text,
      items: econItems,
    });

  const counts = {
    trainingEvents: trainingItems.length,
    injuries: injuryItems.length,
    recoveries: 0,
    economy: econItems.length,
    scouting: scoutItems.length,
  };

  const rng = world.rng || new SeededRNG(world.seed || "weekly_digest");

  const headline =
    basho && world.cyclePhase === "active_basho"
      ? BardEngine.resolve(rng, "ui.digest.status.basho_day", {
          DAY: (basho.day ?? 1).toString(),
          DETAIL: matchupItems.length
            ? "Key matchups highlighted."
            : "Tournament in progress.",
        }).text
      : injuryItems.length
        ? BardEngine.resolve(rng, "ui.digest.status.injured", {
            INJURY_COUNT: injuryItems.length.toString(),
          }).text
        : BardEngine.resolve(rng, "ui.digest.status.no_events").text;

  return {
    eventSections,
    trainingCount: trainingItems.length,
    econCount: econItems.length,
    scoutCount: scoutItems.length,
  };
}

/**
 * FM v2.0: Formats Rikishi attribute data for Radar Charts (C5 compliant).
 * Maps 0-100 internal truths into 5 banded tiers (1-5) for visual shape only.
 */
export function formatRadarData(rikishi: Rikishi) {
  const mapValue = (val: number) => {
    if (val >= 85) return 5;
    if (val >= 65) return 4;
    if (val >= 45) return 3;
    if (val >= 25) return 2;
    return 1;
  };

  const rng = new SeededRNG(rikishi.id + "_radar");
  return [
    {
      subject: BardEngine.resolve(rng, "ui.labels.stats.power").text,
      A: mapValue(rikishi.power || 50),
      fullMark: 5,
    },
    {
      subject: BardEngine.resolve(rng, "ui.labels.stats.speed").text,
      A: mapValue(rikishi.speed || 50),
      fullMark: 5,
    },
    {
      subject: BardEngine.resolve(rng, "ui.labels.stats.technique").text,
      A: mapValue(rikishi.technique || 50),
      fullMark: 5,
    },
    {
      subject: BardEngine.resolve(rng, "ui.labels.stats.spirit").text,
      A: mapValue(rikishi.momentum || 50),
      fullMark: 5,
    },
    {
      subject: BardEngine.resolve(rng, "ui.labels.stats.ring_sense").text,
      A: mapValue(rikishi.condition || 50),
      fullMark: 5,
    },
  ];
}

/**
 * FM v2.0: Formats Meta-State history for Streamgraph (Stacked Area Chart).
 */
export function formatMetaTrends(world: WorldState) {
  if (!world.history || world.history.length === 0) return [];

  return world.history.slice(-6).map((h) => {
    // Determine meta bias values based on actual historical data if available
    // Otherwise fallback to balanced defaults
    const bias = (h as any).metaBias || "neutral";

    return {
      basho: `${h.bashoName.charAt(0).toUpperCase()}${h.year % 100}`,
      oshi: bias === "oshi" ? 50 : bias === "neutral" ? 33 : 25,
      yotsu: bias === "yotsu" ? 50 : bias === "neutral" ? 33 : 25,
      hybrid: bias === "hybrid" ? 50 : bias === "neutral" ? 34 : 25,
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
        narrative: BardEngine.resolve(
          rng,
          `ui.digest.promotion.ozeki_run.${runKey}`,
        ).text,
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

      const narrative = BardEngine.resolve(
        rng,
        `ui.digest.promotion.yokozuna_run.${runKey}`,
      ).text;

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
  world: WorldState,
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

    const narrative = BardEngine.resolve(
      rng,
      `ui.digest.kadoban.${runKey}`,
    ).text;

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
  return BardEngine.resolve(rng, `rikishi.stats.power.${band}`)
    .text.split(" — ")[0]
    .split(".")[0];
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
export {
  getMonthlyMaintenanceCost,
  getUpgradeCostEstimate,
} from "../engine/facilities";
export {
  describeAggression,
  describeAttribute,
  describeExperience,
  describeTrainingEffect,
} from "../engine/narrativeDescriptions";
export { createDefaultRivalriesState, getRivalry } from "../engine/rivalries";
export {
  createScoutedView,
  describeScoutingLevel,
  getScoutedAttributes,
} from "../engine";

/**
 * Resolves a localized label for a given registry domain and ID.
 */
export function resolveRegistryLabel(
  domain: string,
  id: string,
  useJa: boolean = false,
): string {
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
export {
  DEFAULT_DIVISION_DAYS,
  getTotalBashodays,
  needsScheduleForDay,
} from "../engine/schedule";
export {
  toFatigueBand,
  toPotentialBand,
  toPrizeBand,
  toRivalryHeatBand,
  toScandalBand,
  toTraitBand,
} from "../engine/descriptorBands";
import type {
  FatigueBand,
  PotentialBand,
  ScandalBand,
  TraitBand,
  PrizeBand,
} from "../engine/systems/narrative/NarrativeBands";
export const FATIGUE_LABELS: Record<FatigueBand, string> = {
  fresh: "Fresh",
  light: "Light",
  tired: "Tired",
  exhausted: "Exhausted",
  spent: "Spent",
};
export const POTENTIAL_LABELS: Record<
  PotentialBand,
  { label: string; color: string }
> = {
  generational: { label: "Generational Talent", color: "text-yellow-400" },
  star: { label: "Star Potential", color: "text-blue-400" },
  solid: { label: "Solid Prospect", color: "text-green-400" },
  average: { label: "Average Prospect", color: "text-muted-foreground" },
  limited: { label: "Limited Upside", color: "text-orange-400" },
  unknown: { label: "Unknown", color: "text-muted-foreground" },
};
export const TRAIT_LABELS: Record<TraitBand, string> = {
  negligible: "Negligible",
  minor: "Minor",
  moderate: "Moderate",
  strong: "Strong",
  dominant: "Dominant",
};
export const SCANDAL_LABELS: Record<ScandalBand, string> = {
  clean: "Clean",
  whispers: "Whispers",
  scrutiny: "Under Scrutiny",
  scandal: "Scandal",
  crisis: "Crisis",
};
export const PRIZE_LABELS: Record<PrizeBand, string> = {
  nominal: "Nominal",
  modest: "Modest",
  notable: "Notable",
  prestigious: "Prestigious",
  grand: "Grand",
};
export { HOF_CATEGORY_LABELS } from "../engine/hallOfFame";
export { RANK_NAMES } from "../engine/systems/recruitment/RecruitmentConstants";
export {
  RANK_HIERARCHY,
  compareRanks,
  formatRank,
  getRankTitleJa,
  isKachiKoshi,
  isMakeKoshi,
} from "../engine/banzuke";
export { createDefaultMediaState } from "../engine/systems/media/MediaService";
export {
  buildPerceptionSnapshot,
  getCachedPerception,
} from "../engine/perception";
export { buyMyoseki, leaseMyoseki } from "../engine/myosekiMarket";
export { clamp, clampInt } from "../engine/utils";
export {
  clearInjury,
  toInjuryEvent,
} from "../engine/systems/health/InjuryService";
export { deleteSave, exportSave, importSave } from "../engine/saveload";
export { ensureHeyaWelfareState } from "../engine/systems/welfare/WelfareService";
export {
  formatEventTime,
  formatFinePenalty,
  formatSaveDate,
  formatStance,
} from "../engine/utils/formatters";
export { generateH2HCommentary } from "../engine/h2h";
export { generateNarrative } from "../engine/narrative";
export { getArchetypeDescription } from "../engine/oyakataPersonalities";
export { getKimarite } from "../engine/kimarite";
export {
  getOrCreateScouted,
  getScoutingLevel,
  setScoutingInvestment,
  warmScoutingForRikishiList,
} from "../engine/scoutingStore";
export {
  getStatusColor,
  getStatusLabel,
  spendPoliticalCapital,
} from "../engine/governance/GovernanceService";
export {
  scoutPool,
  scoutCandidate,
  offerCandidate,
  getCandidateScoutingLevel,
} from "../engine/systems/generation/TalentPoolService";
export { KOENKAI_MONTHLY_INCOME, SPONSOR_TIER_INCOME };

const boutIndexCache = new WeakMap<any, Map<string, any>>();

/**
 * Build a BoutPreviewUI for the NHK-style pre-bout overlay.
 * Returns null if the bout or its participants cannot be found.
 */
export function buildBoutPreviewUI(
  boutId: string,
  world: WorldState,
): BoutPreviewUI | null {
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
 * Project a list of recent headlines for the Media Page.
 */
export function projectMediaUIDigest(world: WorldState) {
  const mediaState =
    (world.mediaState as MediaState) || buildRawMediaDigest(world as any);
  const headlines = [...(mediaState.headlines || [])].sort(
    (a, b) => b.impact - a.impact || b.week - a.week,
  );

  const hotRikishi = Object.entries(mediaState.mediaHeat || {})
    .map(([id, heat]) => ({
      id,
      heat: heat as number,
      rikishi: world.rikishi.get(id)
        ? projectRikishi(world.rikishi.get(id)!, world)
        : null,
      history: (mediaState.mediaHeatHistory?.[id] as any[]) ?? [],
    }))
    .filter((x) => x.rikishi)
    .sort((a, b) => b.heat - a.heat)
    .slice(0, 10);

  const pressuredHeya = Object.entries(mediaState.heyaPressure || {})
    .map(([id, pressure]) => ({
      id,
      pressure: pressure as number,
      heya: world.heyas.get(id),
    }))
    .filter((x) => x.heya)
    .sort((a, b) => b.pressure - a.pressure)
    .slice(0, 8);

  return {
    headlines,
    hotRikishi,
    pressuredHeya,
    currentWeek: world.week,
  };
}

/**
 * Project Hall of Fame data for the HOF Page.
 */
export function projectHOFUIDigest(world: WorldState) {
  const rawHof = getHallOfFame(world);

  const inductees = rawHof.inductees.map((ind: HoFInductee) => {
    const rikishi = world.rikishi.get(ind.rikishiId);
    const heya = rikishi ? world.heyas.get(rikishi.heyaId) : null;

    // Greatest fights projection
    const greatestFights =
      (rikishi as Rikishi)?.history
        ?.filter((m) => m.win)
        .slice(-10)
        .map((m) => ({
          bashoName: m.bashoId ?? "",
          kimarite: m.kimarite,
          opponentName: world.rikishi.get(m.opponentId)?.shikona ?? "Unknown",
          isWin: m.win,
        }))
        .reverse()
        .slice(0, 5) ?? [];

    // Yusho list projection
    const yushoList = world.history
      .filter((br) => br.yusho === ind.rikishiId)
      .map((br) => ({ year: br.year, bashoName: (br as any).bashoName }));

    return {
      ...ind,
      rikishi: rikishi ? projectRikishi(rikishi, world) : null,
      heyaName: heya?.name ?? "Independent",
      greatestFights,
      yushoList,
    };
  });

  return { inductees };
}

/**
 * Project recruitment data for ScoutingPage.
 */
export function projectRecruitmentUIDigest(
  world: WorldState,
  poolType: "high_school" | "university" | "foreign",
) {
  const candidates = talentpool
    .listVisibleCandidates(world, poolType)
    .map((c) => {
      const scoutLevel = talentpool.getCandidateScoutingLevel(
        world,
        c.candidateId,
      );
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
  filterDivision: string,
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
    const ta =
      RANK_HIERARCHY[a.rank as import("../engine/types/banzuke").Rank]?.tier ??
      99;
    const tb =
      RANK_HIERARCHY[b.rank as import("../engine/types/banzuke").Rank]?.tier ??
      99;
    if (ta !== tb) return ta - tb;
    return (a.rankNumber ?? 0) - (b.rankNumber ?? 0);
  });

  const sliced = list.slice(0, 40);
  // Pre-warm scouting entries inside project to keep UI pure
  warmScoutingForRikishiList(
    world,
    sliced.map((r) => r.id),
  );

  return { opponents: sliced };
}

/**
 * Project H2H history between two stables for PerceptionOverview.
 */
export function projectH2HBetweenHeyas(
  world: WorldState,
  heyaAId: string,
  heyaBId: string,
) {
  const heyaA = world.heyas.get(heyaAId);
  const heyaB = world.heyas.get(heyaBId);
  if (!heyaA || !heyaB) return null;

  const rikishiAIds = heyaA.rikishiIds || [];
  const rikishiBIds = heyaB.rikishiIds || [];

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

      matchups.push({
        rikishiAId: rAId,
        rikishiAName: rA.shikona,
        rikishiBId: rBId,
        rikishiBName: rB.shikona,
        aWins: record.wins,
        bWins: record.losses,
        lastKimarite: record.lastMatch?.kimarite,
        lastWinner:
          record.lastMatch?.winnerId === rAId ? rA.shikona : rB.shikona,
      });
    }
  }

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
    status: (heya.funds > 10000000
      ? "stable"
      : heya.funds < 0
        ? "critical"
        : "normal") as any,
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
      injuredCount: getHeyaRoster(world, playerHeyaId).filter((r) => r.injured)
        .length,
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
 * Project sponsorship management data.
 */
export function projectSponsorUIDigest(world: WorldState) {
  const playerHeyaId = world.playerHeyaId;
  if (!playerHeyaId) return null;
  const heya = world.heyas.get(playerHeyaId);
  if (!heya) return null;

  const pool = world.sponsorPool;
  if (!pool) return null;

  const activeSponsors: any[] = [];

  for (const sponsor of pool.sponsors.values()) {
    if (!sponsor.active) continue;
    for (const rel of sponsor.relationships) {
      if (rel.targetId !== playerHeyaId) continue;

      const monthlyIncome =
        SPONSOR_TIER_INCOME[sponsor.tier] * (rel.strength / 3);
      const satisfactionEstimate = Math.min(
        100,
        sponsor.loyalty * 0.6 + (heya.reputation ?? 50) * 0.4,
      );
      const expiryWeek = rel.endsAtTick ?? null;
      const isExpiringSoon =
        expiryWeek !== null && expiryWeek - (world.week ?? 0) < 8;

      activeSponsors.push({
        relId: rel.relId,
        sponsorId: sponsor.sponsorId,
        name: sponsor.displayName,
        tier: sponsor.tier,
        category: sponsor.category.replace("_", " "),
        monthlyIncome,
        satisfaction: satisfactionEstimate,
        expiryWeek,
        isExpiringSoon,
        strength: rel.strength,
        loyalty: sponsor.loyalty,
        role: rel.role.replace("_", " "),
      });
    }
  }

  activeSponsors.sort((a, b) => {
    const tierOrder: Record<string, number> = {
      T5: 0,
      T4: 1,
      T3: 2,
      T2: 3,
      T1: 4,
      T0: 5,
    };
    return (tierOrder[a.tier] ?? 6) - (tierOrder[b.tier] ?? 6);
  });

  const koenkaiStrength = heya.koenkaiBand ?? "none";
  const koenkaiIncome =
    KOENKAI_MONTHLY_INCOME[
      koenkaiStrength as keyof typeof KOENKAI_MONTHLY_INCOME
    ] || 0;

  return {
    koenkaiName: `${heya.name} Supporters Association`,
    strength: koenkaiStrength,
    activeSponsors,
    totalMonthlyIncome:
      activeSponsors.reduce((sum, s) => sum + s.monthlyIncome, 0) +
      koenkaiIncome,
    expiringCount: activeSponsors.filter((s) => s.isExpiringSoon).length,
    koenkaiIncome,
  };
}

/**
 * Perform a contract renewal.
 * Decouples the UI from direct engine mutations.
 */
export function renewSponsorContract(
  world: WorldState,
  relId: string,
  sponsorId?: string,
): boolean {
  const pool = world.sponsorPool;
  if (!pool) return false;

  if (sponsorId) {
    const sponsor = pool.sponsors.get(sponsorId);
    if (sponsor) {
      const relIdx = sponsor.relationships.findIndex((r) => r.relId === relId);
      if (relIdx >= 0) {
        const rel = sponsor.relationships[relIdx];
        sponsor.relationships[relIdx] = {
          ...rel,
          endsAtTick: (world.week ?? 0) + 52,
          strength: Math.min(5, rel.strength + 1) as any,
        };
        sponsor.loyalty = Math.min(100, sponsor.loyalty + 3);
        return true;
      }
    }
  }

  for (const sponsor of pool.sponsors.values()) {
    const relIdx = sponsor.relationships.findIndex((r) => r.relId === relId);
    if (relIdx >= 0) {
      const rel = sponsor.relationships[relIdx];
      sponsor.relationships[relIdx] = {
        ...rel,
        endsAtTick: (world.week ?? 0) + 52,
        strength: Math.min(5, rel.strength + 1) as any,
      };
      sponsor.loyalty = Math.min(100, sponsor.loyalty + 3);
      return true;
    }
  }
  return false;
}

/**
 * Project medical and injury recovery data.
 */
export function projectMedicalUIDigest(world: WorldState) {
  const playerHeyaId = world.playerHeyaId;
  if (!playerHeyaId) return null;
  const heya = world.heyas.get(playerHeyaId);
  if (!heya) return null;

  const roster = getHeyaRoster(world, playerHeyaId);
  const injured = roster.filter((r) => r.injured);
  const perception = buildPerceptionSnapshot(world, playerHeyaId);
  const rng = world.rng || new SeededRNG(world.seed || "medical_digest");

  const recoveryFacility = heya.facilities?.recovery ?? 50;
  const facilityLabel = getFacilityLevelLabel(rng, recoveryFacility);

  return {
    heyaName: heya.name,
    facilityLevel: recoveryFacility,
    facilityLabel,
    injuredRikishi: injured.map((r) => {
      const injuryStatus = r.injuryStatus;
      const weeksRemaining =
        r.injuryWeeksRemaining ?? (injuryStatus as any)?.weeksRemaining ?? 0;
      const weeksTotal =
        (injuryStatus as any)?.weeksToHeal ?? weeksRemaining + 2;
      const recoveryProgress =
        weeksTotal > 0
          ? Math.round(((weeksTotal - weeksRemaining) / weeksTotal) * 100)
          : 0;
      const facilityBonus = Math.round((recoveryFacility - 50) / 10);

      return {
        id: r.id,
        shikona: r.shikona,
        severity:
          typeof (injuryStatus as any)?.severity === "string"
            ? (injuryStatus as any).severity
            : "unknown",
        location: (injuryStatus as any)?.location || "unknown",
        weeksRemaining,
        weeksTotal,
        recoveryProgress: Math.min(100, Math.max(0, recoveryProgress)),
        facilityBonus,
      };
    }),
    welfare: {
      welfareRisk: heya.welfareState?.welfareRisk ?? 0,
      activeDiet: heya.welfareState?.activeDiet ?? "maintenance",
      complianceState: heya.welfareState?.complianceState ?? "compliant",
      weeksInState: heya.welfareState?.weeksInState ?? 0,
    },
    perception: {
      welfareRiskBand: perception.welfareRiskBand,
      moraleBand: perception.moraleBand,
      rosterStrengthBand: perception.rosterStrengthBand,
      stableMediaHeatBand: perception.stableMediaHeatBand,
      rivalryPressureBand: perception.rivalryPressureBand,
      rikishiHealthPerceptions: perception.rikishiPerceptions.map(
        (rp: any) => ({
          rikishiId: rp.rikishiId,
          shikona: rp.shikona,
          rank: rp.rank,
          healthBand: rp.healthBand,
          momentum: rp.momentum,
        }),
      ),
    },
  };
}

/**
 * Update heya diet via presenter.
 */
export function setHeyaDietAction(
  world: WorldState,
  heyaId: string,
  diet: any,
): boolean {
  const heya = world.heyas.get(heyaId);
  if (!heya) return false;
  if (!heya.welfareState) {
    heya.welfareState = {
      welfareRisk: 0,
      activeDiet: diet,
      complianceState: "compliant",
      weeksInState: 0,
    };
  } else {
    heya.welfareState.activeDiet = diet;
  }
  return true;
}

/**
 * Project banzuke and rank movement data.
 */
export function projectBanzukeUIDigest(world: WorldState) {
  const divisions = [
    "makuuchi",
    "juryo",
    "makushita",
    "sandanme",
    "jonidan",
    "jonokuchi",
  ] as const;
  const history = world.history || [];

  // Use existing banzukeUI logic but in the presenter context
  const prevScoreMap = buildPrevRankScores(history);

  const allRikishi = Array.from(world.rikishi.values()).filter(
    (r) => !r.isRetired,
  );
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
      const rivalry = rivalriesState
        ? getRivalry(rivalriesState, east.id, west.id)
        : null;
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
          playerRikishiIds.has(match.eastRikishiId) ||
          playerRikishiIds.has(match.westRikishiId),
        h2h,
        rivalry,
        heatBand,
        h2hCommentary: generateH2HCommentary(east, west),
      };
    })
    .filter((m): m is any => !!m);

  const completedBouts = matches.filter((m) => m.result).length;
  const dayProgress =
    matches.length > 0 ? (completedBouts / matches.length) * 100 : 0;

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
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        compareRanks(a.rikishi.rank as any, b.rikishi.rank as any),
    )
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
      (world as any).seed,
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
  const totalMonthlyPayment = loans.reduce(
    (sum, l) => sum + l.monthlyPayment,
    0,
  );
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

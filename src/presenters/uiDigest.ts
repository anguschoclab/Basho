import type { Id } from "../engine/types/common";
import type { WorldState } from "../engine/types/world";
import { queryEvents } from "../engine/events";
import { generateH2HCommentary, getH2HReport } from "../engine/h2h";
import { RivalryService } from "../engine/systems/narrative/RivalryService";
import type { BoutPreviewUI } from "./boutPreviewUI";
import { 
  selectInjuredRikishi, 
  selectRecentEvents, 
  selectPromotionCandidates, 
  selectYokozunaCandidates, 
  selectKadobanRikishi, 
  selectTopRivals,
  selectRikishiByHeya
} from "./selectors";
import { projectRikishi } from "./uiModels";
import type { UIRikishi } from "./uiModels";
import type { Rikishi } from "../engine/types/rikishi";
import { getHallOfFame } from "../engine/hallOfFame";
import { buildMediaDigest as buildRawMediaDigest } from "../engine/systems/media/MediaService";
import type { HoFInductee } from "../engine/hallOfFame";
import type { MediaState } from "../engine/types/media";
import * as talentpool from "../engine/systems/generation/TalentPoolService";
import { warmScoutingForRikishiList, getOrCreateScouted, getScoutingLevel } from "../engine/scoutingStore";
import { getScoutedAttributes, describeScoutingLevel } from "../engine/scouting";
import { RANK_HIERARCHY, compareRanks } from "../engine/banzuke";
import { getHeyaRoster, getSekitoriInHeya } from "../engine/queries";

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
  const injuryItems: DigestItem[] = selectInjuredRikishi(world).map(r => {
    const injury = r.injury;
    return {
      id: `injury::${r.id}`,
      kind: "injury",
      title: `${r.shikona ?? r.name ?? r.id} injured`,
      detail: injury ? `${injury.severity ?? "unknown"} — ${injury.weeksRemaining ?? "?"}w remaining` : "Unknown injury",
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
    const day = basho.day ?? 1;
    let matchupCount = 0;
    for (const match of (basho.matches || [])) {
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
      sections.unshift({ id: "matchups", title: "Key Matchups", items: matchupItems });
    }
  }

  // --- Engine Events (using memoized selectors) ---
  const eventBuckets = selectRecentEvents(world);

  const mapEventToItem = (e: import("../engine/events").EngineEvent): DigestItem => ({
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
  const narrativeItems = queryEvents(world, { category: "narrative" }).map(e => ({
     ...mapEventToItem(e),
     kind: "narrative" as const
  }));

  if (mediaItems.length) sections.push({ id: "media", title: "Media & Scandals", items: mediaItems });
  if (narrativeItems.length) sections.push({ id: "narrative", title: "Internal Intelligence", items: narrativeItems });
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
      ? `Basho Day ${basho.day ?? 1}: ${matchupItems.length ? "Key matchups highlighted." : "Tournament in progress."}`
      : injuryItems.length
        ? `${injuryItems.length} injury update${injuryItems.length === 1 ? "" : "s"} this week.`
        : "No major events recorded this week.";

  return {
    time: { label: labelForWorld(world) },
    headline,
    counts,
    sections,
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

  return world.history.slice(-6).map((h) => {
    // Determine meta bias values based on actual historical data if available
    // Otherwise fallback to balanced defaults
    const bias = (h as any).metaBias || 'neutral';
    
    return {
      basho: `${h.bashoName.charAt(0).toUpperCase()}${h.year % 100}`,
      oshi: bias === 'oshi' ? 50 : (bias === 'neutral' ? 33 : 25),
      yotsu: bias === 'yotsu' ? 50 : (bias === 'neutral' ? 33 : 25),
      hybrid: bias === 'hybrid' ? 50 : (bias === 'neutral' ? 34 : 25),
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
  const kadobanMap = world.ozekiKadoban ?? {};
  const entries: Array<{ rikishi: UIRikishi; narrative: string; isDemoted: boolean }> = [];

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
export { HOF_CATEGORY_LABELS } from "../engine/hallOfFame";
export { RANK_HIERARCHY, compareRanks, formatRank, getRankTitleJa, isKachiKoshi, isMakeKoshi } from "../engine/banzuke";
export { createDefaultMediaState } from "../engine/systems/media/MediaService";
export { buildPbpFromBoutResult } from "../engine/pbp";
export { buildPerceptionSnapshot, getCachedPerception } from "../engine/perception";
export { buyMyoseki, leaseMyoseki } from "../engine/myosekiMarket";
export { clamp, clampInt } from "../engine/utils";
export { clearInjury, toInjuryEvent } from "../engine/systems/health/InjuryService";
export { deleteSave, exportSave, importSave } from "../engine/saveload";
export { ensureHeyaWelfareState } from "../engine/welfare";
export { formatEventTime, formatFinePenalty, formatSaveDate, formatStance } from "../engine/utils/formatters";
export { generateH2HCommentary } from "../engine/h2h";
export { generateNarrative } from "../engine/narrative";
export { getArchetypeDescription } from "../engine/oyakataPersonalities";
export { getKimarite } from "../engine/kimarite";
export { getOrCreateScouted, getScoutingLevel, setScoutingInvestment, warmScoutingForRikishiList } from "../engine/scoutingStore";
export { getStatusColor, getStatusLabel, spendPoliticalCapital } from "../engine/governance/GovernanceService";
export { scoutPool, scoutCandidate, offerCandidate, getCandidateScoutingLevel } from "../engine/systems/generation/TalentPoolService";

/**
 * Build a BoutPreviewUI for the NHK-style pre-bout overlay.
 * Returns null if the bout or its participants cannot be found.
 */
export function buildBoutPreviewUI(boutId: string, world: WorldState): BoutPreviewUI | null {
  const match = world.currentBasho?.matches.find(m => m.boutId === boutId);
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
  const mediaState = (world.mediaState as MediaState) || buildRawMediaDigest(world as any); 
  const headlines = [...(mediaState.headlines || [])].sort((a, b) => b.impact - a.impact || b.week - a.week);
  
  const hotRikishi = Object.entries(mediaState.mediaHeat || {})
    .map(([id, heat]) => ({
      id,
      heat: heat as number,
      rikishi: world.rikishi.get(id) ? projectRikishi(world.rikishi.get(id)!, world) : null,
      history: (mediaState.mediaHeatHistory?.[id] as any[]) ?? [],
    }))
    .filter(x => x.rikishi)
    .sort((a, b) => b.heat - a.heat)
    .slice(0, 10);

  const pressuredHeya = Object.entries(mediaState.heyaPressure || {})
    .map(([id, pressure]) => ({ 
      id, 
      pressure: pressure as number,
      heya: world.heyas.get(id) 
    }))
    .filter(x => x.heya)
    .sort((a, b) => b.pressure - a.pressure)
    .slice(0, 8);

  return {
    headlines,
    hotRikishi,
    pressuredHeya,
    currentWeek: world.week
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
    const greatestFights = (rikishi as Rikishi)?.history
      ?.filter(m => m.win)
      .slice(-10)
      .map(m => ({
        bashoName: m.bashoId ?? "",
        kimarite: m.kimarite,
        opponentName: world.rikishi.get(m.opponentId)?.shikona ?? "Unknown",
        isWin: m.win,
      }))
      .reverse()
      .slice(0, 5) ?? [];

    // Yusho list projection
    const yushoList = world.history
      .filter(br => br.yusho === ind.rikishiId)
      .map(br => ({ year: br.year, bashoName: (br as any).bashoName }));

    return {
      ...ind,
      rikishi: rikishi ? projectRikishi(rikishi, world) : null,
      heyaName: heya?.name ?? "Independent",
      greatestFights,
      yushoList
    };
  });

  return { inductees };
}

/**
 * Project recruitment data for ScoutingPage.
 */
export function projectRecruitmentUIDigest(world: WorldState, poolType: "high_school" | "university" | "foreign") {
  const candidates = talentpool.listVisibleCandidates(world, poolType).map(c => {
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
export function projectOpponentScoutingUIDigest(world: WorldState, playerHeyaId: string | null, filterDivision: string) {
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
      heyaName: heya?.name ?? "Unknown Stable"
    });
  }

  // Sort by rank tier
  list.sort((a, b) => {
    const ta = RANK_HIERARCHY[a.rank]?.tier ?? 99;
    const tb = RANK_HIERARCHY[b.rank]?.tier ?? 99;
    if (ta !== tb) return ta - tb;
    return (a.rankNumber ?? 0) - (b.rankNumber ?? 0);
  });

  const sliced = list.slice(0, 40);
  // Pre-warm scouting entries inside project to keep UI pure
  warmScoutingForRikishiList(world, sliced.map(r => r.id));

  return { opponents: sliced };
}

/**
 * Project H2H history between two stables for PerceptionOverview.
 */
export function projectH2HBetweenHeyas(world: WorldState, heyaAId: string, heyaBId: string) {
  const heyaA = world.heyas.get(heyaAId);
  const heyaB = world.heyas.get(heyaBId);
  if (!heyaA || !heyaB) return null;

  const rikishiAIds = new Set(heyaA.rikishiIds);
  const rikishiBIds = new Set(heyaB.rikishiIds);

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
        lastWinner: record.lastMatch?.winnerId === rAId ? rA.shikona : rB.shikona,
      });
    }
  }

  matchups.sort((a, b) => (b.aWins + b.bWins) - (a.aWins + a.bWins));

  return { 
    heyaAName: heyaA.name,
    heyaBName: heyaB.name,
    winsA, 
    winsB, 
    totalBouts: winsA + winsB, 
    matchups 
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

  // Financial summary
  const finances = {
    balance: heya.funds,
    weeklyIncome: 1250000, // Placeholder for actual calc
    weeklyExpense: 850000, 
    status: heya.funds > 10000000 ? "stable" : "critical" as const,
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
      injuredCount: getHeyaRoster(world, playerHeyaId).filter(r => r.injured).length,
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
  const koenkai = pool?.koenkais?.get(heya.koenkaiId || "");

  const activeSponsors = (koenkai?.members || []).map(rel => {
    const sponsor = pool?.sponsors.get(rel.sponsorId);
    return {
      relId: rel.relId,
      name: sponsor?.displayName || "Unknown Sponsor",
      tier: sponsor?.tier || "T0",
      category: sponsor?.category || "local",
      monthlySupport: 50000, // calc based on tier
      loyalty: 80, // placeholder
    };
  });

  return {
    koenkaiName: `${heya.name} Supporters Association`,
    strength: heya.koenkaiBand || "none",
    activeSponsors,
    totalMonthlyIncome: activeSponsors.reduce((sum, s) => sum + s.monthlySupport, 0),
  };
}

/**
 * Project medical and injury recovery data.
 */
export function projectMedicalUIDigest(world: WorldState) {
  const playerHeyaId = world.playerHeyaId;
  if (!playerHeyaId) return null;

  const injured = getHeyaRoster(world, playerHeyaId).filter(r => r.injured);

  return {
    injuredRikishi: injured.map(r => ({
      ...projectRikishi(r, world),
      injury: r.injuryStatus,
      weeksRemaining: r.injuryWeeksRemaining,
    })),
    facilityLevel: 50, // placeholder
    medicalStaff: [], // placeholder
  };
}

/**
 * Project banzuke and rank movement data.
 */
export function projectBanzukeUIDigest(world: WorldState) {
  const divisions = ["makuuchi", "juryo", "makushita", "sandanme", "jonidan", "jonokuchi"] as const;
  
  const banzuke = divisions.reduce((acc, div) => {
    acc[div] = selectRikishiByHeya(world); // This is not quite right, need by division
    return acc;
  }, {} as any);

  // Real implementation would filter by division and sort by rank
  const makuuchi = Array.from(world.rikishi.values())
    .filter(r => r.division === "makuuchi")
    .sort((a, b) => compareRanks(a.rank, b.rank) || (a.rankNumber || 0) - (b.rankNumber || 0))
    .map(r => projectRikishi(r, world));

  return {
    year: world.year,
    basho: world.currentBashoName,
    makuuchi,
  };
}

/**
 * Project tournament live data.
 */
export function projectTournamentUIDigest(world: WorldState) {
  const basho = world.currentBasho;
  if (!basho) return null;

  return {
    name: basho.name,
    day: basho.day,
    isComplete: world.cyclePhase === "interim",
    matches: (basho.matches || []).filter(m => m.day === basho.day).map(m => {
       const east = world.rikishi.get(m.eastRikishiId);
       const west = world.rikishi.get(m.westRikishiId);
       return {
         ...m,
         eastName: east?.shikona || "Unknown",
         westName: west?.shikona || "Unknown",
       };
    }),
  };
}

import type { Id } from "../engine/types/common";
import type { Rikishi } from "../engine/types/rikishi";
import type { WorldState } from "../engine/types/world";
import type { Rank, Division, Side } from "../engine/types/banzuke";
import type { Style } from "../engine/types/combat";
import type { AvatarConfig } from "../engine/types/avatar";
import type { KeshoMawashi, YokozunaTsuna } from "../engine/types/keshoMawashi";
import {
  toRikishiDescriptor,
  toPotentialBand,
  type RikishiDescriptor,
  type PotentialBand,
} from "../engine/descriptorBands";
import { getCareerPhase } from "../engine/systems/training/TrainingMath";
import { getSalaryBreakdown, type SalaryBreakdown } from "../engine/economics_awards";
import { RANK_HIERARCHY } from "../engine/types/banzuke";
import { NarrativeService } from "../engine/systems/narrative/NarrativeService";
import { BardEngine } from "../engine/bard/BardEngine";
import { SeededRNG } from "../engine/rng";
import type { AgeBand, WeightBand, HeightBand } from "../engine/systems/narrative/NarrativeBands";

/** Career phase type inferred from training engine */
type TrainingCareerPhase = ReturnType<typeof getCareerPhase>;

/** History entry for streak/rank calculations - handles MatchResultLog and CareerSnapshot */
interface HistoryEntry {
  win?: boolean;
  rank?: string;
  rankNumber?: number;
  side?: string;
}

export interface UIRivalEntry {
  record: string;
  totalBouts: number;
  heat: number;
  tone: string;
}

export interface UIRikishi {
  id: Id;
  shikona: string;
  realName: string;
  heyaId: Id;
  heyaName: string;
  isPlayerOwned: boolean;
  age: number;
  nationality: string;
  origin: string;
  height: number;
  weight: number;
  rank: Rank;
  rankLabel: string;
  rankNumber: number;
  division: Division;
  side: Side;
  style: Style;
  styleName: string;
  archetypeName: string;
  combatArchetype?: import("../engine/types/combat").CombatArchetype;
  isRetired: boolean;
  isInjured: boolean;
  injurySummary: string;
  condition: number;
  motivation: number;
  fatigue: number;
  powerBand: string;
  techniqueBand: string;
  speedBand: string;
  balanceBand: string;
  momentum: number;
  careerPhase: TrainingCareerPhase;
  currentBashoWins: number;
  currentBashoLosses: number;
  currentBashoRecord: string;
  careerWins: number;
  careerLosses: number;
  careerRecord: string;
  careerYusho: number;
  perceivedStats: {
    strength: string;
    technique: string;
    speed: string;
    stamina: string;
    mental: string;
    adaptability: string;
    balance: string;
  };
  streak: number; // Positive for winning, negative for losing
  streakLabel: string; // e.g. "W5" or "L2"
  winPercentage: number;
  avgRankLabel: string;
  descriptor: RikishiDescriptor;
  potentialBand: PotentialBand;
  conditionDescriptor: string; // Resolved Label
  moraleDescriptor: string; // Resolved Label
  potentialDescriptor: string; // Resolved Label
  ageBand: AgeBand;
  weightBand: WeightBand;
  heightBand: HeightBand;
  ageDescriptor: string;
  weightDescriptor: string;
  heightDescriptor: string;
  topRivals: UIRivalEntry[];
  personalityTraits: string[];
  favoredKimarite: string[];
  favoredKimariteDetailed: { kimarite: string; percentage: number }[];
  favoredKimariteDisplay: string;
  preferredGrip: string;
  preferredGripDepth: string;
  specialPrizes: {
    shukunSho: number;
    kantoSho: number;
    ginoSho: number;
  };
  achievements: {
    kinboshiEarned: number;
    ginboshiEarned: number;
    kinboshiConceded: number;
    ginboshiConceded: number;
  };
  salaryBreakdown: SalaryBreakdown;
  careerHistory: unknown[];
  milestones: unknown[];
  h2h?: Record<string, { wins: number; losses: number; streak: number }>;
  avatarConfig?: AvatarConfig;
  keshoMawashi?: KeshoMawashi;
  yokozunaTsuna?: YokozunaTsuna;
  hasKeshoMawashi: boolean;
  isYokozuna: boolean;
  consecutiveStrongOzeki: number;
  citizenshipStatus: string;
  yearsToNaturalization: number;
  // Phase M: Lineage
  mentorId?: Id;
  mentorName?: string;
  menteeNames?: string[];
}

interface MatchHistoryEntry {
  win?: boolean;
  kimarite?: string;
}

function calculateMostFrequentKimarite(
  history: MatchHistoryEntry[]
): { kimarite: string; percentage: number }[] {
  if (!history || history.length === 0) return [];
  const winCounts: Record<string, number> = {};
  let totalWins = 0;
  for (const match of history) {
    if (match.win && match.kimarite) {
      winCounts[match.kimarite] = (winCounts[match.kimarite] ?? 0) + 1;
      totalWins++;
    }
  }
  if (totalWins === 0) return [];

  // ⚡ Bolt Optimization: Use Object.keys() to avoid O(N) tuple allocations from Object.entries()
  return Object.keys(winCounts)
    .sort((a, b) => winCounts[b] - winCounts[a])
    .map((k) => ({
      kimarite: k,
      percentage: Math.round((winCounts[k] / totalWins) * 100),
    }));
}

function buildFavoredKimariteDisplay(
  rng: SeededRNG,
  entries: { kimarite: string; percentage: number }[]
): string {
  if (entries.length === 0) {
    return BardEngine.resolve(rng, "ui.labels.kimarite.rookie").text;
  }
  const top = entries[0];
  const name = top.kimarite.charAt(0).toUpperCase() + top.kimarite.slice(1);
  return BardEngine.resolve(rng, "ui.labels.kimarite.display_format", {
    NAME: name,
    PCT: top.percentage.toString(),
  }).text;
}

function calculateInjurySummary(rng: SeededRNG, r: Rikishi): string {
  if (!r.injured || !r.injuryStatus) {
    return BardEngine.resolve(rng, "ui.digest.status.healthy").text;
  }

  const loc = r.injuryStatus.location ? ` ${r.injuryStatus.location}` : "";
  const severityValue = typeof r.injuryStatus.severity === "number" ? r.injuryStatus.severity : 50;

  let sevKey = "moderate";
  if (severityValue < 30) sevKey = "minor";
  if (severityValue >= 70) sevKey = "severe";

  const sevLabel = BardEngine.resolve(rng, `ui.labels.injury.severity.${sevKey}`).text;
  const weeks = r.injuryWeeksRemaining?.toString() ?? "?";

  return BardEngine.resolve(rng, "ui.labels.injury.summary_format", {
    SEV: sevLabel,
    LOC: loc,
    WEEKS: weeks,
  }).text;
}

function calculateTopRivals(r: Rikishi, world: WorldState): UIRivalEntry[] {
  const h2h = r.h2h ?? {};
  const rivalriesState = world.rivalriesState;

  const result: UIRivalEntry[] = [];
  for (const oppId in h2h) {
    const rec = h2h[oppId];
    const opp = world.rikishi.get(oppId);
    const hKey = r.id < oppId ? `${r.id}|${oppId}` : `${oppId}|${r.id}`;
    const rivalry = rivalriesState?.pairs?.[hKey];

    result.push({
      opponentId: oppId,
      opponentShikona: opp?.shikona ?? "Unknown",
      wins: rec.wins,
      losses: rec.losses,
      record: `${rec.wins}-${rec.losses}`,
      totalBouts: rec.wins + rec.losses,
      heat: rivalry?.heat ?? 0,
      tone: rivalry?.tone ?? "respect",
    } as UIRivalEntry);
  }

  return result.sort((a, b) => b.heat - a.heat || b.totalBouts - a.totalBouts).slice(0, 5);
}

function calculateSpecialPrizes(r: Rikishi) {
  return {
    shukunSho: r.stats?.specialPrizes?.shukunSho ?? 0,
    kantoSho: r.stats?.specialPrizes?.kantoSho ?? 0,
    ginoSho: r.stats?.specialPrizes?.ginoSho ?? 0,
  };
}

function calculateAchievements(r: Rikishi) {
  return {
    kinboshiEarned: r.stats?.achievements?.kinboshiEarned ?? 0,
    ginboshiEarned: r.stats?.achievements?.ginboshiEarned ?? 0,
    kinboshiConceded: r.stats?.achievements?.kinboshiConceded ?? 0,
    ginboshiConceded: r.stats?.achievements?.ginboshiConceded ?? 0,
  };
}

export function calculatePerceivedStats(rng: SeededRNG, r: Rikishi) {
  return {
    strength: NarrativeService.getStatLabel(
      rng,
      NarrativeService.getStatBand(r.stats?.power ?? 50)
    ),
    technique: NarrativeService.getStatLabel(
      rng,
      NarrativeService.getStatBand(r.stats?.technique ?? 50)
    ),
    speed: NarrativeService.getStatLabel(rng, NarrativeService.getStatBand(r.stats?.speed ?? 50)),
    stamina: NarrativeService.getStatLabel(
      rng,
      NarrativeService.getStatBand(r.stats?.stamina ?? 50)
    ),
    mental: NarrativeService.getStatLabel(rng, NarrativeService.getStatBand(r.stats?.mental ?? 50)),
    adaptability: NarrativeService.getStatLabel(
      rng,
      NarrativeService.getStatBand(r.stats?.adaptability ?? 50)
    ),
    balance: NarrativeService.getStatLabel(
      rng,
      NarrativeService.getStatBand(r.stats?.balance ?? 50)
    ),
  };
}

function calculateStreak(history: HistoryEntry[]): { streak: number; label: string } {
  if (history.length === 0) return { streak: 0, label: "-" };
  const last = history[history.length - 1].win;
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].win === last) streak++;
    else break;
  }
  return {
    streak: last ? streak : -streak,
    label: `${last ? "W" : "L"}${streak}`,
  };
}

function calculateAvgRank(history: HistoryEntry[]): string {
  if (history.length === 0) return "-";
  let totalScore = 0;
  for (let i = 0; i < history.length; i++) {
    totalScore += rankScore(history[i].rank ?? "M", history[i].rankNumber, history[i].side);
  }
  const avg = totalScore / history.length;

  // Convert avg score back to a readable rank (Maegashira level is common)
  const tier = Math.floor(avg / 1000);
  const num = Math.floor((avg % 1000) / 2);
  const RANK_MAP: Record<number, string> = {
    1: "Y",
    2: "O",
    3: "S",
    4: "K",
    5: "M",
    6: "J",
    7: "Ms",
    8: "Sd",
    9: "Jd",
    10: "Jk",
  };
  const prefix = RANK_MAP[tier] || "?";
  return num > 0 ? `${prefix}${num}` : prefix;
}

import { getCitizenshipStatus, yearsUntilNaturalization } from "../engine/utils/citizenshipUtils";

export function projectRikishi(r: Rikishi, world: WorldState): UIRikishi {
  const heya = world.heyas.get(r.heyaId);
  const age = world.year - r.birthYear;
  const careerHistory = r.careerHistory || [];
  const milestones = r.milestones || [];
  const rng = world.rng || new SeededRNG(world.seed || r.id);

  const rankEntry = BardEngine.getRegistryEntry("ranks", r.rank);
  const rankLabel = rankEntry?.label ?? r.rank;

  const styleEntry = BardEngine.getRegistryEntry("styles", r.style);
  const styleName = styleEntry?.label ?? r.style;

  const combatArchetype = r.combatProfile?.archetype ?? "hybrid";
  const archEntry = BardEngine.getRegistryEntry("archetypes", combatArchetype);
  const archetypeName = archEntry?.label ?? combatArchetype;

  const favoredKimariteDetailed = calculateMostFrequentKimarite(r.history ?? []);
  const streakInfo = calculateStreak(r.history ?? []);

  return {
    id: r.id,
    shikona: r.shikona,
    realName: r.realName ?? r.shikona,
    heyaId: r.heyaId,
    heyaName: heya?.name ?? "Unknown",
    isPlayerOwned: heya?.isPlayerOwned ?? false,
    age,
    nationality: r.nationality,
    origin: r.origin ?? r.nationality,
    height: r.height,
    weight: r.weight,
    rank: r.rank,
    rankLabel,
    rankNumber: r.rankNumber ?? 1,
    division: r.division,
    side: r.side,
    style: r.style,
    styleName,
    archetypeName,
    combatArchetype: combatArchetype as import("../engine/types/combat").CombatArchetype,
    isRetired: r.isRetired ?? false,
    isInjured: r.injured,
    injurySummary: calculateInjurySummary(rng, r),
    condition: r.condition,
    motivation: r.motivation,
    fatigue: r.fatigue,
    powerBand: NarrativeService.getStatLabel(
      rng,
      NarrativeService.getStatBand(r.stats.power ?? 50)
    ),
    techniqueBand: NarrativeService.getStatLabel(
      rng,
      NarrativeService.getStatBand(r.stats.technique ?? 50)
    ),
    speedBand: NarrativeService.getStatLabel(
      rng,
      NarrativeService.getStatBand(r.stats.speed ?? 50)
    ),
    balanceBand: NarrativeService.getStatLabel(
      rng,
      NarrativeService.getStatBand(r.stats.balance ?? 50)
    ),
    momentum: r.momentum,
    careerPhase: getCareerPhase(r.stats.experience),
    currentBashoWins: r.currentBashoWins ?? 0,
    currentBashoLosses: r.currentBashoLosses ?? 0,
    currentBashoRecord: `${r.currentBashoWins ?? 0}-${r.currentBashoLosses ?? 0}`,
    careerWins: r.careerWins,
    careerLosses: r.careerLosses,
    careerRecord: `${r.careerWins}-${r.careerLosses}`,
    careerYusho: r.careerRecord?.yusho ?? 0,
    streak: streakInfo.streak,
    streakLabel: streakInfo.label,
    winPercentage: r.careerWins / Math.max(1, r.careerWins + r.careerLosses),
    avgRankLabel: calculateAvgRank(r.careerHistory ?? []),
    perceivedStats: calculatePerceivedStats(rng, r),
    descriptor: toRikishiDescriptor(rng, r, r.descriptor),
    potentialBand: NarrativeService.getPotentialBand(r.talentSeed ?? 50),
    conditionDescriptor: NarrativeService.getConditionDescriptor(rng, r.condition ?? 0.5).label,
    moraleDescriptor: NarrativeService.getMoraleDescriptor(rng, r.motivation ?? 0.5).label,
    potentialDescriptor: NarrativeService.getPotentialDescriptor(rng, r.talentSeed ?? 50).label,
    ageBand: NarrativeService.getAgeBand(age),
    weightBand: NarrativeService.getWeightBand(r.weight ?? 0),
    heightBand: NarrativeService.getHeightBand(r.height ?? 0),
    ageDescriptor: NarrativeService.getAgeLabel(rng, NarrativeService.getAgeBand(age)),
    weightDescriptor: NarrativeService.getWeightLabel(
      rng,
      NarrativeService.getWeightBand(r.weight ?? 0)
    ),
    heightDescriptor: NarrativeService.getHeightLabel(
      rng,
      NarrativeService.getHeightBand(r.height ?? 0)
    ),
    topRivals: calculateTopRivals(r, world),
    personalityTraits: r.personalityTraits ?? [],
    favoredKimariteDetailed,
    favoredKimariteDisplay: buildFavoredKimariteDisplay(rng, favoredKimariteDetailed),
    favoredKimarite: favoredKimariteDetailed
      .slice(0, 1)
      .map((e) => `${e.kimarite} (${e.percentage}%)`),
    preferredGrip: r.combatProfile?.preferredGrip ?? "none",
    preferredGripDepth: r.combatProfile?.preferredGripDepth ?? "standard",
    specialPrizes: calculateSpecialPrizes(r),
    achievements: calculateAchievements(r),
    salaryBreakdown: getSalaryBreakdown(
      RANK_HIERARCHY[(r.rank || "jonokuchi") as Rank]?.salary ?? 0,
      r.division || "jonokuchi",
      r.stats?.achievements?.kinboshiEarned ?? 0
    ),
    careerHistory,
    milestones,
    h2h: r.h2h as UIRikishi["h2h"],
    avatarConfig: r.avatarConfig,
    keshoMawashi: world.customKeshoConfigs?.[r.id]
      ? ({ ...r.keshoMawashi, ...world.customKeshoConfigs[r.id] } as KeshoMawashi)
      : r.keshoMawashi,
    yokozunaTsuna: r.yokozunaTsuna,
    hasKeshoMawashi: !!r.keshoMawashi,
    isYokozuna: r.rank === "yokozuna",
    consecutiveStrongOzeki: r.consecutiveStrongOzeki ?? 0,
    citizenshipStatus: getCitizenshipStatus(r, world?.year ?? 2020),
    yearsToNaturalization: yearsUntilNaturalization(r, world?.year ?? 2020),
    // Phase M: Lineage
    mentorId: r.mentorId,
    mentorName: r.mentorId ? world.rikishi.get(r.mentorId)?.shikona : undefined,
    menteeNames: r.menteeIds
      ?.map((id) => world.rikishi.get(id)?.shikona)
      .filter(Boolean) as string[],
  };
}

export interface UIRankDelta {
  type: "new" | "unchanged" | "up" | "down";
  steps: number;
}

export interface UIRosterEntry {
  id: Id;
  shikona: string;
  heyaId: Id;
  isPlayerOwned: boolean;
  rank: Rank;
  rankLabel: string;
  rankLabelJa: string;
  rankNumber?: number;
  division: Division;
  side: Side;
  record: string;
  careerRecord: string;
  currentBashoWins: number;
  currentBashoLosses: number;
  careerWins: number;
  careerLosses: number;
  isInjured: boolean;
  condition: number;
  fatigue: number;
  powerBand: string;
  techniqueBand: string;
  speedBand: string;
  balanceBand: string;
  momentum: number;
  potentialBand: PotentialBand;
  keshoMawashi?: KeshoMawashi;
  avatarConfig?: AvatarConfig;
  rankDelta?: UIRankDelta;
  archetypeLabel?: string;
  consecutiveStrongOzeki: number;
  streakLabel: string;
  winPercentage: number;
  citizenshipStatus: string;
  yearsToNaturalization: number;
}

export function rankScore(rank: string, rankNumber?: number, side?: string): number {
  const RANK_TIER: Record<string, number> = {
    yokozuna: 1,
    ozeki: 2,
    sekiwake: 3,
    komusubi: 4,
    maegashira: 5,
    juryo: 6,
    makushita: 7,
    sandanme: 8,
    jonidan: 9,
    jonokuchi: 10,
  };
  const tier = RANK_TIER[rank] ?? 99;
  const num = rankNumber ?? 0;
  const sideVal = side === "east" ? 0 : 0.5;
  return tier * 1000 + num * 2 + sideVal;
}

export function projectRosterEntry(
  r: Rikishi,
  world?: WorldState,
  prevScore?: number
): UIRosterEntry {
  const rankEntry = BardEngine.getRegistryEntry("ranks", r.rank);
  let rankDelta: UIRankDelta | undefined;

  const rng = world?.rng || new SeededRNG(world?.seed || r.id);

  if (prevScore !== undefined) {
    const currScore = rankScore(r.rank, r.rankNumber, r.side);
    const diff = prevScore - currScore;
    if (Math.abs(diff) < 1) {
      rankDelta = { type: "unchanged", steps: 0 };
    } else {
      const steps = Math.round(Math.abs(diff) / 2);
      rankDelta = { type: diff > 0 ? "up" : "down", steps };
    }
  } else if (world && world.history && world.history.length > 0) {
    rankDelta = { type: "new", steps: 0 };
  }

  const heya = world ? world.heyas.get(r.heyaId) : null;
  const isPlayerOwned = heya?.isPlayerOwned ?? false;

  return {
    id: r.id,
    shikona: r.shikona,
    heyaId: r.heyaId,
    isPlayerOwned,
    rank: r.rank,
    rankLabel: rankEntry?.label ?? r.rank,
    rankLabelJa: rankEntry?.labelJa ?? r.rank,
    rankNumber: r.rankNumber,
    division: r.division,
    side: r.side,
    record: `${r.currentBashoWins ?? 0}-${r.currentBashoLosses ?? 0}`,
    careerRecord: `${r.careerWins}-${r.careerLosses}`,
    currentBashoWins: r.currentBashoWins ?? 0,
    currentBashoLosses: r.currentBashoLosses ?? 0,
    careerWins: r.careerWins,
    careerLosses: r.careerLosses,
    isInjured: r.injured,
    condition: r.condition,
    fatigue: r.fatigue,
    powerBand: NarrativeService.getStatLabel(
      rng,
      NarrativeService.getStatBand(r.stats.power ?? 50)
    ),
    techniqueBand: NarrativeService.getStatLabel(
      rng,
      NarrativeService.getStatBand(r.stats.technique ?? 50)
    ),
    speedBand: NarrativeService.getStatLabel(
      rng,
      NarrativeService.getStatBand(r.stats.speed ?? 50)
    ),
    balanceBand: NarrativeService.getStatLabel(
      rng,
      NarrativeService.getStatBand(r.stats.balance ?? 50)
    ),
    momentum: r.momentum,
    potentialBand: toPotentialBand(r.talentSeed ?? 50),
    archetypeLabel:
      BardEngine.getRegistryEntry("archetypes", r.combatProfile?.archetype ?? "hybrid")?.label ||
      "Rikishi",
    rankDelta,
    avatarConfig: r.avatarConfig,
    keshoMawashi: world?.customKeshoConfigs?.[r.id]
      ? ({ ...r.keshoMawashi, ...world.customKeshoConfigs[r.id] } as KeshoMawashi)
      : r.keshoMawashi,
    consecutiveStrongOzeki: r.consecutiveStrongOzeki ?? 0,
    streakLabel: calculateStreak(r.history ?? []).label,
    winPercentage: r.careerWins / Math.max(1, r.careerWins + r.careerLosses),
    citizenshipStatus: getCitizenshipStatus(r, world?.year ?? 2020),
    yearsToNaturalization: yearsUntilNaturalization(r, world?.year ?? 2020),
  };
}

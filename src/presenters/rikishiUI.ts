import type { Id } from "../engine/types/common";
import type { Rikishi, RikishiArchetype } from "../engine/types/rikishi";
import type { WorldState } from "../engine/types/world";
import type { Rank, Division, Side } from "../engine/types/banzuke";
import type { Style, TacticalArchetype } from "../engine/types/combat";
import {
  toRikishiDescriptor,
  toPotentialBand,
  ARCHETYPE_LABELS,
  toStatBand,
  type RikishiDescriptor,
  type PotentialBand
} from "../engine/descriptorBands";
import type { DescriptorBand } from "../engine/systems/narrative/NarrativeBands";
import { getCareerPhase } from "../engine/training";
import { RANK_NAMES, STYLE_NAMES, ARCHETYPE_NAMES } from "../engine/scouting";
import { getSalaryBreakdown, type SalaryBreakdown } from "../engine/economics_awards";
import { RANK_HIERARCHY } from "../engine/types/banzuke";
import { NarrativeService } from "../engine/systems/narrative/NarrativeService";

/** Career phase type inferred from training engine */
type TrainingCareerPhase = ReturnType<typeof getCareerPhase>;

export interface UIRivalEntry {
  opponentId: Id;
  opponentShikona: string;
  wins: number;
  losses: number;
  record: string;
  totalBouts: number;
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
  archetype: TacticalArchetype;
  archetypeName: string;
  derivedArchetype: RikishiArchetype;
  derivedArchetypeName: string;
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
  descriptor: RikishiDescriptor;
  potentialBand: PotentialBand;
  conditionDescriptor: DescriptorBand;
  moraleDescriptor: DescriptorBand;
  potentialDescriptor: DescriptorBand;
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
  careerHistory: any[];
  milestones: any[];
  h2h?: Record<string, { wins: number; losses: number; streak: number }>;
}

function calculateMostFrequentKimarite(history: any[]): { kimarite: string; percentage: number }[] {
  if (!history || history.length === 0) return [];
  const winCounts: Record<string, number> = {};
  let totalWins = 0;
  for (const match of history) {
    if (match.win && match.kimarite) {
      winCounts[match.kimarite] = (winCounts[match.kimarite] || 0) + 1;
      totalWins++;
    }
  }
  if (totalWins === 0) return [];
  return Object.entries(winCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([kimarite, count]) => ({
      kimarite,
      percentage: Math.round((count / totalWins) * 100),
    }));
}

function buildFavoredKimariteDisplay(entries: { kimarite: string; percentage: number }[]): string {
  if (entries.length === 0) return "Unknown (Rookie)";
  const top = entries[0];
  // Capitalize first letter of kimarite id for display
  const name = top.kimarite.charAt(0).toUpperCase() + top.kimarite.slice(1);
  return `${name} (${top.percentage}%)`;
}


function calculateInjurySummary(r: Rikishi): string {
  if (!r.injured || !r.injuryStatus) return "Healthy";
  const loc = r.injuryStatus.location ? ` ${r.injuryStatus.location}` : "";
  const sev = typeof r.injuryStatus.severity === "string"
    ? r.injuryStatus.severity
    : r.injuryStatus.severity < 30 ? "Minor" : r.injuryStatus.severity < 70 ? "Moderate" : "Severe";
  const weeks = r.injuryWeeksRemaining;
  return `${sev}${loc} (${weeks}w)`;
}

function calculateTopRivals(r: Rikishi, world: WorldState): UIRivalEntry[] {
  const h2h = r.h2h ?? {};
  return Object.entries(h2h)
    .map(([oppId, rec]) => {
      const opp = world.rikishi.get(oppId);
      return {
        opponentId: oppId,
        opponentShikona: opp?.shikona ?? "Unknown",
        wins: rec.wins,
        losses: rec.losses,
        record: `${rec.wins}-${rec.losses}`,
        totalBouts: rec.wins + rec.losses,
      };
    })
    .sort((a, b) => b.totalBouts - a.totalBouts)
    .slice(0, 5);
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


export function calculatePerceivedStats(r: Rikishi) {
  return {
    strength: NarrativeService.getStatBand(r.stats?.strength ?? 50),
    technique: NarrativeService.getStatBand(r.stats?.technique ?? 50),
    speed: NarrativeService.getStatBand(r.stats?.speed ?? 50),
    stamina: NarrativeService.getStatBand(r.stats?.stamina ?? 50),
    mental: NarrativeService.getStatBand(r.stats?.mental ?? 50),
    adaptability: NarrativeService.getStatBand(r.stats?.adaptability ?? 50),
    balance: NarrativeService.getStatBand(r.stats?.balance ?? 50),
  };
}

export function projectRikishi(r: Rikishi, world: WorldState): UIRikishi {
  const heya = world.heyas.get(r.heyaId);
  const age = world.year - r.birthYear;
  const careerHistory = r.careerHistory || [];
  const milestones = r.milestones || [];





  const rankInfo = RANK_NAMES[r.rank];
  const rankLabel = rankInfo?.en ?? r.rank;
  const styleInfo = STYLE_NAMES[r.style];
  const styleName = styleInfo?.label ?? r.style;
  const archInfo = (ARCHETYPE_NAMES as any)[r.archetype];
  const archetypeName = archInfo?.label ?? r.archetype;

  const derivedArchetype = r.derivedArchetype || ("All_Rounder" as any);
  const derivedArchetypeName = (ARCHETYPE_LABELS as any)[derivedArchetype]?.label ?? "All-Rounder";


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
    archetype: r.archetype,
    archetypeName,
    derivedArchetype,
    derivedArchetypeName,
    isRetired: r.isRetired ?? false,
    isInjured: r.injured,
    injurySummary: calculateInjurySummary(r),
    condition: r.condition,
    motivation: r.motivation,
    fatigue: r.fatigue,
    powerBand: NarrativeService.getStatBand(r.power ?? 50),
    techniqueBand: NarrativeService.getStatBand(r.technique ?? 50),
    speedBand: NarrativeService.getStatBand(r.speed ?? 50),
    balanceBand: NarrativeService.getStatBand(r.balance ?? 50),
    momentum: r.momentum,
    careerPhase: getCareerPhase(r.experience),
    currentBashoWins: r.currentBashoWins ?? 0,
    currentBashoLosses: r.currentBashoLosses ?? 0,
    currentBashoRecord: `${r.currentBashoWins ?? 0}-${r.currentBashoLosses ?? 0}`,
    careerWins: r.careerWins,
    careerLosses: r.careerLosses,
    careerRecord: `${r.careerWins}-${r.careerLosses}`,
    careerYusho: r.careerRecord?.yusho ?? 0,
    perceivedStats: calculatePerceivedStats(r),
    descriptor: toRikishiDescriptor(r, r.descriptor),
    potentialBand: NarrativeService.getPotentialBand(r.talentSeed ?? 50),
    conditionDescriptor: NarrativeService.getConditionDescriptor(r.condition ?? 0.5),
    moraleDescriptor: NarrativeService.getMoraleDescriptor(r.motivation ?? 0.5),
    potentialDescriptor: NarrativeService.getPotentialDescriptor(r.talentSeed ?? 50),
    topRivals: calculateTopRivals(r, world),
    personalityTraits: r.personalityTraits ?? [],
    favoredKimariteDetailed: calculateMostFrequentKimarite(r.history ?? []),
    favoredKimariteDisplay: buildFavoredKimariteDisplay(calculateMostFrequentKimarite(r.history ?? [])),
    favoredKimarite: calculateMostFrequentKimarite(r.history ?? []).slice(0, 1).map(e => `${e.kimarite} (${e.percentage}%)`),
    preferredGrip: r.combatProfile?.preferredGrip ?? 'none',
    preferredGripDepth: r.combatProfile?.preferredGripDepth ?? 'standard',
    specialPrizes: calculateSpecialPrizes(r),
    achievements: calculateAchievements(r),
    salaryBreakdown: getSalaryBreakdown(
      RANK_HIERARCHY[(r.rank || "jonokuchi") as Rank]?.salary || 0,
      r.division || "jonokuchi",
      r.stats?.achievements?.kinboshiEarned ?? 0
    ),
    careerHistory,
    milestones,
    h2h: r.h2h as UIRikishi['h2h'],
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
  archetypeLabel?: string;
  rankDelta?: UIRankDelta;
}

export function rankScore(rank: string, rankNumber?: number, side?: string): number {
  const RANK_TIER: Record<string, number> = {
    yokozuna: 1, ozeki: 2, sekiwake: 3, komusubi: 4,
    maegashira: 5, juryo: 6, makushita: 7,
    sandanme: 8, jonidan: 9, jonokuchi: 10,
  };
  const tier = RANK_TIER[rank] ?? 99;
  const num = rankNumber ?? 0;
  const sideVal = side === "east" ? 0 : 0.5;
  return tier * 1000 + num * 2 + sideVal;
}

export function projectRosterEntry(r: Rikishi, world?: WorldState, prevScore?: number): UIRosterEntry {
  const rankInfo = RANK_NAMES[r.rank];
  let rankDelta: UIRankDelta | undefined;

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
    rankLabel: rankInfo?.en ?? r.rank,
    rankLabelJa: rankInfo?.ja ?? r.rank,
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
    powerBand: toStatBand(r.power ?? 50),
    techniqueBand: toStatBand(r.technique ?? 50),
    speedBand: toStatBand(r.speed ?? 50),
    balanceBand: toStatBand(r.balance ?? 50),
    momentum: r.momentum,
    potentialBand: toPotentialBand(r.talentSeed ?? 50),
    archetypeLabel: r.derivedArchetype ? (ARCHETYPE_LABELS as any)[r.derivedArchetype]?.label : undefined,
    rankDelta,
  };

}

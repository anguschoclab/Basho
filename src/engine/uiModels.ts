/**
 * uiModels.ts — UI Projection Layer
 *
 * These DTOs provide a clean boundary between engine internals and UI components.
 * All projection functions take (entity, WorldState) and return a flat, UI-safe object.
 * Raw hidden attributes are NEVER exposed — only descriptor bands and narrative labels.
 *
 * Usage: import { projectRikishi } from "@/engine/uiModels" in any page/component.
 */

import type { Id } from "./types/common";
import type { Rikishi } from "./types/rikishi";
import type { Heya } from "./types/heya";
import type { WorldState } from "./types/world";
import type { Rank, Division, Side } from "./types/banzuke";
import type { Style, TacticalArchetype } from "./types/combat";
import type { BoutResult, BashoResult } from "./types/basho";
import { toRikishiDescriptor, toPotentialBand, type RikishiDescriptor, type PotentialBand } from "./descriptorBands";
import { getCareerPhase } from "./training";
import { RANK_NAMES, STYLE_NAMES, ARCHETYPE_NAMES } from "./scouting";

/** Career phase type inferred from training engine */
type TrainingCareerPhase = ReturnType<typeof getCareerPhase>;

// ─────────────────────────────────────────
//  UIRikishi — Full profile projection
// ─────────────────────────────────────────

/** Defines the structure for u i rikishi. */
export interface UIRikishi {
  id: Id;
  shikona: string;
  realName: string;

  // Stable
  heyaId: Id;
  heyaName: string;
  isPlayerOwned: boolean;

  // Demographics
  age: number;
  nationality: string;
  origin: string;
  height: number;
  weight: number;

  // Classification
  rank: Rank;
  rankLabel: string;
  rankNumber: number;
  division: Division;
  side: Side;
  style: Style;
  styleName: string;
  archetype: TacticalArchetype;
  archetypeName: string;

  // Status
  isRetired: boolean;
  isInjured: boolean;
  injurySummary: string; // "Healthy", "Minor knee (2w)", etc.
  condition: number; // 0-100 (allowed to show)
  motivation: number; // 0-100 (allowed to show)
  fatigue: number; // 0-100 (allowed to show)
  momentum: number; // 0-100 (allowed to show)

  // Career Phase
  careerPhase: TrainingCareerPhase;

  // Records (public numbers — always OK to show)
  currentBashoWins: number;
  currentBashoLosses: number;
  currentBashoRecord: string;
  careerWins: number;
  careerLosses: number;
  careerRecord: string;
  careerYusho: number;

  // Descriptor bands (narrative-safe stat proxies)
  descriptor: RikishiDescriptor;
  potentialBand: PotentialBand;

  // H2H top rivals
  topRivals: UIRivalEntry[];

  // Flavor
  personalityTraits: string[];
  favoredKimarite: string[];
}

/** Defines the structure for u i rival entry. */
export interface UIRivalEntry {
  opponentId: Id;
  opponentShikona: string;
  wins: number;
  losses: number;
  record: string;
  totalBouts: number;
}

/**
 * Project rikishi.
 *  * @param r - The R.
 *  * @param world - The World.
 *  * @returns The result.
 */
export function projectRikishi(r: Rikishi, world: WorldState): UIRikishi {
  const heya = world.heyas.get(r.heyaId);
  const age = world.year - r.birthYear;

  // Injury summary
  let injurySummary = "Healthy";
  if (r.injured && r.injuryStatus) {
    const loc = r.injuryStatus.location ? ` ${r.injuryStatus.location}` : "";
    const sev = typeof r.injuryStatus.severity === "string"
      ? r.injuryStatus.severity
      : r.injuryStatus.severity < 30 ? "Minor" : r.injuryStatus.severity < 70 ? "Moderate" : "Severe";
    const weeks = r.injuryWeeksRemaining;
    injurySummary = `${sev}${loc} (${weeks}w)`;
  }

  // Top rivals from h2h
  const h2h = r.h2h ?? {};
  const topRivals: UIRivalEntry[] = Object.entries(h2h)
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

  const rankInfo = RANK_NAMES[r.rank];
  const rankLabel = rankInfo?.en ?? r.rank;
  const styleInfo = STYLE_NAMES[r.style];
  const styleName = styleInfo?.label ?? r.style;
  const archInfo = ARCHETYPE_NAMES[r.archetype];
  const archetypeName = archInfo?.label ?? r.archetype;

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
    isRetired: r.isRetired ?? false,
    isInjured: r.injured,
    injurySummary,
    condition: r.condition,
    motivation: r.motivation,
    fatigue: r.fatigue,
    momentum: r.momentum,
    careerPhase: getCareerPhase(r.experience),
    currentBashoWins: r.currentBashoWins,
    currentBashoLosses: r.currentBashoLosses,
    currentBashoRecord: `${r.currentBashoWins}-${r.currentBashoLosses}`,
    careerWins: r.careerWins,
    careerLosses: r.careerLosses,
    careerRecord: `${r.careerWins}-${r.careerLosses}`,
    careerYusho: r.careerRecord?.yusho ?? 0,
    descriptor: toRikishiDescriptor(r),
    potentialBand: toPotentialBand(r.talentSeed ?? 50),
    topRivals,
    personalityTraits: r.personalityTraits ?? [],
    favoredKimarite: r.favoredKimarite ?? [],
  };
}

// ─────────────────────────────────────────
//  UIRosterEntry — Lightweight list item
// ─────────────────────────────────────────

/** Defines the structure for u i roster entry. */
export interface UIRosterEntry {
  id: Id;
  shikona: string;
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
  momentum: number;
  potentialBand: PotentialBand;
}

/**
 * Project roster entry.
 *  * @param r - The R.
 *  * @returns The result.
 */
export function projectRosterEntry(r: Rikishi): UIRosterEntry {
  const rankInfo = RANK_NAMES[r.rank];
  return {
    id: r.id,
    shikona: r.shikona,
    rank: r.rank,
    rankLabel: rankInfo?.en ?? r.rank,
    rankLabelJa: rankInfo?.ja ?? r.rank,
    rankNumber: r.rankNumber,
    division: r.division,
    side: r.side,
    record: `${r.currentBashoWins}-${r.currentBashoLosses}`,
    careerRecord: `${r.careerWins}-${r.careerLosses}`,
    currentBashoWins: r.currentBashoWins,
    currentBashoLosses: r.currentBashoLosses,
    careerWins: r.careerWins,
    careerLosses: r.careerLosses,
    isInjured: r.injured,
    condition: r.condition,
    fatigue: r.fatigue,
    momentum: r.momentum,
    potentialBand: toPotentialBand(r.talentSeed ?? 50),
  };
}

// ─────────────────────────────────────────
//  UIHeya — Stable profile projection
// ─────────────────────────────────────────

/** Defines the structure for u i heya. */
export interface UIHeya {
  id: Id;
  name: string;
  nameJa: string;
  isPlayerOwned: boolean;

  // Oyakata
  oyakataId: Id;
  oyakataName: string;

  // Bands (narrative-safe)
  statureBand: string;
  prestigeBand: string;
  facilitiesBand: string;
  koenkaiBand: string;
  runwayBand: string;

  // Facilities (0-100 each)
  facilities: { training: number; recovery: number; nutrition: number };

  // Roster summary
  rosterSize: number;
  sekitoriCount: number;

  // Finance
  funds: number;
  reputation: number;

  // Risk flags
  riskFinancial: boolean;
  riskGovernance: boolean;
  riskRivalry: boolean;
  riskWelfare: boolean;

  // Governance
  scandalScore: number;
  governanceStatus: string;
}

/**
 * Project heya.
 *  * @param heya - The Heya.
 *  * @param world - The World.
 *  * @returns The result.
 */
export function projectHeya(heya: Heya, world: WorldState): UIHeya {
  const oyakata = world.oyakata?.get(heya.oyakataId);
  const roster = (heya.rikishiIds || [])
    .map(id => world.rikishi.get(id))
    .filter(Boolean) as Rikishi[];

  const sekitoriDivisions = new Set(["makuuchi", "juryo"]);
  const sekitoriCount = roster.reduce((count, r) => sekitoriDivisions.has(r.division) ? count + 1 : count, 0);

  return {
    id: heya.id,
    name: heya.name,
    nameJa: heya.nameJa ?? "",
    isPlayerOwned: heya.isPlayerOwned ?? false,
    oyakataId: heya.oyakataId,
    oyakataName: oyakata?.name ?? "Unknown",
    statureBand: heya.statureBand,
    prestigeBand: heya.prestigeBand,
    facilitiesBand: heya.facilitiesBand,
    koenkaiBand: heya.koenkaiBand,
    runwayBand: heya.runwayBand,
    facilities: { ...heya.facilities },
    rosterSize: roster.length,
    sekitoriCount,
    funds: heya.funds,
    reputation: heya.reputation,
    riskFinancial: heya.riskIndicators?.financial ?? false,
    riskGovernance: heya.riskIndicators?.governance ?? false,
    riskRivalry: heya.riskIndicators?.rivalry ?? false,
    riskWelfare: heya.riskIndicators?.welfare ?? false,
    scandalScore: heya.scandalScore,
    governanceStatus: heya.governanceStatus,
  };
}

// ─────────────────────────────────────────
//  UIBoutRow — Matchday bout display
// ─────────────────────────────────────────

/** Defines the structure for u i bout row. */
export interface UIBoutRow {
  eastId: Id;
  eastShikona: string;
  eastRank: string;
  eastHeyaName: string;
  westId: Id;
  westShikona: string;
  westRank: string;
  westHeyaName: string;
  winnerId: Id;
  kimarite: string;
  isUpset: boolean;
}

/**
 * Project bout row.
 *  * @param bout - The Bout.
 *  * @param world - The World.
 *  * @returns The result.
 */
export function projectBoutRow(bout: BoutResult, world: WorldState): UIBoutRow {
  const east = world.rikishi.get(bout.winnerRikishiId);
  const west = world.rikishi.get(bout.loserRikishiId);
  // Determine actual east/west from bout log or use winner=east, loser=west as approximation
  const eastHeya = east ? world.heyas.get(east.heyaId) : undefined;
  const westHeya = west ? world.heyas.get(west.heyaId) : undefined;

  return {
    eastId: bout.winnerRikishiId,
    eastShikona: east?.shikona ?? "Unknown",
    eastRank: east?.rank ?? "unknown",
    eastHeyaName: eastHeya?.name ?? "",
    westId: bout.loserRikishiId,
    westShikona: west?.shikona ?? "Unknown",
    westRank: west?.rank ?? "unknown",
    westHeyaName: westHeya?.name ?? "",
    winnerId: bout.winnerRikishiId,
    kimarite: bout.kimariteName ?? bout.kimarite,
    isUpset: bout.upset,
  };
}

// ─────────────────────────────────────────
//  UIBashoSummary — Post-basho recap
// ─────────────────────────────────────────

/** Defines the structure for u i basho summary. */
export interface UIBashoSummary {
  year: number;
  bashoNumber: number;
  bashoName: string;
  yushoShikona: string;
  yushoHeyaName: string;
  junYushoShikona: string[];
  ginoShoShikona?: string;
  kantoshoShikona?: string;
  shukunshoShikona?: string;
}

/**
 * Project basho summary.
 *  * @param result - The Result.
 *  * @param world - The World.
 *  * @returns The result.
 */
export function projectBashoSummary(result: BashoResult, world: WorldState): UIBashoSummary {
  const lookup = (id?: Id) => {
    if (!id) return undefined;
    const r = world.rikishi.get(id);
    return r?.shikona ?? "Unknown";
  };
  const yushoR = world.rikishi.get(result.yusho);
  const yushoHeya = yushoR ? world.heyas.get(yushoR.heyaId) : undefined;

  return {
    year: result.year,
    bashoNumber: result.bashoNumber,
    bashoName: result.bashoName,
    yushoShikona: lookup(result.yusho) ?? "Unknown",
    yushoHeyaName: yushoHeya?.name ?? "",
    junYushoShikona: result.junYusho.map(id => lookup(id) ?? "Unknown"),
    ginoShoShikona: lookup(result.ginoSho),
    kantoshoShikona: lookup(result.kantosho),
    shukunshoShikona: lookup(result.shukunsho),
  };
}

// ─────────────────────────────────────────
//  Legacy compat: RikishiUIModel alias
// ─────────────────────────────────────────
/** @deprecated Use UIRikishi + projectRikishi instead */
export type RikishiUIModel = UIRikishi;
/** @deprecated Use projectRikishi instead */
export const toRikishiUIModel = projectRikishi;

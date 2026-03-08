/**
 * uiModels.ts — UI Projection Layer
 *
 * These DTOs provide a clean boundary between engine internals and UI components.
 * All projection functions take (entity, WorldState) and return a flat, UI-safe object.
 * Raw hidden attributes are NEVER exposed — only descriptor bands and narrative labels.
 *
 * Usage: import { projectRikishi } from "@/engine/uiModels" in any page/component.
 */

import type {
  Id, Rikishi, Heya, Oyakata, WorldState, Rank, Division, Side,
  Style, TacticalArchetype, BoutResult, BashoResult,
} from "./types";
import { RANK_HIERARCHY } from "./banzuke";
import { toRikishiDescriptor, toPotentialBand, type RikishiDescriptor, type PotentialBand } from "./descriptorBands";
import { getCareerPhase, type CareerPhase } from "./training";
import { RANK_NAMES, STYLE_NAMES, ARCHETYPE_NAMES } from "./scouting";

// ─────────────────────────────────────────
//  UIRikishi — Full profile projection
// ─────────────────────────────────────────

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
  injurySummary: string; // "Healthy", "Minor knee sprain (2w)", "Major shoulder tear (8w)"
  condition: number; // 0-100 (allowed to show)
  motivation: number; // 0-100 (allowed to show)
  fatigue: number; // 0-100 (allowed to show)
  momentum: number; // 0-100 (allowed to show)

  // Career Phase
  careerPhase: CareerPhase;

  // Records (public numbers — always OK to show)
  currentBashoWins: number;
  currentBashoLosses: number;
  currentBashoRecord: string; // "8-7"
  careerWins: number;
  careerLosses: number;
  careerRecord: string; // "145-120"
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

export interface UIRivalEntry {
  opponentId: Id;
  opponentShikona: string;
  wins: number;
  losses: number;
  record: string; // "5-3"
  totalBouts: number;
}

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

  // Rank label
  const rankEntry = RANK_HIERARCHY.find(rh => rh.rank === r.rank);
  const rankLabel = RANK_NAMES[r.rank] ?? r.rank;

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
    styleName: STYLE_NAMES[r.style] ?? r.style,
    archetype: r.archetype,
    archetypeName: ARCHETYPE_NAMES[r.archetype] ?? r.archetype,
    isRetired: r.isRetired ?? false,
    isInjured: r.injured,
    injurySummary,
    condition: r.condition,
    motivation: r.motivation,
    fatigue: r.fatigue,
    momentum: r.momentum,
    careerPhase: getCareerPhase(r),
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

export interface UIRosterEntry {
  id: Id;
  shikona: string;
  rank: Rank;
  rankLabel: string;
  division: Division;
  side: Side;
  record: string;
  isInjured: boolean;
  condition: number;
  potentialBand: PotentialBand;
}

export function projectRosterEntry(r: Rikishi): UIRosterEntry {
  return {
    id: r.id,
    shikona: r.shikona,
    rank: r.rank,
    rankLabel: RANK_NAMES[r.rank] ?? r.rank,
    division: r.division,
    side: r.side,
    record: `${r.currentBashoWins}-${r.currentBashoLosses}`,
    isInjured: r.injured,
    condition: r.condition,
    potentialBand: toPotentialBand(r.talentSeed ?? 50),
  };
}

// ─────────────────────────────────────────
//  UIHeya — Stable profile projection
// ─────────────────────────────────────────

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
  sekitoriCount: number; // juryo + makuuchi

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

export function projectHeya(heya: Heya, world: WorldState): UIHeya {
  const oyakata = world.oyakata.get(heya.oyakataId);
  const roster = heya.rikishiIds
    .map(id => world.rikishi.get(id))
    .filter(Boolean) as Rikishi[];

  const sekitoriDivisions = new Set(["makuuchi", "juryo"]);
  const sekitoriCount = roster.filter(r => sekitoriDivisions.has(r.division)).length;

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

export interface UIBoutRow {
  eastId: Id;
  eastShikona: string;
  eastRank: string;
  eastHeyaName: string;
  westId: Id;
  westShikona: string;
  westRank: string;
  westHeyaName: string;
  winnerId?: Id;
  kimarite?: string;
  isUpset: boolean;
}

export function projectBoutRow(bout: BoutResult, world: WorldState): UIBoutRow {
  const east = world.rikishi.get(bout.eastId);
  const west = world.rikishi.get(bout.westId);
  const eastHeya = east ? world.heyas.get(east.heyaId) : undefined;
  const westHeya = west ? world.heyas.get(west.heyaId) : undefined;

  return {
    eastId: bout.eastId,
    eastShikona: east?.shikona ?? "Unknown",
    eastRank: east?.rank ?? "unknown",
    eastHeyaName: eastHeya?.name ?? "",
    westId: bout.westId,
    westShikona: west?.shikona ?? "Unknown",
    westRank: west?.rank ?? "unknown",
    westHeyaName: westHeya?.name ?? "",
    winnerId: bout.winnerId,
    kimarite: bout.kimarite,
    isUpset: bout.isUpset ?? false,
  };
}

// ─────────────────────────────────────────
//  UIBashoSummary — Post-basho recap
// ─────────────────────────────────────────

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

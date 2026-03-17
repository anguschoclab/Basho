import { clamp } from './utils';

function localClampInt(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

// banzuke.ts
// Banzuke (Ranking) System — Canon-aligned, deterministic, FULL SYSTEM

import type { Rank, Division, RankPosition } from "./types/banzuke";
import type { Rikishi } from "./types/rikishi";
import type { BoutResult, MatchSchedule } from "./types/basho";
import { KIMARITE_REGISTRY } from "./kimarite";

// === RANK HIERARCHY ===

/** Defines the structure for rank info. */
export interface RankInfo {
  rank: Rank;
  division: Division;
  nameJa: string;
  tier: number; // Lower = higher rank (1 = yokozuna)
  salary: number;
  isSanyaku: boolean;
  isSekitori: boolean;
  fightsPerBasho: number;
}

/** r a n k_ h i e r a r c h y. */
export const RANK_HIERARCHY: Record<Rank, RankInfo> = {
  yokozuna: {
    rank: "yokozuna",
    division: "makuuchi",
    nameJa: "横綱",
    tier: 1,
    salary: 3_000_000,
    isSanyaku: true,
    isSekitori: true,
    fightsPerBasho: 15
  },
  ozeki: {
    rank: "ozeki",
    division: "makuuchi",
    nameJa: "大関",
    tier: 2,
    salary: 2_500_000,
    isSanyaku: true,
    isSekitori: true,
    fightsPerBasho: 15
  },
  sekiwake: {
    rank: "sekiwake",
    division: "makuuchi",
    nameJa: "関脇",
    tier: 3,
    salary: 1_800_000,
    isSanyaku: true,
    isSekitori: true,
    fightsPerBasho: 15
  },
  komusubi: {
    rank: "komusubi",
    division: "makuuchi",
    nameJa: "小結",
    tier: 4,
    salary: 1_800_000,
    isSanyaku: true,
    isSekitori: true,
    fightsPerBasho: 15
  },
  maegashira: {
    rank: "maegashira",
    division: "makuuchi",
    nameJa: "前頭",
    tier: 5,
    salary: 1_400_000,
    isSanyaku: false,
    isSekitori: true,
    fightsPerBasho: 15
  },
  juryo: {
    rank: "juryo",
    division: "juryo",
    nameJa: "十両",
    tier: 6,
    salary: 1_100_000,
    isSanyaku: false,
    isSekitori: true,
    fightsPerBasho: 15
  },
  makushita: {
    rank: "makushita",
    division: "makushita",
    nameJa: "幕下",
    tier: 7,
    salary: 0,
    isSanyaku: false,
    isSekitori: false,
    fightsPerBasho: 7
  },
  sandanme: {
    rank: "sandanme",
    division: "sandanme",
    nameJa: "三段目",
    tier: 8,
    salary: 0,
    isSanyaku: false,
    isSekitori: false,
    fightsPerBasho: 7
  },
  jonidan: {
    rank: "jonidan",
    division: "jonidan",
    nameJa: "序二段",
    tier: 9,
    salary: 0,
    isSanyaku: false,
    isSekitori: false,
    fightsPerBasho: 7
  },
  jonokuchi: {
    rank: "jonokuchi",
    division: "jonokuchi",
    nameJa: "序ノ口",
    tier: 10,
    salary: 0,
    isSanyaku: false,
    isSekitori: false,
    fightsPerBasho: 7
  }
};

// === RANK ORDERING / DISPLAY ===

/**
 * Compare ranks.
 *  * @param a - The A.
 *  * @param b - The B.
 *  * @returns The result.
 */
export function compareRanks(a: RankPosition, b: RankPosition): number {
  const aInfo = RANK_HIERARCHY[a.rank];
  const bInfo = RANK_HIERARCHY[b.rank];

  if (aInfo.tier !== bInfo.tier) return aInfo.tier - bInfo.tier;

  const an = a.rankNumber ?? 0;
  const bn = b.rankNumber ?? 0;
  if (an !== bn) return an - bn;

  if (a.side !== b.side) return a.side === "east" ? -1 : 1;

  return 0;
}

/**
 * Format rank.
 *  * @param position - The Position.
 *  * @returns The result.
 */
export function formatRank(position: RankPosition): string {
  const info = RANK_HIERARCHY[position.rank];
  const side = position.side === "east" ? "E" : "W";
  if (position.rankNumber !== undefined) return `${info.nameJa}${position.rankNumber}${side}`;
  return `${info.nameJa}${side}`;
}

/**
 * Get rank title ja.
 *  * @param position - The Position.
 *  * @returns The result.
 */
export function getRankTitleJa(position: RankPosition): string {
  const info = RANK_HIERARCHY[position.rank];
  const sideJa = position.side === "east" ? "東" : "西";
  if (position.rankNumber !== undefined) return `${sideJa}${info.nameJa}${position.rankNumber}枚目`;
  return `${sideJa}${info.nameJa}`;
}

// === KACHI-KOSHI / MAKE-KOSHI ===

/**
 * Kachi koshi threshold.
 *  * @param rank - The Rank.
 *  * @returns The result.
 */
export function kachiKoshiThreshold(rank: Rank): number {
  const totalBouts = RANK_HIERARCHY[rank].fightsPerBasho;
  return Math.floor(totalBouts / 2) + 1;
}

/**
 * Is kachi koshi.
 *  * @param wins - The Wins.
 *  * @param _losses - The _losses.
 *  * @param rank - The Rank.
 *  * @returns The result.
 */
export function isKachiKoshi(wins: number, _losses: number, rank: Rank): boolean {
  return wins >= kachiKoshiThreshold(rank);
}

/**
 * Is make koshi.
 *  * @param wins - The Wins.
 *  * @param losses - The Losses.
 *  * @param rank - The Rank.
 *  * @param absences - The Absences.
 *  * @returns The result.
 */
export function isMakeKoshi(wins: number, losses: number, rank: Rank, absences = 0): boolean {
  const requiredLosses = kachiKoshiThreshold(rank);
  return losses + absences >= requiredLosses;
}

// === Ozeki kadoban history ===

/** Defines the structure for ozeki kadoban state. */
export interface OzekiKadobanState {
  isKadoban: boolean;
  consecutiveMakeKoshi: number;
}

/** Type representing ozeki kadoban map. */
export type OzekiKadobanMap = Record<string, OzekiKadobanState>;

/**
 * Get ozeki status.
 *  * @param lastBashoWins - The Last basho wins.
 *  * @param lastBashoLosses - The Last basho losses.
 *  * @param absences - The Absences.
 *  * @param previous - The Previous.
 *  * @returns The result.
 */
export function getOzekiStatus(
  lastBashoWins: number,
  lastBashoLosses: number,
  absences: number,
  previous: OzekiKadobanState | undefined
): OzekiKadobanState {
  const prev = previous ?? { isKadoban: false, consecutiveMakeKoshi: 0 };
  const hadMakeKoshi = isMakeKoshi(lastBashoWins, lastBashoLosses, "ozeki", absences);

  if (!hadMakeKoshi) {
    return { isKadoban: false, consecutiveMakeKoshi: 0 };
  }

  return {
    isKadoban: !prev.isKadoban,
    consecutiveMakeKoshi: prev.isKadoban ? 2 : 1
  };
}

// === INPUT/OUTPUT TYPES ===

/** Defines the structure for banzuke entry. */
export interface BanzukeEntry {
  rikishiId: string;
  position: RankPosition;
  division: Division;
}

/** Defines the structure for basho performance. */
export interface BashoPerformance {
  rikishiId: string;
  wins: number;
  losses: number;
  absences?: number;
  yusho?: boolean;
  junYusho?: boolean;
  specialPrizes?: number;
  kinboshi?: number;
  opponentAvgTier?: number;
  promoteToYokozuna?: boolean;
}

/** Defines the structure for movement event. */
export interface MovementEvent {
  rikishiId: string;
  from: string;
  to: string;
  description: string;
  kind: "promotion" | "demotion" | "lateral" | "status";
}

/** Defines the structure for banzuke update result. */
export interface BanzukeUpdateResult {
  newBanzuke: BanzukeEntry[];
  events: MovementEvent[];
  updatedOzekiKadoban: OzekiKadobanMap;
  sanyakuCounts: {
    yokozuna: number;
    ozeki: number;
    sekiwake: number;
    komusubi: number;
    maegashira: number;
  };
}

// === AWARDS LOGIC ===

/** Defines the structure for special prizes result. */
export interface SpecialPrizesResult {
  ginoSho?: string;
  kantosho?: string;
  shukunsho?: string;
}

/**
 * Determine special prizes.
 *  * @param matches - The Matches.
 *  * @param rikishiMap - The Rikishi map.
 *  * @param yushoId - The Yusho id.
 *  * @returns The result.
 */
export function determineSpecialPrizes(
  matches: MatchSchedule[],
  rikishiMap: Map<string, Rikishi>,
  yushoId: string
): SpecialPrizesResult {
  // 1. Identify Candidates: Makuuchi, below Ozeki, Kachi-koshi (8+ wins)
  const stats = new Map<string, { wins: number; opponents: string[]; kimarites: string[] }>();
  const yokozunaIds = new Set<string>();

  for (const r of rikishiMap.values()) {
    if (r.division === "makuuchi" && r.rank === "yokozuna") {
      yokozunaIds.add(r.id);
    }
  }

  // Aggregate stats from matches
  for (const m of matches) {
    if (!m.result) continue;
    const w = m.result.winnerRikishiId;
    const l = m.result.loserRikishiId;
    
    // Track stats for winner
    if (!stats.has(w)) stats.set(w, { wins: 0, opponents: [], kimarites: [] });
    const s = stats.get(w)!;
    s.wins++;
    s.opponents.push(l);
    s.kimarites.push(m.result.kimarite);
  }

  const candidates: Rikishi[] = [];
  for (const r of rikishiMap.values()) {
    if (r.division !== "makuuchi") continue;
    if (r.rank === "yokozuna" || r.rank === "ozeki") continue; // Not eligible
    
    const s = stats.get(r.id);
    if (s && s.wins >= 8) {
      candidates.push(r);
    }
  }

  if (candidates.length === 0) return {};

  const result: SpecialPrizesResult = {};

  // 2. Shukun-shō (Outstanding Performance)
  // Logic: Beat the Yusho winner OR Beat a Yokozuna (Kinboshi), + High wins preferred
  let bestShukun = { id: "", score: -1 };
  
  const kimariteMap = new Map();
  for (const kr of KIMARITE_REGISTRY) {
    kimariteMap.set(kr.id, kr);
  }

  for (const c of candidates) {
    const s = stats.get(c.id)!;
    const beatYusho = s.opponents.includes(yushoId);
    let kinboshiCount = 0;
    for (const oppId of s.opponents) {
      if (yokozunaIds.has(oppId)) kinboshiCount++;
    }
    
    if (beatYusho || kinboshiCount > 0 || s.wins >= 12) {
      // Simple score: Kinboshi=3, BeatYusho=4, EachWin=0.1
      const score = (kinboshiCount * 3) + (beatYusho ? 4 : 0) + (s.wins * 0.1);
      if (score > bestShukun.score) {
        bestShukun = { id: c.id, score };
      }
    }
  }
  if (bestShukun.id) result.shukunsho = bestShukun.id;

  // 3. Kantō-shō (Fighting Spirit)
  // Logic: High wins (usually 10+), or 8-9 wins if underdog story (simplified to wins here)
  let bestKanto = { id: "", score: -1 };
  
  for (const c of candidates) {
    if (c.id === result.shukunsho) continue; // Try to distribute if possible
    const s = stats.get(c.id)!;
    
    if (s.wins >= 10) {
      const score = s.wins;
      if (score > bestKanto.score) {
        bestKanto = { id: c.id, score };
      }
    }
  }
  if (bestKanto.id) result.kantosho = bestKanto.id;

  // 4. Ginō-shō (Technique)
  // Logic: Variety of kimarite OR use of technical kimarite classes (throws, twists, etc vs push/thrust)
  let bestGino = { id: "", score: -1 };
  
  for (const c of candidates) {
    if (c.id === result.shukunsho || c.id === result.kantosho) continue;
    const s = stats.get(c.id)!;
    
    const uniqueMoves = new Set(s.kimarites).size;
    
    // Count "technical" moves (not oshi/tsuki/yori)
    let technicalMoves = 0;
    for (const kId of s.kimarites) {
      const k = kimariteMap.get(kId);
      if (k && k.category !== "push" && k.category !== "thrust" && k.category !== "forfeit") {
        technicalMoves++;
      }
    }

    // Score: (Unique * 1) + (TechRatio * 10)
    const techRatio = technicalMoves / s.wins;
    const score = uniqueMoves + (techRatio * 10);
    
    // Minimum threshold for Gino-sho: significant technical usage
    if (techRatio > 0.4 && score > bestGino.score) {
      bestGino = { id: c.id, score };
    }
  }
  if (bestGino.id) result.ginoSho = bestGino.id;

  return result;
}

// === MAIN UPDATE ===

/**
 * Update banzuke.
 *  * @param currentBanzuke - The Current banzuke.
 *  * @param performance - The Performance.
 *  * @param previousOzekiKadoban - The Previous ozeki kadoban.
 *  * @returns The result.
 */
export function updateBanzuke(
  currentBanzuke: BanzukeEntry[],
  performance: BashoPerformance[],
  previousOzekiKadoban: OzekiKadobanMap = {}
): BanzukeUpdateResult {
  const perfById = new Map(performance.map((p) => [p.rikishiId, p]));

  // 1) Compute updated Ozeki kadoban states and mark Ozeki demotions.
  const updatedOzekiKadoban: OzekiKadobanMap = { ...previousOzekiKadoban };
  const demotedOzeki = new Set<string>();

  for (const e of currentBanzuke) {
    if (e.position.rank !== "ozeki") continue;

    const p = perfById.get(e.rikishiId);
    const wins = p?.wins ?? 0;
    const losses = p?.losses ?? 0;
    const abs = p?.absences ?? 0;

    const prev = previousOzekiKadoban[e.rikishiId];
    const next = getOzekiStatus(wins, losses, abs, prev);
    updatedOzekiKadoban[e.rikishiId] = next;

    if (next.consecutiveMakeKoshi >= 2) demotedOzeki.add(e.rikishiId);
  }

  // 2) Decide variable sanyaku counts for *next* makuuchi template.
  const sanyakuCounts = computeVariableSanyakuCounts(currentBanzuke, perfById, demotedOzeki);

  // 3) Build full slot template for all divisions.
  const fullTemplate = buildFullSlotTemplate(sanyakuCounts, {
    makuuchi: 42,
    juryo: 28,
    makushita: 60,
    sandanme: 50,
    jonidan: 40,
    jonokuchi: 20
  });

  // 4) Normalize roster to template size (crash-proofing).
  const roster = normalizeRosterToTemplate(currentBanzuke, fullTemplate.length);

  // 5) Compute desired strength ordering using performance + absences + ceilings.
  const scored = roster.map((e) => {
    const p = perfById.get(e.rikishiId);
    const move = computeMovementUnits(e, p, demotedOzeki);
    const oldKey = positionKey(e);
    const desiredKey = oldKey - move * 1_000; // bigger move => earlier
    const eligibleBestTier = bestTierAllowed(e, p, updatedOzekiKadoban[e.rikishiId], demotedOzeki);
    return { entry: e, oldKey, desiredKey, eligibleBestTier };
  });

  scored.sort((a, b) => {
    if (a.desiredKey !== b.desiredKey) return a.desiredKey - b.desiredKey;
    if (a.oldKey !== b.oldKey) return a.oldKey - b.oldKey;
    return a.entry.rikishiId.localeCompare(b.entry.rikishiId);
  });

  // 6) Assign into slots top-to-bottom with eligibility constraints.
  const assigned = assignToTemplate(fullTemplate, scored, perfById, updatedOzekiKadoban, demotedOzeki);

  // 7) Emit events (movement + ozeki status)
  const events: MovementEvent[] = [];
  const oldById = new Map(roster.map((e) => [e.rikishiId, e]));

  for (const e of assigned) {
    const old = oldById.get(e.rikishiId);
    if (!old) continue;

    const from = `${old.division}:${formatRank(old.position)}`;
    const to = `${e.division}:${formatRank(e.position)}`;

    const fromTier = RANK_HIERARCHY[old.position.rank].tier;
    const toTier = RANK_HIERARCHY[e.position.rank].tier;

    let kind: MovementEvent["kind"] = "lateral";
    if (toTier < fromTier || divisionTier(e.division) < divisionTier(old.division)) kind = "promotion";
    if (toTier > fromTier || divisionTier(e.division) > divisionTier(old.division)) kind = "demotion";

    if (from !== to) {
      events.push({
        rikishiId: e.rikishiId,
        from,
        to,
        kind,
        description:
          kind === "promotion"
            ? `Promoted: ${from} → ${to}`
            : kind === "demotion"
              ? `Demoted: ${from} → ${to}`
              : `Moved: ${from} → ${to}`
      });
    }
  }

  for (const [id, state] of Object.entries(updatedOzekiKadoban)) {
    const oldState = previousOzekiKadoban[id];
    if (!oldState) continue;

    if (oldState.isKadoban !== state.isKadoban || oldState.consecutiveMakeKoshi !== state.consecutiveMakeKoshi) {
      events.push({
        rikishiId: id,
        from: `kadoban:${oldState.isKadoban ? "yes" : "no"}(${oldState.consecutiveMakeKoshi})`,
        to: `kadoban:${state.isKadoban ? "yes" : "no"}(${state.consecutiveMakeKoshi})`,
        kind: "status",
        description:
          state.consecutiveMakeKoshi >= 2
            ? `Ozeki demotion triggered (two consecutive make-koshi).`
            : state.isKadoban
              ? `Kadoban: Ozeki must kachi-koshi next basho.`
              : `Ozeki status reset.`
      });
    }
  }

  return { newBanzuke: assigned, events, updatedOzekiKadoban, sanyakuCounts };
}

// === VARIABLE SANYAKU COUNTS ===


function calculateYokozunaCount(makuuchi: BanzukeEntry[], perfById: Map<string, BashoPerformance>): number {
  const yokozunaIds = makuuchi.reduce<Id[]>((acc, e) => {
    if (e.position.rank === "yokozuna") acc.push(e.rikishiId);
    return acc;
  }, []);
  const yPromotions = makuuchi.filter((e) => {
    const p = perfById.get(e.rikishiId);
    return e.position.rank === "ozeki" && !!p?.promoteToYokozuna;
  }).length;
  const yokozunaCount = yokozunaIds.length + yPromotions;
  return localClampInt(yokozunaCount, 0, 6);
}

function calculateOzekiCount(makuuchi: BanzukeEntry[], perfById: Map<string, BashoPerformance>, demotedOzeki: Set<string>): number {
  const ozekiIds = makuuchi
    .filter((e) => e.position.rank === "ozeki" && !demotedOzeki.has(e.rikishiId))
    .map((e) => e.rikishiId);

  const ozekiPromoteCandidates = makuuchi.filter((e) => {
    if (e.position.rank !== "sekiwake") return false;
    const p = perfById.get(e.rikishiId);
    return (p?.wins ?? 0) >= 11;
  });

  return Math.max(2, ozekiIds.length + ozekiPromoteCandidates.length);
}

function calculateSekiwakeCount(makuuchi: BanzukeEntry[], perfById: Map<string, BashoPerformance>, demotedCount: number): number {
  const sekiwakePromoteCandidates = makuuchi.filter((e) => {
    if (e.position.rank !== "komusubi") return false;
    const p = perfById.get(e.rikishiId);
    return (p?.wins ?? 0) >= 10;
  });

  const sekiwakeCount = 2 + demotedCount + sekiwakePromoteCandidates.length;
  return localClampInt(sekiwakeCount, 2, 6);
}

function calculateKomusubiCount(makuuchi: BanzukeEntry[], perfById: Map<string, BashoPerformance>): number {
  const komusubiPromoteCandidates = makuuchi.filter((e) => {
    if (e.position.rank !== "maegashira") return false;
    const p = perfById.get(e.rikishiId);
    const wins = p?.wins ?? 0;
    const yusho = !!p?.yusho;
    const rn = e.position.rankNumber ?? 99;
    const nearTop = rn <= 4;
    return yusho || (nearTop && wins >= 10);
  });

  const komusubiCount = 2 + komusubiPromoteCandidates.length;
  return localClampInt(komusubiCount, 2, 6);
}

/**
 * Compute variable sanyaku counts.
 *  * @param current - The Current.
 *  * @param perfById - The Perf by id.
 *  * @param demotedOzeki - The Demoted ozeki.
 *  * @returns The result.
 */
function trimSanyakuCounts(counts: { y: number; o: number; s: number; k: number }) {
  while (counts.y + counts.o + counts.s + counts.k > 20) {
    if (counts.k > 2) counts.k--;
    else if (counts.s > 2) counts.s--;
    else if (counts.o > 2) counts.o--;
    else break;
  }
}

function computeVariableSanyakuCounts(
  current: BanzukeEntry[],
  perfById: Map<string, BashoPerformance>,
  demotedOzeki: Set<string>
): BanzukeUpdateResult["sanyakuCounts"] {
  const makuuchi = current.filter((e) => e.division === "makuuchi");

  const yokozunaCount = calculateYokozunaCount(makuuchi, perfById);
  let ozekiCount = calculateOzekiCount(makuuchi, perfById, demotedOzeki);
  let sekiwakeCount = calculateSekiwakeCount(makuuchi, perfById, demotedOzeki.size);
  let komusubiCount = calculateKomusubiCount(makuuchi, perfById);

  // Guardrail: if sanyaku becomes absurdly large, trim (prefer trimming K then S then O).
  const counts = { y: yokozunaCount, o: ozekiCount, s: sekiwakeCount, k: komusubiCount };
  trimSanyakuCounts(counts);
  ozekiCount = counts.o;
  sekiwakeCount = counts.s;
  komusubiCount = counts.k;

  const maegashiraCount = 42 - (yokozunaCount + ozekiCount + sekiwakeCount + komusubiCount);

  return {
    yokozuna: yokozunaCount,
    ozeki: ozekiCount,
    sekiwake: sekiwakeCount,
    komusubi: komusubiCount,
    maegashira: Math.max(0, maegashiraCount)
  };
}

// === TEMPLATE BUILDERS ===

/**
 * Build full slot template.
 *  * @param sanyaku - The Sanyaku.
 *  * @param counts - The Counts.
 *  * @returns The result.
 */
function buildFullSlotTemplate(
  sanyaku: BanzukeUpdateResult["sanyakuCounts"],
  counts: { makuuchi: number; juryo: number; makushita: number; sandanme: number; jonidan: number; jonokuchi: number }
): Array<{ division: Division; position: RankPosition }> {
  const out: Array<{ division: Division; position: RankPosition }> = [];

  out.push(...buildMakuuchiTemplate(sanyaku, counts.makuuchi));
  out.push(...buildNumberedDivisionTemplate("juryo", "juryo", counts.juryo));
  out.push(...buildNumberedDivisionTemplate("makushita", "makushita", counts.makushita));
  out.push(...buildNumberedDivisionTemplate("sandanme", "sandanme", counts.sandanme));
  out.push(...buildNumberedDivisionTemplate("jonidan", "jonidan", counts.jonidan));
  out.push(...buildNumberedDivisionTemplate("jonokuchi", "jonokuchi", counts.jonokuchi));

  return out;
}

/**
 * Build makuuchi template.
 *  * @param sanyaku - The Sanyaku.
 *  * @param totalSlots - The Total slots.
 *  * @returns The result.
 */
function buildMakuuchiTemplate(
  sanyaku: BanzukeUpdateResult["sanyakuCounts"],
  totalSlots: number
): Array<{ division: Division; position: RankPosition }> {
  const slots: Array<{ division: Division; position: RankPosition }> = [];

  const pushNamed = (rank: "yokozuna" | "ozeki" | "sekiwake" | "komusubi", count: number) => {
    let side: "east" | "west" = "east";
    for (let i = 0; i < count; i++) {
      const position: RankPosition = { rank, side };
      slots.push({ division: "makuuchi", position });
      side = side === "east" ? "west" : "east";
    }
  };

  pushNamed("yokozuna", sanyaku.yokozuna);
  pushNamed("ozeki", sanyaku.ozeki);
  pushNamed("sekiwake", sanyaku.sekiwake);
  pushNamed("komusubi", sanyaku.komusubi);

  const remaining = Math.max(0, totalSlots - slots.length);
  const pairs = Math.floor(remaining / 2);

  for (let n = 1; n <= pairs; n++) {
    slots.push({ division: "makuuchi", position: { rank: "maegashira", side: "east", rankNumber: n } });
    slots.push({ division: "makuuchi", position: { rank: "maegashira", side: "west", rankNumber: n } });
  }

  if (remaining % 2 === 1) {
    slots.push({
      division: "makuuchi",
      position: { rank: "maegashira", side: "east", rankNumber: pairs + 1 }
    });
  }

  return slots;
}

/**
 * Build numbered division template.
 *  * @param division - The Division.
 *  * @param rank - The Rank.
 *  * @param totalSlots - The Total slots.
 *  * @returns The result.
 */
function buildNumberedDivisionTemplate(
  division: Division,
  rank: "juryo" | "makushita" | "sandanme" | "jonidan" | "jonokuchi",
  totalSlots: number
): Array<{ division: Division; position: RankPosition }> {
  const slots: Array<{ division: Division; position: RankPosition }> = [];
  const pairs = Math.floor(totalSlots / 2);

  for (let n = 1; n <= pairs; n++) {
    slots.push({ division, position: { rank, side: "east", rankNumber: n } });
    slots.push({ division, position: { rank, side: "west", rankNumber: n } });
  }

  if (totalSlots % 2 === 1) {
    slots.push({ division, position: { rank, side: "east", rankNumber: pairs + 1 } });
  }

  return slots;
}

// === MOVEMENT MODEL ===

/**
 * Calculate absence penalty.
 *  * @param absences - The Absences.
 *  * @param totalBouts - The Total bouts.
 *  * @returns The result.
 */
function calculateAbsencePenalty(absences: number, totalBouts: number): number {
  if (absences === 0) return 0;
  const heavyKyujo = absences >= Math.floor(totalBouts * 0.5);
  const absenceWeight = heavyKyujo ? 1.75 : 1.25;
  return Math.round(absences * absenceWeight);
}

/**
 * Calculate performance bonuses.
 *  * @param perf - The Perf.
 *  * @returns The result.
 */
function calculatePerformanceBonuses(perf: BashoPerformance): number {
  let bonus = 0;

  if (typeof perf.opponentAvgTier === "number" && Number.isFinite(perf.opponentAvgTier)) {
    bonus += localClampInt(Math.round((5 - perf.opponentAvgTier) * 0.5), -1, 1);
  }

  if (perf.yusho) bonus += 5;
  if (perf.junYusho) bonus += 2;
  if (typeof perf.specialPrizes === "number" && Number.isFinite(perf.specialPrizes)) {
    bonus += localClampInt(perf.specialPrizes, 0, 3);
  }
  if (typeof perf.kinboshi === "number" && Number.isFinite(perf.kinboshi)) {
    bonus += localClampInt(perf.kinboshi, 0, 3);
  }

  return bonus;
}

/**
 * Clamp movement by rank.
 *  * @param move - The Move.
 *  * @param rank - The Rank.
 *  * @param isDemotedOzeki - The Is demoted ozeki.
 *  * @returns The result.
 */
function clampMovementByRank(move: number, rank: string, isDemotedOzeki: boolean): number {
  if (rank === "yokozuna") return localClampInt(move, -2, 2);

  if (rank === "ozeki") {
    const damped = Math.round(move * 0.65);
    if (isDemotedOzeki) return Math.min(-6, damped - 4);
    return localClampInt(damped, -4, 4);
  }

  if (rank === "sekiwake" || rank === "komusubi") {
    return localClampInt(Math.round(move * 0.8), -6, 6);
  }

  return localClampInt(move, -10, 10);
}

/**
 * Calculates the base movement score for a given rank and performance,
 * factoring in the margin versus kachi-koshi, absences, and bonuses.
 */
function calculateBaseMove(rank: Rank, perf: BashoPerformance): number {
  const bouts = RANK_HIERARCHY[rank].fightsPerBasho;
  const required = kachiKoshiThreshold(rank);

  const wins = perf.wins ?? 0;
  const abs = perf.absences ?? 0;

  const marginVsKK = wins - required;
  const absencePenalty = calculateAbsencePenalty(abs, bouts);
  const bonuses = calculatePerformanceBonuses(perf);

  return marginVsKK - absencePenalty + bonuses;
}

/**
 * Computes the final number of ranks a rikishi should move up or down on the banzuke
 * based on their performance, applying necessary ranking caps and damping rules.
 */
function computeMovementUnits(
  entry: BanzukeEntry,
  perf: BashoPerformance | undefined,
  demotedOzeki: Set<string>
): number {
  if (!perf) return 0;

  const rank = entry.position.rank;
  const isDemotedOzeki = demotedOzeki.has(entry.rikishiId);
  const baseMove = calculateBaseMove(rank, perf);

  return clampMovementByRank(baseMove, rank, isDemotedOzeki);
}

/**
 * Best tier allowed.
 *  * @param entry - The Entry.
 *  * @param perf - The Perf.
 *  * @param _ozekiState - The _ozeki state.
 *  * @param demotedOzeki - The Demoted ozeki.
 *  * @returns The result.
 */
function bestTierAllowed(
  entry: BanzukeEntry,
  perf: BashoPerformance | undefined,
  _ozekiState: OzekiKadobanState | undefined,
  demotedOzeki: Set<string>
): number {
  const rank = entry.position.rank;
  const tier = RANK_HIERARCHY[rank].tier;

  if (rank === "yokozuna") return 1;
  if (rank === "ozeki" && demotedOzeki.has(entry.rikishiId)) return 3;
  if (rank === "ozeki" && perf?.promoteToYokozuna) return 1;
  if (rank === "sekiwake" && (perf?.wins ?? 0) >= 11) return 2;

  if (rank === "komusubi" && (perf?.wins ?? 0) >= 10) return 3;

  if (rank === "maegashira") {
    const wins = perf?.wins ?? 0;
    const rn = entry.position.rankNumber ?? 99;
    if (perf?.yusho) return 3;
    if (rn <= 4 && wins >= 10) return 4;
  }

  return tier;
}

// === ASSIGNMENT ===

/** Type representing scored candidate. */
type ScoredCandidate = {
  entry: BanzukeEntry;
  oldKey: number;
  desiredKey: number;
  eligibleBestTier: number;
};

/**
 * Assign to template.
 *  * @param template - The Template.
 *  * @param candidates - The Candidates.
 *  * @param perfById - The Perf by id.
 *  * @param _ozekiKadoban - The _ozeki kadoban.
 *  * @param demotedOzeki - The Demoted ozeki.
 *  * @returns The result.
 */
function assignToTemplate(
  template: Array<{ division: Division; position: RankPosition }>,
  candidates: ScoredCandidate[],
  perfById: Map<string, BashoPerformance>,
  _ozekiKadoban: OzekiKadobanMap,
  demotedOzeki: Set<string>
): BanzukeEntry[] {
  const assigned: BanzukeEntry[] = [];
  const used = new Set<string>();

  const isEligibleForSlot = (cand: ScoredCandidate, slot: RankPosition): boolean => {
    const slotTier = RANK_HIERARCHY[slot.rank].tier;
    const perf = perfById.get(cand.entry.rikishiId);

    if (slotTier < cand.eligibleBestTier) return false;

    if (slot.rank === "yokozuna") {
      if (cand.entry.position.rank === "yokozuna") return true;
      if (cand.entry.position.rank === "ozeki" && !!perf?.promoteToYokozuna) return true;
      return false;
    }

    if (slot.rank === "ozeki") {
      if (cand.entry.position.rank === "ozeki" && !demotedOzeki.has(cand.entry.rikishiId)) return true;
      if (cand.entry.position.rank === "sekiwake" && (perf?.wins ?? 0) >= 11) return true;
      return false;
    }

    return true;
  };

  for (const slot of template) {
    const slotPos = slot.position;
    let chosen: ScoredCandidate | undefined;

    for (const cand of candidates) {
      const id = cand.entry.rikishiId;
      if (used.has(id)) continue;
      if (!isEligibleForSlot(cand, slotPos)) continue;
      chosen = cand;
      break;
    }

    if (!chosen) {
      for (const cand of candidates) {
        const id = cand.entry.rikishiId;
        if (used.has(id)) continue;
        if (slotPos.rank === "yokozuna") continue;
        if (slotPos.rank === "ozeki") continue;
        chosen = cand;
        break;
      }
    }

    if (!chosen) {
      const vacantId = `__VACANT_${slot.division}_${slotPos.rank}_${slotPos.rankNumber ?? 0}_${slotPos.side}`;
      assigned.push({ rikishiId: vacantId, division: slot.division, position: slotPos });
      continue;
    }

    used.add(chosen.entry.rikishiId);
    assigned.push({ rikishiId: chosen.entry.rikishiId, division: slot.division, position: slotPos });
  }

  return assigned;
}

// === POSITION / SORT KEYS ===

/**
 * Position key.
 *  * @param e - The E.
 *  * @returns The result.
 */
function positionKey(e: BanzukeEntry): number {
  const divBase = divisionTier(e.division) * 1_000_000;
  const tier = RANK_HIERARCHY[e.position.rank].tier;
  const rankBase = tier * 10_000;
  const rn = e.position.rankNumber ?? 0;
  const side = e.position.side === "east" ? 0 : 1;
  return divBase + rankBase + rn * 10 + side;
}

/**
 * Division tier.
 *  * @param d - The D.
 *  * @returns The result.
 */
function divisionTier(d: Division): number {
  const order: Record<Division, number> = {
    makuuchi: 0,
    juryo: 1,
    makushita: 2,
    sandanme: 3,
    jonidan: 4,
    jonokuchi: 5
  };
  return order[d] ?? 9;
}

// === ROSTER NORMALIZATION ===

/**
 * Normalize roster to template.
 *  * @param current - The Current.
 *  * @param needed - The Needed.
 *  * @returns The result.
 */
function normalizeRosterToTemplate(current: BanzukeEntry[], needed: number): BanzukeEntry[] {
  if (current.length === needed) return [...current];

  const sorted = [...current].sort((a, b) => {
    const ak = positionKey(a);
    const bk = positionKey(b);
    if (ak !== bk) return ak - bk;
    return a.rikishiId.localeCompare(b.rikishiId);
  });

  if (sorted.length > needed) return sorted.slice(0, needed);

  const out = [...sorted];
  while (out.length < needed) {
    const idx = out.length;
    out.push({
      rikishiId: `__FILLER_${idx}`,
      division: "jonokuchi",
      position: { rank: "jonokuchi", side: idx % 2 === 0 ? "east" : "west", rankNumber: Math.floor(idx / 2) + 1 }
    });
  }
  return out;
}

// === UTILS ===


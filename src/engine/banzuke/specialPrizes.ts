import type { Rikishi } from "@/engine/types/rikishi";
import type { MatchSchedule } from "@/engine/types/basho";
import type { SeededRNG } from "@/engine/core/rng";
import { conveneCommittee, type CommitteeDecision } from "@/engine/committee/committee";
import { SANSHO_COMMITTEE } from "@/constants/engine/committee";
import { isYokozunaOrOzekiRank } from "@/constants/engine/rankDisplay";

/**
 * Resulting special prizes for a tournament.
 * Each prize lists every winner — the JSA may split a prize between tied
 * rikishi, award one rikishi multiple prizes, or withhold a prize entirely
 * (empty array).
 */
export interface SpecialPrizesResult {
  ginoSho: string[];
  kantosho: string[];
  shukunsho: string[];
  /** Sansho committee deliberation records (present when convened). */
  deliberations?: CommitteeDecision[];
}

/** Every candidate at the top score shares the prize (JSA allows split awards). */
function topScorers(scores: Map<string, number>, minScore: number): string[] {
  let best = -1;
  for (const score of scores.values()) best = Math.max(best, score);
  if (best < minScore) return [];
  return [...scores.entries()]
    .filter(([, score]) => score === best)
    .map(([id]) => id)
    .sort();
}

/**
 * Logic to determine Gino-sho, Kanto-sho, and Shukun-sho prizes.
 *
 * JSA eligibility: any makuuchi rikishi ranked below ozeki (sekiwake,
 * komusubi, maegashira) who posts kachi-koshi. The yusho winner is excluded —
 * the champion takes the Emperor's Cup, not sansho.
 *
 * Award selection runs through the shared committee framework
 * (SANSHO_COMMITTEE): the deterministic stat scores below are each case's
 * baseline, and the committee's deliberation produces the decision record
 * (votes + rationale) surfaced in the feed.
 */
export function determineSpecialPrizes(
  matches: MatchSchedule[],
  rikishiMap: Map<string, Rikishi>,
  yushoId: string,
  committeeRng?: SeededRNG
): SpecialPrizesResult {
  const result: SpecialPrizesResult = { ginoSho: [], kantosho: [], shukunsho: [] };

  const stats = new Map<string, { wins: number; opponents: string[]; kimarites: string[] }>();
  const yokozunaIds = new Set<string>();

  for (const r of rikishiMap.values()) {
    if (r.division === "makuuchi" && r.rank === "yokozuna") {
      yokozunaIds.add(r.id);
    }
  }

  for (const m of matches) {
    if (!m.result || m.result.isDraw || !m.result.winnerRikishiId) continue;
    const w = m.result.winnerRikishiId;
    const l = m.result.loserRikishiId;

    let s = stats.get(w);
    if (!s) {
      s = { wins: 0, opponents: [], kimarites: [] };
      stats.set(w, s);
    }
    s.wins++;
    s.opponents.push(l);
    s.kimarites.push(m.result.kimarite);
  }

  const candidates: Rikishi[] = [];
  for (const r of rikishiMap.values()) {
    if (r.division !== "makuuchi") continue;
    if (isYokozunaOrOzekiRank(r.rank)) continue;
    if (r.id === yushoId) continue;
    const s = stats.get(r.id);
    if (s && s.wins >= 8) candidates.push(r);
  }

  if (candidates.length === 0) return result;

  // Sansho committee: each award's stat-derived score is the case baseline;
  // the committee deliberates and its score decides the award. With no
  // seeded evidence the committee adopts the baseline — the record stands.
  const deliberations: CommitteeDecision[] = [];
  const committeed = (prize: string, scores: Map<string, number>): Map<string, number> => {
    if (!committeeRng || scores.size === 0) return scores;
    const decisions = conveneCommittee(
      SANSHO_COMMITTEE,
      [...scores.entries()].map(([id, score]) => ({
        subjectId: `${prize}:${id}`,
        baseScore: score,
        merits: 0,
        demerits: 0,
        faction: "none",
      })),
      committeeRng
    );
    const out = new Map<string, number>();
    for (const [id] of scores) {
      const d = decisions.get(`${prize}:${id}`);
      if (!d) continue;
      deliberations.push(d);
      out.set(id, d.score);
    }
    return out;
  };

  // Shukun-sho (Outstanding Performance): beat the yusho winner or a yokozuna.
  const shukunScores = new Map<string, number>();
  for (const c of candidates) {
    const s = stats.get(c.id);
    if (!s) continue;
    const beatYusho = s.opponents.includes(yushoId);
    const beatYokozuna = s.opponents.some((oppId) => yokozunaIds.has(oppId));
    if (beatYusho || beatYokozuna) {
      shukunScores.set(c.id, (beatYusho ? 10 : 0) + (beatYokozuna ? 5 : 0) + s.wins);
    }
  }
  result.shukunsho = topScorers(committeed("shukun", shukunScores), 0);

  // Kanto-sho (Fighting Spirit): strongest record below the champion.
  const kantoScores = new Map<string, number>();
  for (const c of candidates) {
    const s = stats.get(c.id);
    if (s) kantoScores.set(c.id, s.wins);
  }
  result.kantosho = topScorers(committeed("kanto", kantoScores), 10);

  // Gino-sho (Technique): widest kimarite repertoire.
  const ginoScores = new Map<string, number>();
  for (const c of candidates) {
    const s = stats.get(c.id);
    if (s) ginoScores.set(c.id, new Set(s.kimarites).size);
  }
  result.ginoSho = topScorers(committeed("gino", ginoScores), 3);

  if (deliberations.length > 0) result.deliberations = deliberations;

  return result;
}

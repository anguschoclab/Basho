import type { Rikishi } from "@/engine/types/rikishi";
import type { MatchSchedule } from "@/engine/types/basho";

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
 * The deterministic scorer below is the game's proxy for the real sansho
 * committee's deliberation [game abstraction].
 */
export function determineSpecialPrizes(
  matches: MatchSchedule[],
  rikishiMap: Map<string, Rikishi>,
  yushoId: string
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
    if (!m.result) continue;
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
    if (r.rank === "yokozuna" || r.rank === "ozeki") continue;
    if (r.id === yushoId) continue;
    const s = stats.get(r.id);
    if (s && s.wins >= 8) candidates.push(r);
  }

  if (candidates.length === 0) return result;

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
  result.shukunsho = topScorers(shukunScores, 0);

  // Kanto-sho (Fighting Spirit): strongest record below the champion.
  const kantoScores = new Map<string, number>();
  for (const c of candidates) {
    const s = stats.get(c.id);
    if (s) kantoScores.set(c.id, s.wins);
  }
  result.kantosho = topScorers(kantoScores, 10);

  // Gino-sho (Technique): widest kimarite repertoire.
  const ginoScores = new Map<string, number>();
  for (const c of candidates) {
    const s = stats.get(c.id);
    if (s) ginoScores.set(c.id, new Set(s.kimarites).size);
  }
  result.ginoSho = topScorers(ginoScores, 3);

  return result;
}

import type { Rikishi } from "../types/rikishi";
import type { MatchSchedule } from "../types/basho";

/** Resulting special prizes for a tournament. */
export interface SpecialPrizesResult {
  ginoSho?: string;
  kantosho?: string;
  shukunsho?: string;
}

/**
 * Logic to determine Gino-sho, Kanto-sho, and Shukun-sho prizes.
 * Awarded to Maegashira who meet high-performance criteria.
 */
export function determineSpecialPrizes(
  matches: MatchSchedule[],
  rikishiMap: Map<string, Rikishi>,
  yushoId: string
): SpecialPrizesResult {
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

    if (!stats.has(w)) stats.set(w, { wins: 0, opponents: [], kimarites: [] });
    const s = stats.get(w)!;
    s.wins++;
    s.opponents.push(l);
    s.kimarites.push(m.result.kimarite);
  }

  const candidates: Rikishi[] = [];
  for (const r of rikishiMap.values()) {
    if (r.division !== "makuuchi" || r.rank !== "maegashira") continue;
    const s = stats.get(r.id);
    if (s && s.wins >= 8) candidates.push(r);
  }

  if (candidates.length === 0) return {};

  const result: SpecialPrizesResult = {};

  let bestShukun = { id: "", score: -1 };
  for (const c of candidates) {
    const s = stats.get(c.id)!;
    const beatYusho = s.opponents.includes(yushoId);
    let beatYokozuna = false;
    for (const oppId of s.opponents) {
      if (yokozunaIds.has(oppId)) {
        beatYokozuna = true;
        break;
      }
    }

    if (beatYusho || beatYokozuna) {
      const score = (beatYusho ? 10 : 0) + (beatYokozuna ? 5 : 0) + s.wins;
      if (score > bestShukun.score) bestShukun = { id: c.id, score };
    }
  }
  if (bestShukun.id) result.shukunsho = bestShukun.id;

  let bestKanto = { id: "", score: -1 };
  for (const c of candidates) {
    if (c.id === result.shukunsho) continue;
    const s = stats.get(c.id)!;
    if (s.wins >= 10 && s.wins > bestKanto.score) bestKanto = { id: c.id, score: s.wins };
  }
  if (bestKanto.id) result.kantosho = bestKanto.id;

  let bestGino = { id: "", score: -1 };
  for (const c of candidates) {
    if (c.id === result.shukunsho || c.id === result.kantosho) continue;
    const s = stats.get(c.id)!;
    const uniqueMoves = new Set(s.kimarites).size;
    if (uniqueMoves > bestGino.score && uniqueMoves >= 3)
      bestGino = { id: c.id, score: uniqueMoves };
  }
  if (bestGino.id) result.ginoSho = bestGino.id;

  return result;
}

import type { Rikishi } from "./types/rikishi";
import type { BashoState, MatchSchedule } from "./types/basho";
import type { Division } from "./types/banzuke";
import { scorePairing, MatchPairing, MatchmakingRules, DEFAULT_MATCHMAKING_RULES } from "./matchmaking";
import { rngFromSeed } from "./rng";
import { stableSort } from "./utils";
import { stableTieBreak } from "./utils/sort";

export interface IMatchmakingStrategy {
  generatePairs(basho: BashoState, rikishi: Rikishi[], options: { seed: string; division: Division; rules?: Partial<MatchmakingRules> }): MatchPairing[];
}

export class StandardMatchmaking implements IMatchmakingStrategy {
  public generatePairs(basho: BashoState, rikishi: Rikishi[], options: { seed: string; division: Division; rules?: Partial<MatchmakingRules> }): MatchPairing[] {
    const rules = { ...DEFAULT_MATCHMAKING_RULES, ...(options.rules || {}) };
    const rng = rngFromSeed(options.seed, "matchmaking", options.division);

    const pool = stableSort(
      rikishi.filter(r => r.division === options.division && !r.injured),
      r => r.id
    );

    const out: MatchPairing[] = [];
    const facedPairs = new Set<string>();
    for (const m of basho.matches) {
      const key = m.eastRikishiId < m.westRikishiId
        ? `${m.eastRikishiId}-${m.westRikishiId}`
        : `${m.westRikishiId}-${m.eastRikishiId}`;
      facedPairs.add(key);
    }

    // O(n^2) candidate build
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        const a = pool[i];
        const b = pool[j];

        // Realistic Sumo: No same-heya matches
        if (a.heyaId === b.heyaId) continue;
        
        // Realistic Sumo: No sibling matches (if we had sibling data, we'd check here)

        const pairing = scorePairing({ basho, a, b, rules, facedPairs });
        if (pairing) {
          const jitter = (rng.next() - 0.5) * 0.0001;
          out.push({ ...pairing, score: pairing.score + jitter });
        }
      }
    }

    out.sort((p1, p2) => {
      if (p2.score !== p1.score) return p2.score - p1.score;
      const a1 = `${p1.eastId}-${p1.westId}`;
      const a2 = `${p2.eastId}-${p2.westId}`;
      return stableTieBreak(a1, a2);
    });

    return out;
  }
}

export class PlayoffMatchmaking implements IMatchmakingStrategy {
  public generatePairs(basho: BashoState, rikishi: Rikishi[], options: { seed: string; division: Division; rules?: Partial<MatchmakingRules> }): MatchPairing[] {
    // Playoff rules: same-heya IS allowed, same-opponent IS allowed if needed.
    // Usually playoffs are single elimination or round robin for the yusho.
    // For now, we'll just prioritize top records regardless of heya.
    const rules: Partial<MatchmakingRules> = {
      avoidSameHeya: false,
      avoidRepeatOpponents: false,
      preferSimilarRecords: true
    };
    
    const pool = rikishi.filter(r => r.division === options.division);
    const out: MatchPairing[] = [];

    for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          const a = pool[i];
          const b = pool[j];
          const pairing = scorePairing({ basho, a, b, rules });
          if (pairing) out.push(pairing);
        }
    }
    return out.sort((a,b) => b.score - a.score);
  }
}

export class ExhibitionMatchmaking implements IMatchmakingStrategy {
  public generatePairs(basho: BashoState, rikishi: Rikishi[], options: { seed: string; division: Division; rules?: Partial<MatchmakingRules> }): MatchPairing[] {
     // Exhibition: Just random pairings for hype
     const rng = rngFromSeed(options.seed, "matchmaking", "exhibition");
     const pool = rikishi.filter(r => r.division === options.division);
     const out: MatchPairing[] = [];
     
     for (let i = 0; i < pool.length; i++) {
         for (let j = i + 1; j < pool.length; j++) {
             out.push({
                 eastId: pool[i].id,
                 westId: pool[j].id,
                 score: rng.next(),
                 reasons: ["exhibition"]
             });
         }
     }
     return out.sort((a,b) => b.score - a.score);
  }
}

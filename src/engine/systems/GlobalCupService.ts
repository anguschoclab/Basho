/**
 * GlobalCupService.ts
 * ==================
 * Core service for Global Cup tournament operations.
 */

import type { WorldState } from "../types/world";
import type {
  GlobalCupState,
  GlobalCupPhase,
  GlobalCupParticipant,
  GlobalCupMatch,
} from "../types/globalCup";
import type { Rikishi } from "../types/rikishi";
import { SeededRNG } from "../rng";

const INTERIM_WEEK_START = 10;
const JSA_SLOTS = 6;
const CHALLENGER_SLOTS = 2;

/**
 * Initialize a new Global Cup tournament
 */
export function initializeGlobalCup(
  world: WorldState,
  year: number,
  rng: SeededRNG
): GlobalCupState {
  // Select top 6 JSA rikishi by rank
  const jsaParticipants = selectJSAParticipants(world, JSA_SLOTS);

  // Select 2 international challengers
  const challengers = selectChallengers(world, CHALLENGER_SLOTS, rng);

  const participants: GlobalCupParticipant[] = [
    ...jsaParticipants.map((r, i) => ({
      rikishiId: r.id,
      shikona: r.shikona,
      rank: r.rank,
      heyaId: r.heyaId,
      nationality: "Japan",
      isChallenger: false,
      seed: i + 1,
    })),
    ...challengers.map((c, i) => ({
      rikishiId: c.id,
      shikona: c.shikona,
      rank: "International",
      heyaId: undefined,
      nationality: c.nationality || "Unknown",
      isChallenger: true,
      seed: JSA_SLOTS + i + 1,
    })),
  ];

  // Generate bracket
  const bracket = generateBracket(participants);

  return {
    year,
    phase: "registration",
    isActive: true,
    participants,
    bracket,
    startedAtWeek: world.week,
  };
}

/**
 * Select top JSA rikishi by rank and performance
 */
function selectJSAParticipants(world: WorldState, count: number): Rikishi[] {
  const activeRikishi = Array.from(world.activeRikishiIds)
    .map((id) => world.rikishi.get(id))
    .filter((r): r is Rikishi => r !== undefined && !r.injured);

  // Sort by rank prestige
  const rankOrder = ["Yokozuna", "Ozeki", "Sekiwake", "Komusubi", "M1", "M2", "M3", "M4", "M5"];

  return activeRikishi
    .sort((a, b) => {
      const rankA = rankOrder.indexOf(a.rank);
      const rankB = rankOrder.indexOf(b.rank);
      return rankB - rankA;
    })
    .slice(0, count);
}

/**
 * Select international challengers
 */
function selectChallengers(
  _world: WorldState,
  count: number,
  rng: SeededRNG
): Array<{ id: string; shikona: string; nationality: string }> {
  // International challenger pool
  const challengerPool = [
    { id: "challenger_1", shikona: "Möller", nationality: "Estonia", strength: 85 },
    { id: "challenger_2", shikona: "Gagloev", nationality: "Georgia", strength: 88 },
    { id: "challenger_3", shikona: "Kokk", nationality: "Estonia", strength: 82 },
    { id: "challenger_4", shikona: "Naya", nationality: "Brazil", strength: 80 },
    { id: "challenger_5", shikona: "Kato", nationality: "USA", strength: 78 },
  ];

  // Randomly select from pool using Fisher-Yates shuffle
  const shuffled = [...challengerPool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

/**
 * Generate tournament bracket
 */
function generateBracket(participants: GlobalCupParticipant[]): GlobalCupMatch[] {
  const matches: GlobalCupMatch[] = [];

  // Quarterfinals: 4 matches
  const quarterfinalPairs = [
    [0, 7], // 1 vs 8
    [3, 4], // 4 vs 5
    [1, 6], // 2 vs 7
    [2, 5], // 3 vs 6
  ];

  quarterfinalPairs.forEach((pair, i) => {
    matches.push({
      id: `qf_${i + 1}`,
      round: "quarterfinal",
      matchNumber: i + 1,
      eastRikishiId: participants[pair[0]].rikishiId,
      westRikishiId: participants[pair[1]].rikishiId,
      day: i + 1,
    });
  });

  // Semifinals: 2 matches (placeholders)
  matches.push(
    {
      id: `sf_1`,
      round: "semifinal",
      matchNumber: 1,
      eastRikishiId: "",
      westRikishiId: "",
      day: 5,
    },
    {
      id: `sf_2`,
      round: "semifinal",
      matchNumber: 2,
      eastRikishiId: "",
      westRikishiId: "",
      day: 6,
    }
  );

  // Finale: 1 match (placeholder)
  matches.push({
    id: `final`,
    round: "final",
    matchNumber: 1,
    eastRikishiId: "",
    westRikishiId: "",
    day: 7,
  });

  return matches;
}

/**
 * Advance tournament to next phase
 */
export function advancePhase(cup: GlobalCupState): GlobalCupState {
  const phaseOrder: GlobalCupPhase[] = [
    "registration",
    "quarterfinals",
    "semifinals",
    "finale",
    "complete",
  ];

  const currentIdx = phaseOrder.indexOf(cup.phase);
  const nextPhase = phaseOrder[Math.min(currentIdx + 1, phaseOrder.length - 1)];

  return {
    ...cup,
    phase: nextPhase,
    isActive: nextPhase !== "complete",
    completedAtWeek: nextPhase === "complete" ? cup.startedAtWeek + 2 : undefined,
  };
}

/**
 * Record match result and advance winner
 */
export function recordMatchResult(
  cup: GlobalCupState,
  matchId: string,
  winnerRikishiId: string
): GlobalCupState {
  const updatedBracket = cup.bracket.map((m) => (m.id === matchId ? { ...m, winnerRikishiId } : m));

  // Advance winner to next round
  const match = updatedBracket.find((m) => m.id === matchId);
  if (match) {
    if (match.round === "quarterfinal") {
      const sfIndex = match.matchNumber <= 2 ? 0 : 1;
      const sfId = `sf_${sfIndex + 1}`;
      const sfMatch = updatedBracket.find((m) => m.id === sfId);
      if (sfMatch) {
        if (!sfMatch.eastRikishiId) {
          sfMatch.eastRikishiId = winnerRikishiId;
        } else {
          sfMatch.westRikishiId = winnerRikishiId;
        }
      }
    } else if (match.round === "semifinal") {
      const finalMatch = updatedBracket.find((m) => m.round === "final");
      if (finalMatch) {
        if (!finalMatch.eastRikishiId) {
          finalMatch.eastRikishiId = winnerRikishiId;
        } else {
          finalMatch.westRikishiId = winnerRikishiId;
        }
      }
    } else if (match.round === "final") {
      return {
        ...cup,
        bracket: updatedBracket,
        championId: winnerRikishiId,
        phase: "complete",
        isActive: false,
      };
    }
  }

  return {
    ...cup,
    bracket: updatedBracket,
  };
}

/**
 * Check if Global Cup should start this week
 */
export function shouldStartGlobalCup(world: WorldState): boolean {
  return world.week === INTERIM_WEEK_START && !world.globalCup?.isActive;
}

/**
 * Get current phase label
 */
export function getPhaseLabel(phase: GlobalCupPhase): string {
  const labels: Record<GlobalCupPhase, string> = {
    registration: "Registration Open",
    quarterfinals: "Quarterfinals",
    semifinals: "Semifinals",
    finale: "Finale",
    complete: "Tournament Complete",
  };
  return labels[phase];
}

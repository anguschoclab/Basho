import type { WorldState } from "@/engine/types/world";
import type { Id } from "@/engine/types/common";
import { getHeya, getOyakataForHeya } from "@/engine/core/queries";
import { ELECTION_BOARD_SIZE } from "@/constants/engine/succession";
import { CAREER_MILESTONES } from "@/constants/ui/career";

export interface CareerMilestone {
  id: string;
  label: string;
  achieved: boolean;
  progress: number;
}

export interface ManagerCareerProjection {
  tenure: {
    startedYear?: number;
    bashoServed: number;
    championships: number;
    sekitoriProduced: number;
    insolvencyEvents: number;
    majorScandals: number;
    forcedMergers: number;
    boardSeatsWon: number;
  };
  prestigeBand: string;
  statureBand: string;
  legacyTier: string;
  eraCount: number;
  election: {
    score: number;
    rank: number;
    boardSeat: boolean;
    chairman: boolean;
    gapToBoard: number | null;
  };
  milestones: CareerMilestone[];
  successionRisk: {
    insolvency: number;
    scandals: number;
    underperformance: number;
  };
}

const ZERO_TENURE = {
  bashoServed: 0,
  championships: 0,
  sekitoriProduced: 0,
  insolvencyEvents: 0,
  majorScandals: 0,
  forcedMergers: 0,
  boardSeatsWon: 0,
};

function electionScore(heya: { politicalCapital?: number; reputation?: number }): number {
  return (heya.politicalCapital ?? 50) + (heya.reputation ?? 50) / 2;
}

/**
 * Surfaces the player's manager career: tenure counters, prestige/stature
 * bands, legacy tier/era, JSA election standing (same score as
 * runElections: politicalCapital + reputation/2), milestone progress, and
 * the §16.1 succession-trigger counters (post player-stakes fix these
 * apply to the player too).
 */
export function projectManagerCareer(world: WorldState, heyaId: Id): ManagerCareerProjection {
  const heya = getHeya(world, heyaId);
  const oyakata = getOyakataForHeya(world, heyaId);
  const tenure = { ...ZERO_TENURE, ...oyakata?.tenure };

  const scores = new Map<Id, number>();
  for (const h of world.heyas.values()) scores.set(h.id, electionScore(h));
  const ranked = [...world.heyas.keys()].sort(
    (a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0) || (a < b ? -1 : 1)
  );
  const rank = Math.max(1, ranked.indexOf(heyaId) + 1);
  const myScore = scores.get(heyaId) ?? electionScore(heya ?? {});
  const boardCutoff = ranked[ELECTION_BOARD_SIZE - 1];
  const fifthScore = boardCutoff !== undefined ? scores.get(boardCutoff) ?? 0 : null;
  const boardSeat = rank <= ELECTION_BOARD_SIZE && world.heyas.size >= 1;

  const values: Record<string, number> = {
    "first-sekitori": tenure.sekitoriProduced,
    "first-yusho": tenure.championships,
    "ten-sekitori": tenure.sekitoriProduced,
    "prestige-band": heya?.prestigeBand === "elite" || heya?.prestigeBand === "respected" ? 1 : 0,
    "board-seat": tenure.boardSeatsWon,
    chairman: rank === 1 ? 1 : 0,
    "legacy-tier": heya?.legacyTier === "dynasty" || heya?.legacyTier === "legend" ? 1 : 0,
  };
  const milestones: CareerMilestone[] = CAREER_MILESTONES.map((def) => {
    const value = values[def.id] ?? 0;
    return {
      id: def.id,
      label: def.label,
      achieved: value >= def.target,
      progress: Math.min(1, value / def.target),
    };
  }).sort((a, b) => a.id.localeCompare(b.id));

  return {
    tenure,
    prestigeBand: heya?.prestigeBand ?? "unknown",
    statureBand: heya?.statureBand ?? "unknown",
    legacyTier: heya?.legacyTier ?? "emerging",
    eraCount: heya?.dynasty?.length ?? 0,
    election: {
      score: myScore,
      rank,
      boardSeat,
      chairman: rank === 1,
      gapToBoard: boardSeat || fifthScore === null ? null : Math.max(0, fifthScore - myScore),
    },
    milestones,
    successionRisk: {
      insolvency: tenure.insolvencyEvents / 3,
      scandals: tenure.majorScandals / 2,
      underperformance: (heya?.consecutiveUnderperformanceBasho ?? 0) / 8,
    },
  };
}

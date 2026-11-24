import type { WorldState } from "@/engine/types/world";
import type { Id } from "@/engine/types/common";
import type { Heya } from "@/engine/types/heya";
import {
  SUCCESSION_INSOLVENCY_EVENTS,
  SUCCESSION_MAJOR_SCANDALS,
  SUCCESSION_UNDERPERFORMANCE_BASHO,
} from "@/constants/engine/succession";
import { BOARD_COMMITTEE } from "@/constants/engine/committee";
import { KABU_SEAT_WEIGHT } from "@/constants/engine/economic";
import { CAREER_MILESTONES } from "@/constants/ui/career";
import { baseTenure } from "@/engine/legacy/tenure";
import {
  apportionClanSeats,
  clanKeyOf,
  computeClanElectorate,
} from "@/engine/governance/elections";

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
    sanyakuProduced: number;
    ozekiProduced: number;
    yokozunaProduced: number;
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

const ZERO_TENURE = baseTenure(0);

function electionScore(
  heya: { politicalCapital?: number; reputation?: number },
  kabuAtHeya: number
): number {
  return (
    (heya.politicalCapital ?? 50) + (heya.reputation ?? 50) / 2 + kabuAtHeya * KABU_SEAT_WEIGHT
  );
}

/** Kabu held at each heya — mirrors runElections' slate weighting. */
function kabuByHeya(world: WorldState): Map<Id, number> {
  const counts = new Map<Id, number>();
  for (const stock of Object.values(world.myosekiMarket?.stocks ?? {})) {
    if (stock.status !== "held" && stock.status !== "leased") continue;
    const holder = stock.holderId;
    const hid =
      world.oyakata?.get(holder)?.heyaId ?? world.rikishi?.get(holder)?.heyaId;
    if (hid) counts.set(hid, (counts.get(hid) ?? 0) + 1);
  }
  return counts;
}

/**
 * Surfaces the player's manager career: tenure counters, prestige/stature
 * bands, legacy tier/era, JSA election standing (mirrors runElections'
 * clan-quota model: rank inside the stable's own caucus vs its apportioned
 * seats; chairman read from the persisted board), milestone progress, and
 * the §16.1 succession-trigger counters (post player-stakes fix these
 * apply to the player too).
 */
export function projectManagerCareer(world: WorldState, heyaId: Id): ManagerCareerProjection {
  const heya: Heya | undefined = world.heyas?.get(heyaId);
  const oyakata = heya?.oyakataId ? world.oyakata?.get(heya.oyakataId) : undefined;
  const tenure = { ...ZERO_TENURE, ...oyakata?.tenure };

  const kabu = kabuByHeya(world);
  const scores = new Map<Id, number>();
  for (const h of world.heyas?.values() ?? []) {
    scores.set(h.id, electionScore(h, kabu.get(h.id) ?? 0));
  }

  // Caucus standings: the heya competes inside its own clan for that clan's
  // apportioned seats (largest-remainder over the clan kabu electorate).
  const myClan = clanKeyOf(heya?.ichimon);
  const candidatesByClan = new Map<string, number>();
  for (const h of world.heyas?.values() ?? []) {
    const c = clanKeyOf(h.ichimon);
    candidatesByClan.set(c, (candidatesByClan.get(c) ?? 0) + 1);
  }
  const clanSeats = apportionClanSeats(
    computeClanElectorate(world),
    candidatesByClan as never,
    BOARD_COMMITTEE.size
  );
  const clanSlate = [...(world.heyas?.values() ?? [])]
    .filter((h) => clanKeyOf(h.ichimon) === myClan)
    .map((h) => h.id)
    .sort((a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0) || (a < b ? -1 : 1));
  const mySeats = clanSeats.get(myClan) ?? 0;
  const rank = Math.max(1, clanSlate.indexOf(heyaId) + 1);
  const myScore = scores.get(heyaId) ?? electionScore(heya ?? {}, kabu.get(heyaId) ?? 0);
  const boardSeat = rank <= mySeats && clanSlate.includes(heyaId);
  const cutoffId = clanSlate[mySeats - 1];
  const cutoffScore = cutoffId !== undefined ? (scores.get(cutoffId) ?? 0) : null;

  // Chairman: the sitting board's pick if an election has resolved; else the
  // projected consensus leader (rep + polCap + 2×yearsInCharge, id tiebreak).
  const chairmanScore = (h: Heya | undefined): number =>
    (h?.reputation ?? 50) +
    (h?.politicalCapital ?? 50) +
    2 * (h?.oyakataId ? world.oyakata?.get(h.oyakataId)?.yearsInCharge ?? 0 : 0);
  const sittingChair = world.jsaBoard?.directors.find((d) => d.isChairman)?.heyaId;
  const projectedChair = [...(world.heyas?.values() ?? [])].sort(
    (a, b) => chairmanScore(b) - chairmanScore(a) || (a.id < b.id ? -1 : 1)
  )[0]?.id;
  const chairman = (sittingChair ?? projectedChair) === heyaId;

  const values: Record<string, number> = {
    "first-sekitori": tenure.sekitoriProduced,
    "first-yusho": tenure.championships,
    "ten-sekitori": tenure.sekitoriProduced,
    "prestige-band": heya?.prestigeBand === "elite" || heya?.prestigeBand === "respected" ? 1 : 0,
    "board-seat": tenure.boardSeatsWon,
    chairman: chairman ? 1 : 0,
    "legacy-tier": heya?.legacyTier === "dynasty" || heya?.legacyTier === "legend" ? 1 : 0,
  };
  // Declaration order is presentation-meaningful (career progression), so the
  // projector honors CAREER_MILESTONES order rather than alphabetical.
  const milestones: CareerMilestone[] = CAREER_MILESTONES.map((def) => {
    const value = values[def.id] ?? 0;
    return {
      id: def.id,
      label: def.label,
      achieved: value >= def.target,
      progress: Math.min(1, value / def.target),
    };
  });

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
      chairman,
      gapToBoard: boardSeat || cutoffScore === null ? null : Math.max(0, cutoffScore - myScore),
    },
    milestones,
    successionRisk: {
      insolvency: tenure.insolvencyEvents / SUCCESSION_INSOLVENCY_EVENTS,
      scandals: tenure.majorScandals / SUCCESSION_MAJOR_SCANDALS,
      underperformance:
        (heya?.consecutiveUnderperformanceBasho ?? 0) / SUCCESSION_UNDERPERFORMANCE_BASHO,
    },
  };
}

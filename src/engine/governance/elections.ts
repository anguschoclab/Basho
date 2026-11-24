/**
 * elections.ts — Clan-quota JSA board elections (理事選).
 *
 * The real biennial board race is fought inside clan (ichimon) caucuses:
 * a clan's vote weight is its kabu count, seats split by largest remainder
 * (~10.5 kabu per seat → 3/3/2/1/1), and each caucus's slate is its
 * stablemasters ranked by standing. The board then elects a chairman
 * internally — a cross-clan consensus pick, not the top score. Three
 * external director seats are cosmetic. The result persists on
 * `world.jsaBoard`.
 *
 * Extracted from ScandalService — `runElections` keeps its signature and
 * remains re-exported there for existing call sites.
 */

import type { WorldState } from "@/engine/types/world";
import type { Id } from "@/engine/types/common";
import type { IchimonName, JsaBoardDirector } from "@/engine/types/economy";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { bumpTenure } from "@/engine/legacy/tenure";
import type { StateImpact } from "@/engine/core/StateImpact";
import { getHeya } from "@/engine/core/queries";
import { rngForWorld } from "@/engine/core/rng";
import { stableSort } from "@/engine/utils/sort";
import { ELECTION_INCUMBENCY_BONUS } from "@/constants/engine/succession";
import { KABU_SEAT_WEIGHT } from "@/constants/engine/economic";
import { BOARD_COMMITTEE } from "@/constants/engine/committee";
import { conveneCommittee } from "@/engine/committee/committee";

/** Clanless stables caucus as one pseudo-clan. */
export const UNAFFILIATED = "unaffiliated" as const;
export type ClanKey = IchimonName | typeof UNAFFILIATED;

/** External directors seated alongside the elected riji (cosmetic). */
export const EXTERNAL_BOARD_SEATS = 3;

/** A heya's clan key for election purposes. */
export const clanKeyOf = (ichimon: IchimonName | undefined): ClanKey =>
  ichimon ?? UNAFFILIATED;

/** Resolve a stock/elder holder's stable clan (oyakata or rikishi holder). */
function holderClan(world: WorldState, holderId: Id | undefined): ClanKey {
  const heyaId =
    (holderId && world.oyakata?.get(holderId)?.heyaId) ??
    (holderId && world.rikishi?.get(holderId)?.heyaId);
  return clanKeyOf(heyaId ? getHeya(world, heyaId)?.ichimon : undefined);
}

/**
 * Kabu held at each heya — stocks held or leased by the stable's oyakata OR
 * by any of its rikishi (sekitori reserves count toward the stable's voting
 * power while the wrestler holds them).
 */
function kabuByHeya(world: WorldState): Map<Id, number> {
  const counts = new Map<Id, number>();
  for (const stock of Object.values(world.myosekiMarket?.stocks ?? {})) {
    if (stock.status !== "held" && stock.status !== "leased") continue;
    const holder = stock.holderId;
    const heyaId =
      world.oyakata?.get(holder)?.heyaId ?? world.rikishi?.get(holder)?.heyaId;
    if (heyaId) counts.set(heyaId, (counts.get(heyaId) ?? 0) + 1);
  }
  return counts;
}

/**
 * The electorate: occupied kabu (held|leased) counted by `stock.ichimon`
 * (fallback: holder's stable clan) + 1 per stockless elder — a master's or
 * jun/ichidai elder's caucus vote survives the absence of a paper share.
 */
export function computeClanElectorate(world: WorldState): Map<ClanKey, number> {
  const votes = new Map<ClanKey, number>();
  const bump = (clan: ClanKey) => votes.set(clan, (votes.get(clan) ?? 0) + 1);
  const holders = new Set<Id>();
  for (const stock of Object.values(world.myosekiMarket?.stocks ?? {})) {
    if (stock.status !== "held" && stock.status !== "leased") continue;
    if (stock.holderId) holders.add(stock.holderId);
    bump(stock.ichimon ?? holderClan(world, stock.holderId));
  }
  for (const o of world.oyakata?.values() ?? []) {
    if (!holders.has(o.id)) bump(holderClan(world, o.id));
  }
  return votes;
}

/**
 * Largest-remainder apportionment of `size` seats across clan caucuses,
 * capped by each clan's candidate count; leftovers pass to the clan with
 * the largest remaining fraction that still has candidates (deterministic
 * clan-key tiebreak). When nobody holds kabu, candidate counts stand in
 * as the vote base — every master's caucus vote persists.
 */
export function apportionClanSeats(
  votes: Map<ClanKey, number>,
  candidates: Map<ClanKey, number>,
  size: number
): Map<ClanKey, number> {
  let voteBase = votes;
  const totalVotes = [...votes.values()].reduce((a, b) => a + b, 0);
  if (totalVotes <= 0) voteBase = new Map(candidates);
  const total = Math.max(1, [...voteBase.values()].reduce((a, b) => a + b, 0));

  const clans = stableSort([...candidates.keys()], (c) => c);
  const quota = new Map<ClanKey, { floor: number; rem: number }>();
  const seats = new Map<ClanKey, number>();
  for (const clan of clans) {
    const exact = ((voteBase.get(clan) ?? 0) / total) * size;
    const floor = Math.floor(exact);
    quota.set(clan, { floor, rem: exact - floor });
    seats.set(clan, Math.min(floor, candidates.get(clan) ?? 0));
  }

  let remaining = size - [...seats.values()].reduce((a, b) => a + b, 0);
  const order = [...clans].sort(
    (a, b) => (quota.get(b)?.rem ?? 0) - (quota.get(a)?.rem ?? 0) || (a < b ? -1 : 1)
  );
  while (remaining > 0) {
    let granted = false;
    for (const clan of order) {
      if (remaining <= 0) break;
      if ((seats.get(clan) ?? 0) < (candidates.get(clan) ?? 0)) {
        seats.set(clan, (seats.get(clan) ?? 0) + 1);
        remaining--;
        granted = true;
      }
    }
    if (!granted) break;
  }
  return seats;
}

/** Influence a stable brings to its clan's slate. */
function slateScore(world: WorldState, heyaId: Id, kabu: Map<Id, number>): number {
  const heya = getHeya(world, heyaId);
  return (
    (heya?.politicalCapital ?? 50) +
    (heya?.reputation ?? 50) / 2 +
    (kabu.get(heyaId) ?? 0) * KABU_SEAT_WEIGHT
  );
}

/**
 * Internal chairman pick — the board's cross-clan consensus: standing
 * (polCap + rep) weighted by seniority (yearsInCharge×2). Deterministic
 * heya-id tiebreak, mirroring careerProjections.
 */
function chairmanScore(world: WorldState, heyaId: Id): number {
  const heya = getHeya(world, heyaId);
  const years = heya?.oyakataId ? world.oyakata?.get(heya.oyakataId)?.yearsInCharge ?? 0 : 0;
  return (heya?.reputation ?? 50) + (heya?.politicalCapital ?? 50) + years * 2;
}

/**
 * Bi-annual JSA Board Elections — clan-quota model.
 * Seats apportion by clan kabu weight, slates are intra-clan standings,
 * the chairman is an internal board pick, and the result persists to
 * `world.jsaBoard`. Keeps the incumbency bump, `boardSeatsWon` tenure, and
 * the `good_standing` elevation.
 */
export function runElections(world: WorldState): StateImpact {
  const builder = createImpactBuilder("elections");

  const votes = computeClanElectorate(world);
  const kabu = kabuByHeya(world);

  // Candidates are stable-level seats, caucused by the stable's clan.
  const byClan = new Map<ClanKey, string[]>();
  for (const heya of world.heyas.values()) {
    const clan = clanKeyOf(heya.ichimon);
    const bucket = byClan.get(clan) ?? [];
    bucket.push(heya.id);
    byClan.set(clan, bucket);
  }
  const candidatesByClan = new Map<ClanKey, number>(
    [...byClan.entries()].map(([c, ids]) => [c, ids.length])
  );
  const seats = apportionClanSeats(votes, candidatesByClan, BOARD_COMMITTEE.size);

  // Score every candidate through the shared committee framework (BOARD
  // spec has zero discretion — the mechanical vote is the outcome).
  const allCandidates = [...byClan.entries()].flatMap(([clan, ids]) =>
    ids.map((heyaId) => ({
      clan,
      heyaId,
      score: slateScore(world, heyaId, kabu),
      name: getHeya(world, heyaId)?.name ?? heyaId,
    }))
  );
  const decisions = conveneCommittee(
    BOARD_COMMITTEE,
    allCandidates.map((c) => ({
      subjectId: c.heyaId,
      baseScore: c.score,
      merits: 0,
      demerits: 0,
      faction: "none",
    })),
    rngForWorld(world, "governance", BOARD_COMMITTEE.id)
  );
  for (const c of allCandidates) {
    const d = decisions.get(c.heyaId);
    if (d) c.score = d.score;
  }

  // Intra-clan slate: the clan's top-seated candidates win.
  const elected: typeof allCandidates = [];
  for (const [clan, ids] of byClan) {
    const quota = seats.get(clan) ?? 0;
    if (quota <= 0) continue;
    const slate = allCandidates
      .filter((c) => ids.includes(c.heyaId))
      .sort((a, b) => b.score - a.score || (a.heyaId < b.heyaId ? -1 : 1));
    elected.push(...slate.slice(0, quota));
  }

  // Internal chairman pick — consensus score, deterministic tiebreak.
  const chairman = [...elected].sort(
    (a, b) =>
      chairmanScore(world, b.heyaId) - chairmanScore(world, a.heyaId) ||
      (a.heyaId < b.heyaId ? -1 : 1)
  )[0];

  for (const candidate of elected) {
    builder.updateHeya(candidate.heyaId, {
      governanceStatus: "good_standing", // Board members are elevated to good standing
      politicalCapital: Math.min(
        100,
        (getHeya(world, candidate.heyaId)?.politicalCapital ?? 0) + ELECTION_INCUMBENCY_BONUS
      ),
    });
    bumpTenure(world, builder, candidate.heyaId, { boardSeatsWon: 1 });

    builder.logEvent(
      "GOVERNANCE_RULING",
      "discipline",
      {
        incident: "election_victory",
        status: "board_member",
        reason: "JSA Elder Election",
        score: Math.floor(candidate.score),
        ichimon: candidate.clan,
      },
      { heyaId: candidate.heyaId, importance: "headline" }
    );
  }

  // Persist the board — careerProjections + governance UI read it.
  const directors: JsaBoardDirector[] = stableSort(
    elected,
    (c) => c.heyaId
  ).map((c) => {
    const heya = getHeya(world, c.heyaId);
    return {
      oyakataId: heya?.oyakataId ?? "",
      heyaId: c.heyaId,
      ...(heya?.ichimon ? { ichimon: heya.ichimon } : {}),
      isChairman: c === chairman,
    };
  });
  builder.updateWorldField("jsaBoard", {
    directors,
    externalSeats: EXTERNAL_BOARD_SEATS,
    clanSeats: Object.fromEntries(seats),
    electedYear: world.year,
  });

  if (chairman) {
    builder.logEvent("BASHO_STATUS", "basho", {
      status: "phase_transition",
      incident: `The JSA bi-annual board elections have concluded. ${chairman.name} has been appointed as Chairman.`,
      shikona: chairman.name,
    });
  }

  return builder.build();
}

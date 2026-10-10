/**
 * AdvisorService.ts
 * =================
 * Generates a prioritized list of player-facing recommendations from the
 * current world state. All recommendations are derived from banded perception
 * and public data; no hidden AI state is exposed.
 */

import type { WorldState } from "../types/world";
import type { Id } from "../types/common";
import type { AIRecommendation, AIGoalDomain } from "../ai/types";
import { buildPerceptionSnapshot } from "../perception";
import { buildLeaguePerception } from "../npcAI/LeaguePerception";
import { getAdvice } from "../bout/CornerAdvice";
import { getRikishi, getHeya, getOyakataForHeya } from "../queries";
import { getOpponentModel } from "../npcAI/MemoryStore";
import { getOpponentDominantFamily, suggestCounterTactic } from "../npcAI/OpponentModel";
import { buildMetaPerception } from "../npcAI/MetaPerception";
import { candidateConsumesForeignSlot } from "../systems/generation/talentPoolReads";
import { isAtForeignLimit } from "../utils/citizenshipUtils";

const MAX_ROSTER = 30;

const ROSTER_LOW_THRESHOLD = 10;

/** How far back a rival plan shift remains actionable intel (weeks). */
const RIVAL_PLAN_INTEL_WINDOW_WEEKS = 8;

function rec(
  id: string,
  category: AIGoalDomain | "bout",
  priority: AIRecommendation["priority"],
  title: string,
  detail: string,
  action?: string,
  entityId?: string
): AIRecommendation {
  return {
    id,
    category: category as AIRecommendation["category"],
    priority,
    title,
    detail,
    reasoning: [detail],
    suggestedAction: action,
    relatedEntityId: entityId,
  };
}

function financialRecommendations(world: WorldState, heyaId: Id): AIRecommendation[] {
  const perception = buildPerceptionSnapshot(world, heyaId);
  const recs: AIRecommendation[] = [];
  if (perception.runwayBand === "desperate" || perception.runwayBand === "critical") {
    recs.push(
      rec(
        "finance-emergency",
        "finance",
        "critical",
        "Critical runway",
        `The stable has ${perception.runwayBand} finances. Suspend discretionary spending and prioritize prize-money events.`,
        "Open finances panel",
        heyaId
      )
    );
  } else if (perception.runwayBand === "tight") {
    recs.push(
      rec(
        "finance-tight",
        "finance",
        "high",
        "Tight runway",
        "Stable funds are tight. Consider a conservative training budget until the next basho payout.",
        "Open finances panel",
        heyaId
      )
    );
  }
  return recs;
}

function rosterRecommendations(world: WorldState, heyaId: Id): AIRecommendation[] {
  const heya = getHeya(world, heyaId);
  if (!heya) return [];
  const rikishiIds = [...new Set(heya.rikishiIds ?? [])];
  let active = 0;
  let injuredCount = 0;
  for (const id of rikishiIds) {
    const r = getRikishi(world, id);
    if (r && !r.isRetired) {
      active++;
      if (r.injured) injuredCount++;
    }
  }
  const recs: AIRecommendation[] = [];
  if (active < ROSTER_LOW_THRESHOLD) {
    recs.push(
      rec(
        "roster-undermanned",
        "recruitment",
        "high",
        "Undermanned stable",
        `Only ${active} active rikishi are available. Recruit prospects before the next tournament.`,
        "Open recruitment panel",
        heyaId
      )
    );
  }
  if (injuredCount > active / 3 && active > 0) {
    recs.push(
      rec(
        "health-injury-wave",
        "training",
        "high",
        "Injury wave",
        `${injuredCount} of ${active} rikishi are injured. Reduce training intensity and review medical facilities.`,
        "Open training panel",
        heyaId
      )
    );
  }
  return recs;
}

function rivalryRecommendations(world: WorldState, heyaId: Id): AIRecommendation[] {
  const heya = getHeya(world, heyaId);
  if (!heya || !world.rivalriesState) return [];
  const ids = new Set(heya.rikishiIds ?? []);
  const involved = [];
  for (const p of Object.values(world.rivalriesState.pairs)) {
    if (ids.has(p.aId) || ids.has(p.bId)) {
      involved.push(p);
    }
  }
  const heated = [];
  for (const p of involved) {
    if (p.heat >= 60) {
      heated.push(p);
    }
  }
  if (heated.length === 0) return [];
  return [
    rec(
      "rivalry-heated",
      "rivalry",
      "medium",
      "Heated rivalry active",
      `${heated.length} active rivalry(ies) are running hot. Monitor media and consider matchmaking pressure.`,
      "Open rivalries panel",
      heated[0].key
    ),
  ];
}

function bashoRecommendations(world: WorldState, heyaId: Id): AIRecommendation[] {
  if (!world.currentBasho) return [];
  const recs: AIRecommendation[] = [];
  const today = world.currentBasho.day;
  const matches = world.currentBasho.matches.filter((m) => m.day === today && !m.result);
  for (const match of matches) {
    const east = getRikishi(world, match.eastRikishiId);
    const west = getRikishi(world, match.westRikishiId);
    if (!east || !west) continue;
    const playerId =
      east.heyaId === heyaId ? east.id : west.heyaId === heyaId ? west.id : undefined;
    const opponent = east.heyaId === heyaId ? west : west.heyaId === heyaId ? east : undefined;
    if (!playerId || !opponent) continue;
    const playerRikishi = getRikishi(world, playerId);
    if (!playerRikishi) continue;
    const advice = getAdvice({
      playerRikishi,
      opponent,
      bashoDay: today,
    });
    for (const a of advice) {
      recs.push({
        ...a,
        id: `corner-${match.boutId ?? `${today}-${match.eastRikishiId}`}-${a.id}`,
        category: "bout",
      });
    }

    // Opponent-model intel: if the player's oyakata has learned this
    // opponent's tactical family, surface it as a banded scout hint.
    const oyakata = getOyakataForHeya(world, heyaId);
    const model = oyakata?.memory ? getOpponentModel(oyakata.memory, opponent.id) : undefined;
    const family = model ? getOpponentDominantFamily(model) : undefined;
    const counter = model ? suggestCounterTactic(model) : undefined;
    if (family) {
      recs.push(
        rec(
          `opponent-model-${match.boutId ?? `${today}-${opponent.id}`}`,
          "bout",
          "medium",
          `Scout report: ${opponent.shikona}`,
          `Your stable's notes say ${opponent.shikona} favors the ${family} family — counter with ${counter ?? "push"}-style work in training.`,
          "Open bout prep",
          opponent.id
        )
      );
    }
  }
  return recs;
}

/** League-aware recommendations — rival plans, contested recruits. */
function leagueRecommendations(world: WorldState, heyaId: Id): AIRecommendation[] {
  const recs: AIRecommendation[] = [];
  const league = buildLeaguePerception(world);
  const heya = getHeya(world, heyaId);
  if (!heya) return recs;

  // A rival stable leads the yusho race while the player is in contention.
  const leader = league.yushoRace.leaders[0];
  if (leader && !league.yushoRace.isClinched) {
    const leaderRikishi = getRikishi(world, leader.rikishiId);
    const playerInRace = league.yushoRace.leaders.some((l) =>
      (heya.rikishiIds ?? []).includes(l.rikishiId)
    );
    if (leaderRikishi && leaderRikishi.heyaId !== heyaId && playerInRace) {
      const rivalHeya = getHeya(world, leaderRikishi.heyaId ?? "");
      recs.push(
        rec(
          "rival-yusho-leader",
          "rank",
          "high",
          "Rival leads the yusho race",
          `${leader.shikona} of ${rivalHeya?.name ?? "a rival stable"} leads the tournament at ${leader.wins}-${leader.losses}. Your rikishi are still in the race — every bout matters.`,
          "Open standings",
          leader.rikishiId
        )
      );
    }
  }

  // A top recruit is visible and rival stables have roster vacancies.
  if (league.topRecruitAvailable) {
    const rivalWithVacancy = [...world.heyas.values()].some(
      (h) => h.id !== heyaId && (h.rikishiIds?.length ?? 0) < MAX_ROSTER
    );
    if (rivalWithVacancy) {
      recs.push(
        rec(
          "contested-recruit",
          "recruitment",
          "medium",
          "Contested top recruit",
          "A high-potential recruit is available and rival stables have roster room. Expect bidding competition.",
          "Open recruitment panel",
          heyaId
        )
      );
    }
  }

  return recs;
}

/**
 * WS7 — league intel: rival plan shifts, meta drift, succession watch,
 * faction pressure, contested foreign recruits. Every output is banded
 * perception or public record — no raw trait numbers, no private plans.
 */
function intelRecommendations(world: WorldState, heyaId: Id): AIRecommendation[] {
  const recs: AIRecommendation[] = [];
  const week = world.calendar?.currentWeek ?? world.week ?? 0;

  // Rival plan shift — recent plan changes are actionable intelligence.
  const log = (world.events?.log ?? []) as {
    type: string;
    category?: string;
    week?: number;
    data?: Record<string, unknown>;
  }[];
  const shift = [...log]
    .reverse()
    .find(
      (e) =>
        e.type === "STRATEGY_SHIFT" &&
        e.category === "ai_plan_change" &&
        e.data?.heyaId !== undefined &&
        e.data.heyaId !== heyaId &&
        week - Number(e.week ?? 0) >= 0 &&
        week - Number(e.week ?? 0) <= RIVAL_PLAN_INTEL_WINDOW_WEEKS
    );
  if (shift) {
    const shiftHeyaId = String(shift.data?.heyaId);
    const rivalHeya = getHeya(world, shiftHeyaId);
    recs.push(
      rec(
        "rival-plan-shift",
        "rivalry",
        "medium",
        "Rival stable changed strategy",
        `${rivalHeya?.name ?? "A rival stable"} committed to a new direction (${String(
          shift.data?.planId ?? "unknown plan"
        )}). Watch their recruitment and matchmaking.`,
        "Open rival stables",
        shiftHeyaId
      )
    );
  }

  // Meta-drift bulletin — banded era perception; the era tone is a
  // publicly announced headline and family shares are banded, not raw.
  const meta = buildMetaPerception(world);
  const notable =
    meta.dominanceBand === "established" ||
    (meta.dominanceBand === "emerging" && meta.trend === "strengthening");
  if (notable) {
    recs.push(
      rec(
        "meta-drift-bulletin",
        "governance",
        meta.dominanceBand === "established" ? "medium" : "low",
        "Era style bulletin",
        `Observers say the ${meta.dominantFamily} family is ${meta.dominanceBand} and ${meta.trend}. Align recruitment and training — or prepare counters.`,
        "Open scouting",
        heyaId
      )
    );
  }

  // Succession watch — a rival oyakata at mandatory retirement is a public
  // governance fact (JSA age rule), not private state.
  for (const heya of world.heyas.values()) {
    if (heya.id === heyaId) continue;
    const oya = getOyakataForHeya(world, heya.id);
    if (oya?.successionReadiness === "mandatory") {
      recs.push(
        rec(
          "succession-watch",
          "governance",
          "medium",
          "Rival succession imminent",
          `${oya.name} of ${heya.name} is at mandatory retirement age — expect a leadership transition there.`,
          "Open rival stables",
          heya.id
        )
      );
      break;
    }
  }

  // Faction pressure — an elected coordinated-pressure posture naming the
  // player is delivered as a governance ruling, so it is public.
  for (const [ichimon, fp] of Object.entries(world.factionPostures ?? {})) {
    if (fp?.posture === "coordinated_pressure" && fp.targetHeyaId === heyaId) {
      recs.push(
        rec(
          "faction-pressure",
          "governance",
          "high",
          "Ichimon coordinating pressure",
          `The ${ichimon} ichimon is coordinating pressure against your stable. Expect hostile matchmaking and political friction.`,
          "Open governance",
          heyaId
        )
      );
    }
  }

  // Contested foreign recruit — a visible standout while the player's
  // foreign slot is open. Only surfaced when it's actually actionable.
  const pool = world.talentPool;
  if (pool?.candidates) {
    const foreignStar = Object.values(pool.candidates).find(
      (c) =>
        c.availabilityState === "available" &&
        (c.isEmergentProdigy || c.tags?.includes("amateur_star")) &&
        candidateConsumesForeignSlot(c)
    );
    if (foreignStar) {
      const playerRikishi = [...(world.activeRikishiIds ?? [])]
        .map((id) => getRikishi(world, id))
        .filter((r): r is NonNullable<typeof r> => !!r && r.heyaId === heyaId);
      if (!isAtForeignLimit(playerRikishi, world.year)) {
        recs.push(
          rec(
            "contested-foreign-recruit",
            "recruitment",
            "high",
            "Foreign standout available",
            `${foreignStar.name} is drawing rival interest and your foreign slot is open. Foreign recruits are capped at one per stable — move decisively or pass.`,
            "Open recruitment panel",
            foreignStar.candidateId
          )
        );
      }
    }
  }

  return recs;
}

/** Generate a prioritized list of player-facing recommendations. */
export function generateRecommendations(world: WorldState, playerHeyaId?: Id): AIRecommendation[] {
  const heyaId = playerHeyaId ?? world.playerHeyaId;
  if (!heyaId) return [];

  const recs: AIRecommendation[] = [
    ...financialRecommendations(world, heyaId),
    ...rosterRecommendations(world, heyaId),
    ...rivalryRecommendations(world, heyaId),
    ...bashoRecommendations(world, heyaId),
    ...leagueRecommendations(world, heyaId),
    ...intelRecommendations(world, heyaId),
  ];

  const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  recs.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  return recs;
}

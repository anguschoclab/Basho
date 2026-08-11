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
import { getRikishi, getHeya } from "../queries";

const ROSTER_LOW_THRESHOLD = 10;

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
  const active = (heya.rikishiIds ?? []).filter((id) => {
    const r = getRikishi(world, id);
    return r && !r.isRetired;
  }).length;
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
  const injuredCount = (heya.rikishiIds ?? []).filter((id) => {
    const r = getRikishi(world, id);
    return r && r.injured;
  }).length;
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
  ];

  const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  recs.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  return recs;
}

/** Build a lightweight digest object for UI panels. */
export function getPlayerDigest(world: WorldState, playerHeyaId?: Id) {
  const heyaId = playerHeyaId ?? world.playerHeyaId;
  if (!heyaId) return undefined;

  const perception = buildPerceptionSnapshot(world, heyaId);
  const league = buildLeaguePerception(world);

  return {
    heyaId,
    runwayBand: perception.runwayBand,
    rosterStrengthBand: perception.rosterStrengthBand,
    moraleBand: perception.moraleBand,
    topRecruitAvailable: league.topRecruitAvailable,
    rivalryClusters: league.rivalryClusters.length,
    financiallyFragileHeyas: league.financiallyFragileHeyas.length,
    recommendations: generateRecommendations(world, heyaId),
  };
}

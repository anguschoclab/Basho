/**
 * npcEventSurfacing.ts
 * ====================
 * Logic to determine if an NPC event should be surfaced/highlighted to the player.
 * Highlights events that have direct interest or impact on the player's world state.
 */

import type { WorldState } from "../types/world";
import type { Id } from "../types/common";
import type { EventImportance } from "../types/events";
import type { TalentCandidate } from "../types/talent";
import type { MyosekiStock } from "../types/myoseki";
import { getHeya } from "../queries";

/**
 * Checks if a recruitment decision is relevant to the player.
 */
export function isRecruitmentPlayerRelevant(
  world: WorldState,
  candidate: TalentCandidate
): EventImportance {
  const playerHeyaId = world.playerHeyaId;
  if (!playerHeyaId) return "minor";

  // 1. Player has an active offer
  const playerOffer = candidate.competingSuitors?.find((s) => s.heyaId === playerHeyaId);
  if (playerOffer) return "headline";

  // 2. Player has scouted this candidate deeply
  const scoutingData = world.talentPool?.playerScouting?.[candidate.candidateId];
  if (scoutingData && scoutingData.scoutingLevel >= 2) return "major";

  // 3. Elite or Amateur Star
  if (candidate.isAmateurStar || candidate.isEmergentProdigy) return "notable";

  return "minor";
}

/**
 * Checks if a Myoseki acquisition is relevant to the player.
 */
export function isMyosekiPlayerRelevant(world: WorldState, stock: MyosekiStock): EventImportance {
  const playerHeyaId = world.playerHeyaId;
  if (!playerHeyaId) return "minor";

  const playerHeya = getHeya(world, playerHeyaId);
  if (!playerHeya) return "minor";

  // 1. Elite tier Myoseki
  if (stock.prestigeTier === "elite") return "major";

  // 2. Player can afford it and has high ambition
  const oyakata = world.oyakata.get(playerHeya.oyakataId);
  if (
    stock.askingPrice &&
    playerHeya.funds >= stock.askingPrice &&
    oyakata &&
    oyakata.traits.ambition > 70
  ) {
    return "notable";
  }

  return "minor";
}

/**
 * Checks if a governance ruling is relevant.
 */
export function isGovernancePlayerRelevant(_heyaId: Id, severity: string): EventImportance {
  // Any major sanction on any heya is notable
  if (severity === "critical") return "headline";
  if (severity === "major") return "major";

  return "minor";
}

/**
 * Checks if a sponsor recruitment is relevant.
 */
export function isSponsorPlayerRelevant(tier: string): EventImportance {
  // High tier sponsors are notable
  if (tier === "T5" || tier === "T4") return "notable";
  return "minor";
}

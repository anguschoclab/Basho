/**
 * src/engine/prestige/prestigeSystem.ts
 *
 * Handles stable prestige decay, stature band updates, and reputation drift.
 * Based on Constitution A3.4.
 */

import type { WorldState } from "../types/world";
import type { Heya } from "../types/heya";
import type { PrestigeBand } from "../types/narrative";
import { getHeyaRoster } from "../queries";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";

export const PRESTIGE_ORDER: PrestigeBand[] = [
  "unknown",
  "struggling",
  "modest",
  "respected",
  "elite",
];

/**
 * Get the index of a prestige band in the canonical order.
 */
export function bandIndex(b: PrestigeBand): number {
  return PRESTIGE_ORDER.indexOf(b);
}

/**
 * Update stature band based on roster rank composition.
 */
export function updateStatureBand(world: WorldState, heya: Heya): void {
  let maxRankWeight = 0;
  let rosterScore = 0;
  const RANK_WEIGHT: Record<string, number> = {
    yokozuna: 100,
    ozeki: 80,
    sekiwake: 60,
    komusubi: 50,
    maegashira: 30,
    juryo: 15,
    makushita: 8,
    sandanme: 4,
    jonidan: 2,
    jonokuchi: 1,
  };

  const roster = getHeyaRoster(world, heya.id);
  for (const r of roster) {
    const w = RANK_WEIGHT[r.rank] ?? 5;
    rosterScore += w;
    if (w > maxRankWeight) maxRankWeight = w;
  }

  const avgScore = roster.length > 0 ? rosterScore / roster.length : 0;

  if (maxRankWeight >= 100 && avgScore >= 40) heya.statureBand = "legendary";
  else if (maxRankWeight >= 60 && avgScore >= 30) heya.statureBand = "powerful";
  else if (avgScore >= 20) heya.statureBand = "established";
  else if (avgScore >= 10) heya.statureBand = "rebuilding";
  else if (roster.length >= 3) heya.statureBand = "fragile";
  else heya.statureBand = "new";
}

/**
 * Post-basho prestige decay and recalculation.
 * Per A3.4:
 * - Elite stables must maintain performance or erode.
 * - Multi-basho stagnation accelerates decay.
 * - Yūshō/sanshō provide upward shifts.
 * - Small stables face extra fragility.
 *
 * Returns StateImpact describing prestige changes instead of mutating state.
 */
export function runPrestigeDecay(world: WorldState): StateImpact {
  const lastBasho = world.history[world.history.length - 1];
  if (!lastBasho) {
    return createImpactBuilder("prestigeDecay").build();
  }

  const builder = createImpactBuilder("prestigeDecay");

  for (const heya of world.heyas.values()) {
    let totalWins = 0;
    let totalLosses = 0;
    let hasYusho = false;
    let hasJunYusho = false;
    let sanshoPrizeCount = 0;
    let sekitoriCount = 0;

    const roster = getHeyaRoster(world, heya.id);
    for (const r of roster) {
      totalWins += r.currentBashoWins ?? 0;
      totalLosses += r.currentBashoLosses ?? 0;

      if (lastBasho.yusho === r.id) hasYusho = true;
      if (lastBasho.junYusho.includes(r.id)) hasJunYusho = true;
      if (lastBasho.ginoSho === r.id) sanshoPrizeCount++;
      if (lastBasho.kantosho === r.id) sanshoPrizeCount++;
      if (lastBasho.shukunsho === r.id) sanshoPrizeCount++;

      if (r.division === "makuuchi" || r.division === "juryo") sekitoriCount++;
    }

    const totalBouts = totalWins + totalLosses;
    const winRate = totalBouts > 0 ? totalWins / totalBouts : 0.5;

    const currentIdx = bandIndex(heya.prestigeBand);
    let shift = 0;

    // === Positive prestige gains ===
    if (hasYusho) shift += 2;
    else if (hasJunYusho) shift += 1;
    if (sanshoPrizeCount >= 2) shift += 1;
    else if (sanshoPrizeCount === 1) shift += winRate >= 0.55 ? 1 : 0;
    if (winRate >= 0.65 && totalBouts >= 10) shift += 1;

    // === Prestige decay — passive erosion for average/poor performance ===
    if (winRate < 0.4 && totalBouts >= 10) shift -= 1;
    if (winRate < 0.3 && totalBouts >= 10) shift -= 1; // double penalty for terrible basho

    // === Elite erosion — must maintain excellence ===
    if (heya.prestigeBand === "elite") {
      if (!hasYusho && !hasJunYusho && winRate < 0.55) shift -= 1;
      if (sekitoriCount === 0) shift -= 1; // no sekitori = severe erosion
    }

    // === Multi-basho stagnation check ===
    if (heya.prestigeBand === "unknown" && winRate < 0.5 && !hasYusho) {
      shift = Math.min(shift, 0);
    }
    if (heya.prestigeBand === "struggling" && winRate < 0.45 && !hasJunYusho && !hasYusho) {
      shift = Math.min(shift, 0);
    }

    // === Small stable fragility ===
    if (roster.length < 5 && heya.prestigeBand !== "unknown") {
      shift -= 1;
    }

    // Apply clamped shift
    const newIdx = Math.max(0, Math.min(PRESTIGE_ORDER.length - 1, currentIdx + shift));
    const newBand = PRESTIGE_ORDER[newIdx];

    if (newBand !== heya.prestigeBand) {
      const direction = newIdx > currentIdx ? "rose" : "fell";
      // Queue event in impact instead of calling EventBus directly
      builder.logEvent(
        "GOVERNANCE_RULING",
        "narrative",
        {
          incident: "prestige_shift",
          status: newBand,
          reason: heya.prestigeBand, // previous band
          score: Math.round(winRate * 100),
        },
        {
          heyaId: heya.id,
          importance: Math.abs(shift) >= 2 ? "major" : "notable",
        }
      );
      // Queue heya update for prestigeBand
      builder.updateHeya(heya.id, { prestigeBand: newBand });
    }

    // Calculate new stature band
    let newStatureBand = heya.statureBand;
    let maxRankWeight = 0;
    let rosterScore = 0;
    const RANK_WEIGHT: Record<string, number> = {
      yokozuna: 100,
      ozeki: 80,
      sekiwake: 60,
      komusubi: 50,
      maegashira: 30,
      juryo: 15,
      makushita: 8,
      sandanme: 4,
      jonidan: 2,
      jonokuchi: 1,
    };

    for (const r of roster) {
      const w = RANK_WEIGHT[r.rank] ?? 5;
      rosterScore += w;
      if (w > maxRankWeight) maxRankWeight = w;
    }

    const avgScore = roster.length > 0 ? rosterScore / roster.length : 0;

    if (maxRankWeight >= 100 && avgScore >= 40) newStatureBand = "legendary";
    else if (maxRankWeight >= 60 && avgScore >= 30) newStatureBand = "powerful";
    else if (avgScore >= 20) newStatureBand = "established";
    else if (avgScore >= 10) newStatureBand = "rebuilding";
    else if (roster.length >= 3) newStatureBand = "fragile";
    else newStatureBand = "new";

    // Queue heya update for statureBand
    builder.updateHeya(heya.id, { statureBand: newStatureBand });

    // Reputation drift
    const reputationDelta = shift * 5;
    const newReputation = Math.max(0, Math.min(100, (heya.reputation ?? 50) + reputationDelta));
    // Queue heya update for reputation
    builder.updateHeya(heya.id, { reputation: newReputation });
  }

  return builder.build();
}

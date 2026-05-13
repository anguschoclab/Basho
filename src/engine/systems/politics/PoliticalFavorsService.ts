// @ts-nocheck
/**
 * PoliticalFavorsService.ts
 * ==========================
 * Manages "Ichimon Favor" and player-led political maneuvers.
 * (Phase 4: Media, Narratives & Faction Power)
 */

import { WorldState } from "../../types/world";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { StateImpact } from "../../core/StateImpact";

export type FavorType = "matchmaking_avoid" | "advance_payout" | "governance_pardon";

export interface FavorOption {
  id: FavorType;
  label: string;
  description: string;
  cost: number;
}

export const POLITICAL_FAVORS: FavorOption[] = [
  {
    id: "matchmaking_avoid",
    label: "Matchmaking Influence",
    description: "Request the Shimpan to avoid a specific rival on Day 1 of the tournament.",
    cost: 15,
  },
  {
    id: "advance_payout",
    label: "JSA Payout Advance",
    description: "Request an immediate advance on your stable's monthly stipend.",
    cost: 25,
  },
  {
    id: "governance_pardon",
    label: "Governance Clemency",
    description: "Use faction influence to wipe a minor governance warning from your record.",
    cost: 40,
  },
];

export const PoliticalFavorsService = {
  /**
   * Spends political capital to activate a favor.
   */
  requestFavor(world: WorldState, heyaId: string, favorId: FavorType): StateImpact {
    const builder = createImpactBuilder("requestFavor");
    const heya = world.heyas.get(heyaId);
    if (!heya) return builder.build();

    const favor = POLITICAL_FAVORS.find((f) => f.id === favorId);
    if (!favor) return builder.build();

    const currentCapital = heya.politicalCapital ?? 50;
    if (currentCapital < favor.cost) {
      return builder.build();
    }

    // Spend political capital
    builder.updateHeya(heyaId, {
      politicalCapital: currentCapital - favor.cost,
    });

    // Apply specific favor logic
    const FAVOR_HANDLERS: Record<FavorType, () => void> = {
      advance_payout: () => {
        builder.updateHeya(heyaId, { funds: heya.funds + 5_000_000 });
        builder.logEvent("OYAKATA_MOOD_SHIFT", "narrative", { newMood: "content" });
      },
      governance_pardon: () => {
        builder.updateHeya(heyaId, { scandalScore: Math.max(0, (heya.scandalScore ?? 0) - 10) });
      },
      matchmaking_avoid: () => {
        builder.updateWorldField("matchmakingOverride", {
          type: "avoid_rival",
          requesterId: heyaId,
        });
      },
    };

    const handler = FAVOR_HANDLERS[favorId];
    if (handler) handler();

    builder.logEvent(
      "POLITICAL_FAVOR_REDEEMED",
      "discipline",
      {
        favorId,
        cost: favor.cost,
        incident: `Spent faction favor: ${favor.label}`,
      },
      { heyaId }
    );

    return builder.build();
  },
};

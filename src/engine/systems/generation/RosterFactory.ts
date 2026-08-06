/**
 * src/engine/systems/generation/RosterFactory.ts
 * ===============================================
 * Rikishi roster generation logic.
 * Extracted from WorldFactory.ts for SRP separation.
 */

import { SeededRNG } from "../../rng";
import { Heya } from "../../types/heya";
import { Oyakata } from "../../types/oyakata";
import { Rikishi } from "../../types/rikishi";
import { generateFullRikishi } from "./CandidateBuilder";
import { Division, Rank, Side } from "../../types/banzuke";
import {
  YOKOZUNA_COUNT_MIN,
  YOKOZUNA_COUNT_MAX,
  ROSTER_TIER_FALLBACK_CHANCE,
} from "../../../constants/engine/generation";

export function createRosters(
  worldRng: SeededRNG,
  heyaMap: Map<string, Heya>,
  oyakataMap: Map<string, Oyakata>
): Map<string, Rikishi> {
  const rikishiMap = new Map<string, Rikishi>();
  const heyaList = Array.from(heyaMap.values());

  const heyaByTier = heyaList.sort((a, b) => {
    const tierOrder: Record<string, number> = {
      legendary: 5,
      powerful: 4,
      established: 3,
      rebuilding: 2,
      fragile: 1,
      new: 0,
    };
    return (tierOrder[b.statureBand] ?? 0) - (tierOrder[a.statureBand] ?? 0);
  });

  const yokozunaCount = worldRng.int(YOKOZUNA_COUNT_MIN, YOKOZUNA_COUNT_MAX);
  const rankConfigs: { rank: Rank; division: Division; count: number; tierWeight: number }[] = [
    { rank: "yokozuna", division: "makuuchi", count: yokozunaCount, tierWeight: 5 },
    { rank: "ozeki", division: "makuuchi", count: 2, tierWeight: 5 },
    { rank: "sekiwake", division: "makuuchi", count: 2, tierWeight: 4 },
    { rank: "komusubi", division: "makuuchi", count: 2, tierWeight: 4 },
    { rank: "maegashira", division: "makuuchi", count: 34, tierWeight: 3 },
    { rank: "juryo", division: "juryo", count: 28, tierWeight: 2 },
    { rank: "makushita", division: "makushita", count: 120, tierWeight: 1 },
    { rank: "sandanme", division: "sandanme", count: 110, tierWeight: 0 },
    { rank: "jonidan", division: "jonidan", count: 90, tierWeight: 0 },
    { rank: "jonokuchi", division: "jonokuchi", count: 50, tierWeight: 0 },
  ];

  rankConfigs.forEach((config) => {
    for (let i = 0; i < config.count; i++) {
      const side: Side = i % 2 === 0 ? "east" : "west";
      const rankNumber =
        config.rank === "maegashira" ||
        config.rank === "juryo" ||
        config.rank === "makushita" ||
        config.rank === "sandanme" ||
        config.rank === "jonidan" ||
        config.rank === "jonokuchi"
          ? Math.floor(i / 2) + 1
          : 1;

      const rikishiId = worldRng.uuid("RK");

      const eligibleStables = heyaByTier.filter((h) => {
        const stableTier =
          { legendary: 5, powerful: 4, established: 3, rebuilding: 2, fragile: 1, new: 0 }[
            h.statureBand
          ] ?? 0;
        return (
          stableTier >= config.tierWeight - 1 ||
          (stableTier >= config.tierWeight - 2 && worldRng.next() > ROSTER_TIER_FALLBACK_CHANCE)
        );
      });

      const heya =
        eligibleStables.length > 0 ? worldRng.pick(eligibleStables) : worldRng.pick(heyaList);

      const oyakata = oyakataMap.get(heya?.oyakataId || "");

      const r = generateFullRikishi({
        id: rikishiId,
        rng: worldRng,
        currentYear: 2025,
        rank: config.rank,
        division: config.division,
        side,
        rankNumber,
        legacyShikona: oyakata?.formerShikona,
        heyaPrefix: heya.shikonaPrefix,
      });

      r.heyaId = heya.id;
      heya.rikishiIds = [...(heya.rikishiIds || []), r.id];
      rikishiMap.set(r.id, r);
    }
  });

  return rikishiMap;
}

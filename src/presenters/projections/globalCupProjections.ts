/**
 * globalCupProjections.ts
 * =======================
 * Projections for Global Cup tournament data.
 */

import type { WorldState } from "@/engine/types/world";
import type {
  GlobalCupParticipant,
  GlobalCupMatch,
  GlobalCupProjection,
} from "@/engine/types/globalCup";

/**
 * Project Global Cup data for UI consumption
 */
export function projectGlobalCup(world: WorldState): GlobalCupProjection | null {
  const cup = world.globalCup;
  if (!cup || !cup.isActive) return null;

  const phaseLabels: Record<string, string> = {
    registration: "Registration Open",
    quarterfinals: "Quarterfinals",
    semifinals: "Semifinals",
    finale: "Finale",
    complete: "Tournament Complete",
  };

  // Build participant projections
  const participants = cup.participants.map((p: GlobalCupParticipant) => {
    const heya = p.heyaId ? world.heyas.get(p.heyaId) : null;
    return {
      rikishiId: p.rikishiId,
      shikona: p.shikona,
      rank: p.rank,
      heyaName: heya?.name || "Independent",
      nationality: p.nationality,
      nationalityFlag: getFlagForNationality(p.nationality),
      isChallenger: p.isChallenger,
      seed: p.seed,
      isChampion: p.rikishiId === cup.championId,
    };
  });

  // Build bracket projections
  const bracket = cup.bracket.map((m: GlobalCupMatch) => {
    const east = world.rikishi.get(m.eastRikishiId);
    const west = world.rikishi.get(m.westRikishiId);
    const winner = m.winnerRikishiId ? world.rikishi.get(m.winnerRikishiId) : null;
    const eastHeya = east?.heyaId ? world.heyas.get(east.heyaId) : null;
    const westHeya = west?.heyaId ? world.heyas.get(west.heyaId) : null;
    const winnerHeya = winner?.heyaId ? world.heyas.get(winner.heyaId) : null;

    return {
      id: m.id,
      round: m.round,
      matchNumber: m.matchNumber,
      eastRikishi: east ? { shikona: east.shikona, heyaName: eastHeya?.name || "Unknown" } : null,
      westRikishi: west ? { shikona: west.shikona, heyaName: westHeya?.name || "Unknown" } : null,
      winnerRikishi: winner
        ? { shikona: winner.shikona, heyaName: winnerHeya?.name || "Unknown" }
        : null,
      isComplete: !!m.winnerRikishiId,
      day: m.day,
    };
  });

  // Build champion info
  const champion = cup.championId
    ? (() => {
        const champ = world.rikishi.get(cup.championId);
        const champHeya = champ?.heyaId ? world.heyas.get(champ.heyaId) : null;
        return champ
          ? {
              shikona: champ.shikona,
              heyaName: champHeya?.name || "Unknown",
            }
          : null;
      })()
    : null;

  return {
    year: cup.year,
    phase: cup.phase,
    isActive: cup.isActive,
    phaseLabel: phaseLabels[cup.phase] || cup.phase,
    participants,
    bracket,
    champion,
    history: [], // History populated from ChronicleService
  };
}

/**
 * Get flag emoji for nationality
 */
function getFlagForNationality(nationality: string): string {
  const flags: Record<string, string> = {
    Japan: "🇯🇵",
    Mongolia: "🇲🇳",
    Estonia: "🇪🇪",
    Georgia: "🇬🇪",
    Bulgaria: "🇧🇬",
    Brazil: "🇧🇷",
    USA: "🇺🇸",
    Russia: "🇷🇺",
    Ukraine: "🇺🇦",
    China: "🇨🇳",
    Korea: "🇰🇷",
    Hungary: "🇭🇺",
    Czech: "🇨🇿",
  };
  return flags[nationality] || "🏳️";
}

/**
 * Check if Global Cup is currently active
 */
export function isGlobalCupActive(world: WorldState): boolean {
  return world.globalCup?.isActive ?? false;
}

/**
 * Get Global Cup phase
 */
export function getGlobalCupPhase(world: WorldState): string | null {
  return world.globalCup?.phase ?? null;
}

/**
 * Get tournament progress percentage
 */
export function getGlobalCupProgress(world: WorldState): number {
  const cup = world.globalCup;
  if (!cup?.isActive) return 0;

  switch (cup.phase) {
    case "registration":
      return 0;
    case "quarterfinals":
      return 25;
    case "semifinals":
      return 50;
    case "finale":
      return 75;
    case "complete":
      return 100;
    default:
      return 0;
  }
}

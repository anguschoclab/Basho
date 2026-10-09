/**
 * PostBashoPressService.ts
 * ========================
 * Generates post-basho press conference PBP lines for NPC rikishi.
 * Facade composing the per-domain generators in ./postBashoPress/.
 */

import type { WorldState } from "../../types/world";
import type { Id } from "../../types/common";
import type { PbpLine } from "../../bout/boutNarrative";
import { rngFromSeed } from "../../rng";
import { getRikishi } from "../../queries";
import { generateChampionLines } from "./postBashoPress/champion";
import {
  generatePrizeWinnerLines,
  generateYokozunaBidLines,
  generateOzekiStakeLines,
} from "./postBashoPress/prizes";
import { generateLowerDivisionChampionLines } from "./postBashoPress/lowerDivision";

export interface PressConferenceContext {
  yushoId: Id;
  junYushoIds: Id[];
  ginoSho?: Id;
  kantosho?: Id;
  shukunsho?: Id;
  bashoName: string;
  year: number;
  divisionYushoMap?: Record<string, Id>;
}

/**
 * Generate post-basho press conference PBP lines for all relevant NPC rikishi.
 */
function generatePressConference(world: WorldState, context: PressConferenceContext): PbpLine[] {
  const lines: PbpLine[] = [];
  const { yushoId, bashoName, year } = context;
  const pressRng = rngFromSeed(`press-${bashoName}-${year}`, "narrative", "post_basho_press");

  // Champion press conference
  const champion = getRikishi(world, yushoId);
  if (champion) {
    lines.push(...generateChampionLines(champion, pressRng, bashoName, year));
  }

  // Special prize winners
  for (const prizeId of [context.shukunsho, context.kantosho, context.ginoSho]) {
    if (!prizeId) continue;
    const winner = getRikishi(world, prizeId);
    if (!winner || prizeId === yushoId) continue;
    lines.push(...generatePrizeWinnerLines(winner, pressRng, bashoName, year));
  }

  // Yokozuna bid commentary for strong Ozeki
  for (const rid of world.activeRikishiIds) {
    const r = getRikishi(world, rid);
    if (!r || r.rank !== "ozeki") continue;
    const wins = r.currentBashoWins ?? 0;
    if (wins >= 12) {
      lines.push(...generateYokozunaBidLines(r, pressRng, bashoName, year, wins));
    }
  }

  // Ozeki stake claim for strong sekiwake/komusubi
  for (const rid of world.activeRikishiIds) {
    const r = getRikishi(world, rid);
    if (!r) continue;
    if (r.rank !== "sekiwake" && r.rank !== "komusubi") continue;
    const wins = r.currentBashoWins ?? 0;
    if (wins >= 11) {
      lines.push(...generateOzekiStakeLines(r, pressRng, bashoName, year));
    }
  }

  // Lower division champion press lines — use division yusho map if available
  if (context.divisionYushoMap) {
    for (const [division, champId] of Object.entries(context.divisionYushoMap)) {
      if (division === "makuuchi") continue; // makuuchi champion already covered above
      const divChamp = getRikishi(world, champId);
      if (divChamp) {
        lines.push(
          ...generateLowerDivisionChampionLines(divChamp, pressRng, bashoName, year, division)
        );
      }
    }
  } else {
    // Fallback: only if yusho winner is from a lower division
    const championRikishi = getRikishi(world, yushoId);
    if (championRikishi && championRikishi.division !== "makuuchi") {
      lines.push(
        ...generateLowerDivisionChampionLines(
          championRikishi,
          pressRng,
          bashoName,
          year,
          championRikishi.division ?? "lower division"
        )
      );
    }
  }

  return lines;
}

export const PostBashoPressService = {
  generatePressConference,
  generateChampionLines,
  generatePrizeWinnerLines,
  generateYokozunaBidLines,
  generateOzekiStakeLines,
  generateLowerDivisionChampionLines,
};

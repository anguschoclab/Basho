import type { Rikishi } from "../../../types/rikishi";
import type { PbpLine } from "../../../bout/boutNarrative";
import { BardEngine } from "../../../bard/BardEngine";
import type { rngFromSeed } from "../../../rng";
import { emitLine } from "./emit";

/**
 * Lower-division champion press lines: first honor (always), career goal
 * (50% chance), coach gratitude (40% chance).
 */
export function generateLowerDivisionChampionLines(
  champion: Rikishi,
  rng: ReturnType<typeof rngFromSeed>,
  bashoName: string,
  year: number,
  division?: string
): PbpLine[] {
  const lines: PbpLine[] = [];
  const baseId = `press-ld-champion-${champion.id}-${bashoName}-${year}`;
  const divLabel = division ?? champion.division ?? "lower division";
  const tokens = { SHIKONA: champion.shikona, rikishiId: champion.id };

  // First honor — always generate for lower division champions
  emitLine(
    lines,
    BardEngine.resolve(rng, "post_basho_press.lower_division.first_honor", {
      ...tokens,
      DIVISION: divLabel,
    }),
    baseId,
    "first-honor"
  );

  // Career goal — 50% chance
  if (rng.next() < 0.5) {
    emitLine(
      lines,
      BardEngine.resolve(rng, "post_basho_press.lower_division.career_goal", tokens),
      baseId,
      "career-goal"
    );
  }

  // Coach gratitude — 40% chance
  if (rng.next() < 0.4) {
    emitLine(
      lines,
      BardEngine.resolve(rng, "post_basho_press.lower_division.coach_gratitude", tokens),
      baseId,
      "coach"
    );
  }

  return lines;
}

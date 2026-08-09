/**
 * Career Highlight Memory System (B7)
 *
 * Tracks standout career memories for each rikishi. Highlights are recorded
 * at bout resolution and consumed at retirement for narrative reflection.
 */

import type { Rikishi } from "../types/rikishi";
import type { Id } from "../types/common";

export type CareerHighlightType =
  | "debut_win"
  | "seven_seven_win"
  | "upset_over_elite"
  | "yusho"
  | "playoff_win"
  | "kinboshi"
  | "rivalry_defining";

export interface CareerHighlight {
  type: CareerHighlightType;
  basho: string;
  opponent?: Id;
  description: string;
}

/** Priority ranking for selecting a "favorite" highlight at retirement */
const HIGHLIGHT_PRIORITY: Record<CareerHighlightType, number> = {
  yusho: 7,
  playoff_win: 6,
  kinboshi: 5,
  rivalry_defining: 4,
  upset_over_elite: 3,
  seven_seven_win: 2,
  debut_win: 1,
};

/**
 * Record a career highlight on a rikishi, returning a new rikishi object
 * with the highlight appended. Does not mutate the original.
 */
export function recordCareerHighlight(rikishi: Rikishi, highlight: CareerHighlight): Rikishi {
  const existing = rikishi.careerHighlights ?? [];
  return {
    ...rikishi,
    careerHighlights: [...existing, highlight],
  };
}

/**
 * Get the most significant career highlight for a rikishi.
 * Used at retirement to reference a favorite memory.
 */
export function getFavoriteHighlight(rikishi: Rikishi): CareerHighlight | undefined {
  const highlights = rikishi.careerHighlights;
  if (!highlights || highlights.length === 0) return undefined;

  return highlights.reduce((best, current) =>
    HIGHLIGHT_PRIORITY[current.type] > HIGHLIGHT_PRIORITY[best.type] ? current : best
  );
}

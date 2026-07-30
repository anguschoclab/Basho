/**
 * Post-Retirement Career Path System (B8)
 *
 * Determines what a rikishi does after retirement based on career achievements,
 * rank, and personality. Generates a retirement narrative that references
 * career highlights.
 */

import type { Rikishi } from "../types/rikishi";
import type { SeededRNG } from "../rng";
import { getFavoriteHighlight } from "../bout/CareerHighlights";

export type PostRetirementPath = "oyakata" | "media_pundit" | "sumo_school_coach" | "leave_sumo_world";

/** Minimum yusho count to be eligible for oyakata path */
const OYAKATA_MIN_YUSHO = 1;

/** Minimum career wins to be eligible for oyakata path */
const OYAKATA_MIN_WINS = 300;

/**
 * Determine the post-retirement career path for a rikishi.
 *
 * - Yokozuna/Ozeki with yusho → oyakata
 * - Sekitori with strong career → oyakata or media_pundit (RNG)
 * - Lower division with moderate career → sumo_school_coach or media_pundit
 * - Short/weak career → leave_sumo_world
 */
export function determinePostRetirementPath(
  rikishi: Rikishi,
  rng: SeededRNG
): PostRetirementPath {
  const rank = rikishi.rank ?? "";
  const wins = rikishi.careerRecord?.wins ?? 0;
  const yusho = rikishi.careerRecord?.yusho ?? 0;
  const division = rikishi.division ?? "";

  // Elite champions → oyakata
  if (
    (rank === "yokozuna" || rank === "ozeki") &&
    yusho >= OYAKATA_MIN_YUSHO
  ) {
    return "oyakata";
  }

  // Sekitori with strong career → oyakata or media_pundit
  if (division === "makuuchi" || division === "juryo") {
    if (wins >= OYAKATA_MIN_WINS && yusho >= OYAKATA_MIN_YUSHO) {
      return rng.next() < 0.7 ? "oyakata" : "media_pundit";
    }
    // Moderate sekitori career
    if (wins >= 150) {
      return rng.next() < 0.5 ? "media_pundit" : "sumo_school_coach";
    }
    // Weak sekitori career
    return rng.next() < 0.4 ? "media_pundit" : "leave_sumo_world";
  }

  // Lower division
  if (wins >= 80) {
    return rng.next() < 0.6 ? "sumo_school_coach" : "leave_sumo_world";
  }

  // Very short career
  return rng.next() < 0.3 ? "sumo_school_coach" : "leave_sumo_world";
}

/**
 * Generate a retirement narrative for a rikishi based on their post-retirement path.
 * Includes the rikishi's favorite career highlight if available.
 */
export function getRetirementNarrative(
  rikishi: Rikishi,
  path: PostRetirementPath
): string {
  const shikona = rikishi.shikona || rikishi.name || "The rikishi";
  const highlight = getFavoriteHighlight(rikishi);
  const highlightText = highlight
    ? ` His greatest moment: ${highlight.description}.`
    : "";

  const wins = rikishi.careerRecord?.wins ?? 0;
  const losses = rikishi.careerRecord?.losses ?? 0;
  const yusho = rikishi.careerRecord?.yusho ?? 0;

  const recordStr = `(${wins}-${losses}${yusho > 0 ? `, ${yusho} yusho` : ""})`;

  switch (path) {
    case "oyakata":
      return `${shikona} retires ${recordStr} and will remain in the sumo world as an oyakata, passing on his knowledge to the next generation.${highlightText}`;
    case "media_pundit":
      return `${shikona} hangs up his mawashi ${recordStr} and transitions to a career in media commentary, where his experience will illuminate the sport for fans.${highlightText}`;
    case "sumo_school_coach":
      return `${shikona} retires ${recordStr} and takes a position coaching at a sumo school, nurturing young talent before they enter the professional ranks.${highlightText}`;
    case "leave_sumo_world":
      return `${shikona} retires ${recordStr} and steps away from the sumo world, seeking a new path in life beyond the dohyo.${highlightText}`;
  }
}

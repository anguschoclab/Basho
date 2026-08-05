/**
 * Gyoji (Referee) and Shimpan (Judge) Entity Types
 *
 * Gyoji are referees who officiate bouts. Their accuracy rating affects
 * mono-ii (judge consultation) reversal rates. Shimpan are the five judges
 * who form the mono-ii panel.
 */

import type { Id } from "./common";

/** Gyoji rank — tate-gyoji (top) down to lower ranks. */
export type GyojiRank = "tate" | "fuku-tate" | "sanyaku" | "makuuchi" | "juryo" | "makushita";

/** Shimpan judge role on the mono-ii panel. */
export type ShimpanRole = "chief" | "panelist";

/** Defines the structure for a gyoji (referee) entity. */
export interface Gyoji {
  id: Id;
  name: string;
  rank: GyojiRank;
  /** Accuracy rating 0-100. Higher = fewer reversed calls. */
  accuracy: number;
  /** Years of experience. */
  yearsActive: number;
  /** Number of bouts officiated. */
  boutsOfficiated: number;
  /** Number of calls reversed by mono-ii. */
  callsReversed: number;
  /** Career history entries — basho-by-basho log. */
  careerHistory?: Array<{
    bashoName: string;
    year: number;
    boutsOfficiated: number;
    reversals: number;
  }>;
}

/** Defines the structure for a shimpan (judge) entity. */
export interface Shimpan {
  id: Id;
  name: string;
  /** Accuracy rating 0-100. Affects mono-ii panel decisions. */
  accuracy: number;
  /** Years of experience. */
  yearsActive: number;
  /** Number of mono-ii consultations participated in. */
  consultations: number;
}

/** A shimpan panel for a single bout's mono-ii. */
export interface ShimpanPanel {
  chief: Shimpan;
  panelists: Shimpan[];
}

/** Result of a mono-ii consultation. */
export type MonoiiOutcome = "upheld" | "reversed" | "rematch";

/**
 * Calculate the probability that a gyoji's call is reversed by mono-ii.
 * Lower accuracy → higher reversal probability.
 * Base reversal rate is 25%; each point of accuracy below 50 adds 0.5%.
 */
export function calculateReversalProbability(gyoji: Gyoji, panel: ShimpanPanel | null): number {
  let prob = 0.25;
  // Low accuracy increases reversal chance
  if (gyoji.accuracy < 50) {
    prob += (50 - gyoji.accuracy) * 0.005;
  }
  // High accuracy decreases reversal chance
  if (gyoji.accuracy > 70) {
    prob -= (gyoji.accuracy - 70) * 0.003;
  }
  // Panel accuracy moderates: high-accuracy panel is more likely to reverse bad calls
  if (panel) {
    const panelAvg =
      (panel.chief.accuracy + panel.panelists.reduce((s, p) => s + p.accuracy, 0)) /
      (1 + panel.panelists.length);
    if (panelAvg > 70 && gyoji.accuracy < 50) {
      prob += 0.05; // Sharp panel catches bad calls more often
    }
  }
  return Math.max(0.05, Math.min(0.6, prob));
}

/**
 * Determine the outcome of a mono-ii consultation.
 * Uses the gyoji's accuracy and panel composition to decide.
 */
export function resolveMonoii(
  gyoji: Gyoji,
  panel: ShimpanPanel | null,
  rng: { next: () => number }
): MonoiiOutcome {
  const reversalProb = calculateReversalProbability(gyoji, panel);
  const roll = rng.next();
  if (roll < reversalProb) return "reversed";
  if (roll < reversalProb + 0.1) return "rematch";
  return "upheld";
}

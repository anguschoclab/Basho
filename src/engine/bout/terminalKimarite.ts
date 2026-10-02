/**
 * terminalKimarite.ts
 * ===================
 * Contextual terminal kimarite classification.
 *
 * Physics decides the ENDING TYPE — push-side boundary exit, belt-side
 * boundary exit, push-side collapse, belt-side collapse. This module decides
 * the TECHNIQUE LABEL within that ending type by a weighted draw over the
 * contextually-plausible candidates, with weights proportional to each
 * technique's real-world makuuchi share (KIMARITE_FREQUENCY_TARGETS).
 *
 * Because weights are real shares, observed distribution converges to real
 * life wherever the ending-type mix is right — and every technique that is
 * physically plausible in a given ending becomes reachable (the long tail of
 * hineri/kake/sori techniques live in the collapse contexts).
 */

import type { SeededRNG } from "../rng";
import type { KimariteId } from "../types/combat";
import { KIMARITE_FREQUENCY_TARGETS } from "../../constants/engine/kimariteFrequencies";

export type TerminalContext =
  | "push_exit" // boundary exit, no belt grip (oshi/tsuppari endings)
  | "belt_exit" // boundary exit while gripped (force-outs)
  | "push_fall" // collapse/touch-down during a pushing exchange
  | "belt_fall"; // collapse during a belt grapple (throws, trips, twists)

/** A candidate technique and a plausibility multiplier on its real share. */
type Candidate = [KimariteId, number];

const w = (id: string) => KIMARITE_FREQUENCY_TARGETS[id] ?? 0.0001;

/**
 * Push-side boundary exits: force-outs and thrust-outs dominate; slap-outs
 * and rear push-outs occur when geometry allows (handled by dedicated gates
 * in the caller). A sliver of pull-down-style exits (waridashi etc.) tail out.
 */
const PUSH_EXIT_CANDIDATES: Candidate[] = [
  ["oshidashi", 1],
  ["tsukidashi", 2.4],
  ["waridashi", 1.5], // arm-split push-out — rare but plausible on any push exit
  ["hatakikomi", 0.15], // slap-down right at the edge
  ["hikiotoshi", 0.1],
  ["katasukashi", 0.15],
];

/**
 * Belt-side boundary exits: the frontal belt force-out is the single most
 * common ending in real sumo; dashinage (pull-through throws at the edge),
 * carry-outs and rear exits tail off.
 */
const BELT_EXIT_CANDIDATES: Candidate[] = [
  ["yorikiri", 0.8],
  ["yoritaoshi", 0.5],
  ["okuridashi", 0.5],
  ["okuritaoshi", 1.4],
  ["uwatedashinage", 1],
  ["shitatedashinage", 1],
  ["tsuridashi", 1],
  ["okuritsuridashi", 1],
];

/**
 * Push-side collapses: pulldowns and slap-downs — the whole "winner lets the
 * loser fall" family. Also where the arm-pull hineri techniques live.
 */
const PUSH_FALL_CANDIDATES: Candidate[] = [
  ["oshitaoshi", 2.2],
  ["tsukitaoshi", 1],
  ["hatakikomi", 1.2],
  ["hikiotoshi", 1.2],
  ["tsukiotoshi", 1.6],
  ["katasukashi", 1],
  ["tottari", 2.0],
  ["abisetaoshi", 1],
  ["sokubiotoshi", 1],
  ["kotehineri", 3.0],
  ["amiuchi", 1],
  ["sakatottari", 1],
  ["kubiotoshi", 1],
  ["kainahineri", 0.4],
  ["osakate", 0.6],
  ["sotokomata_hinerite", 0.6],
  ["uchimuso", 0.4],
  ["sotomuso", 0.4],
  ["makiotoshi", 0.5],
];

/** Sorite — the winner sacrifices their own posture to throw. Boosted heavily
 * when the winner is desperate (falling/backing toward the edge themselves). */
const SORI_FALL_CANDIDATES: Candidate[] = [
  ["izori", 1],
  ["kakezori", 1],
  ["shumokuzori", 1],
  ["sototasukizori", 1],
  ["tasukizori", 1],
  ["tsutaezori", 1],
];

/**
 * Belt-side collapses: the throw families plus leg techniques, twists, and —
 * when the winner is also falling/backing out — the sorite unicorns.
 */
const BELT_FALL_CANDIDATES: Candidate[] = [
  // throws
  ["uwatenage", 1],
  ["shitatenage", 0.55],
  ["kotenage", 0.8],
  ["sukuinage", 1],
  ["kubinage", 1],
  ["uwatedashinage", 0.6],
  ["shitatedashinage", 0.6],
  ["ipponzeoi", 1],
  ["kakenage", 1],
  ["koshihineri", 1],
  ["yaguranage", 1],
  ["nichonage", 1],
  // belt force-down
  ["yoritaoshi", 0.5],
  // twists that end on the ground
  ["shitatehineri", 1],
  ["uwatehineri", 1],
  ["zubuneri", 1],
  ["gasshohineri", 1],
  ["harimanage", 1],
  ["sabaori", 1],
  ["tokkurinage", 1],
  ["kainahineri", 1],
  // lift/drop
  ["tsuriotoshi", 1],
  ["okuritsuriotoshi", 0.5],
  // arm/lock finishes on the ground
  ["kimedashi", 0.6],
  ["kimetaoshi", 0.6],
  ["tsukaminage", 0.5],
  // leg techniques
  ["sotogake", 1],
  ["uchigake", 1],
  ["ashitori", 1],
  ["ketaguri", 1],
  ["watashikomi", 1],
  ["kekaeshi", 1],
  ["kosotogake", 1],
  ["komatasukui", 1],
  ["chongake", 1],
  ["kawarigake", 1],
  ["susoharai", 1],
  ["kirikaeshi", 1],
  ["nimaigeri", 1],
  ["omata", 1],
  ["susotori", 1],
  ["mitokorozeme", 1],
  ["kosotogari", 1],
  ["tsumatori", 1],
  // sorite — backward-bending throws. Present at low base weight on any belt
  // collapse; sharply boosted when the winner is desperate (SORI mult below).
  ...SORI_FALL_CANDIDATES.map(([id]) => [id, 0.5] as Candidate),
];

/** Extra candidates layered on when the winner is off-balance/backing out. */
const DESPERATE_FALL_EXTRA: Candidate[] = [
  ["utchari", 1],
  ["yobimodoshi", 1],
  ["ushiromotare", 1],
  ["okurinage", 0.3],
];

/** Pick one candidate, weights = real share × plausibility multiplier. */
export function pickTerminalKimarite(
  rng: SeededRNG,
  candidates: Candidate[],
  extraMultipliers?: Map<string, number>
): KimariteId {
  let total = 0;
  const weights = candidates.map(([id, mult]) => {
    const weight = w(id) * mult * (extraMultipliers?.get(id) ?? 1);
    total += weight;
    return weight;
  });
  if (total <= 0) return "yorikiri"; // unreachable in practice

  let roll = rng.next() * total;
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return candidates[i][0];
  }
  return candidates[candidates.length - 1][0];
}

/**
 * Push-side boundary exit classification (no belt grip at resolution).
 */
export function classifyPushExitKimarite(rng: SeededRNG): KimariteId {
  return pickTerminalKimarite(rng, PUSH_EXIT_CANDIDATES);
}

/**
 * Belt-side boundary exit classification (winner held a belt grip).
 */
export function classifyBeltExitKimarite(rng: SeededRNG): KimariteId {
  return pickTerminalKimarite(rng, BELT_EXIT_CANDIDATES);
}

/**
 * Push-side collapse — pulldown/slap-down families. `loserOvercommitted`
 * biases toward the momentum-capture techniques (hatakikomi, tsukiotoshi).
 */
export function classifyPushFallKimarite(
  rng: SeededRNG,
  opts: { loserOvercommitted?: boolean } = {}
): KimariteId {
  const extra = opts.loserOvercommitted
    ? new Map<string, number>([
        ["hatakikomi", 1.6],
        ["hikiotoshi", 1.6],
        ["tsukiotoshi", 1.4],
        ["katasukashi", 1.4],
      ])
    : undefined;
  return pickTerminalKimarite(rng, PUSH_FALL_CANDIDATES, extra);
}

/**
 * Belt-side collapse. Grip-aware: the winner's grip class shifts weight
 * between uwate (over/outside-arm) and shitate (under/inside-arm) throws.
 * `winnerDesperate` unlocks the sorite + desperation-reversal tail.
 */
export function classifyBeltFallKimariteV2(
  rng: SeededRNG,
  winnerGrip: "uwate" | "shitate" | "morozashi" | "outside" | "none",
  winnerDesperate: boolean
): KimariteId {
  const extra = new Map<string, number>();
  if (winnerGrip === "uwate") {
    extra.set("uwatenage", 2.2);
    extra.set("sukuinage", 1.8);
    extra.set("uwatedashinage", 1.8);
    extra.set("shitatenage", 0.4);
    extra.set("shitatedashinage", 0.4);
    extra.set("shitatehineri", 0.4);
  } else if (winnerGrip === "shitate") {
    extra.set("shitatenage", 2.0);
    extra.set("shitatedashinage", 1.8);
    extra.set("shitatehineri", 1.8);
    extra.set("uwatenage", 0.5);
    extra.set("sukuinage", 0.5);
  } else if (winnerGrip === "morozashi") {
    extra.set("uwatenage", 1.6);
    extra.set("shitatenage", 1.3);
    extra.set("yoritaoshi", 1.4);
  }

  const candidates: Candidate[] = winnerDesperate
    ? [...BELT_FALL_CANDIDATES, ...DESPERATE_FALL_EXTRA]
    : BELT_FALL_CANDIDATES;
  // Desperation endings are where the sorite unicorns live — boost them so
  // they register as occasional real outcomes, not never-seen entries.
  if (winnerDesperate) {
    for (const [id] of SORI_FALL_CANDIDATES) extra.set(id, 8);
    // utchari — the edge-reversal — is mostly a desperation counter.
    extra.set("utchari", 30);
  }
  return pickTerminalKimarite(rng, candidates, extra);
}

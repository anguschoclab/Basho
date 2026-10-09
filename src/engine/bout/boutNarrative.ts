/**
 * boutNarrative.ts — unified bout narrative generator.
 *
 * Orchestrates the beat modules in src/engine/bout/narrative/ over a shared
 * PbpPipeline, producing a single rich PbpLine[] array with phase, voice, and
 * tag metadata. All public types and helpers live in narrative/ and are
 * re-exported here so existing imports keep working.
 */
import type { Rikishi } from "../types/rikishi";
import type { BoutResult, BashoName } from "../types/basho";
import type { WorldState } from "../types/world";
import { buildPipeline } from "./narrative/pipeline";
import { narratePrelude } from "./narrative/prelude";
import { narrateRecords } from "./narrative/context";
import { narrateStyle } from "./narrative/context2";
import { narrateStakes } from "./narrative/stakes";
import { narrateCeremony } from "./narrative/ceremony";
import { narrateFrames } from "./narrative/frames";
import { narrateResolution } from "./narrative/resolution";
import { narratePostBout } from "./narrative/postbout";
import { narrateAftermath } from "./narrative/postbout2";
import { narrateInterview } from "./narrative/interview";

export type { PbpPhase, PbpVoice, PbpTag, PbpLine } from "./narrative/pbpTypes";
export {
  countMakuuchiTournaments,
  focusBiasToStyleKey,
  isSanyakuPromotionByRank,
  getIntensity,
  generateKyujoNarrative,
  extractNotableNarrativeLines,
  isNotableBout,
} from "./narrative/helpers";

/**
 * Generate the full play-by-play narrative for a resolved bout.
 * Beats run in the original monolith's order; each writes through `push`.
 */
export function generateBoutNarrative(
  result: BoutResult,
  east: Rikishi,
  west: Rikishi,
  bashoName: BashoName | undefined,
  day: number,
  seed: string,
  world: WorldState
): void {
  const p = buildPipeline(result, east, west, bashoName, day, seed, world);

  narratePrelude(p);
  narrateRecords(p);
  narrateStyle(p);
  narrateStakes(p);
  narrateCeremony(p);
  narrateFrames(p);
  narrateResolution(p);
  narratePostBout(p);
  narrateAftermath(p);
  narrateInterview(p);

  result.pbpLines = p.lines.length > 0 ? p.lines : undefined;
}

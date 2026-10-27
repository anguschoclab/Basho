/**
 * boutNarrative.ts — unified bout narrative generator.
 *
 * Orchestrates the beat modules in src/engine/bout/narrative/ over a shared
 * PbpPipeline, producing a single rich PbpLine[] array with phase, voice, and
 * tag metadata. All public types and helpers live in narrative/ and are
 * re-exported here so existing imports keep working.
 */
import type { Rikishi } from "@/engine/types/rikishi";
import type { BoutResult, BashoName } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import { buildPipeline } from "@/engine/bout/narrative/pipeline";
import { narratePrelude } from "@/engine/bout/narrative/prelude";
import { narrateRecords } from "@/engine/bout/narrative/context";
import { narrateStyle } from "@/engine/bout/narrative/context2";
import { narrateStakes } from "@/engine/bout/narrative/stakes";
import { narrateCeremony } from "@/engine/bout/narrative/ceremony";
import { narrateFrames } from "@/engine/bout/narrative/frames";
import { narrateResolution } from "@/engine/bout/narrative/resolution";
import { narratePostBout } from "@/engine/bout/narrative/postbout";
import { narrateAftermath } from "@/engine/bout/narrative/postbout2";
import { narrateInterview } from "@/engine/bout/narrative/interview";

export type { PbpPhase, PbpVoice, PbpTag, PbpLine } from "@/engine/bout/narrative/pbpTypes";
export {
  countMakuuchiTournaments,
  focusBiasToStyleKey,
  isSanyakuPromotionByRank,
  getIntensity,
  generateKyujoNarrative,
  extractNotableNarrativeLines,
  isNotableBout,
} from "@/engine/bout/narrative/helpers";

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

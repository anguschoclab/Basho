/**
 * pipeline.ts — shared context object for the bout-narrative beat modules.
 *
 * `generateBoutNarrative` builds one PbpPipeline, then runs every beat module
 * over it in the original order. Values that used to be cross-section locals
 * inside the 2,600-line monolith are computed eagerly here; every rng stream
 * is independently seeded, so eager evaluation preserves behavior.
 */
import { rngFromSeed, type SeededRNG } from "../../rng";
import type { Rikishi } from "../../types/rikishi";
import type { BoutResult, BashoName } from "../../types/basho";
import type { WorldState } from "../../types/world";
import { BASHO_CALENDAR } from "../../calendar";
import { RivalryService } from "../../systems/narrative/RivalryService";
import type { RivalriesState, RivalryKey } from "../../../constants/engine/rivalry";
import { buildNarrativeContext } from "../../bard/narrativeContext";
import { getIntensity } from "./helpers";
import type { PbpLine, PbpPhase, PbpTag } from "./pbpTypes";

export interface PbpPipeline {
  lines: PbpLine[];
  push: (text: string, phase: PbpPhase, tags?: PbpTag[]) => void;
  ctx: ReturnType<typeof buildNarrativeContext>;
  rng: SeededRNG;
  intensity: number;
  east: Rikishi;
  west: Rikishi;
  result: BoutResult;
  seed: string;
  bashoName: BashoName | undefined;
  day: number;
  world: WorldState;
  rivalryState: RivalriesState;
  rivalryKey: RivalryKey;
  pair: RivalriesState["pairs"][string] | undefined;
  isGrudgeMatch: boolean | undefined;
  preBoutRng: SeededRNG;
  postBoutRng: SeededRNG;
  winnerRikishi: Rikishi;
  loserRikishi: Rikishi;
  eastWins: number;
  eastLosses: number;
  westWins: number;
  westLosses: number;
  winnerWins: number;
  winnerLosses: number;
  loserWins: number;
  loserLosses: number;
  eastAge: number;
  westAge: number;
  bashoInfo: (typeof BASHO_CALENDAR)[BashoName] | undefined;
}

export function buildPipeline(
  result: BoutResult,
  east: Rikishi,
  west: Rikishi,
  bashoName: BashoName | undefined,
  day: number,
  seed: string,
  world: WorldState
): PbpPipeline {
  const lines: PbpLine[] = [];
  const rng = rngFromSeed(seed, "narrative", "bout");
  const ctx = buildNarrativeContext(east, west, result, bashoName, day, rng);
  const intensity = getIntensity(ctx.voiceStyle);

  const push = (text: string, phase: PbpPhase, tags: PbpTag[] = []) => {
    if (text && !text.includes("[MISSING:")) {
      lines.push({
        text,
        id: `${result.boutId}-${phase}-${lines.length}`,
        phase,
        tags,
        voice: ctx.voiceStyle,
      });
    }
  };

  const rivalryState = RivalryService.ensureRivalriesState(world);
  const rivalryKey = RivalryService.makeRivalryKey(east.id, west.id);
  const pair = rivalryState.pairs[rivalryKey];
  const isGrudgeMatch = pair && pair.heat > 70;

  const preBoutRng = rngFromSeed(seed, "pbp", "pre-bout");
  const postBoutRng = rngFromSeed(seed, "pbp", "post-bout");
  const winnerRikishi = result.winner === "east" ? east : west;
  const loserRikishi = result.winner === "east" ? west : east;

  const eastWins = east.currentBashoWins ?? 0;
  const eastLosses = east.currentBashoLosses ?? 0;
  const westWins = west.currentBashoWins ?? 0;
  const westLosses = west.currentBashoLosses ?? 0;
  const winnerWins = winnerRikishi.currentBashoWins ?? 0;
  const winnerLosses = winnerRikishi.currentBashoLosses ?? 0;
  const loserWins = loserRikishi.currentBashoWins ?? 0;
  const loserLosses = loserRikishi.currentBashoLosses ?? 0;

  const eastAge = east.age ?? world.year - east.birthYear;
  const westAge = west.age ?? world.year - west.birthYear;
  const bashoInfo = bashoName ? BASHO_CALENDAR[bashoName] : undefined;

  return {
    lines, push, ctx, rng, intensity, east, west, result, seed, bashoName, day, world,
    rivalryState, rivalryKey, pair, isGrudgeMatch,
    preBoutRng, postBoutRng, winnerRikishi, loserRikishi,
    eastWins, eastLosses, westWins, westLosses,
    winnerWins, winnerLosses, loserWins, loserLosses,
    eastAge, westAge, bashoInfo,
  };
}

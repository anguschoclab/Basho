import { buildPbpFromBoutResult, type PbpContext, type PbpLine } from "../pbp";
import { generateNarrative } from "../narrative";
import type { Rikishi } from "../types/rikishi";
import type { BoutResult, BashoName } from "../types/basho";

/**
 * Pure translator function. Consumes raw physics frames and maps them 
 * to event tokens defined in pbpMatrix/pbp.ts, and generates narrative.
 */
export function generateBoutNarrative(
  result: BoutResult,
  east: Rikishi,
  west: Rikishi,
  bashoName: BashoName | undefined,
  day: number,
  seed: string
): void {
  const pbpCtx: PbpContext = {
    seed: `${seed}-pbp`,
    day,
    bashoName,
    east: { id: east.id, shikona: east.shikona, style: east.style, archetype: east.archetype, derivedArchetype: east.derivedArchetype },
    west: { id: west.id, shikona: west.shikona, style: west.style, archetype: west.archetype, derivedArchetype: west.derivedArchetype },
    kenshoCount: undefined,
    isKinboshiBout: result.isKinboshi,
    isYushoRaceKeyBout: false
  };

  const pbpLines: PbpLine[] = buildPbpFromBoutResult(result, pbpCtx);

  result.pbpLines = pbpLines;
  result.pbp = pbpLines.map((l) => l.text);
  result.narrative = bashoName ? generateNarrative(east, west, result, bashoName, day) : [];
}

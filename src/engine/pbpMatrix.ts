// pbpMatrix.ts
// PBP Voice Matrix Loader — loads pbp_voice_matrix.json as PbpLibrary
import matrixData from "./pbp_voice_matrix.json";
import type { PbpLibrary, PbpTag } from "./pbp";

type RawPhrase = { id: string; text: string; tags?: string[]; weight?: number };

function castBucket(raw: RawPhrase[]): any[] {
  return raw.map((p) => ({
    id: p.id,
    text: p.text,
    weight: p.weight,
    tags: p.tags as PbpTag[] | undefined,
  }));
}

function loadVoiceMatrix(): PbpLibrary {
  return {
    tachiai: {
      decisive: castBucket(matrixData.tachiai.decisive),
      even: castBucket(matrixData.tachiai.even),
      slow: castBucket(matrixData.tachiai.slow),
    },
    clinch: {
      grip_gain: castBucket(matrixData.clinch.grip_gain),
      grip_break: castBucket(matrixData.clinch.grip_break),
      oshi_pressure: castBucket(matrixData.clinch.oshi_pressure),
      scramble: castBucket(matrixData.clinch.scramble),
      rear_attack: castBucket(matrixData.clinch.rear_attack),
    },
    momentum: {
      edge_dance: castBucket(matrixData.momentum.edge_dance),
      counter_turn: castBucket(matrixData.momentum.counter_turn),
      fatigue_swing: castBucket(matrixData.momentum.fatigue_swing),
      steady_drive: castBucket(matrixData.momentum.steady_drive),
    },
    finish: {
      normal: castBucket(matrixData.finish.normal),
      upset: castBucket(matrixData.finish.upset),
      close_call: castBucket(matrixData.finish.close_call),
      kinboshi: castBucket(matrixData.finish.kinboshi),
    },
    connective: {
      short: castBucket(matrixData.connective.short),
    },
    tactical: {
      oshi_strategy: [{ id: "tac_oshi_vm", text: "📋 {leader} sets up for forward pressure — oshi game plan." }],
      yotsu_strategy: [{ id: "tac_yotsu_vm", text: "📋 {leader} wants the belt — yotsu strategy in play." }],
      speedster_strategy: [{ id: "tac_speed_vm", text: "📋 {leader} will use movement and angles." }],
      trickster_strategy: [{ id: "tac_trick_vm", text: "📋 {leader} is reading habits — expect deception." }],
      counter_strategy: [{ id: "tac_ctr_vm", text: "📋 {leader} sets up to absorb and redirect." }],
      adaptive_strategy: [{ id: "tac_adapt_vm", text: "📋 {leader} adapts the approach to the matchup." }],
    },
  };
}

let _cachedLibrary: PbpLibrary | null = null;

export function getVoiceMatrix(): PbpLibrary {
  if (!_cachedLibrary) _cachedLibrary = loadVoiceMatrix();
  return _cachedLibrary;
}

export function validateDiversityGates(
  lib: PbpLibrary,
  minPhrases: number = 50
): Array<{ context: string; bucket: string; count: number }> {
  const failures: Array<{ context: string; bucket: string; count: number }> = [];
  const sections: Record<string, Record<string, unknown[]>> = {
    tachiai: lib.tachiai as any,
    clinch: lib.clinch as any,
    momentum: lib.momentum as any,
    finish: lib.finish as any,
  };
  for (const [ctx, buckets] of Object.entries(sections)) {
    for (const [bucket, phrases] of Object.entries(buckets)) {
      const count = Array.isArray(phrases) ? phrases.length : 0;
      if (count < minPhrases) failures.push({ context: ctx, bucket, count });
    }
  }
  return failures;
}

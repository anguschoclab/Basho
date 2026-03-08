// pbpMatrix.ts
// =======================================================
// PBP Voice Matrix Loader + Diversity Gate Validator
// Loads the build-time pbp_voice_matrix.json and integrates
// it with the PBP system as the canonical phrase library.
// =======================================================

import matrixData from "./pbp_voice_matrix.json";
import type { PbpLibrary } from "./pbp";

/**
 * Convert the JSON voice matrix into a PbpLibrary compatible format.
 * The matrix JSON uses the same structure as PbpLibrary.
 */
export function loadVoiceMatrix(): PbpLibrary {
  return {
    tachiai: {
      decisive: matrixData.tachiai.decisive,
      even: matrixData.tachiai.even,
      slow: matrixData.tachiai.slow,
    },
    clinch: {
      grip_gain: matrixData.clinch.grip_gain,
      grip_break: matrixData.clinch.grip_break,
      oshi_pressure: matrixData.clinch.oshi_pressure,
      scramble: matrixData.clinch.scramble,
      rear_attack: matrixData.clinch.rear_attack,
    },
    momentum: {
      edge_dance: matrixData.momentum.edge_dance,
      counter_turn: matrixData.momentum.counter_turn,
      fatigue_swing: matrixData.momentum.fatigue_swing,
      steady_drive: matrixData.momentum.steady_drive,
    },
    finish: {
      normal: matrixData.finish.normal,
      upset: matrixData.finish.upset,
      close_call: matrixData.finish.close_call,
      kinboshi: matrixData.finish.kinboshi,
    },
    connective: {
      short: matrixData.connective.short,
    },
  };
}

/** Singleton: loaded once, used everywhere */
let _cachedLibrary: PbpLibrary | null = null;

export function getVoiceMatrix(): PbpLibrary {
  if (!_cachedLibrary) {
    _cachedLibrary = loadVoiceMatrix();
  }
  return _cachedLibrary;
}

/**
 * Diversity gate: validate that every cell has at least `minPhrases`.
 * Returns list of cells that fail the gate.
 */
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
      if (count < minPhrases) {
        failures.push({ context: ctx, bucket, count });
      }
    }
  }

  return failures;
}

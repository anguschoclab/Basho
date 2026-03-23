// pbpMatrix.ts
// PBP Voice Matrix Loader — loads pbp_voice_matrix.json as PbpLibrary
import matrixData from "./pbp_voice_matrix.json";
import type { PbpLibrary, PbpTag } from "./pbp";

/** Type representing raw phrase. */
type RawPhrase = { id: string; text: string; tags?: string[]; weight?: number };

/**
 * Cast bucket.
 *  * @param raw - The Raw.
 *  * @returns The result.
 */
function castBucket(raw: RawPhrase[]): any[] {
  return raw.map((p) => ({
    id: p.id,
    text: p.text,
    weight: p.weight,
    tags: p.tags as PbpTag[] | undefined,
  }));
}

/**
 * Load voice matrix.
 *  * @returns The result.
 */
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
      tsuppari_barrage: castBucket((matrixData.clinch as any).tsuppari_barrage || []),
      nodowa_pressure: castBucket((matrixData.clinch as any).nodowa_pressure || []),
      harite_slap: castBucket((matrixData.clinch as any).harite_slap || []),
      throat_attack: castBucket((matrixData.clinch as any).throat_attack || []),
      shoulder_blast: castBucket((matrixData.clinch as any).shoulder_blast || []),
      migi_yotsu_established: castBucket((matrixData.clinch as any).migi_yotsu_established || []),
      hidari_yotsu_established: castBucket((matrixData.clinch as any).hidari_yotsu_established || []),
      double_inside: castBucket((matrixData.clinch as any).double_inside || []),
      over_under: castBucket((matrixData.clinch as any).over_under || []),
      no_grip_scramble: castBucket((matrixData.clinch as any).no_grip_scramble || []),
    },
    momentum: {
      edge_dance: castBucket(matrixData.momentum.edge_dance),
      counter_turn: castBucket(matrixData.momentum.counter_turn),
      fatigue_swing: castBucket(matrixData.momentum.fatigue_swing),
      steady_drive: castBucket(matrixData.momentum.steady_drive),
      bales_at_tawara: castBucket((matrixData.momentum as any).bales_at_tawara || []),
      steps_out_then_recovers: castBucket((matrixData.momentum as any).steps_out_then_recovers || []),
      heel_on_straw: castBucket((matrixData.momentum as any).heel_on_straw || []),
      dancing_escape: castBucket((matrixData.momentum as any).dancing_escape || []),
      turns_the_tables: castBucket((matrixData.momentum as any).turns_the_tables || []),
      slips_but_survives: castBucket((matrixData.momentum as any).slips_but_survives || []),
      grip_change: castBucket((matrixData.momentum as any).grip_change || []),
      footwork_angle: castBucket((matrixData.momentum as any).footwork_angle || []),
      mistake: castBucket((matrixData.momentum as any).mistake || []),
      tachiai_win: castBucket((matrixData.momentum as any).tachiai_win || []),
    },
    finish: {
      normal: castBucket(matrixData.finish.normal),
      upset: castBucket(matrixData.finish.upset),
      close_call: castBucket(matrixData.finish.close_call),
      kinboshi: castBucket(matrixData.finish.kinboshi),
    },
    injury: {
      sprain: castBucket((matrixData as any).injury?.sprain || []),
      strain: castBucket((matrixData as any).injury?.strain || []),
      contusion: castBucket((matrixData as any).injury?.contusion || []),
      inflammation: castBucket((matrixData as any).injury?.inflammation || []),
      tear: castBucket((matrixData as any).injury?.tear || []),
      fracture: castBucket((matrixData as any).injury?.fracture || []),
      nerve: castBucket((matrixData as any).injury?.nerve || []),
      unknown: castBucket((matrixData as any).injury?.unknown || []),
    },
    institutional: {
      GOVERNANCE_STATUS_CHANGED: {
        default: castBucket((matrixData as any).institutional?.GOVERNANCE_STATUS_CHANGED?.default || []),
        traditionalist: castBucket((matrixData as any).institutional?.GOVERNANCE_STATUS_CHANGED?.traditionalist || []),
        scientist: castBucket((matrixData as any).institutional?.GOVERNANCE_STATUS_CHANGED?.scientist || []),
        gambler: castBucket((matrixData as any).institutional?.GOVERNANCE_STATUS_CHANGED?.gambler || []),
        nurturer: castBucket((matrixData as any).institutional?.GOVERNANCE_STATUS_CHANGED?.nurturer || []),
        tyrant: castBucket((matrixData as any).institutional?.GOVERNANCE_STATUS_CHANGED?.tyrant || []),
        strategist: castBucket((matrixData as any).institutional?.GOVERNANCE_STATUS_CHANGED?.strategist || []),
      },
      GOVERNANCE_RULING: {
        default: castBucket((matrixData as any).institutional?.GOVERNANCE_RULING?.default || []),
        traditionalist: castBucket((matrixData as any).institutional?.GOVERNANCE_RULING?.traditionalist || []),
        scientist: castBucket((matrixData as any).institutional?.GOVERNANCE_RULING?.scientist || []),
        gambler: castBucket((matrixData as any).institutional?.GOVERNANCE_RULING?.gambler || []),
        nurturer: castBucket((matrixData as any).institutional?.GOVERNANCE_RULING?.nurturer || []),
        tyrant: castBucket((matrixData as any).institutional?.GOVERNANCE_RULING?.tyrant || []),
        strategist: castBucket((matrixData as any).institutional?.GOVERNANCE_RULING?.strategist || []),
      },
      WELFARE_ALERT: {
        default: castBucket((matrixData as any).institutional?.WELFARE_ALERT?.default || []),
        traditionalist: castBucket((matrixData as any).institutional?.WELFARE_ALERT?.traditionalist || []),
        scientist: castBucket((matrixData as any).institutional?.WELFARE_ALERT?.scientist || []),
        gambler: castBucket((matrixData as any).institutional?.WELFARE_ALERT?.gambler || []),
        nurturer: castBucket((matrixData as any).institutional?.WELFARE_ALERT?.nurturer || []),
        tyrant: castBucket((matrixData as any).institutional?.WELFARE_ALERT?.tyrant || []),
        strategist: castBucket((matrixData as any).institutional?.WELFARE_ALERT?.strategist || []),
      }
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

/**
 * Get voice matrix.
 *  * @returns The result.
 */
export function getVoiceMatrix(): PbpLibrary {
  if (!_cachedLibrary) _cachedLibrary = loadVoiceMatrix();
  return _cachedLibrary;
}

/**
 * Validate diversity gates.
 *  * @param lib - The Lib.
 *  * @param minPhrases - The Min phrases.
 *  * @returns The result.
 */
export function validateDiversityGates(
  lib: PbpLibrary,
  minPhrases: number = 50
): Array<{ context: string; bucket: string; count: number }> {
  const failures: Array<{ context: string; bucket: string; count: number }> = [];
  const sections: Record<string, Record<string, unknown[]>> = {
    tachiai: lib.tachiai,
    clinch: lib.clinch,
    momentum: lib.momentum,
    finish: lib.finish,
  };
  for (const [ctx, buckets] of Object.entries(sections)) {
    for (const [bucket, phrases] of Object.entries(buckets)) {
      const count = Array.isArray(phrases) ? phrases.length : 0;
      if (count < minPhrases) failures.push({ context: ctx, bucket, count });
    }
  }
  return failures;
}

/**
 * Validates that all string interpolation tokens used in the loaded PBP Library
 * are valid and matched by the allowed variables.
 * @param lib The loaded PbpLibrary
 * @param allowedTokens A list of allowed tokens (e.g. ["east", "west", "winner", "loser", "kimarite", "leader", "trailer", "rikishi_shikona", "action_target"])
 * @returns Array of errors containing the invalid token and its phrase
 */
export function validateInterpolationTokens(
  lib: PbpLibrary,
  allowedTokens: string[] = ["east", "west", "winner", "loser", "kimarite", "leader", "trailer", "rikishi_shikona", "action_target"]
): Array<{ phraseId: string; invalidToken: string }> {
  const failures: Array<{ phraseId: string; invalidToken: string }> = [];
  const allowedSet = new Set(allowedTokens);

  const traverse = (obj: any) => {
    if (Array.isArray(obj)) {
      for (const phrase of obj) {
        if (phrase && typeof phrase.text === "string") {
          const matches = phrase.text.match(/\{(\w+)\}/g);
          if (matches) {
            for (const match of matches) {
              const token = match.replace(/[{}]/g, "");
              if (!allowedSet.has(token)) {
                failures.push({ phraseId: phrase.id, invalidToken: token });
              }
            }
          }
        }
      }
    } else if (typeof obj === "object" && obj !== null) {
      for (const key of Object.keys(obj)) {
        traverse(obj[key]);
      }
    }
  };

  traverse(lib);
  return failures;
}

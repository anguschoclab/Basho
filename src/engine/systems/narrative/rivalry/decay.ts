import type { WorldState } from "../../../types/world";
import { clamp } from "../../../utils/math";
import { type RivalryPairState } from "../../../../constants/engine/rivalry";
import { deriveTone } from "../RivalryHeatService";
import { createImpactBuilder } from "../../../core/ImpactBuilder";
import type { StateImpact } from "../../../core/StateImpact";
import {
  CLOSENESS_DECAY_RATE,
  SPITE_DECAY_RATE,
} from "../../../../constants/engine/narrative";
import {
  RIVALRY_DECAY_WEEKS_LONG,
  RIVALRY_HEAT_MIN,
  RIVALRY_MEETINGS_MIN,
} from "../../../../constants/engine/rivalry";
import { ensureRivalriesState, getDecayRate } from "./state";

/**
 * Weekly Decay Tick.
 * Applies natural decay to rivalry heat, closeness, and spite over time.
 * Auto-culls stale rivalries (low heat, few meetings, long since meeting).
 */
export function applyWeeklyDecay(world: WorldState): StateImpact {
  const builder = createImpactBuilder("applyWeeklyDecay");
  const state = ensureRivalriesState(world);
  const week = world.calendar?.currentWeek || 0;

  const finalPairs: Record<string, RivalryPairState> = {};

  for (const key in state.pairs) {
    const pair = state.pairs[key];
    const weeksSince = week - pair.lastMetWeek;
    const decay = getDecayRate(weeksSince);

    const updatedPair: RivalryPairState = {
      ...pair,
      heat: clamp(pair.heat - decay, 0, 100),
      closeness: clamp(pair.closeness - CLOSENESS_DECAY_RATE, 0, 100),
      spite: clamp(pair.spite - SPITE_DECAY_RATE, 0, 100),
    };
    // Tone must reflect the decayed values, not the pre-decay pair.
    updatedPair.tone = deriveTone(updatedPair);

    // Auto-cull
    if (!(
      updatedPair.heat < RIVALRY_HEAT_MIN &&
      updatedPair.meetings < RIVALRY_MEETINGS_MIN &&
      weeksSince > RIVALRY_DECAY_WEEKS_LONG
    )) {
      finalPairs[key] = updatedPair;
    }
  }

  builder.updateWorldField("rivalriesState", {
    version: state.version,
    pairs: finalPairs,
    // updateWorldField replaces the whole field — preserve the
    // stable-level rivalries accumulated by onBoutResolved.
    heyaRivalryPairs: state.heyaRivalryPairs,
  });

  return builder.build();
}

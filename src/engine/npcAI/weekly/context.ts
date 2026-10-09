import type { WorldState } from "../../types/world";
import type { Id } from "../../types/common";
import type { Heya } from "../../types/heya";
import type { Oyakata } from "../../types/oyakata";
import type { TrainingIntensity } from "../../types/training";
import type { PerceptionSnapshot } from "../../perception";
import { getOyakataStyleProfile, type OyakataStyleProfile } from "../../oyakataStylePreferences";
import { getOyakataForHeya, getHeya } from "../../queries";
import { getManagerPersona, type NPCPersona } from "../../systems/NPCPersonaService";

/** Everything the weekly pipeline derives once from (world, heyaId). */
export interface WeeklyContext {
  persona: NPCPersona;
  perception: PerceptionSnapshot;
  heya: Heya | undefined;
  oyakata: Oyakata | undefined;
  styleProfile: OyakataStyleProfile | undefined;
  complianceCap: TrainingIntensity | undefined;
  reasoning: string[];
}

export function buildWeeklyContext(world: WorldState, heyaId: Id): WeeklyContext {
  const persona = getManagerPersona(world, heyaId);
  const perception = persona.perception;

  const heya = getHeya(world, heyaId);
  const oyakata = heya ? getOyakataForHeya(world, heyaId) : undefined;
  const styleProfile = oyakata ? getOyakataStyleProfile(world, oyakata) : undefined;

  const rawCap = heya?.welfareState?.sanctions?.trainingIntensityCap;
  const complianceCap: TrainingIntensity | undefined = rawCap
    ? ({ low: "conservative", medium: "balanced", high: "intensive" } as const)[rawCap]
    : undefined;

  return {
    persona,
    perception,
    heya,
    oyakata,
    styleProfile,
    complianceCap,
    reasoning: [],
  };
}

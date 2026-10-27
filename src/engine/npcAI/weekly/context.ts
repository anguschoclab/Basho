import type { WorldState } from "@/engine/types/world";
import type { Id } from "@/engine/types/common";
import type { Heya } from "@/engine/types/heya";
import type { Oyakata } from "@/engine/types/oyakata";
import type { TrainingIntensity } from "@/engine/types/training";
import type { PerceptionSnapshot } from "@/engine/perception";
import { getOyakataStyleProfile, type OyakataStyleProfile } from "@/engine/oyakataStylePreferences";
import { getOyakataForHeya, getHeya } from "@/engine/queries";
import { getManagerPersona, type NPCPersona } from "@/engine/systems/NPCPersonaService";

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

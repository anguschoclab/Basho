/**
 * academyManagementProjections.ts — projects foreign academy state for UI.
 */
import type { WorldState } from "@/engine/types/world";
import type { AcademyManagementProjection } from "@/components/stable/AcademyManagementPanel";
import {
  WorldCircuitService,
  EXHIBITION_REGIONS,
  type ExhibitionRegion,
} from "@/engine/worldCircuit/WorldCircuitService";

export type { ExhibitionRegion };

const REGIONS: ExhibitionRegion[] = EXHIBITION_REGIONS;

/**
 * Projects foreign-academy state for the management panel — invites, presence, and regional breakdown.
 */
export function projectAcademyManagement(
  world: WorldState,
  heyaId: string
): AcademyManagementProjection {
  const heya = world.heyas.get(heyaId);
  if (!heya) {
    return { academies: [], buildableRegions: [], hasAcademies: false };
  }

  const academies = (heya.foreignAcademies ?? []).map((a) => ({
    region: a.region,
    builtAtYear: a.builtAtYear,
    candidateQualityBonus: a.candidateQualityBonus,
  }));

  const buildableRegions = REGIONS.map((region) => {
    const presence = heya.regionalPresence?.[region] ?? 0;
    const alreadyBuilt = academies.some((a) => a.region === region);
    const canBuild =
      !alreadyBuilt && WorldCircuitService.getRegionVisibility(heya, region) === "academy";
    return { region, presence, canBuild };
  }).filter((r) => r.presence > 0 || r.canBuild);

  return {
    academies,
    buildableRegions,
    hasAcademies: academies.length > 0,
  };
}

/**
 * GlobalStrategicHub.tsx
 *
 * Renders the global strategic hub for a heya, focusing on international
 * influence, academies, and the Global Cup.
 * Derivation lives in useGlobalStrategicDerived; sections in
 * ./GlobalStrategicHubSections.tsx.
 */

import type { WorldState } from "@/presenters/uiDigest";
import type { Id } from "@/engine/types/common";
import { useGlobalStrategicDerived } from "@/hooks/useGlobalStrategicDerived";
import {
  InfluenceCard,
  PipelineCard,
  GlobalCupCard,
  GlobalCupLegacyCard,
  AcademiesCard,
} from "./GlobalStrategicHubSections";

interface GlobalStrategicHubProps {
  world: WorldState;
  heyaId: Id;
}

export function GlobalStrategicHub({ world, heyaId }: GlobalStrategicHubProps) {
  const {
    heya,
    presence,
    regions,
    foreignCandidates,
    activeAcademies,
    globalCup,
    heyaParticipants,
    globalCupWins,
  } = useGlobalStrategicDerived(world, heyaId);

  if (!heya) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* World Influence Map (Presence) */}
        <InfluenceCard
          presence={presence}
          regions={regions}
          activeAcademies={activeAcademies}
        />

        {/* Global Talent Pipeline */}
        <PipelineCard candidates={foreignCandidates} />
      </div>

      {/* Global Cup Participation */}
      {globalCup && heyaParticipants.length > 0 && (
        <GlobalCupCard globalCup={globalCup} heyaParticipants={heyaParticipants} />
      )}

      {/* Historical Global Cup Record */}
      {globalCupWins > 0 && <GlobalCupLegacyCard wins={globalCupWins} />}

      {/* Academy Benefits & Status */}
      {activeAcademies.length > 0 && <AcademiesCard activeAcademies={activeAcademies} />}
    </div>
  );
}

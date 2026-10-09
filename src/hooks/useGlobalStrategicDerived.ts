/**
 * useGlobalStrategicDerived.ts
 *
 * Derived data for GlobalStrategicHub — regional presence, visible
 * foreign candidates, active academies, and Global Cup participation.
 */

import { useMemo } from "react";
import type { WorldState } from "@/presenters/uiDigest";
import type { Id } from "@/engine/types/common";
import { listVisibleCandidates } from "@/presenters/engineAccess";

export function useGlobalStrategicDerived(world: WorldState, heyaId: Id) {
  const heya = world.heyas.get(heyaId);

  // Use useMemo for presence to avoid recreating object on every render
  const presence = useMemo(() => {
    if (!heya) return { Mongolia: 0, Georgia: 0, Europe: 0, Americas: 0 };
    return heya.regionalPresence || { Mongolia: 0, Georgia: 0, Europe: 0, Americas: 0 };
  }, [heya]);

  const regions = useMemo(() => Object.keys(presence).sort(), [presence]);

  const foreignCandidates = useMemo(() => {
    if (!heya) return [];
    return listVisibleCandidates(world, "foreign").filter((c) => presence[c.originRegion] >= 40);
  }, [world, presence, heya]);

  const activeAcademies = useMemo(() => {
    if (!heya) return [];
    return Object.entries(heya.infrastructure || {})
      .filter(([id, state]) => id.startsWith("academy_") && state.status === "active")
      .map(([id]) => id);
  }, [heya]);

  // Global Cup participation
  const globalCup = world.globalCup;
  const heyaParticipants = useMemo(() => {
    if (!globalCup) return [];
    return globalCup.participants.filter((p) => p.heyaId === heyaId);
  }, [globalCup, heyaId]);

  // Count historical Global Cup wins for this heya
  const globalCupWins = useMemo(() => {
    if (!heya) return 0;
    return (world.chronicle?.globalCups || []).filter((entry) => entry.championHeya === heya.name)
      .length;
  }, [world.chronicle?.globalCups, heya]);

  return { heya, presence, regions, foreignCandidates, activeAcademies, globalCup, heyaParticipants, globalCupWins };
}

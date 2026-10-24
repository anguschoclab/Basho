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
import {
  resolveAvatar,
  candidateStageInput,
  rikishiStageInput,
} from "@/presenters/avatarProjections";

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
    return listVisibleCandidates(world, "foreign")
      .filter((c) => presence[c.originRegion] >= 40)
      .map((c) => ({
        ...c,
        avatar: resolveAvatar({
          id: c.personId,
          stored: c.avatarConfig,
          nationality: c.nationality,
          ...candidateStageInput(c, world.year),
        }),
      }));
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
    return globalCup.participants
      .filter((p) => p.heyaId === heyaId)
      .map((p) => {
        const r = world.rikishi.get(p.rikishiId);
        return {
          ...p,
          avatar: r
            ? resolveAvatar({
                id: r.id,
                stored: r.avatarConfig,
                nationality: r.nationality,
                ...rikishiStageInput(r, world.year),
              })
            : undefined,
        };
      });
  }, [globalCup, heyaId, world]);

  // Count historical Global Cup wins for this heya
  const globalCupWins = useMemo(() => {
    if (!heya) return 0;
    return (world.chronicle?.globalCups || []).filter((entry) => entry.championHeya === heya.name)
      .length;
  }, [world.chronicle?.globalCups, heya]);

  return {
    heya,
    presence,
    regions,
    foreignCandidates,
    activeAcademies,
    globalCup,
    heyaParticipants,
    globalCupWins,
  };
}

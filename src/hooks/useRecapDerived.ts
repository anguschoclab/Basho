/**
 * useRecapDerived.ts
 *
 * Derived recap state — intai ceremony queue, banzuke reveal
 * entries, key bouts, and grouped narrative events.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import type { WorldState } from "@/presenters/uiDigest";
import type { EngineEvent } from "@/engine/types/events";
import type { BashoResult } from "@/engine/types/basho";
import type { UIRikishi } from "@/presenters/uiModels";
import { selectKeyBouts } from "@/presenters/projections/recapProjections";
import { buildBanzukeRevealEntries } from "@/presenters/projections/recapBanzukeRevealProjections";
import { getRikishi, getRikishiAnywhere } from "@/presenters/worldAccess";
import { projectRikishi } from "@/presenters/uiModels";
import {
  getBashoWrapEvents,
  groupEventsByNarrative,
  getPrestigeChanges,
  toNarrativeGroupedEvents,
} from "@/components/recap/recapEventGroups";

export function useRecapDerived(world: WorldState | null | undefined, lastBasho: BashoResult | undefined) {
  const [intaiQueue, setIntaiQueue] = useState<{ rikishi: UIRikishi; reason: string }[]>([]);
  const [currentIntaiIndex, setCurrentIntaiIndex] = useState(0);

  // Check for player rikishi retirements and populate intai ceremony queue
  useEffect(() => {
    if (!world || !world.playerHeyaId || !lastBasho) return;

    const retirementEvents = (world.events?.log || []).filter(
      (e: EngineEvent) => e.category === "career" && (e.type as string).includes("RETIRE")
    );

    const playerRetirements: { rikishi: UIRikishi; reason: string }[] = [];
    for (const event of retirementEvents) {
      if (event.rikishiId) {
        const rikishi = getRikishiAnywhere(world, event.rikishiId);
        // Retirement ceremony runs before year-end summarization, so the entry
        // is still a full Rikishi. Guard against summaries defensively.
        if (rikishi && "stats" in rikishi && rikishi.heyaId === world.playerHeyaId) {
          playerRetirements.push({
            rikishi: projectRikishi(rikishi, world),
            reason: event.summary || (event.type as string) || "Retirement",
          });
        }
      }
    }

    if (playerRetirements.length > 0) {
      setIntaiQueue(playerRetirements);
      setCurrentIntaiIndex(0);
    }
  }, [world, lastBasho]);

  // Generate banzuke comparison data using real banzuke comparison
  const banzukeEntries = useMemo(
    () => buildBanzukeRevealEntries(world, lastBasho),
    [world, lastBasho]
  );

  const keyMoments = useMemo(() => (world ? selectKeyBouts(world) : []), [world]);
  const getRikishiForBout = useCallback(
    (id: string) => {
      if (!world) return null;
      const r = getRikishi(world, id);
      return r ? projectRikishi(r, world) : null;
    },
    [world]
  );

  const events = world?.events?.log || [];
  const bashoEvents = getBashoWrapEvents(events, lastBasho?.bashoNumber);
  const groupedEvents = groupEventsByNarrative(bashoEvents);
  const prestigeChanges = world ? getPrestigeChanges(world) : [];
  const narrativeGroupedEvents = toNarrativeGroupedEvents(groupedEvents);

  return {
    intaiQueue,
    currentIntaiIndex,
    advanceIntai: () =>
      currentIntaiIndex < intaiQueue.length - 1
        ? setCurrentIntaiIndex(currentIntaiIndex + 1)
        : (setIntaiQueue([]), setCurrentIntaiIndex(0)),
    banzukeEntries,
    keyMoments,
    getRikishiForBout,
    prestigeChanges,
    narrativeGroupedEvents,
  };
}

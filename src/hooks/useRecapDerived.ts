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
import { getRikishi, getRikishiAnywhere, getHeya } from "@/presenters/worldAccess";
import { projectRikishi } from "@/presenters/uiModels";
import {
  getBashoWrapEvents,
  groupEventsByNarrative,
  getPrestigeChanges,
  toNarrativeGroupedEvents,
} from "@/components/recap/recapEventGroups";

export function useRecapDerived(
  world: WorldState | null | undefined,
  lastBasho: BashoResult | undefined
) {
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

  // Yokozuna deliberation ceremony (T0.3 burn-down): surface the council
  // scene when this basho's wrap events contain a PROMOTION_DELIBERATION.
  // Verdict is read back from the rikishi's CURRENT rank — promoted iff
  // they actually made yokozuna; otherwise deferred. The engine's
  // deliberation flow never produces a hard "denied" — controversial
  // cases defer instead.
  const deliberation = useMemo(() => {
    if (!world) return null;
    const event = [...bashoEvents]
      .reverse()
      .find((e) => (e.type as string) === "PROMOTION_DELIBERATION");
    const rikishiId = (event?.data as { rikishiId?: string } | undefined)?.rikishiId;
    if (!event || !rikishiId) return null;
    const r = getRikishiAnywhere(world, rikishiId);
    if (!r || !("stats" in r)) return null;
    const data = event.data as { status?: string; score?: number; threshold?: number };
    const heya = r.heyaId ? getHeya(world, r.heyaId) : undefined;
    const verdict =
      r.rank === "yokozuna" ? ("promoted" as const) : ("deferred" as const);
    const reasoning = [
      data.status === "controversial"
        ? "Public heat fell short of the council's threshold — deliberation deferred."
        : "Public support met the council's threshold.",
      `Media heat: ${Math.round(data.score ?? 0)} (threshold ${data.threshold ?? "—"}).`,
      verdict === "promoted"
        ? "The candidate's back-to-back tournament results carried the vote."
        : "The council will re-convene after the next tournament.",
    ];
    return {
      id: `${rikishiId}-${lastBasho?.bashoNumber ?? "x"}`,
      rikishi: projectRikishi(r, world),
      heyaName: heya?.name ?? "Independent",
      isPlayerRikishi: r.heyaId === world.playerHeyaId,
      verdict,
      reasoning,
    };
  }, [world, bashoEvents, lastBasho]);

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
    deliberation,
  };
}

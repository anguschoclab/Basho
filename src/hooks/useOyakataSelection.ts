/**
 * useOyakataSelection.ts
 *
 * OyakataPage state — selected oyakata (defaults to the player's
 * stable master), sort state, and the stable's mentorship pairs.
 */

import { useEffect, useState } from "react";
import { useGame } from "@/contexts/useGame";
import type { Oyakata } from "@/engine/types/oyakata";
import type { Rikishi } from "@/engine/types/rikishi";
import { menteesOf } from "@/presenters/engineAccess";
import { getPlayerHeya } from "@/presenters/engineAccess";
import { getOyakata, getHeya, getRikishi } from "@/presenters/worldAccess";
import type { SortDirection } from "@/lib/sortUtils";

export function useOyakataSelection() {
  const { state } = useGame();
  const world = state.world;
  const [selectedOyakata, setSelectedOyakata] = useState<Oyakata | null>(null);
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<SortDirection>("asc");

  useEffect(() => {
    if (world && world.playerHeyaId) {
      const playerHeya = getPlayerHeya(world);
      if (playerHeya && playerHeya.oyakataId) {
        const o = getOyakata(world, playerHeya.oyakataId);
        if (o) setSelectedOyakata(o);
      }
    }
  }, [world]);

  // Get mentorship relationships in the stable
  const heya = world && selectedOyakata ? getHeya(world, selectedOyakata.heyaId) : undefined;
  const mentorshipPairs: Array<{ mentor: Rikishi; mentees: Rikishi[] }> = [];
  if (world && heya?.rikishiIds) {
    for (const id of [...new Set(heya.rikishiIds)]) {
      const r = getRikishi(world, id);
      if (r) {
        const mentees = menteesOf(world, r);
        if (mentees.length > 0) {
          mentorshipPairs.push({ mentor: r, mentees });
        }
      }
    }
  }

  return {
    world,
    selectedOyakata,
    setSelectedOyakata,
    sortKey,
    setSortKey,
    sortOrder,
    setSortOrder,
    mentorshipPairs,
  };
}

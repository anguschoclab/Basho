/**
 * useEconomyDerived.ts
 *
 * Derived financial data for EconomyPage — player heya, roster,
 * sekitori count, top earners, weekly finances, and bailout handler.
 */

import { useMemo, useCallback } from "react";
import { useGameStore } from "@/store/gameStore";
import { getPlayerHeya } from "@/presenters/engineAccess";
import { getRikishi } from "@/presenters/worldAccess";
import { calculateHeyaWeeklyFinances } from "@/presenters/engineAccess";
import { toast } from "sonner";
import { isSekitoriDivision } from "@/constants/engine/rankDisplay";
import { error } from "@/presenters/engineAccess";
import { compareBy, type SortDirection } from "@/lib/sortUtils";
import type { WorldState } from "@/presenters/uiDigest";

export function useEconomyDerived(
  world: WorldState | null,
  playerHeyaId: string | null,
  earnerSortKey: string,
  earnerSortOrder: SortDirection
) {
  const sendCommand = useGameStore((s) => s.sendCommand);

  const playerHeya = useMemo(() => {
    if (!world || !playerHeyaId) return null;
    return getPlayerHeya(world) || null;
  }, [world, playerHeyaId]);

  const handleBailoutRequest = useCallback(() => {
    if (!world || !playerHeyaId || !playerHeya) return;

    if (playerHeya.funds >= 0) {
      toast.error("Emergency funding is only available when in significant debt.");
      return;
    }

    if (playerHeya.funds > -5_000_000) {
      toast.info(
        "The Association only considers bailouts for stables with debts exceeding ¥5,000,000."
      );
      return;
    }

    sendCommand({ type: "REQUEST_BAILOUT", heyaId: playerHeyaId });
    toast.success("Emergency bailout requested. Processing...");
  }, [playerHeyaId, playerHeya, sendCommand, world]);

  const playerRikishi = useMemo(() => {
    if (!playerHeya || !world) return [];
    const ids: string[] = Array.isArray(playerHeya.rikishiIds) ? playerHeya.rikishiIds : [];

    const result: ReturnType<typeof getRikishi>[] = [];
    for (const id of ids) {
      const rikishi = getRikishi(world, id);
      if (rikishi) {
        result.push(rikishi);
      }
    }
    return result;
  }, [playerHeya, world]);

  // Sekitori count
  const sekitoriCount = useMemo(() => {
    if (!playerRikishi) return 0;
    let count = 0;
    for (const r of playerRikishi) {
      if (r && isSekitoriDivision(r.division)) {
        count++;
      }
    }
    return count;
  }, [playerRikishi]);

  // Top earners
  const topEarners = useMemo(() => {
    const list = (playerRikishi as Array<NonNullable<(typeof playerRikishi)[number]>>).filter(
      (r): r is NonNullable<typeof r> => r && typeof r === "object"
    );
    const accessor: Record<
      string,
      (r: NonNullable<(typeof playerRikishi)[number]>) => string | number | undefined
    > = {
      name: (r) => r.shikona,
      kensho: (r) => Number(r.economics?.careerKenshoWon ?? 0) || 0,
    };
    const fn = accessor[earnerSortKey];
    if (!fn)
      return list
        .sort((a, b) => {
          const av = Number(a.economics?.careerKenshoWon ?? 0) || 0;
          const bv = Number(b.economics?.careerKenshoWon ?? 0) || 0;
          return bv - av;
        })
        .slice(0, 5);
    return [...list].sort((a, b) => compareBy(a, b, fn, earnerSortOrder)).slice(0, 5);
  }, [playerRikishi, earnerSortKey, earnerSortOrder]);

  // Calculate actual weekly finances - moved before early return for React Hook rules
  const weeklyFinances = useMemo(() => {
    if (!world || !playerHeya) return null;
    try {
      return calculateHeyaWeeklyFinances(playerHeya, world);
    } catch (e) {
      error("Failed to calculate finances", "EconomyPage", e);
      return null;
    }
  }, [world, playerHeya]);

  return {
    sendCommand,
    playerHeya,
    handleBailoutRequest,
    sekitoriCount,
    topEarners,
    weeklyFinances,
  };
}

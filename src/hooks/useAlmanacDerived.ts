/**
 * useAlmanacDerived.ts
 *
 * Derived data for AlmanacPage — kimarite stats per scope, history
 * counts, and the giant-slayers ledger.
 */

import { useMemo, useState } from "react";
import type { WorldState } from "@/presenters/uiDigest";
import {
  selectAllTimeKimaritePercentages,
  selectKimaritePercentages,
} from "@/presenters/selectors";
import { getAllRikishi, getHistory } from "@/presenters/worldAccess";
import { selectLatestKinboshiDates } from "@/presenters/projections/kinboshiLedger";

export function useAlmanacDerived(world: WorldState | null | undefined) {
  const [statsScope, setStatsScope] = useState<"era" | "alltime">("era");

  // Real recorded-ending totals per scope — shown on the toggle so the counts
  // behind each view are visible before switching.
  const eraEndings = Object.values(world?.globalKimariteStats ?? {}).reduce((a, b) => a + b, 0);
  const allTimeEndings = Object.values(world?.allTimeKimariteStats ?? {}).reduce(
    (a, b) => a + b,
    0
  );

  const kimariteStats = useMemo(
    () =>
      world
        ? statsScope === "alltime"
          ? selectAllTimeKimaritePercentages(world)
          : selectKimaritePercentages(world)
        : [],
    [world, statsScope]
  );
  // Use getHistory(world).length for the count — it reflects the total number
  // of completed bashos (capped at 500), which is what the "Past Bashos" tab
  // actually displays. world.almanacSnapshots is bounded to 6 (hot-state
  // window); older snapshots are in cold storage (OPFS) but not counted here.
  const history = world ? getHistory(world) : [];
  const snapshotCount = history.length;
  // Hot-state almanac window (most recent 6). Older snapshots live in OPFS.
  const hotSnapshotWindow = world?.almanacSnapshots?.length ?? 0;
  const topKimarite = kimariteStats.slice(0, 5);

  const giantSlayers = useMemo(() => {
    if (!world) return [];
    const results: {
      rikishiId: string;
      shikona: string;
      value: number;
      details: string;
      achievedDate?: { year: number; month: number };
    }[] = [];
    const kinboshiDates = selectLatestKinboshiDates(world);
    for (const r of getAllRikishi(world)) {
      const value =
        (r.stats?.achievements?.kinboshiEarned ?? 0) + (r.stats?.achievements?.ginboshiEarned ?? 0);
      if (value > 0) {
        results.push({
          rikishiId: r.id,
          shikona: r.shikona,
          value,
          details: `K: ${r.stats?.achievements?.kinboshiEarned ?? 0} | G: ${r.stats?.achievements?.ginboshiEarned ?? 0}`,
          // The awardLog kinboshi ledger records when each star was earned —
          // show the most recent one; ginboshi earns no official record.
          achievedDate: kinboshiDates.get(r.id),
        });
      }
    }
    return results.sort((a, b) => b.value - a.value).slice(0, 5);
  }, [world]);

  return {
    statsScope,
    setStatsScope,
    eraEndings,
    allTimeEndings,
    kimariteStats,
    history,
    snapshotCount,
    hotSnapshotWindow,
    topKimarite,
    giantSlayers,
  };
}

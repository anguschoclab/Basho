// HallOfFamePage.tsx — Dedicated Hall of Fame shrine
// Yearly inductees with portraits, career stats, and greatest fights

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppLayout } from "@/components/layout/AppLayout";
import { RECORDS_TABS } from "@/constants/ui/navigation";
import { useGame } from "@/contexts/useGame";
import { Award } from "lucide-react";
import { HoFTimeline } from "@/components/game/HoFTimeline";
import type { HoFCategory } from "@/presenters/engineAccess";
import { projectHOFUIDigest } from "@/presenters/uiDigest";
import { getRikishi } from "@/presenters/worldAccess";
import { selectAwardLog } from "@/presenters/selectors";
import type { UIHofInductee } from "@/presenters/projections/hofProjection";
import type { UIRikishi } from "@/presenters/uiModels";
import type { SortDirection } from "@/lib/sortUtils";
import { HallHero, DynastyRegistry, HofTabsRow } from "@/components/hof/HofPageSections";

export default function HallOfFamePage() {
  const { state } = useGame();
  const world = state.world;
  const [sortKey, setSortKey] = useState<string>("year");
  const [sortOrder, setSortOrder] = useState<SortDirection>("asc");

  const hof = useMemo(() => (world ? projectHOFUIDigest(world) : null), [world]);
  const awardLog = useMemo(() => (world ? selectAwardLog(world) : []), [world]);

  const byCategory = useMemo(() => {
    const map: Record<HoFCategory, UIHofInductee[]> = {
      champion: [],
      iron_man: [],
      technician: [],
    };
    if (!hof) return map;
    for (const ind of hof.inductees) {
      map[ind.category as HoFCategory]?.push(ind);
    }
    return map;
  }, [hof]);

  const totalInductees = hof?.inductees.length ?? 0;
  const totalAwards = world ? (world.awardLog?.length ?? awardLog.length) : 0;

  if (!world) {
    return (
      <AppLayout pageTitle="Hall of Fame" subNavTabs={RECORDS_TABS} activeSubTab="hall-of-fame">
        <EmptyState
          icon={Award}
          title="No world loaded"
          description="Load or start a game to view the Hall of Fame."
          className="h-64"
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Hall of Fame" subNavTabs={RECORDS_TABS} activeSubTab="hall-of-fame">
      <title>Hall of Fame — Basho</title>

      <div className="space-y-6">
        <HallHero
          totalInductees={totalInductees}
          totalAwards={totalAwards}
          byCategory={byCategory}
        />

        {totalInductees > 0 && (
          <HoFTimeline
            rikishiMap={
              new Map(
                (hof?.inductees ?? [])
                  .map(
                    (ind) => [ind.rikishiId, getRikishi(world, ind.rikishiId)] as [string, unknown]
                  )
                  .filter((pair) => !!pair[1])
              ) as unknown as Map<string, UIRikishi>
            }
            inductees={hof?.inductees ?? []}
          />
        )}

        {world.bloodlineRegistry && (
          <DynastyRegistry traits={world.bloodlineRegistry.traits} />
        )}

        <HofTabsRow
          totalInductees={totalInductees}
          inductees={hof?.inductees ?? []}
          byCategory={byCategory}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSortChange={(key, order) => {
            setSortKey(key);
            setSortOrder(order);
          }}
        />
      </div>
    </AppLayout>
  );
}

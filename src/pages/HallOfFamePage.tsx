// HallOfFamePage.tsx — Dedicated Hall of Fame shrine
// Yearly inductees with portraits, career stats, and greatest fights

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppLayout } from "@/components/layout/AppLayout";
import { RECORDS_TABS } from "@/constants/ui/navigation";
import { useGame } from "@/state/game/useGame";
import { Award } from "lucide-react";
import { HoFTimeline } from "@/components/ceremony/HoFTimeline";
import type { HoFCategory } from "@/presenters/engineAccess";
import { projectHOFUIDigest } from "@/presenters/uiDigest";
import { getRikishi, getHistoricalRikishi } from "@/presenters/worldAccess";
import { selectAwardLog } from "@/presenters/selectors";
import { resolveAvatar } from "@/presenters/projections/avatarProjections";
import type { UIHofInductee } from "@/presenters/projections/hofProjection";
import type { AvatarRenderData } from "@/engine/types/avatar";
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

  const hofRikishiMap = useMemo(() => {
    const map = new Map<string, { shikona: string; avatar?: AvatarRenderData }>();
    for (const ind of hof?.inductees ?? []) {
      if (!world) continue;
      const r = getRikishi(world, ind.rikishiId);
      const hist = r ?? getHistoricalRikishi(world, ind.rikishiId);
      if (!hist) continue;
      const avatar = resolveAvatar({
        id: hist.id,
        stored: hist.avatarConfig,
        nationality: "nationality" in hist ? hist.nationality : undefined,
        role: "rikishi",
        age: world.year - (hist.birthYear ?? world.year - 25),
      });
      map.set(ind.rikishiId, { shikona: hist.shikona, avatar });
    }
    return map;
  }, [hof, world]);

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
            rikishiMap={hofRikishiMap}
            inductees={hof?.inductees ?? []}
          />
        )}

        {world.bloodlineRegistry && <DynastyRegistry traits={world.bloodlineRegistry.traits} />}

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

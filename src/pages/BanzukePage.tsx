import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/useGame";
import { TOURNAMENT_TABS } from "@/constants/ui/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { PageHeader } from "@/components/layout/control-center";
import { YokozunaTrajectory } from "@/components/banzuke/YokozunaTrajectory";
import { DivisionTable } from "@/components/banzuke/DivisionTable";
import { BanzukeControlsRow, MovementLegend } from "@/components/banzuke/BanzukeControls";
import { useBanzukeDerived, DIVISION_KEYS } from "@/hooks/useBanzukeDerived";
import type { SortDirection } from "@/lib/sortUtils";

/** banzuke page. */
export default function BanzukePage() {
  const { state } = useGame();
  const world = state.world;
  const [showChanges, setShowChanges] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string>("rank");
  const [sortOrder, setSortOrder] = useState<SortDirection>("asc");

  const { banzukeDigest, pyramidData, yokozunaCandidates, filteredRowsByDivision } =
    useBanzukeDerived(world, searchQuery, sortKey, sortOrder);

  if (!world || !banzukeDigest) return null;

  const { kadobanMap, heyaNameMap, hasPrevBasho } = banzukeDigest;

  return (
    <AppLayout pageTitle="Official Banzuke" subNavTabs={TOURNAMENT_TABS} activeSubTab="banzuke">
      <title>Official Banzuke — Rankings | Basho</title>

      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <PageHeader
          eyebrow="── TOURNAMENT · BANZUKE ──"
          title="Official Rankings"
          lede={`${world.year} ${world.currentBashoName ?? "Upcoming"} · ${banzukeDigest.totalWrestlerCount} wrestlers listed`}
        />

        {/* Pyramid + controls row */}
        <BanzukeControlsRow
          pyramidData={pyramidData}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          hasPrevBasho={hasPrevBasho}
          showChanges={showChanges}
          onShowChanges={setShowChanges}
          onSortChange={(key, order) => {
            setSortKey(key);
            setSortOrder(order);
          }}
        />

        {/* Legend */}
        {hasPrevBasho && showChanges && <MovementLegend />}

        {/* Division tabs */}
        <Tabs defaultValue="makuuchi" className="w-full">
          <TabsList className="bg-muted/50">
            {DIVISION_KEYS.map((d) => (
              <TooltipWrap key={d} content={`View ${d} division rankings`} side="bottom">
                <TabsTrigger value={d} className="capitalize font-display text-xs gap-1">
                  {d}
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ({banzukeDigest.divisionCounts[d] ?? 0})
                  </span>
                </TabsTrigger>
              </TooltipWrap>
            ))}
          </TabsList>

          {DIVISION_KEYS.map((div) => (
            <TabsContent key={div} value={div}>
              <DivisionTable
                div={div}
                rows={filteredRowsByDivision.get(div) ?? []}
                kadobanMap={kadobanMap}
                heyaNameMap={heyaNameMap}
                showChanges={showChanges && hasPrevBasho}
                searchQuery={searchQuery}
              />
            </TabsContent>
          ))}
        </Tabs>

        {/* Yokozuna Promotion Watch */}
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="font-display font-bold uppercase tracking-tight text-sm text-muted-foreground">
              Yokozuna Promotion Watch
            </h2>
            <span className="h-px flex-1 bg-border/40" />
            <span className="text-[10px] font-mono text-gold/70 uppercase tracking-wider">
              横綱
            </span>
          </div>
          <YokozunaTrajectory candidates={yokozunaCandidates} />
        </section>
      </div>
    </AppLayout>
  );
}

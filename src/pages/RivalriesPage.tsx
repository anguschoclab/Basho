import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/control-center";
import { Card, CardContent } from "@/components/ui/card";
import { TOURNAMENT_TABS } from "@/constants/ui/navigation";
import { useState } from "react";
import { useGame } from "@/contexts/useGame";
import { RivalriesHeader } from "@/components/rivalries/RivalriesHeader";
import { RivalriesEmptyState } from "@/components/rivalries/RivalriesEmptyState";
import { HeatLegend } from "@/components/rivalries/HeatLegend";
import { RivalrySections } from "@/components/rivalries/RivalriesPageSections";
import { useRivalriesDerived } from "@/hooks/useRivalriesDerived";
import { SortMenu } from "@/components/ui/SortMenu";
import type { SortDirection } from "@/lib/sortUtils";

const RIVALRY_SORT_OPTIONS = [
  { key: "heat", label: "Heat" },
  { key: "wins", label: "Wins" },
];

// Page
/** rivalries page. */
export default function RivalriesPage() {
  const { state } = useGame();
  const { world, playerHeyaId } = state;
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string>("heat");
  const [sortOrder, setSortOrder] = useState<SortDirection>("asc");

  const { playerRivalries, hotRivalries, coolRivalries, stableRivalries, stats, playerRikishiIds } =
    useRivalriesDerived(world, playerHeyaId, searchQuery, sortKey, sortOrder);

  if (!world) {
    return (
      <AppLayout pageTitle="Rivalries & Feuds">
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No world loaded.
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const hasRivalries = stats.total > 0;

  return (
    <AppLayout pageTitle="Rivalries & Feuds" subNavTabs={TOURNAMENT_TABS} activeSubTab="rivalries">
      <title>Rivalries & Feuds - Basho</title>

      <div className="space-y-6 animate-fade-in">
        <PageHeader
          eyebrow="── TOURNAMENT ──"
          title="Rivalries & Feuds"
          lede="Tension, history, and blood feuds across the dohyo."
        />
        <RivalriesHeader
          stats={stats}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchClear={() => setSearchQuery("")}
        />

        <div className="flex justify-end">
          <SortMenu
            options={RIVALRY_SORT_OPTIONS}
            storageKey="basho_sort_rivalries"
            defaultSortKey="heat"
            defaultSortOrder="asc"
            onSortChange={(key, order) => {
              setSortKey(key);
              setSortOrder(order);
            }}
          />
        </div>

        {!hasRivalries ? (
          <RivalriesEmptyState />
        ) : (
          <RivalrySections
            world={world}
            playerRivalries={playerRivalries}
            hotRivalries={hotRivalries}
            coolRivalries={coolRivalries}
            stableRivalries={stableRivalries}
            playerRikishiIds={playerRikishiIds}
          />
        )}

        <HeatLegend />
      </div>
    </AppLayout>
  );
}

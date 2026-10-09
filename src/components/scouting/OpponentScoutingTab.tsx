// OpponentScoutingTab.tsx — Comprehensive opponent lookup & scouting investment

import { useMemo, useState } from "react";
import { useGame } from "@/contexts/useGame";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { projectOpponentScoutingUIDigest, RANK_HIERARCHY } from "@/presenters/uiDigest";
import { compareBy, type SortDirection } from "@/lib/sortUtils";
import { ScoutingFilterRow, OpponentCard } from "./OpponentScoutingSections";

export function OpponentScoutingTab({ playerHeyaId }: { playerHeyaId: string | null }) {
  const { state, setScoutingInvestment: setScoutingInvestmentAction } = useGame();
  const world = state.world;
  const { toast } = useToast();
  const [filterDivision, setFilterDivision] = useState<string>("makuuchi");
  const [sortKey, setSortKey] = useState<string>("rank");
  const [sortOrder, setSortOrder] = useState<SortDirection>("asc");

  const digest = useMemo(() => {
    if (!world) return { opponents: [] };
    const d = projectOpponentScoutingUIDigest(world, playerHeyaId, filterDivision);
    if (sortKey === "rank") {
      d.opponents = [...d.opponents].sort((a, b) => {
        const ta = (RANK_HIERARCHY as Record<string, { tier: number }>)[a.rank]?.tier ?? 99;
        const tb = (RANK_HIERARCHY as Record<string, { tier: number }>)[b.rank]?.tier ?? 99;
        const result = ta - tb || (a.rankNumber ?? 0) - (b.rankNumber ?? 0);
        return sortOrder === "desc" ? -result : result;
      });
    } else {
      const accessor: Record<
        string,
        (r: (typeof d.opponents)[number]) => string | number | undefined
      > = {
        shikona: (r) => r.shikona,
        scoutLevel: (r) => r.scoutLevel,
      };
      const fn = accessor[sortKey];
      if (fn) {
        d.opponents = [...d.opponents].sort((a, b) => compareBy(a, b, fn, sortOrder));
      }
    }
    return d;
  }, [world, playerHeyaId, filterDivision, sortKey, sortOrder]);

  const handleInvestScouting = (
    rikishiId: string,
    level: "none" | "light" | "standard" | "deep"
  ) => {
    if (!world) return;
    if (!setScoutingInvestmentAction(rikishiId, level)) return;
    toast({
      title: "Scouting updated",
      description: `Investment set to ${level}.`,
    });
  };

  return (
    <div className="space-y-4">
      <ScoutingFilterRow
        filterDivision={filterDivision}
        onDivisionChange={setFilterDivision}
        onSortChange={(key, order) => {
          setSortKey(key);
          setSortOrder(order);
        }}
      />

      <ScrollArea className="h-[600px]">
        <div className="space-y-3 pr-2">
          {digest.opponents.map((r) => (
            <OpponentCard key={r.id} opponent={r} onInvest={handleInvestScouting} />
          ))}

          {digest.opponents.length === 0 && (
            <EmptyState icon={Search} title="No opponents found in this division." compact />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

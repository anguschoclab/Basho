import React, { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpDown, TrendingUp, TrendingDown } from "lucide-react";
import type { UIRikishi } from "@/presenters/uiModels";
import { cn } from "@/lib/utils";
import { useSortState } from "@/hooks/useSortState";
import { compareBy } from "@/lib/sortUtils";

interface StableStatsTableProps {
  rikishiList: UIRikishi[];
}

type SortKey =
  | "shikona"
  | "division"
  | "careerWins"
  | "careerLosses"
  | "winPercentage"
  | "streak"
  | "avgRankLabel";

const SORT_ACCESSORS: Record<SortKey, (r: UIRikishi) => string | number> = {
  shikona: (r) => r.shikona,
  division: (r) => r.division,
  careerWins: (r) => r.careerWins,
  careerLosses: (r) => r.careerLosses,
  winPercentage: (r) => r.winPercentage,
  streak: (r) => r.streak,
  avgRankLabel: (r) => r.avgRankLabel,
};

export function StableStatsTable({ rikishiList }: StableStatsTableProps) {
  const { sortKey, sortOrder, setSortKey, toggleOrder } = useSortState<SortKey>(
    "basho_sort_stable_stats",
    "division",
    "desc",
    "asc"
  );
  const [divisionFilter, setDivisionFilter] = useState<string>("all");

  const divisions = ["all", "makuuchi", "juryo", "makushita", "lower"];

  const filteredAndSortedRikishi = useMemo(() => {
    let result = [...rikishiList];

    // Filter by division
    if (divisionFilter !== "all") {
      if (divisionFilter === "lower") {
        result = result.filter((r) => !["makuuchi", "juryo", "makushita"].includes(r.division));
      } else {
        result = result.filter((r) => r.division === divisionFilter);
      }
    }

    // Sort
    const accessor = SORT_ACCESSORS[sortKey];
    result.sort((a, b) => compareBy(a, b, accessor, sortOrder));

    return result;
  }, [rikishiList, sortKey, sortOrder, divisionFilter]);

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        toggleOrder();
      } else {
        setSortKey(key);
      }
    },
    [sortKey, setSortKey, toggleOrder]
  );

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Performance Dashboard
          </CardTitle>

          <div className="flex flex-wrap gap-1.5">
            {divisions.map((div) => (
              <DivisionFilterBadge
                key={div}
                division={div}
                isActive={divisionFilter === div}
                onClick={setDivisionFilter}
              />
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        <ScrollArea className="h-[600px] w-full rounded-md border border-border/50 bg-card/30 backdrop-blur-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr className="text-left border-b border-border/50">
                <TableHeader
                  label="Shikona"
                  id="shikona"
                  currentSort={sortKey}
                  onClick={toggleSort}
                />
                <TableHeader
                  label="Division"
                  id="division"
                  currentSort={sortKey}
                  onClick={toggleSort}
                />
                <TableHeader
                  label="Wins"
                  id="careerWins"
                  currentSort={sortKey}
                  onClick={toggleSort}
                />
                <TableHeader
                  label="Losses"
                  id="careerLosses"
                  currentSort={sortKey}
                  onClick={toggleSort}
                />
                <TableHeader
                  label="Win %"
                  id="winPercentage"
                  currentSort={sortKey}
                  onClick={toggleSort}
                />
                <TableHeader
                  label="Streak"
                  id="streak"
                  currentSort={sortKey}
                  onClick={toggleSort}
                />
                <th className="p-4 font-semibold text-muted-foreground whitespace-nowrap">Basho</th>
                <TableHeader
                  label="Avg Rank"
                  id="avgRankLabel"
                  currentSort={sortKey}
                  onClick={toggleSort}
                />
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRikishi.map((r) => (
                <StableStatsRow key={r.id} r={r} />
              ))}
              {filteredAndSortedRikishi.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground italic">
                    No rikishi found matching this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

const TableHeader = React.memo(function TableHeader({
  label,
  id,
  currentSort,
  onClick,
}: {
  label: string;
  id: SortKey;
  currentSort: SortKey;
  onClick: (id: SortKey) => void;
}) {
  const isActive = currentSort === id;
  return (
    <th
      className={cn(
        "p-4 font-semibold cursor-pointer select-none whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm",
        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
      onClick={() => onClick(id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(id);
        }
      }}
    >
      <div className="flex items-center gap-2">
        {label}
        <ArrowUpDown className={cn("h-3 w-3", isActive ? "opacity-100" : "opacity-30")} />
      </div>
    </th>
  );
});

const DivisionFilterBadge = React.memo(function DivisionFilterBadge({
  division,
  isActive,
  onClick,
}: {
  division: string;
  isActive: boolean;
  onClick: (div: string) => void;
}) {
  return (
    <Badge
      variant={isActive ? "default" : "outline"}
      className="cursor-pointer capitalize px-3 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
      onClick={() => onClick(division)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(division);
        }
      }}
    >
      {division}
    </Badge>
  );
});

const StableStatsRow = React.memo(function StableStatsRow({ r }: { r: UIRikishi }) {
  return (
    <tr className="border-b border-border/30 hover:bg-muted/30 transition-colors">
      <td className="py-3 px-4 font-medium">{r.shikona}</td>
      <td className="py-3 px-4 capitalize text-muted-foreground">{r.division}</td>
      <td className="py-3 px-4">{r.careerWins}</td>
      <td className="py-3 px-4 text-muted-foreground">{r.careerLosses}</td>
      <td className="py-3 px-4 font-mono">{(r.winPercentage * 100).toFixed(1)}%</td>
      <td className="py-3 px-4">
        <StreakBadge streak={r.streak} label={r.streakLabel} />
      </td>
      <td className="py-3 px-4 font-medium text-primary">{r.currentBashoRecord}</td>
      <td className="py-3 px-4 font-display font-semibold text-primary">{r.avgRankLabel}</td>
    </tr>
  );
});

const StreakBadge = React.memo(function StreakBadge({
  streak,
  label,
}: {
  streak: number;
  label: string;
}) {
  if (streak === 0) return <span className="text-muted-foreground">-</span>;

  const isWinning = streak > 0;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold w-fit",
        isWinning ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
      )}
    >
      {isWinning ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {label}
    </div>
  );
});

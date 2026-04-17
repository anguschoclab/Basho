import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpDown, TrendingUp, TrendingDown } from "lucide-react";
import type { UIRikishi } from "@/presenters/uiModels";
import { cn } from "@/lib/utils";

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

export function StableStatsTable({ rikishiList }: StableStatsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("division");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
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
    result.sort((a, b) => {
      let valA: string | number = a[sortKey] as string | number;
      let valB: string | number = b[sortKey] as string | number;

      // Special handling for labels or complex types if needed
      if (sortKey === "streak") {
        valA = a.streak;
        valB = b.streak;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [rikishiList, sortKey, sortOrder, divisionFilter]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("desc"); // Default to desc for stats
    }
  };

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
              <Badge
                key={div}
                variant={divisionFilter === div ? "default" : "outline"}
                className="cursor-pointer capitalize px-3 py-0.5"
                onClick={() => setDivisionFilter(div)}
              >
                {div}
              </Badge>
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
                  onClick={() => toggleSort("shikona")}
                />
                <TableHeader
                  label="Division"
                  id="division"
                  currentSort={sortKey}
                  onClick={() => toggleSort("division")}
                />
                <TableHeader
                  label="Wins"
                  id="careerWins"
                  currentSort={sortKey}
                  onClick={() => toggleSort("careerWins")}
                />
                <TableHeader
                  label="Losses"
                  id="careerLosses"
                  currentSort={sortKey}
                  onClick={() => toggleSort("careerLosses")}
                />
                <TableHeader
                  label="Win %"
                  id="winPercentage"
                  currentSort={sortKey}
                  onClick={() => toggleSort("winPercentage")}
                />
                <TableHeader
                  label="Streak"
                  id="streak"
                  currentSort={sortKey}
                  onClick={() => toggleSort("streak")}
                />
                <TableHeader label="Basho" id="shikona" currentSort={sortKey} onClick={() => {}} />
                <TableHeader
                  label="Avg Rank"
                  id="avgRankLabel"
                  currentSort={sortKey}
                  onClick={() => toggleSort("avgRankLabel")}
                />
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRikishi.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-3 px-4 font-medium">{r.shikona}</td>
                  <td className="py-3 px-4 capitalize text-muted-foreground">{r.division}</td>
                  <td className="py-3 px-4">{r.careerWins}</td>
                  <td className="py-3 px-4 text-muted-foreground">{r.careerLosses}</td>
                  <td className="py-3 px-4 font-mono">{(r.winPercentage * 100).toFixed(1)}%</td>
                  <td className="py-3 px-4">
                    <StreakBadge streak={r.streak} label={r.streakLabel} />
                  </td>
                  <td className="py-3 px-4 font-medium text-primary">{r.currentBashoRecord}</td>
                  <td className="py-3 px-4 font-display font-semibold text-primary">
                    {r.avgRankLabel}
                  </td>
                </tr>
              ))}
              {filteredAndSortedRikishi.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground italic">
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

function TableHeader({
  label,
  id,
  currentSort,
  onClick,
}: {
  label: string;
  id: SortKey;
  currentSort: SortKey;
  onClick: () => void;
}) {
  const isActive = currentSort === id;
  return (
    <th
      className={cn(
        "p-4 font-semibold cursor-pointer select-none whitespace-nowrap",
        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        {label}
        <ArrowUpDown className={cn("h-3 w-3", isActive ? "opacity-100" : "opacity-30")} />
      </div>
    </th>
  );
}

function StreakBadge({ streak, label }: { streak: number; label: string }) {
  if (streak === 0) return <span className="text-muted-foreground">-</span>;

  const isWinning = streak > 0;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold w-fit",
        isWinning ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
      )}
    >
      {isWinning ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {label}
    </div>
  );
}

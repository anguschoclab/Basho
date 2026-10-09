/**
 * DivisionTable.tsx
 *
 * Single-division banzuke table for BanzukePage — east/west rikishi
 * cells per rank row with kadoban and movement indicators.
 */

import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { RikishiCell } from "@/components/banzuke/RikishiCell";
import type { UIRankRow } from "@/presenters/banzukeUI";

interface DivisionTableProps {
  div: string;
  rows: UIRankRow[];
  kadobanMap: Record<string, { isKadoban: boolean }>;
  heyaNameMap: Map<string, string>;
  showChanges: boolean;
  searchQuery: string;
}

export const DivisionTable = memo(function DivisionTable({
  rows,
  kadobanMap,
  heyaNameMap,
  showChanges,
  searchQuery,
}: DivisionTableProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr className="border-b">
                <th className="p-3 font-display font-medium text-right w-[280px]">
                  <span className="text-east text-[10px] uppercase tracking-widest">East 東</span>
                </th>
                <th className="p-3 font-display font-medium text-center w-[120px] text-muted-foreground text-[10px] uppercase tracking-widest">
                  Rank
                </th>
                <th className="p-3 font-display font-medium w-[280px]">
                  <span className="text-west text-[10px] uppercase tracking-widest">West 西</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.rankKey}
                  className={`border-b hover:bg-muted/50 transition-colors bout-enter ${row.rankTierClass}`}
                  style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                >
                  <RikishiCell
                    entry={row.east}
                    kadobanMap={kadobanMap}
                    heyaName={row.east ? heyaNameMap.get(row.east.id) : undefined}
                    showChanges={showChanges}
                    searchQuery={searchQuery}
                    side="east"
                  />
                  <td className="p-3 text-center">
                    <div className="font-display text-muted-foreground text-xs font-medium">
                      {row.rankLabel}
                    </div>
                    <div className="text-[9px] text-muted-foreground/60 leading-tight mt-0.5 font-display">
                      {row.rankTitleJa}
                      {row.isSanyaku && <span className="ml-1 text-gold/70">三役</span>}
                    </div>
                  </td>
                  <RikishiCell
                    entry={row.west}
                    kadobanMap={kadobanMap}
                    heyaName={row.west ? heyaNameMap.get(row.west.id) : undefined}
                    showChanges={showChanges}
                    searchQuery={searchQuery}
                    side="west"
                  />
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-0">
                    <EmptyState
                      icon={Search}
                      title={searchQuery ? "No matches found" : "Division empty"}
                      description={
                        searchQuery
                          ? "No wrestlers match your search"
                          : "No wrestlers in this division"
                      }
                      compact
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});

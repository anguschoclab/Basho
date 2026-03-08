import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRank } from "@/engine/banzuke";
import type { OzekiKadobanMap } from "@/engine/banzuke";
import { toRankPosition } from "@/engine/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClickableName } from "@/components/ClickableName";
import type { Rikishi, Rank, Division, Side } from "@/engine/types";

interface RankRow {
  rankLabel: string;
  rankKey: string;
  east: Rikishi | null;
  west: Rikishi | null;
}

function buildRankRows(rikishiList: Rikishi[], division: string): RankRow[] {
  // Filter to this division
  const divRikishi = rikishiList.filter(r => r.division === division);

  // Group by rank + rankNumber to form east/west pairs
  const groups = new Map<string, { east: Rikishi | null; west: Rikishi | null }>();

  for (const r of divRikishi) {
    const key = `${r.rank}_${r.rankNumber ?? 1}`;
    if (!groups.has(key)) groups.set(key, { east: null, west: null });
    const g = groups.get(key)!;
    if (r.side === "east") g.east = r;
    else g.west = r;
  }

  // Sort by rank tier then rank number
  const tier = (rank: string) => {
    switch (rank) {
      case "yokozuna": return 1;
      case "ozeki": return 2;
      case "sekiwake": return 3;
      case "komusubi": return 4;
      case "maegashira": return 5;
      case "juryo": return 6;
      case "makushita": return 7;
      case "sandanme": return 8;
      case "jonidan": return 9;
      case "jonokuchi": return 10;
      default: return 99;
    }
  };

  const entries = Array.from(groups.entries())
    .map(([key, { east, west }]) => {
      const sample = east || west;
      const rank = sample?.rank ?? "unknown";
      const rankNumber = sample?.rankNumber ?? 1;
      const isSanyaku = ["yokozuna", "ozeki", "sekiwake", "komusubi"].includes(rank);
      const rankLabel = isSanyaku
        ? rank.charAt(0).toUpperCase() + rank.slice(1)
        : `${rank.charAt(0).toUpperCase() + rank.slice(1)} #${rankNumber}`;
      return { rankLabel, rankKey: key, east, west, _tier: tier(rank), _num: rankNumber };
    })
    .sort((a, b) => a._tier - b._tier || a._num - b._num);

  return entries;
}

function RikishiCell({ r, kadobanMap, heyaName }: { r: Rikishi | null; kadobanMap: OzekiKadobanMap; heyaName?: string }) {
  if (!r) return <td className="p-3 text-muted-foreground/40 text-center">—</td>;

  return (
    <td className="p-3">
      <div className="flex items-center gap-2">
        <ClickableName id={r.id} name={r.shikona} type="rikishi" className="font-bold text-sm" />
        <span className="text-[11px] text-muted-foreground">{heyaName}</span>
        {r.rank === "ozeki" && kadobanMap[r.id]?.isKadoban && (
          <Badge variant="outline" className="text-[9px] border-amber-600 text-amber-600 ml-auto">角番</Badge>
        )}
        {r.rank === "yokozuna" && (
          <Badge variant="default" className="text-[9px] bg-purple-900 hover:bg-purple-800 ml-auto">横綱</Badge>
        )}
        {r.injured && (
          <Badge variant="destructive" className="text-[9px] ml-auto">休場</Badge>
        )}
      </div>
    </td>
  );
}

export default function BanzukePage() {
  const { state } = useGame();
  const world = state.world;

  if (!world) return null;

  const kadobanMap: OzekiKadobanMap = (world as any).ozekiKadoban ?? {};
  const rikishiList = Array.from(world.rikishi.values());

  const divisions = ["makuuchi", "juryo", "makushita", "sandanme", "jonidan", "jonokuchi"];

  const competitionTabs = [
    { id: "basho", label: "Basho", href: "/basho" },
    { id: "banzuke", label: "Banzuke" },
    { id: "rivalries", label: "Rivalries", href: "/rivalries" },
  ];

  return (
    <AppLayout
      pageTitle="Official Banzuke"
      subNavTabs={competitionTabs}
      activeSubTab="banzuke"
    >
      <div className="space-y-6">
        <p className="text-muted-foreground">
          {world.year} {world.currentBashoName?.toUpperCase() || "UPCOMING"} Rankings
        </p>

        <Tabs defaultValue="makuuchi" className="w-full">
          <TabsList>
            {divisions.map(d => (
                <TabsTrigger key={d} value={d} className="capitalize">{d}</TabsTrigger>
            ))}
          </TabsList>
          
          {divisions.map(div => {
              const rows = buildRankRows(rikishiList, div);

              return (
                <TabsContent key={div} value={div}>
                    <Card>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[600px]">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 sticky top-0 z-10">
                                        <tr className="text-left border-b">
                                            <th className="p-3 font-medium text-right w-[180px]">East</th>
                                            <th className="p-3 font-medium text-center w-[120px]">Rank</th>
                                            <th className="p-3 font-medium w-[180px]">West</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row) => (
                                            <tr key={row.rankKey} className="border-b hover:bg-muted/50 transition-colors">
                                                <RikishiCell
                                                  r={row.east}
                                                  kadobanMap={kadobanMap}
                                                  heyaName={row.east ? world.heyas.get(row.east.heyaId)?.name : undefined}
                                                />
                                                <td className="p-3 font-mono text-muted-foreground text-center text-xs">
                                                    {row.rankLabel}
                                                </td>
                                                <RikishiCell
                                                  r={row.west}
                                                  kadobanMap={kadobanMap}
                                                  heyaName={row.west ? world.heyas.get(row.west.heyaId)?.name : undefined}
                                                />
                                            </tr>
                                        ))}
                                        {rows.length === 0 && (
                                          <tr>
                                            <td colSpan={3} className="p-8 text-center text-muted-foreground">
                                              No wrestlers in this division
                                            </td>
                                          </tr>
                                        )}
                                    </tbody>
                                </table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
              );
          })}
        </Tabs>
      </div>
    </AppLayout>
  );
}

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRank } from "@/engine/banzuke";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClickableName } from "@/components/ClickableName";
import type { Rikishi, Rank } from "@/engine/types";

export default function BanzukePage() {
  const { state } = useGame();
  const world = state.world;

  if (!world) return null;

  // We group rikishi by division and sort them
  const rikishiList = Array.from(world.rikishi.values());
  
  // Sort by rank value (we need a helper, but for now we can rely on division + rank string sort approx)
  // Ideally use `positionKey` from banzuke.ts logic, but here we can just filter.
  
  const tier = (r: Rank) => {
    if (r === "yokozuna") return 1;
    if (r === "ozeki") return 2;
    if (r === "sekiwake") return 3;
    if (r === "komusubi") return 4;
    return 5;
  };

  const sortRikishi = (a: Rikishi, b: Rikishi) => {
    const ta = tier(a.rank);
    const tb = tier(b.rank);
    if (ta !== tb) return ta - tb;
    if (a.rankNumber !== b.rankNumber) return (a.rankNumber || 0) - (b.rankNumber || 0);
    return a.side === "east" ? -1 : 1;
  };
  
  const makuuchi = rikishiList
    .filter(r => r.division === "makuuchi")
    .sort(sortRikishi);

  const divisions = ["makuuchi", "juryo", "makushita", "sandanme", "jonidan", "jonokuchi"];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Official Banzuke</h1>
            <p className="text-muted-foreground">
              {world.year} {world.currentBashoName?.toUpperCase() || "UPCOMING"} Rankings
            </p>
          </div>
        </div>

        <Tabs defaultValue="makuuchi" className="w-full">
          <TabsList>
            {divisions.map(d => (
                <TabsTrigger key={d} value={d} className="capitalize">{d}</TabsTrigger>
            ))}
          </TabsList>
          
          {divisions.map(div => {
              const list = rikishiList.filter(r => r.division === div).sort(sortRikishi);

              return (
                <TabsContent key={div} value={div}>
                    <Card>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[600px]">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 sticky top-0 z-10">
                                        <tr className="text-left border-b">
                                            <th className="p-3 font-medium">Rank</th>
                                            <th className="p-3 font-medium">East</th>
                                            <th className="p-3 font-medium">West</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Render in pairs if possible, or list. List is easier for V1 */}
                                        {list.map((r) => (
                                            <tr key={r.id} className="border-b hover:bg-muted/50 transition-colors">
                                                <td className="p-3 font-mono text-muted-foreground w-32">
                                                    {formatRank({ rank: r.rank, rankNumber: r.rankNumber, side: r.side })}
                                                </td>
                                                <td className="p-3" colSpan={2}>
                                                    <div className="flex items-center gap-3">
                                                        <ClickableName id={r.id} name={r.shikona} type="rikishi" className="font-bold text-base" />
                                                        <span className="text-xs text-muted-foreground">{world.heyas.get(r.heyaId)?.name}</span>
                                                        {r.rank === "ozeki" && (
                                                            <Badge variant="outline" className="ml-auto text-[10px] border-yellow-500 text-yellow-600">OZEKI</Badge>
                                                        )}
                                                        {r.rank === "yokozuna" && (
                                                            <Badge variant="default" className="ml-auto text-[10px] bg-purple-900 hover:bg-purple-800">YOKOZUNA</Badge>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
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

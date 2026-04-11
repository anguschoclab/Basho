import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/GameContext";
import { TOURNAMENT_TABS } from "@/constants/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Division } from "@/engine/types/banzuke";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUp, ArrowDown, Minus, ArrowUpRight, Search, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RikishiCell } from "@/components/banzuke/RikishiCell";
import { projectBanzukeUIDigest } from "@/presenters/uiDigest";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import type { UIRikishi } from "@/presenters/uiModels";

/** banzuke page. */
export default function BanzukePage() {
  const { state } = useGame();
  const world = state.world;
  const [showChanges, setShowChanges] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const banzukeDigest = useMemo(() => {
    if (!world) return null;
    return projectBanzukeUIDigest(world);
  }, [world]);

  if (!world || !banzukeDigest) return null;

  const { divisions: banzukeData, kadobanMap, heyaNameMap, hasPrevBasho } = banzukeDigest;
  const divisionKeys: Division[] = ["makuuchi", "juryo", "makushita", "sandanme", "jonidan", "jonokuchi"];

  return (
    <AppLayout pageTitle="Official Banzuke" subNavTabs={TOURNAMENT_TABS} activeSubTab="banzuke">
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md rank-yokozuna flex items-center justify-center">
              <span className="font-display text-primary-foreground text-sm font-bold">番</span>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">
                {world.year} {world.currentBashoName?.toUpperCase() || "UPCOMING"} Rankings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Player stable legend */}
            <div className="flex items-center gap-1.5 text-[10px] text-primary border border-primary/20 rounded-md px-2 py-1 bg-primary/5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Your Stable
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search wrestler…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-8 w-48 pl-8 pr-8 text-xs"
              />
              {searchQuery && (
                <TooltipWrap content="Clear search filter" side="top">
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </TooltipWrap>
              )}
            </div>
            {hasPrevBasho && (
              <div className="flex items-center gap-2">
                <TooltipWrap content="Toggle rank movement indicators relative to the previous tournament" side="top">
                  <div className="flex items-center gap-2">
                    <Switch id="show-changes" checked={showChanges} onCheckedChange={setShowChanges} />
                    <Label htmlFor="show-changes" className="text-xs text-muted-foreground cursor-pointer">Changes</Label>
                  </div>
                </TooltipWrap>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        {hasPrevBasho && showChanges && (
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground border border-border/50 rounded-md px-3 py-1.5 bg-muted/20 w-fit">
            <span className="flex items-center gap-1 text-success"><ArrowUp className="h-3 w-3" /> Promoted</span>
            <span className="flex items-center gap-1 text-destructive"><ArrowDown className="h-3 w-3" /> Demoted</span>
            <span className="flex items-center gap-1 text-muted-foreground"><Minus className="h-3 w-3" /> Unchanged</span>
            <span className="flex items-center gap-1 text-primary"><ArrowUpRight className="h-2.5 w-2.5" /> New entry</span>
          </div>
        )}

        {/* Division tabs */}
        <Tabs defaultValue="makuuchi" className="w-full">
          <TabsList className="bg-muted/50">
            {divisionKeys.map(d => {
              const divData = banzukeData.find((b: any) => b.division === d);
              const divCount = divData?.rows.reduce((acc: number, r: any) => acc + (r.east ? 1 : 0) + (r.west ? 1 : 0), 0) || 0;
              return (
                <TooltipWrap key={d} content={`View ${d} division rankings`} side="bottom">
                  <TabsTrigger value={d} className="capitalize font-display text-xs gap-1">
                    {d}
                    <span className="text-[10px] text-muted-foreground font-mono">({divCount})</span>
                  </TabsTrigger>
                </TooltipWrap>
              );
            })}
          </TabsList>

          {divisionKeys.map(div => {
            const divData = banzukeData.find((b: any) => b.division === div);
            let rows = divData?.rows || [];
            if (searchQuery) {
              const q = searchQuery.toLowerCase();
              rows = rows.filter((r: any) => 
                r.east?.shikona?.toLowerCase().includes(q) || 
                r.west?.shikona?.toLowerCase().includes(q)
              );
            }
            
            return (
              <TabsContent key={div} value={div}>
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
                                showChanges={showChanges && hasPrevBasho}
                                searchQuery={searchQuery}
                                side="east"
                              />
                              <td className="p-3 text-center">
                                <div className="font-display text-muted-foreground text-xs font-medium">{row.rankLabel}</div>
                                <div className="text-[9px] text-muted-foreground/60 leading-tight mt-0.5 font-display">
                                  {row.rankTitleJa}
                                  {row.isSanyaku && <span className="ml-1 text-gold/70">三役</span>}
                                </div>
                              </td>
                              <RikishiCell
                                entry={row.west}
                                kadobanMap={kadobanMap}
                                heyaName={row.west ? heyaNameMap.get(row.west.id) : undefined}
                                showChanges={showChanges && hasPrevBasho}
                                searchQuery={searchQuery}
                                side="west"
                              />
                            </tr>
                          ))}
                          {rows.length === 0 && (
                            <tr>
                              <td colSpan={3} className="p-8 text-center text-muted-foreground font-display">
                                {searchQuery ? "No wrestlers match your search" : "No wrestlers in this division"}
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

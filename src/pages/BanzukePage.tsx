import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { OzekiKadobanMap, RankInfo } from "@/engine/banzuke";
import { RANK_HIERARCHY, getRankTitleJa, formatRank } from "@/engine/banzuke";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUp, ArrowDown, Minus, ArrowUpRight, Search, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { Division, RankPosition } from "@/engine/types";
import { projectRosterEntry } from "@/engine/uiModels";
import { RikishiCell } from "@/components/banzuke/RikishiCell";
import { buildRankRows, buildPrevRankMap, rankRowClass } from "@/components/banzuke/banzukeHelpers";

export default function BanzukePage() {
  const { state } = useGame();
  const world = state.world;
  const [showChanges, setShowChanges] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const prevRankMap = useMemo(() => {
    if (!world) return new Map();
    return buildPrevRankMap(world.history);
  }, [world]);

  const rosterEntries = useMemo(() => {
    if (!world) return [];
    return Array.from(world.rikishi.values())
      .filter(r => !r.isRetired)
      .map(r => projectRosterEntry(r));
  }, [world]);

  const heyaNameMap = useMemo(() => {
    if (!world) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const r of world.rikishi.values()) {
      if (r.isRetired) continue;
      const heya = world.heyas.get(r.heyaId);
      if (heya) map.set(r.id, heya.name);
    }
    return map;
  }, [world]);

  // Build set of player stable rikishi IDs
  const playerRikishiIds = useMemo(() => {
    if (!world) return new Set<string>();
    const playerHeya = Array.from(world.heyas.values()).find(h => h.isPlayerOwned);
    if (!playerHeya) return new Set<string>();
    return new Set(playerHeya.rikishiIds);
  }, [world]);

  if (!world) return null;

  const kadobanMap: OzekiKadobanMap = world.ozekiKadoban ?? {};
  const hasPrevBasho = prevRankMap.size > 0;
  const divisions: Division[] = ["makuuchi", "juryo", "makushita", "sandanme", "jonidan", "jonokuchi"];

  const competitionTabs = [
    { id: "basho", label: "Basho", href: "/basho" },
    { id: "banzuke", label: "Banzuke" },
    { id: "rivalries", label: "Rivalries", href: "/rivalries" },
  ];

  return (
    <AppLayout pageTitle="Official Banzuke" subNavTabs={competitionTabs} activeSubTab="banzuke">
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
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {hasPrevBasho && (
              <div className="flex items-center gap-2">
                <Switch id="show-changes" checked={showChanges} onCheckedChange={setShowChanges} />
                <Label htmlFor="show-changes" className="text-xs text-muted-foreground cursor-pointer">Changes</Label>
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
            {divisions.map(d => {
              const count = rosterEntries.filter(r => r.rank === d || (d === "maegashira" ? false : r.rank === d)).length;
              // Count rikishi per division properly
              const divCount = rosterEntries.filter(r => {
                if (d === "makuuchi") return ["yokozuna","ozeki","sekiwake","komusubi","maegashira"].includes(r.rank);
                return r.rank === d;
              }).length;
              return (
                <TabsTrigger key={d} value={d} className="capitalize font-display text-xs gap-1">
                  {d}
                  <span className="text-[10px] text-muted-foreground font-mono">({divCount})</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {divisions.map(div => {
            const rows = buildRankRows(rosterEntries, div, searchQuery);
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
                              className={`border-b hover:bg-muted/50 transition-colors bout-enter ${rankRowClass(row.rankTier)}`}
                              style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                            >
                              <RikishiCell
                                entry={row.east}
                                kadobanMap={kadobanMap}
                                heyaName={row.east ? heyaNameMap.get(row.east.id) : undefined}
                                showChanges={showChanges && hasPrevBasho}
                                prevRankMap={prevRankMap}
                                searchQuery={searchQuery}
                                isPlayerStable={row.east ? playerRikishiIds.has(row.east.id) : false}
                                side="east"
                              />
                              <td className="p-3 text-center">
                                <div className="font-display text-muted-foreground text-xs font-medium">{row.rankLabel}</div>
                                {(() => {
                                  const sample = row.east || row.west;
                                  if (!sample) return null;
                                  const pos: RankPosition = { rank: sample.rank as any, side: (sample.side ?? "east") as any, rankNumber: sample.rankNumber };
                                  const titleJa = getRankTitleJa(pos);
                                  const info: RankInfo | undefined = RANK_HIERARCHY[sample.rank as keyof typeof RANK_HIERARCHY];
                                  return (
                                    <div className="text-[9px] text-muted-foreground/60 leading-tight mt-0.5 font-display">
                                      {titleJa}
                                      {info?.isSanyaku && <span className="ml-1 text-gold/70">三役</span>}
                                    </div>
                                  );
                                })()}
                              </td>
                              <RikishiCell
                                entry={row.west}
                                kadobanMap={kadobanMap}
                                heyaName={row.west ? heyaNameMap.get(row.west.id) : undefined}
                                showChanges={showChanges && hasPrevBasho}
                                prevRankMap={prevRankMap}
                                searchQuery={searchQuery}
                                isPlayerStable={row.west ? playerRikishiIds.has(row.west.id) : false}
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

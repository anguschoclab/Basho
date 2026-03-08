import React, { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRank, RANK_HIERARCHY } from "@/engine/banzuke";
import type { OzekiKadobanMap } from "@/engine/banzuke";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClickableName } from "@/components/ClickableName";
import { ArrowUp, ArrowDown, Minus, ChevronsUp, ChevronsDown, ArrowUpRight, Search, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { Rikishi, Rank, Division, Side, BanzukeSnapshot, BanzukeAssignment, RankPosition } from "@/engine/types";

// ── Helpers ──

interface RankRow {
  rankLabel: string;
  rankKey: string;
  east: Rikishi | null;
  west: Rikishi | null;
}

const RANK_TIER: Record<string, number> = {
  yokozuna: 1, ozeki: 2, sekiwake: 3, komusubi: 4,
  maegashira: 5, juryo: 6, makushita: 7,
  sandanme: 8, jonidan: 9, jonokuchi: 10,
};

function rankScore(rank: string, rankNumber?: number, side?: string): number {
  const tier = RANK_TIER[rank] ?? 99;
  const num = rankNumber ?? 0;
  const sideVal = side === "east" ? 0 : 0.5;
  return tier * 1000 + num * 2 + sideVal;
}

function buildRankRows(rikishiList: Rikishi[], division: string, searchQuery: string): RankRow[] {
  const divRikishi = rikishiList.filter(r => r.division === division);
  const groups = new Map<string, { east: Rikishi | null; west: Rikishi | null }>();

  for (const r of divRikishi) {
    const key = `${r.rank}_${r.rankNumber ?? 1}`;
    if (!groups.has(key)) groups.set(key, { east: null, west: null });
    const g = groups.get(key)!;
    if (r.side === "east") g.east = r;
    else g.west = r;
  }

  const q = searchQuery.toLowerCase().trim();

  return Array.from(groups.entries())
    .map(([key, { east, west }]) => {
      const sample = east || west;
      const rank = sample?.rank ?? "unknown";
      const rankNumber = sample?.rankNumber ?? 1;
      const isSanyaku = ["yokozuna", "ozeki", "sekiwake", "komusubi"].includes(rank);
      const rankLabel = isSanyaku
        ? rank.charAt(0).toUpperCase() + rank.slice(1)
        : `${rank.charAt(0).toUpperCase() + rank.slice(1)} #${rankNumber}`;
      return { rankLabel, rankKey: key, east, west, _tier: RANK_TIER[rank] ?? 99, _num: rankNumber };
    })
    .filter(row => {
      if (!q) return true;
      const eastMatch = row.east?.shikona?.toLowerCase().includes(q) || row.east?.name?.toLowerCase().includes(q);
      const westMatch = row.west?.shikona?.toLowerCase().includes(q) || row.west?.name?.toLowerCase().includes(q);
      return eastMatch || westMatch;
    })
    .sort((a, b) => a._tier - b._tier || a._num - b._num);
}

function buildPrevRankMap(history: { nextBanzuke?: BanzukeSnapshot }[]): Map<string, { rank: string; rankNumber?: number; side?: string; score: number }> {
  const map = new Map<string, { rank: string; rankNumber?: number; side?: string; score: number }>();
  for (let i = history.length - 1; i >= 0; i--) {
    const banzuke = history[i].nextBanzuke;
    if (!banzuke) continue;
    for (const div of Object.values(banzuke.divisions)) {
      for (const assignment of div.assignments) {
        const pos = assignment.position;
        map.set(assignment.rikishiId, {
          rank: pos.rank,
          rankNumber: (pos as any).rankNumber,
          side: pos.side,
          score: rankScore(pos.rank, (pos as any).rankNumber, pos.side),
        });
      }
    }
    break;
  }
  return map;
}

// ── Components ──

function RankChangeIndicator({ rikishiId, currentRank, currentRankNumber, currentSide, prevRankMap }: {
  rikishiId: string;
  currentRank: string;
  currentRankNumber?: number;
  currentSide?: string;
  prevRankMap: Map<string, { rank: string; rankNumber?: number; side?: string; score: number }>;
}) {
  const prev = prevRankMap.get(rikishiId);
  if (!prev) {
    return (
      <Badge variant="outline" className="text-[8px] h-4 px-1 border-primary/40 text-primary gap-0.5">
        <ArrowUpRight className="h-2.5 w-2.5" /> NEW
      </Badge>
    );
  }

  const currScore = rankScore(currentRank, currentRankNumber, currentSide);
  const diff = prev.score - currScore;

  if (Math.abs(diff) < 1) {
    return <Minus className="h-3 w-3 text-muted-foreground/40" />;
  }

  const steps = Math.round(Math.abs(diff) / 2);

  if (diff > 0) {
    const Icon = steps >= 5 ? ChevronsUp : ArrowUp;
    return (
      <span className="flex items-center gap-0.5 text-emerald-500">
        <Icon className="h-3 w-3" />
        <span className="text-[9px] font-mono font-bold">+{steps}</span>
      </span>
    );
  } else {
    const Icon = steps >= 5 ? ChevronsDown : ArrowDown;
    return (
      <span className="flex items-center gap-0.5 text-destructive">
        <Icon className="h-3 w-3" />
        <span className="text-[9px] font-mono font-bold">−{steps}</span>
      </span>
    );
  }
}

function RikishiCell({
  r, kadobanMap, heyaName, showChanges, prevRankMap, searchQuery,
}: {
  r: Rikishi | null;
  kadobanMap: OzekiKadobanMap;
  heyaName?: string;
  showChanges: boolean;
  prevRankMap: Map<string, { rank: string; rankNumber?: number; side?: string; score: number }>;
  searchQuery: string;
}) {
  if (!r) return <td className="p-3 text-muted-foreground/40 text-center">—</td>;

  const q = searchQuery.toLowerCase().trim();
  const isMatch = q && (r.shikona?.toLowerCase().includes(q) || r.name?.toLowerCase().includes(q));
  const wins = r.currentBashoRecord?.wins ?? r.currentBashoWins ?? 0;
  const losses = r.currentBashoRecord?.losses ?? r.currentBashoLosses ?? 0;

  return (
    <td className={`p-3 ${isMatch ? "bg-primary/10" : ""}`}>
      <div className="flex items-center gap-2">
        <ClickableName id={r.id} name={r.shikona} type="rikishi" className="font-bold text-sm" />
        <span className="text-[10px] font-mono text-muted-foreground">{wins}-{losses}</span>
        <span className="text-[11px] text-muted-foreground hidden lg:inline">{heyaName}</span>
        {showChanges && (
          <RankChangeIndicator
            rikishiId={r.id}
            currentRank={r.rank}
            currentRankNumber={r.rankNumber}
            currentSide={r.side}
            prevRankMap={prevRankMap}
          />
        )}
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

// ── Page ──

export default function BanzukePage() {
  const { state } = useGame();
  const world = state.world;
  const [showChanges, setShowChanges] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const prevRankMap = useMemo(() => {
    if (!world) return new Map();
    return buildPrevRankMap(world.history);
  }, [world]);

  if (!world) return null;

  const kadobanMap: OzekiKadobanMap = world.ozekiKadoban ?? {};
  const rikishiList = Array.from(world.rikishi.values()).filter(r => !r.isRetired);
  const hasPrevBasho = prevRankMap.size > 0;

  const divisions: Division[] = ["makuuchi", "juryo", "makushita", "sandanme", "jonidan", "jonokuchi"];

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
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-muted-foreground">
            {world.year} {world.currentBashoName?.toUpperCase() || "UPCOMING"} Rankings
          </p>
          <div className="flex items-center gap-3">
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
                <Label htmlFor="show-changes" className="text-xs text-muted-foreground cursor-pointer">
                  Changes
                </Label>
              </div>
            )}
          </div>
        </div>

        {hasPrevBasho && showChanges && (
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground border border-border/50 rounded-md px-3 py-1.5 bg-muted/20 w-fit">
            <span className="flex items-center gap-1 text-emerald-500"><ArrowUp className="h-3 w-3" /> Promoted</span>
            <span className="flex items-center gap-1 text-destructive"><ArrowDown className="h-3 w-3" /> Demoted</span>
            <span className="flex items-center gap-1 text-muted-foreground"><Minus className="h-3 w-3" /> Unchanged</span>
            <span className="flex items-center gap-1 text-primary"><ArrowUpRight className="h-2.5 w-2.5" /> New entry</span>
          </div>
        )}

        <Tabs defaultValue="makuuchi" className="w-full">
          <TabsList>
            {divisions.map(d => (
              <TabsTrigger key={d} value={d} className="capitalize">{d}</TabsTrigger>
            ))}
          </TabsList>
          
          {divisions.map(div => {
            const rows = buildRankRows(rikishiList, div, searchQuery);
            return (
              <TabsContent key={div} value={div}>
                <Card>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0 z-10">
                          <tr className="text-left border-b">
                            <th className="p-3 font-medium text-right w-[240px]">East</th>
                            <th className="p-3 font-medium text-center w-[120px]">Rank</th>
                            <th className="p-3 font-medium w-[240px]">West</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => (
                            <tr key={row.rankKey} className="border-b hover:bg-muted/50 transition-colors">
                              <RikishiCell
                                r={row.east}
                                kadobanMap={kadobanMap}
                                heyaName={row.east ? world.heyas.get(row.east.heyaId)?.name : undefined}
                                showChanges={showChanges && hasPrevBasho}
                                prevRankMap={prevRankMap}
                                searchQuery={searchQuery}
                              />
                              <td className="p-3 font-mono text-muted-foreground text-center text-xs">
                                {row.rankLabel}
                              </td>
                              <RikishiCell
                                r={row.west}
                                kadobanMap={kadobanMap}
                                heyaName={row.west ? world.heyas.get(row.west.heyaId)?.name : undefined}
                                showChanges={showChanges && hasPrevBasho}
                                prevRankMap={prevRankMap}
                                searchQuery={searchQuery}
                              />
                            </tr>
                          ))}
                          {rows.length === 0 && (
                            <tr>
                              <td colSpan={3} className="p-8 text-center text-muted-foreground">
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

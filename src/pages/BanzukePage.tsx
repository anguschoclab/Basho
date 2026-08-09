import { memo, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/useGame";
import { TOURNAMENT_TABS } from "@/constants/ui/navigation";
import { Card, CardContent } from "@/components/ui/card";
import type { Division } from "@/engine/types/banzuke";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUp, ArrowDown, Minus, ArrowUpRight, Search, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { projectBanzukeUIDigest, projectPressConferenceData } from "@/presenters/uiDigest";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { PressConference } from "@/components/game/PressConference";
import { PageHeader } from "@/components/layout/control-center";
import { BanzukePyramid } from "@/components/charts/BanzukePyramid";
import { RikishiCell } from "@/components/banzuke/RikishiCell";
import { YokozunaTrajectory } from "@/components/banzuke/YokozunaTrajectory";
import { getYokozunaCandidates } from "@/presenters/projections/promotionProjections";
import type { UIRankRow } from "@/presenters/banzukeUI";
import { getPlayerHeya, updateHeyaInWorld } from "@/presenters/engineAccess";
import { SortMenu } from "@/components/ui/SortMenu";
import { compareBy, type SortDirection } from "@/lib/sortUtils";

const DIVISION_KEYS: Division[] = [
  "makuuchi",
  "juryo",
  "makushita",
  "sandanme",
  "jonidan",
  "jonokuchi",
];

const BANZUKE_SORT_OPTIONS = [
  { key: "rank", label: "Rank" },
  { key: "shikona", label: "Shikona" },
];

const banzukeAccessor: Record<string, (r: UIRankRow) => string | number | undefined> = {
  rank: (r) => r.rankKey,
  shikona: (r) => r.east?.shikona ?? r.west?.shikona ?? "",
};

/** banzuke page. */
export default function BanzukePage() {
  const { state, updateWorld } = useGame();
  const world = state.world;
  const [showChanges, setShowChanges] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPressConference, setShowPressConference] = useState(false);
  const [sortKey, setSortKey] = useState<string>("rank");
  const [sortOrder, setSortOrder] = useState<SortDirection>("asc");

  // Check if Media Day is active (D1)
  const isMediaDay = useMemo(() => {
    if (!world || world.cyclePhase !== "pre_basho") return false;
    // Look for the press conference event in recent logs
    return world.events?.log?.some((e) => e.tags?.includes("press_conference")) ?? false;
  }, [world]);

  const pressData = useMemo(() => {
    if (!world || !isMediaDay) return null;
    return projectPressConferenceData(world);
  }, [world, isMediaDay]);

  const banzukeDigest = useMemo(() => {
    if (!world) return null;
    return projectBanzukeUIDigest(world);
  }, [world]);

  const pyramidData = useMemo(() => {
    if (!banzukeDigest) return [];
    const counts: Record<string, number> = {
      Yokozuna: 0,
      Ozeki: 0,
      Sekiwake: 0,
      Komusubi: 0,
      "Maegashira 1-8": 0,
      "Maegashira 9-15": 0,
      Juryo: banzukeDigest.divisionCounts["juryo"] ?? 0,
      Makushita: banzukeDigest.divisionCounts["makushita"] ?? 0,
    };
    const makuuchi = banzukeDigest.divisionMap.get("makuuchi");
    if (makuuchi) {
      for (const row of makuuchi.rows) {
        const sample = row.east ?? row.west;
        if (!sample) continue;
        const rank = sample.rank;
        const num = sample.rankNumber ?? 0;
        const inc = (row.east ? 1 : 0) + (row.west ? 1 : 0);
        if (rank === "yokozuna") counts.Yokozuna += inc;
        else if (rank === "ozeki") counts.Ozeki += inc;
        else if (rank === "sekiwake") counts.Sekiwake += inc;
        else if (rank === "komusubi") counts.Komusubi += inc;
        else if (rank === "maegashira" && num <= 8) counts["Maegashira 1-8"] += inc;
        else if (rank === "maegashira" && num > 8) counts["Maegashira 9-15"] += inc;
      }
    }
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([rank, count]) => ({ rank, count }));
  }, [banzukeDigest]);

  const yokozunaCandidates = useMemo(() => (world ? getYokozunaCandidates(world) : []), [world]);

  const normalizedSearchQuery = useMemo(() => searchQuery.toLowerCase().trim(), [searchQuery]);

  const filteredRowsByDivision = useMemo(() => {
    if (!banzukeDigest) return new Map<string, UIRankRow[]>();
    const map = new Map<string, UIRankRow[]>();
    for (const div of DIVISION_KEYS) {
      const divData = banzukeDigest.divisionMap.get(div);
      let rows = divData?.rows ?? [];
      if (normalizedSearchQuery) {
        rows = rows.filter(
          (r: UIRankRow) =>
            r.east?.shikona?.toLowerCase().includes(normalizedSearchQuery) ||
            r.west?.shikona?.toLowerCase().includes(normalizedSearchQuery)
        );
      }
      const fn = banzukeAccessor[sortKey];
      if (fn && sortKey !== "rank") {
        rows = [...rows].sort((a, b) => compareBy(a, b, fn, sortOrder));
      }
      map.set(div, rows);
    }
    return map;
  }, [banzukeDigest, normalizedSearchQuery, sortKey, sortOrder]);

  if (!world || !banzukeDigest) return null;

  const handlePressConferenceClose = (effects: {
    reputation: number;
    morale: number;
    mediaHeat: number;
  }) => {
    setShowPressConference(false);
    // Apply effects to world via game context (similar to RecapPage)
    if (world.playerHeyaId) {
      const heya = getPlayerHeya(world);
      if (heya) {
        const newReputation = Math.max(
          0,
          Math.min(100, (heya.reputation ?? 50) + effects.reputation)
        );
        updateWorld(updateHeyaInWorld(world, world.playerHeyaId, { reputation: newReputation }));
      }
    }
  };

  const { kadobanMap, heyaNameMap, hasPrevBasho } = banzukeDigest;

  return (
    <AppLayout pageTitle="Official Banzuke" subNavTabs={TOURNAMENT_TABS} activeSubTab="banzuke">
      <Helmet>
        <title>Official Banzuke — Rankings | Basho</title>
      </Helmet>
      {/* Media Day Trigger (D1) */}
      {isMediaDay && !showPressConference && (
        <div className="mb-6 bg-gradient-to-r from-gold/10 to-west/10 border border-gold/30 rounded p-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="space-y-1 text-center md:text-left">
            <h2 className="text-xl font-display font-bold uppercase tracking-tight flex items-center gap-3 sumi-e-ink">
              <span className="h-2 w-2 rounded-sm bg-gold animate-pulse" />
              Media Day
            </h2>
            <p className="text-sm text-muted-foreground font-body">
              The press has arrived. Address the journalists' questions before the basho starts.
            </p>
          </div>
          <Button
            onClick={() => setShowPressConference(true)}
            size="lg"
            variant="primary-gradient"
            className="gap-2"
          >
            Begin Press Conference
          </Button>
        </div>
      )}

      {showPressConference && (
        <PressConference
          phase="pre_basho"
          pressData={pressData}
          open={showPressConference}
          onClose={handlePressConferenceClose}
        />
      )}

      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <PageHeader
          eyebrow="── TOURNAMENT · BANZUKE ──"
          title="Official Rankings"
          lede={`${world.year} ${world.currentBashoName ?? "Upcoming"} · ${banzukeDigest.totalWrestlerCount} wrestlers listed`}
        />

        {/* Pyramid + controls row */}
        <div className="flex items-start gap-4 flex-wrap">
          <div className="min-w-[200px]">
            <BanzukePyramid data={pyramidData} />
          </div>
          <div className="flex flex-col gap-3 flex-1">
            <div className="flex items-center gap-3">
              {/* Player stable legend */}
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase text-gold border border-gold/30 rounded px-2 py-1 bg-gold/5 tracking-wider">
                <span className="h-1.5 w-1.5 rounded-sm bg-gold" />
                Your Stable
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search wrestler…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                  <TooltipWrap
                    content="Toggle rank movement indicators relative to the previous tournament"
                    side="top"
                  >
                    <div className="flex items-center gap-2">
                      <Switch
                        id="show-changes"
                        checked={showChanges}
                        onCheckedChange={setShowChanges}
                      />
                      <Label
                        htmlFor="show-changes"
                        className="text-xs text-muted-foreground cursor-pointer"
                      >
                        Changes
                      </Label>
                    </div>
                  </TooltipWrap>
                </div>
              )}
              <SortMenu
                options={BANZUKE_SORT_OPTIONS}
                storageKey="basho_sort_banzuke"
                defaultSortKey="rank"
                defaultSortOrder="asc"
                onSortChange={(key, order) => {
                  setSortKey(key);
                  setSortOrder(order);
                }}
              />
            </div>
          </div>
        </div>

        {/* Legend */}
        {hasPrevBasho && showChanges && (
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground border border-border/50 rounded-md px-3 py-1.5 bg-muted/20 w-fit">
            <span className="flex items-center gap-1 text-success">
              <ArrowUp className="h-3 w-3" /> Promoted
            </span>
            <span className="flex items-center gap-1 text-destructive">
              <ArrowDown className="h-3 w-3" /> Demoted
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Minus className="h-3 w-3" /> Unchanged
            </span>
            <span className="flex items-center gap-1 text-primary">
              <ArrowUpRight className="h-2.5 w-2.5" /> New entry
            </span>
          </div>
        )}

        {/* Division tabs */}
        <Tabs defaultValue="makuuchi" className="w-full">
          <TabsList className="bg-muted/50">
            {DIVISION_KEYS.map((d) => (
              <TooltipWrap key={d} content={`View ${d} division rankings`} side="bottom">
                <TabsTrigger value={d} className="capitalize font-display text-xs gap-1">
                  {d}
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ({banzukeDigest.divisionCounts[d] ?? 0})
                  </span>
                </TabsTrigger>
              </TooltipWrap>
            ))}
          </TabsList>

          {DIVISION_KEYS.map((div) => (
            <TabsContent key={div} value={div}>
              <DivisionTable
                div={div}
                rows={filteredRowsByDivision.get(div) ?? []}
                kadobanMap={kadobanMap}
                heyaNameMap={heyaNameMap}
                showChanges={showChanges && hasPrevBasho}
                searchQuery={searchQuery}
              />
            </TabsContent>
          ))}
        </Tabs>

        {/* Yokozuna Promotion Watch */}
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="font-display font-bold uppercase tracking-tight text-sm text-muted-foreground">
              Yokozuna Promotion Watch
            </h2>
            <span className="h-px flex-1 bg-border/40" />
            <span className="text-[10px] font-mono text-gold/70 uppercase tracking-wider">
              横綱
            </span>
          </div>
          <YokozunaTrajectory candidates={yokozunaCandidates} />
        </section>
      </div>
    </AppLayout>
  );
}

interface DivisionTableProps {
  div: string;
  rows: UIRankRow[];
  kadobanMap: Record<string, { isKadoban: boolean }>;
  heyaNameMap: Map<string, string>;
  showChanges: boolean;
  searchQuery: string;
}

const DivisionTable = memo(function DivisionTable({
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
                  <td colSpan={3} className="p-8 text-center text-muted-foreground font-display">
                    {searchQuery
                      ? "No wrestlers match your search"
                      : "No wrestlers in this division"}
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

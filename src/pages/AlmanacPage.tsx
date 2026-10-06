import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { RECORDS_TABS } from "@/constants/ui/navigation";
import { useGame } from "@/contexts/useGame";
import {
  selectAllTimeKimaritePercentages,
  selectKimaritePercentages,
} from "@/presenters/selectors";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RecordEntry } from "@/engine/types/records";
import type { BashoResult } from "@/engine/types/basho";
import {
  Medal,
  Star,
  TrendingUp,
  Trophy,
  Users,
  History,
  Award,
  Gavel,
  Swords,
} from "lucide-react";
import { PageHeader } from "@/components/layout/control-center";
import { getAllRikishi, getRikishi, getHistory } from "@/presenters/worldAccess";
import { selectLatestKinboshiDates } from "@/presenters/projections/kinboshiLedger";
import { projectOfficials } from "@/presenters/officialsProjections";
import { OfficialsPanel } from "@/components/officials/OfficialsPanel";

/** Leaderboard widget for record book displays. */
function LeaderboardWidget({
  title,
  entries,
  icon: Icon,
  colorClass = "text-primary",
}: {
  title: string;
  entries: RecordEntry[];
  icon: ComponentType<{ className?: string }>;
  colorClass?: string;
}) {
  return (
    <Card className="paper h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`h-5 w-5 ${colorClass}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {entries.length === 0 ? (
            <p className="text-muted-foreground text-center py-6 text-sm">No records yet</p>
          ) : (
            entries.map((entry, idx) => (
              <Link
                key={`${entry.rikishiId}-${idx}`}
                to="/rikishi/$rikishiId"
                params={{ rikishiId: entry.rikishiId }}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/50 transition-colors text-sm"
              >
                <span
                  className={`w-5 text-center font-bold ${idx < 3 ? colorClass : "text-muted-foreground"}`}
                >
                  {idx + 1}
                </span>
                <span className="flex-1 font-display truncate">{entry.shikona}</span>
                <div className="text-right">
                  <Badge variant="outline" className="font-mono text-xs tabular-nums">
                    {entry.value}
                  </Badge>
                  {entry.achievedDate && (
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {entry.achievedDate.year}.{entry.achievedDate.month}
                    </div>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AlmanacPage() {
  const { state } = useGame();
  const { world } = state;

  const [activeTab, setActiveTab] = useState("past-bashos");
  const [statsScope, setStatsScope] = useState<"era" | "alltime">("era");

  // Real recorded-ending totals per scope — shown on the toggle so the counts
  // behind each view are visible before switching.
  const eraEndings = Object.values(world?.globalKimariteStats ?? {}).reduce((a, b) => a + b, 0);
  const allTimeEndings = Object.values(world?.allTimeKimariteStats ?? {}).reduce(
    (a, b) => a + b,
    0
  );

  const kimariteStats = useMemo(
    () =>
      world
        ? statsScope === "alltime"
          ? selectAllTimeKimaritePercentages(world)
          : selectKimaritePercentages(world)
        : [],
    [world, statsScope]
  );
  // Use getHistory(world).length for the count — it reflects the total number
  // of completed bashos (capped at 500), which is what the "Past Bashos" tab
  // actually displays. world.almanacSnapshots is bounded to 6 (hot-state
  // window); older snapshots are in cold storage (OPFS) but not counted here.
  const history = world ? getHistory(world) : [];
  const snapshotCount = history.length;
  // Hot-state almanac window (most recent 6). Older snapshots live in OPFS.
  const hotSnapshotWindow = world?.almanacSnapshots?.length ?? 0;
  const topKimarite = kimariteStats.slice(0, 5);

  // Compute giant slayers data before any early returns
  const giantSlayers = useMemo(() => {
    if (!world) return [];
    const results: ReturnType<
      typeof Array.from<{
        rikishiId: string;
        shikona: string;
        value: number;
        details: string;
        achievedDate?: { year: number; month: number };
      }>
    > = [];
    const kinboshiDates = selectLatestKinboshiDates(world);
    for (const r of getAllRikishi(world)) {
      const value =
        (r.stats?.achievements?.kinboshiEarned ?? 0) + (r.stats?.achievements?.ginboshiEarned ?? 0);
      if (value > 0) {
        results.push({
          rikishiId: r.id,
          shikona: r.shikona,
          value,
          details: `K: ${r.stats?.achievements?.kinboshiEarned ?? 0} | G: ${r.stats?.achievements?.ginboshiEarned ?? 0}`,
          // The awardLog kinboshi ledger records when each star was earned —
          // show the most recent one; ginboshi earns no official record.
          achievedDate: kinboshiDates.get(r.id),
        });
      }
    }
    return results.sort((a, b) => b.value - a.value).slice(0, 5);
  }, [world]);

  if (!world) {
    return (
      <AppLayout pageTitle="Almanac" subNavTabs={RECORDS_TABS} activeSubTab="almanac">
        <Card className="paper py-12 text-center">
          <CardHeader>
            <CardTitle>Almanac unavailable</CardTitle>
            <CardDescription>The world state is not loaded yet.</CardDescription>
          </CardHeader>
        </Card>
      </AppLayout>
    );
  }

  const records = world.records || {
    allTime: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
    active: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
  };

  return (
    <AppLayout pageTitle="Almanac" subNavTabs={RECORDS_TABS} activeSubTab="almanac">
      <title>Almanac - The Memory of the World</title>

      <div className="space-y-6">
        <PageHeader
          eyebrow="── RECORDS ──"
          title="力士名鑑"
          lede="The living memory of the dohyo — records, dynasties, and statistics."
        />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">The authoritative history of the Sumo world.</p>
            <p className="text-xs text-muted-foreground mt-1">
              {snapshotCount} bashos recorded · {hotSnapshotWindow} in hot window ·{" "}
              {kimariteStats.length} kimarite recorded
            </p>
            {topKimarite.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Top technique: {topKimarite[0].name} ({topKimarite[0].count} recorded,{" "}
                {topKimarite[0].observedPct.toFixed(1)}% observed vs{" "}
                {topKimarite[0].realWorldPct.toFixed(1)}% expected)
              </p>
            )}
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2 bg-secondary/50">
            Year {world.year}
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-5">
            <TabsTrigger value="past-bashos" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Past Bashos
            </TabsTrigger>
            <TabsTrigger value="records" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Record Book
            </TabsTrigger>
            <TabsTrigger value="techniques" className="flex items-center gap-2">
              <Swords className="h-4 w-4" />
              Techniques
            </TabsTrigger>
            <TabsTrigger value="hof" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Hall of Fame
            </TabsTrigger>
            <TabsTrigger value="officials" className="flex items-center gap-2">
              <Gavel className="h-4 w-4" />
              Officials
            </TabsTrigger>
          </TabsList>

          <TabsContent value="past-bashos">
            <div className="grid gap-6">
              {getHistory(world).length === 0 ? (
                <Card className="paper py-12 text-center">
                  <p className="text-muted-foreground">
                    No tournaments have been completed yet in this world.
                  </p>
                </Card>
              ) : (
                [...getHistory(world)].reverse().map((basho: BashoResult, idx) => (
                  <Card key={idx} className="paper overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-secondary/20">
                      <div>
                        <h3 className="font-bold text-lg capitalize">
                          {basho.bashoName} {basho.year}
                        </h3>
                        <p className="text-xs text-muted-foreground">Tournament Snapshot</p>
                      </div>
                      <Trophy className="h-6 w-6 text-gold" />
                    </div>
                    <CardContent className="p-4 grid md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs uppercase text-muted-foreground font-semibold">
                          Yūshō Winner
                        </p>
                        <p className="font-display font-bold text-lg">
                          {getRikishi(world, basho.yusho)?.shikona ?? basho.yusho ?? "Reserved"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs uppercase text-muted-foreground font-semibold">
                          Attendance
                        </p>
                        <p className="font-mono text-lg">Full House</p>
                      </div>
                      <div className="text-right">
                        <Link
                          to="/basho"
                          className="text-primary hover:underline text-sm font-semibold"
                        >
                          View Full Results →
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="records" className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Star className="h-6 w-6 text-gold" />
                All-Time Records
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <LeaderboardWidget
                  title="Total Wins"
                  entries={records.allTime.careerWins}
                  icon={TrendingUp}
                  colorClass="text-success"
                />
                <LeaderboardWidget
                  title="Makuuchi Wins"
                  entries={records.allTime.makuuchiWins}
                  icon={Users}
                  colorClass="text-west"
                />
                <LeaderboardWidget
                  title="Yūshō Count"
                  entries={records.allTime.yusho}
                  icon={Trophy}
                  colorClass="text-gold"
                />
                <LeaderboardWidget
                  title="Consecutive Yūshō"
                  entries={records.allTime.consecutiveYusho}
                  icon={Star}
                  colorClass="text-purple-400"
                />
                <LeaderboardWidget
                  title="Giant Slayers"
                  entries={giantSlayers}
                  icon={Medal}
                  colorClass="text-gold"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-success" />
                Active Leaders
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <LeaderboardWidget
                  title="Total Wins"
                  entries={records.active.careerWins}
                  icon={TrendingUp}
                  colorClass="text-success"
                />
                <LeaderboardWidget
                  title="Makuuchi Wins"
                  entries={records.active.makuuchiWins}
                  icon={Users}
                  colorClass="text-west"
                />
                <LeaderboardWidget
                  title="Yūshō Count"
                  entries={records.active.yusho}
                  icon={Trophy}
                  colorClass="text-gold"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="techniques">
            <Card className="paper">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <Swords className="h-5 w-5 text-primary" />
                    Winning Techniques
                  </CardTitle>
                  <div className="flex rounded-md border border-border overflow-hidden">
                    {(["era", "alltime"] as const).map((scope) => {
                      const endings = scope === "era" ? eraEndings : allTimeEndings;
                      return (
                        <button
                          key={scope}
                          type="button"
                          onClick={() => setStatsScope(scope)}
                          className={`px-3 py-1 text-xs font-medium transition-colors ${
                            statsScope === scope
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {scope === "era" ? "This era" : "All time"} · {endings.toLocaleString()}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <CardDescription>
                  {statsScope === "era"
                    ? "Observed share of bout endings this era (resets each year) against the real-world makuuchi reference."
                    : "Observed share of bout endings across the entire save history against the real-world makuuchi reference."}{" "}
                  Observed percentages are computed from recorded results; expected values are
                  all-time professional statistics.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {kimariteStats.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6 text-sm">
                    {statsScope === "era"
                      ? "No bouts have been recorded yet this era."
                      : "No bouts have been recorded yet."}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                          <th className="py-2 pr-3 font-semibold">Technique</th>
                          <th className="py-2 pr-3 font-semibold text-right">Count</th>
                          <th className="py-2 pr-3 font-semibold text-right">Observed %</th>
                          <th className="py-2 pr-3 font-semibold text-right">Expected %</th>
                          <th className="py-2 font-semibold text-right">Rarity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kimariteStats.map((row) => (
                          <tr key={row.kimarite} className="border-b last:border-0">
                            <td className="py-1.5 pr-3 font-display">{row.name}</td>
                            <td className="py-1.5 pr-3 text-right font-mono tabular-nums">
                              {row.count}
                            </td>
                            <td className="py-1.5 pr-3 text-right font-mono tabular-nums">
                              {row.count > 0 ? `${row.observedPct.toFixed(2)}%` : "—"}
                            </td>
                            <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-muted-foreground">
                              {row.realWorldPct > 0 ? `${row.realWorldPct.toFixed(2)}%` : "—"}
                            </td>
                            <td className="py-1.5 text-right">
                              <Badge
                                variant="outline"
                                className={
                                  row.rarity === "legendary"
                                    ? "border-purple-400 text-purple-400"
                                    : row.rarity === "rare"
                                      ? "border-west text-west"
                                      : "text-muted-foreground"
                                }
                              >
                                {row.rarity}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hof">
            <Card className="paper py-12 text-center border-dashed">
              <div className="flex flex-col items-center gap-4">
                <Award className="h-16 w-16 text-gold/50" />
                <div>
                  <h3 className="text-xl font-bold">The Hall of Fame</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mt-2">
                    Reserved for the greatest legends of Sumo history. Wrestlers become eligible
                    after retiring with exceptional achievements.
                  </p>
                </div>
                <Badge variant="secondary" className="mt-4">
                  Expansion in Progress
                </Badge>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="officials">
            <div data-testid="officials-tab">
              <OfficialsPanel projection={projectOfficials(world)} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

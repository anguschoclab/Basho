import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { RECORDS_TABS } from "@/constants/ui/navigation";
import { useGame } from "@/contexts/useGame";
import { selectRetiredRikishi } from "@/presenters/selectors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/control-center";
import { Trophy, Building2, ScrollText, Crown, AlertCircle, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Rikishi, Heya } from "@/presenters/uiDigest";
import type { RetiredRikishiSummary } from "@/engine/types/history";
import type { RecordEntry, WorldRecords } from "@/engine/types/records";
import { getAllHeyas } from "@/presenters/worldAccess";
import { SortMenu } from "@/components/ui/SortMenu";
import { compareBy, type SortDirection } from "@/lib/sortUtils";
import { RANK_HIERARCHY } from "@/presenters/uiDigest";
import type { WorldState } from "@/presenters/uiDigest";
import type { Rank } from "@/engine/types/banzuke";
import { selectCohortSummaries } from "@/presenters/projections/historyCohortProjections";

/**
 * HistoryDashboard - The Museum of Sumo
 * =====================================
 * A premium archival UI for exploring the 100+ years of simulation history.
 * Integrated into the Records section with Kokugikan Noir design system.
 */
export const HistoryDashboard = () => {
  const { state } = useGame();
  const world = state.world;
  const [activeTab, setActiveTab] = useState("records");

  if (!world) {
    return (
      <AppLayout pageTitle="Museum" subNavTabs={RECORDS_TABS} activeSubTab="museum">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <EmptyState
            icon={AlertCircle}
            title="Museum Unavailable"
            description="No world loaded. Start a game to explore the archives."
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Museum" subNavTabs={RECORDS_TABS} activeSubTab="museum">
      <div className="space-y-6">
        <PageHeader
          eyebrow="── ARCHIVES ──"
          title="Museum of Sumo"
          lede="Preserving the legacy of the Dohyo — records, stables, and the history of the world."
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="records" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Records
            </TabsTrigger>
            <TabsTrigger value="stables" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Stables
            </TabsTrigger>
            <TabsTrigger value="cohorts" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Cohorts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="records">
            <RecordsTab records={world.records} />
          </TabsContent>

          <TabsContent value="stables">
            <StablesTab heyas={getAllHeyas(world)} retired={selectRetiredRikishi(world)} />
          </TabsContent>

          <TabsContent value="cohorts">
            <CohortsTab world={world} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

function LeaderboardCard({
  title,
  entries,
  icon: Icon,
}: {
  title: string;
  entries: RecordEntry[];
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="paper h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-display">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {entries.length === 0 ? (
            <EmptyState title="No records yet recorded..." compact />
          ) : (
            entries.slice(0, 5).map((entry, idx) => (
              <div
                key={`${entry.rikishiId}-${idx}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/50 transition-colors text-sm"
              >
                <span
                  className={`w-5 text-center font-bold font-mono ${
                    idx < 3 ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="flex-1 font-display truncate">{entry.shikona}</span>
                <Badge variant="outline" className="font-mono text-xs tabular-nums">
                  {entry.value}
                </Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const RecordsTab = ({ records }: { records?: WorldRecords }) => {
  const r = records || {
    allTime: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
  };

  const categories = [
    { label: "All-Time Wins", data: r.allTime.careerWins, icon: Crown },
    { label: "Top Division Yusho", data: r.allTime.yusho, icon: Trophy },
    { label: "Consecutive Wins", data: r.allTime.consecutiveYusho, icon: ScrollText },
    { label: "Kinboshi Collectors", data: r.allTime.kinboshi, icon: Trophy },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {categories.map((cat) => (
        <LeaderboardCard
          key={cat.label}
          title={cat.label}
          entries={cat.data || []}
          icon={cat.icon}
        />
      ))}
    </div>
  );
};

interface LineageTenure {
  generation: number;
  name: string;
  startYear: number;
  endYear?: number;
  achievements?: {
    sekitoriCount?: number;
    titlesWon?: number;
  };
}

const RETIRED_SORT_OPTIONS = [
  { key: "name", label: "Name" },
  { key: "rank", label: "Rank" },
];

type RetiredEntry = Rikishi | RetiredRikishiSummary;

function isSummaryEntry(entry: RetiredEntry): entry is RetiredRikishiSummary {
  return (entry as RetiredRikishiSummary).isSummary === true;
}

const retiredAccessor: Record<string, (r: RetiredEntry) => string | number | undefined> = {
  name: (r) => r.shikona,
  // Summaries expose peakRank; full Rikishi expose rank (current rank at retirement).
  rank: (r) => {
    if (isSummaryEntry(r)) {
      return RANK_HIERARCHY[r.peakRank as Rank]?.tier ?? 99;
    }
    return RANK_HIERARCHY[r.rank as Rank]?.tier ?? 99;
  },
};

const StablesTab = ({
  heyas,
  retired,
}: {
  heyas: Heya[];
  retired: Array<Rikishi | RetiredRikishiSummary>;
}) => {
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<SortDirection>("asc");

  const sortedRetired = useMemo(() => {
    const fn = retiredAccessor[sortKey];
    if (!fn) return retired;
    return [...retired].sort((a, b) => compareBy(a, b, fn, sortOrder));
  }, [retired, sortKey, sortOrder]);

  const heyasById = useMemo(() => {
    const map: Record<string, Heya> = {};
    for (const h of heyas) map[h.id] = h;
    return map;
  }, [heyas]);

  return (
    <div className="space-y-8">
      {/* Stables Ancestry */}
      <section className="space-y-6">
        <h2 className="text-xl font-display font-semibold border-b border-border pb-3">
          Stable Lineages
        </h2>
        <div className="space-y-6">
          {heyas.map((heya: Heya) => (
            <Card key={heya.id} className="paper border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="font-display text-xl">{heya.nameJa || heya.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {(heya.lineage || []).map((tenure: LineageTenure, idx: number) => (
                    <div
                      key={idx}
                      className="flex-shrink-0 w-56 bg-secondary/50 p-4 border border-border rounded-xs relative"
                    >
                      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary" />
                      <div className="text-muted-foreground text-[10px] uppercase tracking-wider font-mono mb-1">
                        Generation {tenure.generation}
                      </div>
                      <div className="text-lg font-display font-semibold mb-1">{tenure.name}</div>
                      <div className="text-sm text-muted-foreground font-mono mb-3">
                        {tenure.startYear} — {tenure.endYear || "Present"}
                      </div>
                      <div className="text-xs space-y-1 border-t border-border pt-2 font-mono">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sekitori:</span>
                          <span className="text-foreground">
                            {tenure.achievements?.sekitoriCount ?? 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Titles:</span>
                          <span className="text-foreground">
                            {tenure.achievements?.titlesWon ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Retired Legends */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-semibold border-b border-border pb-3">
            Retired Legends
          </h2>
          <SortMenu
            options={RETIRED_SORT_OPTIONS}
            storageKey="basho_sort_retired_legends"
            defaultSortKey="name"
            defaultSortOrder="asc"
            onSortChange={(key, order) => {
              setSortKey(key);
              setSortOrder(order);
            }}
          />
        </div>
        {sortedRetired.length === 0 ? (
          <EmptyState title="No retirements on record yet." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {sortedRetired.slice(0, 40).map((r: RetiredEntry) => {
              const heyaName = heyasById[r.heyaId]?.name || r.heyaId;
              const rankLabel = isSummaryEntry(r) ? r.peakRank : r.rank;
              return (
                <Card key={r.id} className="paper p-3 text-center">
                  <div className="font-display font-semibold text-sm mb-1">{r.shikona}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono mb-1">
                    {rankLabel || "—"}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">{heyaName}</div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

function CohortsTab({ world }: { world: WorldState }) {
  const cohorts = selectCohortSummaries(world);

  if (cohorts.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No Cohorts Available"
        description="Recruitment cohorts will appear here once rikishi have been recruited."
      />
    );
  }

  return (
    <div className="space-y-4" data-testid="cohorts-tab">
      <PageHeader
        eyebrow="── INTAKE CLASSES ──"
        title="Recruitment Cohorts"
        lede="Track recruit classes and their development trajectories over time."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {cohorts.map((c) => (
          <Card key={c.cohortId} data-testid={`cohort-${c.cohortId}`}>
            <CardHeader>
              <CardTitle className="text-sm font-mono">{c.cohortId}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">Members</div>
                  <div className="font-medium tabular-nums">{c.totalMembers}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Active</div>
                  <div className="font-medium tabular-nums">{c.activeMembers}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Sekitori</div>
                  <div className="font-medium tabular-nums">{c.sekitoriCount}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Yusho</div>
                  <div className="font-medium tabular-nums">{c.totalYusho}</div>
                </div>
              </div>
              {c.topProspects.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-border/30">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Top Prospects
                  </span>
                  {c.topProspects.map((p) => (
                    <div key={p.rikishiId} className="flex justify-between text-xs">
                      <span className={p.isRetired ? "text-muted-foreground line-through" : ""}>
                        {p.shikona}
                      </span>
                      <Badge variant="outline" className="text-[9px]">{p.rank}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

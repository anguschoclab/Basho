import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { RECORDS_TABS } from "@/constants/navigation";
import { useGame } from "@/contexts/GameContext";
import { selectRetiredRikishi } from "@/presenters/selectors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/control-center";
import { Trophy, Building2, ScrollText, Crown } from "lucide-react";
import type {
  WorldState,
  Rikishi,
  Heya,
  RecordEntry,
} from "@/presenters/uiDigest";

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
        <Card className="paper py-12 text-center">
          <CardHeader>
            <CardTitle className="font-display">Museum Unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground font-body">
              No world loaded. Start a game to explore the archives.
            </p>
          </CardContent>
        </Card>
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
          <TabsList className="grid w-full max-w-2xl grid-cols-2">
            <TabsTrigger value="records" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Records
            </TabsTrigger>
            <TabsTrigger value="stables" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Stables
            </TabsTrigger>
          </TabsList>

          <TabsContent value="records">
            <RecordsTab world={world} />
          </TabsContent>

          <TabsContent value="stables">
            <StablesTab world={world} />
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
            <p className="text-muted-foreground text-center py-6 text-sm font-body">
              No records yet recorded...
            </p>
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

const RecordsTab = ({ world }: { world: WorldState }) => {
  const records = world.records || {
    allTime: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
  };

  const categories = [
    { label: "All-Time Wins", data: records.allTime.careerWins, icon: Crown },
    { label: "Top Division Yusho", data: records.allTime.yusho, icon: Trophy },
    { label: "Consecutive Wins", data: records.allTime.consecutiveYusho, icon: ScrollText },
    { label: "Kinboshi Collectors", data: records.allTime.kinboshi, icon: Trophy },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {categories.map((cat) => (
        <LeaderboardCard key={cat.label} title={cat.label} entries={cat.data || []} icon={cat.icon} />
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

const StablesTab = ({ world }: { world: WorldState }) => {
  const activeStables = Array.from(world.heyas.values());
  const retired = selectRetiredRikishi(world);

  return (
    <div className="space-y-8">
      {/* Stables Ancestry */}
      <section className="space-y-6">
        <h2 className="text-xl font-display font-semibold border-b border-border pb-3">
          Stable Lineages
        </h2>
        <div className="space-y-6">
          {activeStables.map((heya: Heya) => (
            <Card key={heya.id} className="paper border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="font-display text-xl">{heya.nameJa || heya.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {(heya.lineage || []).map((tenure: LineageTenure, idx: number) => (
                    <div
                      key={idx}
                      className="flex-shrink-0 w-56 bg-secondary/50 p-4 border border-border rounded-sm relative"
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
                          <span className="text-foreground">{tenure.achievements?.sekitoriCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Titles:</span>
                          <span className="text-foreground">{tenure.achievements?.titlesWon || 0}</span>
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
        <h2 className="text-xl font-display font-semibold border-b border-border pb-3">
          Retired Legends
        </h2>
        {retired.length === 0 ? (
          <Card className="paper py-12 text-center">
            <p className="text-muted-foreground font-body">No retirements on record yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {retired.slice(0, 40).map((r: Rikishi) => {
              const heyaName = world.heyas?.get(r.heyaId)?.name || r.heyaId;
              return (
                <Card key={r.id} className="paper p-3 text-center">
                  <div className="font-display font-semibold text-sm mb-1">{r.shikona}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono mb-1">
                    {r.rank || "—"}
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


// HallOfFamePage.tsx — Dedicated Hall of Fame shrine
// Yearly inductees with portraits, career stats, and greatest fights

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppLayout } from "@/components/layout/AppLayout";
import { RECORDS_TABS } from "@/constants/ui/navigation";
import { PageHeader } from "@/components/layout/control-center";
import { useGame } from "@/contexts/useGame";
import { Card, CardContent } from "@/components/ui/card";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { RikishiName } from "@/components/ClickableName";
import { SortMenu } from "@/components/ui/SortMenu";
import { compareBy, type SortDirection } from "@/lib/sortUtils";
import {
  Trophy,
  Shield,
  Target,
  Award,
  Swords,
  Crown,
  TrendingUp,
  Star,
  Calendar,
} from "lucide-react";
import { HoFTimeline } from "@/components/game/HoFTimeline";
import type { HoFCategory } from "@/presenters/engineAccess";
import { HOF_CATEGORY_LABELS, projectHOFUIDigest } from "@/presenters/uiDigest";
import { getRikishi } from "@/presenters/worldAccess";
import { selectAwardLog } from "@/presenters/selectors";
import type { UIHofInductee } from "@/presenters/projections/hofProjection";
import type { UIRikishi } from "@/presenters/uiModels";

const CATEGORY_ICONS: Record<HoFCategory, React.ElementType> = {
  champion: Trophy,
  iron_man: Shield,
  technician: Target,
};

const CATEGORY_GRADIENT: Record<HoFCategory, string> = {
  champion: "from-gold/20 to-gold/5 border-gold/30",
  iron_man: "from-west/20 to-west/5 border-west/30",
  technician: "from-success/20 to-success/5 border-success/30",
};

const CATEGORY_ACCENT: Record<HoFCategory, string> = {
  champion: "text-gold",
  iron_man: "text-west",
  technician: "text-success",
};

const RANK_JA: Record<string, string> = {
  yokozuna: "横綱",
  ozeki: "大関",
  sekiwake: "関脇",
  komusubi: "小結",
  maegashira: "前頭",
  juryo: "十両",
  makushita: "幕下",
  sandanme: "三段目",
  jonidan: "序二段",
  jonokuchi: "序ノ口",
};

// === Portrait Avatar ===

function RikishiPortrait({
  rikishi,
  category,
}: {
  rikishi: UIRikishi | null;
  category: HoFCategory;
}) {
  const accent = CATEGORY_ACCENT[category];

  return (
    <SumoAvatar
      config={rikishi?.avatarConfig}
      size="lg"
      showHairstyle={true}
      fallback={rikishi?.shikona}
      expression={
        category === "champion" ? "confident" : category === "technician" ? "determined" : "neutral"
      }
      className={`border-2 ${accent}`}
    />
  );
}

// === Inductee Full Card ===

function InducteeFullCard({ inductee }: { inductee: UIHofInductee }) {
  const Icon = CATEGORY_ICONS[inductee.category as HoFCategory];
  const label = HOF_CATEGORY_LABELS[inductee.category as HoFCategory];
  const accent = CATEGORY_ACCENT[inductee.category as HoFCategory];
  const gradient = CATEGORY_GRADIENT[inductee.category as HoFCategory];
  const rikishi = inductee.rikishi;

  return (
    <Card className={`border bg-gradient-to-br ${gradient} overflow-hidden`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <RikishiPortrait rikishi={rikishi} category={inductee.category} />

          <div className="flex-1 min-w-0">
            {/* Name & Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <RikishiName
                id={inductee.rikishiId}
                name={inductee.shikona}
                className="font-display font-bold text-lg"
              />
              <Badge className={`gap-1 ${accent} border-current/30`}>
                <Icon className="h-3 w-3" />
                {label.icon} {label.name}
              </Badge>
            </div>

            {/* Metadata row */}
            <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
              {inductee.stats.highestRank && (
                <span className="flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  Peak:{" "}
                  <strong className="text-foreground">
                    {RANK_JA[inductee.stats.highestRank] ?? inductee.stats.highestRank}
                  </strong>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Inducted: <strong className="text-foreground">{inductee.inductionYear}</strong>
              </span>
              {inductee.heyaName && (
                <span>
                  Stable: <span className="text-xs font-medium">{inductee.heyaName}</span>
                </span>
              )}
            </div>

            {/* Career Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              {inductee.stats.yushoCount != null && (
                <StatBox
                  icon={Trophy}
                  label="Yūshō"
                  value={inductee.stats.yushoCount}
                  accent="text-gold"
                />
              )}
              {inductee.stats.consecutiveBasho != null && (
                <StatBox
                  icon={Shield}
                  label="Basho Streak"
                  value={inductee.stats.consecutiveBasho}
                  accent="text-west"
                />
              )}
              {inductee.stats.ginoShoCount != null && (
                <StatBox
                  icon={Target}
                  label="Ginō-shō"
                  value={inductee.stats.ginoShoCount}
                  accent="text-success"
                />
              )}
              {inductee.stats.careerWins != null && (
                <StatBox
                  icon={TrendingUp}
                  label="Career Record"
                  value={`${inductee.stats.careerWins}-${inductee.stats.careerLosses ?? 0}`}
                  accent="text-foreground"
                />
              )}
            </div>

            {/* Yūshō list for champions */}
            {inductee.category === "champion" && inductee.yushoList?.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wider">
                  Tournament Victories
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {inductee.yushoList.map((y, i) => (
                    <Badge key={i} className="text-[10px] capitalize">
                      {y.bashoName} {y.year}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Greatest Fights */}
            {inductee.greatestFights?.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wider flex items-center gap-1">
                  <Swords className="h-3 w-3" /> Notable Bouts
                </div>
                <div className="space-y-1">
                  {inductee.greatestFights.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-success">W</span>
                      <span className="text-muted-foreground">vs</span>
                      <span className="font-medium">{f.opponentName}</span>
                      <Badge className="text-[9px]">{f.kimarite}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="bg-background/50 rounded-md p-2 text-center">
      <Icon className={`h-3.5 w-3.5 mx-auto mb-0.5 ${accent}`} />
      <div className={`text-sm font-bold font-mono ${accent}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

const HOF_SORT_OPTIONS = [
  { key: "name", label: "Name" },
  { key: "year", label: "Year" },
  { key: "yusho", label: "Yusho" },
];

const hofAccessor: Record<string, (ind: UIHofInductee) => string | number | undefined> = {
  name: (ind) => ind.shikona,
  year: (ind) => ind.inductionYear,
  yusho: (ind) => ind.stats?.yushoCount ?? 0,
};

function sortInductees(
  inductees: UIHofInductee[],
  sortKey: string,
  sortOrder: SortDirection
): UIHofInductee[] {
  const fn = hofAccessor[sortKey];
  if (!fn) return inductees;
  return [...inductees].sort((a, b) => compareBy(a, b, fn, sortOrder));
}

// === Category Tab ===

function CategoryTab({
  category,
  inductees,
  sortKey,
  sortOrder,
}: {
  category: HoFCategory;
  inductees: UIHofInductee[];
  sortKey: string;
  sortOrder: SortDirection;
}) {
  const label = HOF_CATEGORY_LABELS[category];
  const Icon = CATEGORY_ICONS[category];

  const byYear = useMemo(() => {
    if (sortKey !== "year") return null;
    const sorted = sortInductees(inductees, sortKey, sortOrder);
    const map = new Map<number, UIHofInductee[]>();
    for (const ind of sorted) {
      const arr = map.get(ind.inductionYear) ?? [];
      arr.push(ind);
      map.set(ind.inductionYear, arr);
    }
    return Array.from(map.entries()).sort((a, b) =>
      sortOrder === "asc" ? a[0] - b[0] : b[0] - a[0]
    );
  }, [inductees, sortKey, sortOrder]);

  const sortedFlat = useMemo(() => {
    if (sortKey === "year") return null;
    return sortInductees(inductees, sortKey, sortOrder);
  }, [inductees, sortKey, sortOrder]);

  if (inductees.length === 0) {
    return (
      <EmptyState
        icon={Icon}
        title={`No ${label.name.toLowerCase()} inductees yet.`}
        description="Legends are forged through years of competition."
        className="py-16"
      />
    );
  }

  if (byYear) {
    return (
      <ScrollArea className="max-h-[600px]">
        <div className="space-y-6 pr-2">
          {byYear.map(([year, inds]) => (
            <div key={year}>
              <div className="flex items-center gap-2 mb-3">
                <Star className="h-4 w-4 text-gold" />
                <h3 className="text-sm font-display font-semibold">Class of {year}</h3>
                <Badge variant="secondary" className="text-[10px]">
                  {inds.length}
                </Badge>
              </div>
              <div className="space-y-3">
                {inds.map((ind, i) => (
                  <InducteeFullCard key={`${ind.rikishiId}-${i}`} inductee={ind} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="max-h-[600px]">
      <div className="space-y-3 pr-2">
        {(sortedFlat ?? []).map((ind, i) => (
          <InducteeFullCard key={`${ind.rikishiId}-${i}`} inductee={ind} />
        ))}
      </div>
    </ScrollArea>
  );
}

// === All-time view ===

function AllInducteesTab({
  inductees,
  sortKey,
  sortOrder,
}: {
  inductees: UIHofInductee[];
  sortKey: string;
  sortOrder: SortDirection;
}) {
  const sorted = useMemo(
    () => sortInductees(inductees, sortKey, sortOrder),
    [inductees, sortKey, sortOrder]
  );

  const byYear = useMemo(() => {
    if (sortKey !== "year") return null;
    const map = new Map<number, UIHofInductee[]>();
    for (const ind of sorted) {
      const arr = map.get(ind.inductionYear) ?? [];
      arr.push(ind);
      map.set(ind.inductionYear, arr);
    }
    return Array.from(map.entries()).sort((a, b) =>
      sortOrder === "asc" ? a[0] - b[0] : b[0] - a[0]
    );
  }, [sorted, sortKey, sortOrder]);

  if (inductees.length === 0) {
    return (
      <EmptyState
        icon={Award}
        title="The Hall stands empty, awaiting its first legends."
        description="Compete through multiple years to see inductees appear."
        className="py-16"
      />
    );
  }

  if (byYear) {
    return (
      <ScrollArea className="max-h-[600px]">
        <div className="space-y-6 pr-2">
          {byYear.map(([year, inds]) => (
            <div key={year}>
              <div className="flex items-center gap-2 mb-3">
                <Star className="h-4 w-4 text-gold" />
                <h3 className="text-sm font-display font-semibold">Class of {year}</h3>
                <Separator className="flex-1" />
              </div>
              <div className="space-y-3">
                {inds.map((ind, i) => (
                  <InducteeFullCard key={`${ind.rikishiId}-${i}`} inductee={ind} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="max-h-[600px]">
      <div className="space-y-3 pr-2">
        {sorted.map((ind, i) => (
          <InducteeFullCard key={`${ind.rikishiId}-${i}`} inductee={ind} />
        ))}
      </div>
    </ScrollArea>
  );
}

// === Main Page ===

export default function HallOfFamePage() {
  const { state } = useGame();
  const world = state.world;
  const [sortKey, setSortKey] = useState<string>("year");
  const [sortOrder, setSortOrder] = useState<SortDirection>("asc");

  const hof = useMemo(() => (world ? projectHOFUIDigest(world) : null), [world]);
  const awardLog = useMemo(() => (world ? selectAwardLog(world) : []), [world]);

  const byCategory = useMemo(() => {
    const map: Record<HoFCategory, UIHofInductee[]> = {
      champion: [],
      iron_man: [],
      technician: [],
    };
    if (!hof) return map;
    for (const ind of hof.inductees) {
      map[ind.category as HoFCategory]?.push(ind);
    }
    return map;
  }, [hof]);

  const totalInductees = hof?.inductees.length ?? 0;
  const totalAwards = world ? (world.awardLog?.length ?? awardLog.length) : 0;

  if (!world) {
    return (
      <AppLayout pageTitle="Hall of Fame" subNavTabs={RECORDS_TABS} activeSubTab="hall-of-fame">
        <EmptyState
          icon={Award}
          title="No world loaded"
          description="Load or start a game to view the Hall of Fame."
          className="h-64"
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Hall of Fame" subNavTabs={RECORDS_TABS} activeSubTab="hall-of-fame">
      <title>Hall of Fame — Sumo Manager</title>

      <div className="space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-lg border bg-gradient-to-br from-gold/10 via-background to-primary/5 p-6">
          <div className="absolute top-2 right-4 text-6xl opacity-10">🏛️</div>
          <PageHeader
            eyebrow="── RECORDS ──"
            title="Hall of Fame"
            lede={
              totalInductees > 0
                ? `${totalInductees} legend${totalInductees !== 1 ? "s" : ""} enshrined in sumo immortality.`
                : "The sacred shrine awaits its first legends — compete through the years."
            }
          />

          {totalInductees > 0 && (
            <div className="flex gap-6 mt-4">
              <div className="text-center">
                <div className="text-xl font-display font-bold text-gold">
                  {byCategory.champion.length}
                </div>
                <div className="text-[10px] text-muted-foreground">Champions</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-display font-bold text-west">
                  {byCategory.iron_man.length}
                </div>
                <div className="text-[10px] text-muted-foreground">Iron Men</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-display font-bold text-success">
                  {byCategory.technician.length}
                </div>
                <div className="text-[10px] text-muted-foreground">Technicians</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-display font-bold text-primary">{totalAwards}</div>
                <div className="text-[10px] text-muted-foreground">Awards</div>
              </div>
            </div>
          )}
        </div>

        {/* Timeline Visualization */}
        {totalInductees > 0 && (
          <HoFTimeline
            rikishiMap={
              new Map(
                (hof?.inductees ?? [])
                  .map(
                    (ind) => [ind.rikishiId, getRikishi(world, ind.rikishiId)] as [string, unknown]
                  )
                  .filter((pair) => !!pair[1])
              ) as unknown as Map<string, import("@/presenters/uiModels").UIRikishi>
            }
            inductees={hof?.inductees ?? []}
          />
        )}

        {/* Dynasty Registry */}
        {world.bloodlineRegistry && Object.keys(world.bloodlineRegistry.traits).length > 0 && (
          <Card className="border overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-4 w-4" style={{ color: "hsl(var(--gold))" }} />
                <h3 className="text-sm font-display font-semibold">Dynasty Registry</h3>
                <Badge variant="secondary" className="text-[10px] font-mono tabular-nums">
                  {Object.keys(world.bloodlineRegistry.traits).length}
                </Badge>
              </div>
              <div className="space-y-2">
                {Object.values(world.bloodlineRegistry.traits).map((trait) => (
                  <div
                    key={trait.traitId}
                    className="flex items-center justify-between p-2 rounded bg-background/50"
                  >
                    <div>
                      <div className="font-display font-medium text-sm">{trait.label}</div>
                      <div className="text-xs text-muted-foreground font-body">
                        {trait.description}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono tabular-nums">
                      {trait.ancestorShikona} · {trait.registeredYear}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex items-center justify-between">
          <Tabs defaultValue="all" className="flex-1">
            <TabsList className="grid w-full max-w-lg grid-cols-4">
              <TabsTrigger value="all" className="gap-1">
                <Award className="h-3.5 w-3.5" /> All ({totalInductees})
              </TabsTrigger>
              <TabsTrigger value="champion" className="gap-1">
                <Trophy className="h-3.5 w-3.5" /> Champions
              </TabsTrigger>
              <TabsTrigger value="iron_man" className="gap-1">
                <Shield className="h-3.5 w-3.5" /> Iron Men
              </TabsTrigger>
              <TabsTrigger value="technician" className="gap-1">
                <Target className="h-3.5 w-3.5" /> Technicians
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <AllInducteesTab
                inductees={hof?.inductees ?? []}
                sortKey={sortKey}
                sortOrder={sortOrder}
              />
            </TabsContent>
            <TabsContent value="champion" className="mt-4">
              <CategoryTab
                category="champion"
                inductees={byCategory.champion}
                sortKey={sortKey}
                sortOrder={sortOrder}
              />
            </TabsContent>
            <TabsContent value="iron_man" className="mt-4">
              <CategoryTab
                category="iron_man"
                inductees={byCategory.iron_man}
                sortKey={sortKey}
                sortOrder={sortOrder}
              />
            </TabsContent>
            <TabsContent value="technician" className="mt-4">
              <CategoryTab
                category="technician"
                inductees={byCategory.technician}
                sortKey={sortKey}
                sortOrder={sortOrder}
              />
            </TabsContent>
          </Tabs>
          <SortMenu
            options={HOF_SORT_OPTIONS}
            storageKey="basho_sort_hof"
            defaultSortKey="year"
            defaultSortOrder="asc"
            onSortChange={(key, order) => {
              setSortKey(key);
              setSortOrder(order);
            }}
          />
        </div>
      </div>
    </AppLayout>
  );
}

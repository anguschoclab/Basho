// HallOfFamePage.tsx — Dedicated Hall of Fame shrine
// Yearly inductees with portraits, career stats, and greatest fights

import { useMemo } from "react";
import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { RikishiName, StableName } from "@/components/ClickableName";
import { Trophy, Shield, Target, Award, Swords, Crown, TrendingUp, Star, Calendar } from "lucide-react";
import { HoFTimeline } from "@/components/game/HoFTimeline";
import { getHallOfFame, HOF_CATEGORY_LABELS, type HoFInductee, type HoFCategory } from "@/engine/hallOfFame";
import type { WorldState } from "../../types/world";
import type { Rikishi } from "../../types/rikishi";
import type { BashoResult } from "../../types/basho";

const CATEGORY_ICONS: Record<HoFCategory, React.ElementType> = {
  champion: Trophy,
  iron_man: Shield,
  technician: Target,
};

const CATEGORY_GRADIENT: Record<HoFCategory, string> = {
  champion: "from-amber-500/20 to-amber-500/5 border-amber-500/30",
  iron_man: "from-blue-500/20 to-blue-500/5 border-blue-500/30",
  technician: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30",
};

const CATEGORY_ACCENT: Record<HoFCategory, string> = {
  champion: "text-amber-400",
  iron_man: "text-blue-400",
  technician: "text-emerald-400",
};

const RANK_JA: Record<string, string> = {
  yokozuna: "横綱", ozeki: "大関", sekiwake: "関脇", komusubi: "小結",
  maegashira: "前頭", juryo: "十両", makushita: "幕下",
  sandanme: "三段目", jonidan: "序二段", jonokuchi: "序ノ口",
};

function getGreatestFights(world: WorldState, rikishiId: string): Array<{ bashoName: string; kimarite: string; opponentName: string; isWin: boolean }> {
  const r = world.rikishi.get(rikishiId);
  if (!r?.history) return [];
  
  // Pick notable bouts — wins by diverse kimarite, or recent bouts
  const fights = r.history
    .filter(m => m.win)
    .slice(-10) // last 10 wins
    .map(m => {
      const opp = world.rikishi.get(m.opponentId);
      return {
        bashoName: m.bashoId ?? "",
        kimarite: m.kimarite,
        opponentName: opp?.shikona ?? "Unknown",
        isWin: m.win,
      };
    })
    .reverse()
    .slice(0, 5);
  
  return fights;
}

function getYushoBasho(world: WorldState, rikishiId: string): Array<{ year: number; bashoName: string }> {
  return world.history
    .filter(br => br.yusho === rikishiId)
    .map(br => ({ year: br.year, bashoName: br.bashoName }));
}

// === Portrait Avatar ===

function RikishiPortrait({ rikishi, category }: { rikishi: Rikishi | undefined; category: HoFCategory }) {
  const accent = CATEGORY_ACCENT[category];
  const initials = rikishi?.shikona?.slice(0, 2) ?? "??";
  
  return (
    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-display font-bold border-2 ${accent} bg-gradient-to-br ${CATEGORY_GRADIENT[category]}`}>
      {initials}
    </div>
  );
}

// === Inductee Full Card ===

function InducteeFullCard({ inductee, world }: { inductee: HoFInductee; world: WorldState }) {
  const Icon = CATEGORY_ICONS[inductee.category];
  const label = HOF_CATEGORY_LABELS[inductee.category];
  const accent = CATEGORY_ACCENT[inductee.category];
  const gradient = CATEGORY_GRADIENT[inductee.category];
  const rikishi = world.rikishi.get(inductee.rikishiId);
  const heya = rikishi ? world.heyas.get(rikishi.heyaId) : null;
  
  const greatestFights = useMemo(() => getGreatestFights(world, inductee.rikishiId), [world, inductee.rikishiId]);
  const yushoList = useMemo(() => getYushoBasho(world, inductee.rikishiId), [world, inductee.rikishiId]);

  return (
    <Card className={`border bg-gradient-to-br ${gradient} overflow-hidden`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <RikishiPortrait rikishi={rikishi} category={inductee.category} />
          
          <div className="flex-1 min-w-0">
            {/* Name & Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <RikishiName id={inductee.rikishiId} name={inductee.shikona} className="font-display font-bold text-lg" />
              <Badge variant="outline" className={`gap-1 ${accent} border-current/30`}>
                <Icon className="h-3 w-3" />
                {label.icon} {label.name}
              </Badge>
            </div>
            
            {/* Metadata row */}
            <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
              {inductee.stats.highestRank && (
                <span className="flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  Peak: <strong className="text-foreground">{RANK_JA[inductee.stats.highestRank] ?? inductee.stats.highestRank}</strong>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Inducted: <strong className="text-foreground">{inductee.inductionYear}</strong>
              </span>
              {heya && (
                <span>
                  Stable: <StableName id={heya.id} name={heya.name} className="text-xs font-medium" />
                </span>
              )}
            </div>

            {/* Career Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              {inductee.stats.yushoCount != null && (
                <StatBox icon={Trophy} label="Yūshō" value={inductee.stats.yushoCount} accent="text-amber-400" />
              )}
              {inductee.stats.consecutiveBasho != null && (
                <StatBox icon={Shield} label="Basho Streak" value={inductee.stats.consecutiveBasho} accent="text-blue-400" />
              )}
              {inductee.stats.ginoShoCount != null && (
                <StatBox icon={Target} label="Ginō-shō" value={inductee.stats.ginoShoCount} accent="text-emerald-400" />
              )}
              {inductee.stats.careerWins != null && (
                <StatBox icon={TrendingUp} label="Career Record" value={`${inductee.stats.careerWins}-${inductee.stats.careerLosses ?? 0}`} accent="text-foreground" />
              )}
            </div>

            {/* Yūshō list for champions */}
            {inductee.category === "champion" && yushoList.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wider">Tournament Victories</div>
                <div className="flex gap-1.5 flex-wrap">
                  {yushoList.map((y, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] capitalize">
                      {y.bashoName} {y.year}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Greatest Fights */}
            {greatestFights.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wider flex items-center gap-1">
                  <Swords className="h-3 w-3" /> Notable Bouts
                </div>
                <div className="space-y-1">
                  {greatestFights.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-emerald-400">W</span>
                      <span className="text-muted-foreground">vs</span>
                      <span className="font-medium">{f.opponentName}</span>
                      <Badge variant="outline" className="text-[9px]">{f.kimarite}</Badge>
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

function StatBox({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string | number; accent: string }) {
  return (
    <div className="bg-background/50 rounded-md p-2 text-center">
      <Icon className={`h-3.5 w-3.5 mx-auto mb-0.5 ${accent}`} />
      <div className={`text-sm font-bold font-mono ${accent}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

// === Category Tab ===

function CategoryTab({ category, inductees, world }: { category: HoFCategory; inductees: HoFInductee[]; world: WorldState }) {
  const label = HOF_CATEGORY_LABELS[category];

  // Group by induction year
  const byYear = useMemo(() => {
    const map = new Map<number, HoFInductee[]>();
    for (const ind of inductees) {
      const arr = map.get(ind.inductionYear) ?? [];
      arr.push(ind);
      map.set(ind.inductionYear, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]); // newest first
  }, [inductees]);

  if (inductees.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="text-4xl">{label.icon}</div>
        <p className="text-muted-foreground">No {label.name.toLowerCase()} inductees yet.</p>
        <p className="text-xs text-muted-foreground">Legends are forged through years of competition.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[600px]">
      <div className="space-y-6 pr-2">
        {byYear.map(([year, inds]) => (
          <div key={year}>
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-display font-semibold">Class of {year}</h3>
              <Badge variant="secondary" className="text-[10px]">{inds.length}</Badge>
            </div>
            <div className="space-y-3">
              {inds.map((ind, i) => (
                <InducteeFullCard key={`${ind.rikishiId}-${i}`} inductee={ind} world={world} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// === All-time view ===

function AllInducteesTab({ inductees, world }: { inductees: HoFInductee[]; world: WorldState }) {
  const byYear = useMemo(() => {
    const map = new Map<number, HoFInductee[]>();
    for (const ind of inductees) {
      const arr = map.get(ind.inductionYear) ?? [];
      arr.push(ind);
      map.set(ind.inductionYear, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [inductees]);

  if (inductees.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="text-4xl">🏛️</div>
        <p className="text-muted-foreground">The Hall stands empty, awaiting its first legends.</p>
        <p className="text-xs text-muted-foreground">Compete through multiple years to see inductees appear.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[600px]">
      <div className="space-y-6 pr-2">
        {byYear.map(([year, inds]) => (
          <div key={year}>
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-display font-semibold">Class of {year}</h3>
              <Separator className="flex-1" />
            </div>
            <div className="space-y-3">
              {inds.map((ind, i) => (
                <InducteeFullCard key={`${ind.rikishiId}-${i}`} inductee={ind} world={world} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// === Main Page ===

export default function HallOfFamePage() {
  const { state } = useGame();
  const world = state.world;

  const hof = useMemo(() => world ? getHallOfFame(world) : null, [world]);

  const byCategory = useMemo(() => {
    const map: Record<HoFCategory, HoFInductee[]> = { champion: [], iron_man: [], technician: [] };
    if (!hof) return map;
    for (const ind of hof.inductees) {
      map[ind.category]?.push(ind);
    }
    return map;
  }, [hof]);

  const totalInductees = hof?.inductees.length ?? 0;

  const recordsTabs = [
    { id: "recap", label: "Recap", href: "/recap" },
    { id: "history", label: "History", href: "/history" },
    { id: "almanac", label: "Almanac", href: "/almanac" },
    { id: "media", label: "Media", href: "/media" },
    { id: "hall-of-fame", label: "Hall of Fame" },
  ];

  if (!world) {
    return (
      <AppLayout pageTitle="Hall of Fame" subNavTabs={recordsTabs} activeSubTab="hall-of-fame">
        <div className="flex items-center justify-center h-64 text-muted-foreground">No world loaded</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Hall of Fame" subNavTabs={recordsTabs} activeSubTab="hall-of-fame">
      <Helmet><title>Hall of Fame — Sumo Manager</title></Helmet>
      <div className="space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-amber-500/10 via-background to-primary/5 p-6">
          <div className="absolute top-2 right-4 text-6xl opacity-10">🏛️</div>
          <div className="flex items-center gap-3">
            <Award className="h-8 w-8 text-amber-400" />
            <div>
              <h1 className="text-2xl font-display font-bold">Hall of Fame</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {totalInductees > 0
                  ? `${totalInductees} legend${totalInductees !== 1 ? "s" : ""} enshrined in sumo immortality.`
                  : "The sacred shrine awaits its first legends — compete through the years."}
              </p>
            </div>
          </div>
          
          {totalInductees > 0 && (
            <div className="flex gap-6 mt-4">
              <div className="text-center">
                <div className="text-xl font-display font-bold text-amber-400">{byCategory.champion.length}</div>
                <div className="text-[10px] text-muted-foreground">Champions</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-display font-bold text-blue-400">{byCategory.iron_man.length}</div>
                <div className="text-[10px] text-muted-foreground">Iron Men</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-display font-bold text-emerald-400">{byCategory.technician.length}</div>
                <div className="text-[10px] text-muted-foreground">Technicians</div>
              </div>
            </div>
          )}
        </div>

        {/* Timeline Visualization */}
        {totalInductees > 0 && (
          <HoFTimeline inductees={hof?.inductees ?? []} world={world} />
        )}

        {/* Tabs */}
        <Tabs defaultValue="all">
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
            <AllInducteesTab inductees={hof?.inductees ?? []} world={world} />
          </TabsContent>
          <TabsContent value="champion" className="mt-4">
            <CategoryTab category="champion" inductees={byCategory.champion} world={world} />
          </TabsContent>
          <TabsContent value="iron_man" className="mt-4">
            <CategoryTab category="iron_man" inductees={byCategory.iron_man} world={world} />
          </TabsContent>
          <TabsContent value="technician" className="mt-4">
            <CategoryTab category="technician" inductees={byCategory.technician} world={world} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// HallOfFamePage.tsx — Hall of Fame display
// Surfaces hallOfFame.ts inductees by category

import { useMemo } from "react";
import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RikishiName } from "@/components/ClickableName";
import { Trophy, Shield, Target, Award } from "lucide-react";
import { getHallOfFame, HOF_CATEGORY_LABELS, type HoFInductee, type HoFCategory } from "@/engine/hallOfFame";

const CATEGORY_ICONS: Record<HoFCategory, React.ElementType> = {
  champion: Trophy,
  iron_man: Shield,
  technician: Target,
};

const CATEGORY_COLORS: Record<HoFCategory, string> = {
  champion: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  iron_man: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  technician: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

function InducteeCard({ inductee }: { inductee: HoFInductee }) {
  const Icon = CATEGORY_ICONS[inductee.category];
  const color = CATEGORY_COLORS[inductee.category];
  const label = HOF_CATEGORY_LABELS[inductee.category];

  return (
    <div className="p-4 rounded-lg border bg-card/50 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <RikishiName id={inductee.rikishiId} name={inductee.shikona} className="font-display font-bold text-base" />
          <div className="text-xs text-muted-foreground mt-0.5">
            Inducted {inductee.inductionYear}
            {inductee.stats.highestRank && ` • Peak: ${inductee.stats.highestRank}`}
          </div>
        </div>
        <Badge variant="outline" className={`${color} gap-1`}>
          <Icon className="h-3 w-3" />
          {label.name}
        </Badge>
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        {inductee.stats.yushoCount != null && (
          <span><strong className="text-foreground">{inductee.stats.yushoCount}</strong> Yūshō</span>
        )}
        {inductee.stats.consecutiveBasho != null && (
          <span><strong className="text-foreground">{inductee.stats.consecutiveBasho}</strong> Consecutive Basho</span>
        )}
        {inductee.stats.ginoShoCount != null && (
          <span><strong className="text-foreground">{inductee.stats.ginoShoCount}</strong> Ginō-shō</span>
        )}
        {inductee.stats.careerWins != null && (
          <span>Career: {inductee.stats.careerWins}-{inductee.stats.careerLosses ?? 0}</span>
        )}
      </div>
    </div>
  );
}

function CategoryTab({ category, inductees }: { category: HoFCategory; inductees: HoFInductee[] }) {
  const label = HOF_CATEGORY_LABELS[category];
  if (inductees.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-12">
        No {label.name.toLowerCase()} inductees yet. Legends are forged through years of competition.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {inductees.map((ind, i) => (
        <InducteeCard key={`${ind.rikishiId}-${ind.category}-${i}`} inductee={ind} />
      ))}
    </div>
  );
}

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

  if (!world) {
    return (
      <AppLayout pageTitle="Hall of Fame">
        <div className="flex items-center justify-center h-64 text-muted-foreground">No world loaded</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Hall of Fame">
      <Helmet><title>Hall of Fame — Sumo Manager</title></Helmet>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Award className="h-6 w-6 text-amber-400" /> Hall of Fame
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalInductees > 0
              ? `${totalInductees} legend${totalInductees !== 1 ? "s" : ""} enshrined. Year-end inductions honor the greatest.`
              : "No inductees yet — legends emerge after several years of competition."}
          </p>
        </div>

        <Card className="paper">
          <CardContent className="pt-6">
            <Tabs defaultValue="champion">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="champion" className="gap-1">
                  <Trophy className="h-3.5 w-3.5" /> Champions ({byCategory.champion.length})
                </TabsTrigger>
                <TabsTrigger value="iron_man" className="gap-1">
                  <Shield className="h-3.5 w-3.5" /> Iron Men ({byCategory.iron_man.length})
                </TabsTrigger>
                <TabsTrigger value="technician" className="gap-1">
                  <Target className="h-3.5 w-3.5" /> Technicians ({byCategory.technician.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="champion" className="mt-4">
                <CategoryTab category="champion" inductees={byCategory.champion} />
              </TabsContent>
              <TabsContent value="iron_man" className="mt-4">
                <CategoryTab category="iron_man" inductees={byCategory.iron_man} />
              </TabsContent>
              <TabsContent value="technician" className="mt-4">
                <CategoryTab category="technician" inductees={byCategory.technician} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

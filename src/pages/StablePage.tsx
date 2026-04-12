import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { HQ_TABS } from "@/constants/navigation";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  FacilitiesBand,
  KoenkaiBandType,
  PrestigeBand,
  RunwayBand,
  StatureBand,
} from "@/engine/types/narrative";
import {
  projectRosterEntry,
  projectRikishi,
  type UIRosterEntry,
  type UIRikishi,
} from "@/presenters/uiModels";
import {
  Activity,
  AlertTriangle,
  Building,
  Coins,
  Crown,
  Dumbbell,
  Heart,
  History,
  Medal,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  Users2,
  Zap,
  Scroll,
} from "lucide-react";
import { useMemo, useState } from "react";
import { OyakataName, RikishiName } from "@/components/ClickableName";
import { RANK_HIERARCHY } from "@/presenters/uiDigest";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { InstitutionPanel } from "@/components/game/InstitutionPanel";

export default function StablePage() {
  const navigate = useNavigate();
  const { id: routeId } = useParams({ strict: false });
  const { state, updateWorld } = useGame();
  const { world, playerHeyaId } = state;

  const viewingHeyaId = world && playerHeyaId ? routeId || playerHeyaId : "";
  const isViewingOwnStable = viewingHeyaId === playerHeyaId;
  const heya = world?.heyas.get(viewingHeyaId) ?? null;

  // Compute rikishi list before any early returns
  const rikishiList = useMemo(() => {
    if (!heya || !world) return [];
    return (heya.rikishiIds ?? [])
      .map((id) => {
        const r = world.rikishi.get(id);
        return r ? projectRikishi(r, world) : null;
      })
      .filter(Boolean) as UIRikishi[];
  }, [heya, world]);

  if (!world || !heya) return null;

  const lineage = heya.lineage || [];

  return (
    <AppLayout pageTitle="Stable Operations" subNavTabs={HQ_TABS} activeSubTab="stable">
      <Helmet>
        <title>{heya.name} — Stable Profile</title>
      </Helmet>

      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold flex items-center gap-3">
              <Building className="h-10 w-10 text-primary" />
              {heya.name}
              {heya.nameJa && (
                <span className="text-2xl text-muted-foreground font-normal ml-2">
                  {heya.nameJa}
                </span>
              )}
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Users className="h-4 w-4" /> {rikishiList.length} Active Rikishi
            </p>
          </div>
          <div className="flex gap-2">
            <TooltipWrap
              content="Ichimon: A group of affiliated stables within the Association"
              side="bottom"
            >
              <Badge variant="outline" className="px-3 py-1 text-sm bg-secondary/50 cursor-help">
                {heya.ichimon || "Independent"}
              </Badge>
            </TooltipWrap>
          </div>
        </div>

        <Tabs defaultValue="roster" className="space-y-6">
          <TabsList className="grid w-[400px] grid-cols-3">
            <TabsTrigger value="roster">Roster</TabsTrigger>
            <TabsTrigger value="institution">Institution</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="roster" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rikishiList.map((r) => (
                <TooltipWrap
                  key={r.id}
                  content={`View detailed statistics and career history for ${r.shikona}`}
                  side="top"
                >
                  <Card
                    className="paper hover:border-primary transition-colors cursor-pointer"
                    onClick={() =>
                      navigate({ to: "/rikishi/$rikishiId", params: { rikishiId: r.id } as any })
                    }
                  >
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <div className="font-bold">{r.shikona}</div>
                        <div className="text-xs text-muted-foreground uppercase">{r.rank}</div>
                      </div>
                      <Badge variant="secondary">
                        {r.currentBashoWins}-{r.currentBashoLosses}
                      </Badge>
                    </CardContent>
                  </Card>
                </TooltipWrap>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="institution" className="space-y-4">
            <InstitutionPanel world={world} heya={heya} />
          </TabsContent>

          <TabsContent value="history" className="space-y-8">
            {/* Leadership Timeline */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Scroll className="h-5 w-5 text-primary" />
                Oyakata Lineage
              </h3>
              <div className="space-y-4">
                {lineage.length === 0 ? (
                  <p className="text-muted-foreground text-sm italic">No lineage recorded yet.</p>
                ) : (
                  lineage
                    .slice()
                    .reverse()
                    .map((tenure, i) => (
                      <Card key={i} className="paper">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {tenure.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold">{tenure.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {tenure.startYear} — {tenure.endYear || "Present"}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 ml-auto">
                            <div className="flex gap-1 flex-wrap justify-end">
                              {tenure.achievements.titlesWon > 0 && (
                                <TooltipWrap
                                  content="Tournament victories under this master"
                                  side="top"
                                >
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] border-gold/50 text-gold cursor-help"
                                  >
                                    <Trophy className="h-2.5 w-2.5 mr-1" />{" "}
                                    {tenure.achievements.titlesWon} Yusho
                                  </Badge>
                                </TooltipWrap>
                              )}
                              {tenure.achievements.sekitoriCount > 0 && (
                                <TooltipWrap
                                  content="Salaried wrestlers produced during this tenure"
                                  side="top"
                                >
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] border-primary/30 text-primary cursor-help"
                                  >
                                    <Users2 className="h-2.5 w-2.5 mr-1" />{" "}
                                    {tenure.achievements.sekitoriCount} Sekitori
                                  </Badge>
                                </TooltipWrap>
                              )}
                              {tenure.achievements.highestStudentRank && (
                                <TooltipWrap
                                  content="Highest rank achieved by a student"
                                  side="top"
                                >
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] border-purple-500/30 text-purple-600 cursor-help"
                                  >
                                    <Star className="h-2.5 w-2.5 mr-1" />{" "}
                                    {tenure.achievements.highestStudentRank}
                                  </Badge>
                                </TooltipWrap>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                )}
              </div>
            </div>

            {/* Historical Summary */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="paper h-full">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-gold" />
                    Championship Legacy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-display font-bold">{heya.historicalYusho || 0}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    All-time tournament victories by members of this stable.
                  </p>
                </CardContent>
              </Card>

              <Card className="paper h-full opacity-50 border-dashed">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Medal className="h-5 w-5 text-slate-400" />
                    Hall of Fame Inductees
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Coming in future expansion.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

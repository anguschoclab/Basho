import { useMemo } from "react";
import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { STABLE_TABS } from "@/constants/navigation";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { projectRikishi } from "@/presenters/rikishiUI";
import { InfrastructureService } from "@/engine/systems/economy/InfrastructureService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Medal, Star, Trophy, Users2, Scroll } from "lucide-react";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { InstitutionPanel } from "@/components/game/InstitutionPanel";
import { StableStatsTable } from "@/components/game/StableStatsTable";
import { projectHeyaData } from "@/presenters/projections/heyaProjections";
import { InfrastructureDashboard } from "@/components/stable/InfrastructureDashboard";
import { SponsorshipHub } from "@/components/economy/SponsorshipHub";
import { projectSponsorUIDigest } from "@/presenters/uiProjections";
import { ChronicleRoom } from "@/components/stable/ChronicleRoom";
import { GlobalStrategicHub } from "@/components/stable/GlobalStrategicHub";
import type { FacilityId } from "@/engine/types/infrastructure";

export default function StablePage() {
  const navigate = useNavigate();
  const { id: routeId } = useParams({ strict: false });
  const { state, updateWorld } = useGame();
  const { world, playerHeyaId } = state;

  const viewingHeyaId = routeId || playerHeyaId || "";
  const heya = world?.heyas.get(viewingHeyaId) ?? null;

  const rikishiList = useMemo(() => {
    if (!world || !heya) return [];
    return (heya.rikishiIds ?? [])
      .map((id) => world.rikishi.get(id))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .map((r) => projectRikishi(r, world));
  }, [world, heya]);

  const lineage: Array<{
    name: string;
    startYear: number;
    endYear?: number;
    achievements: { titlesWon: number; sekitoriCount: number; highestStudentRank?: string };
  }> = [];

  if (!world || !heya) return null;

  const sponsorData = projectSponsorUIDigest(world);

  const handleUpgrade = (facilityId: FacilityId) => {
    if (!world) return;
    const impact = InfrastructureService.startConstruction(world, viewingHeyaId, facilityId);
    const nextWorld = resolveImpacts(world, [impact]);
    updateWorld(nextWorld);
  };

  return (
    <AppLayout pageTitle="Stable Operations" subNavTabs={STABLE_TABS} activeSubTab="stable">
      <Helmet>
        <title>{heya.name} — Stable Profile</title>
      </Helmet>

      <div className="space-y-8">
        {/* Header... */}

        <Tabs defaultValue="roster" className="space-y-6">
          <TabsList className="grid w-full max-w-[800px] grid-cols-6 text-[10px] font-black uppercase">
            <TabsTrigger value="roster">Roster</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
            <TabsTrigger value="sponsorship">Sponsorship</TabsTrigger>
            <TabsTrigger value="institution">Institution</TabsTrigger>
            <TabsTrigger value="global">Global Influence</TabsTrigger>
            <TabsTrigger value="chronicle">Chronicle</TabsTrigger>
          </TabsList>

          <TabsContent value="sponsorship">
            <SponsorshipHub data={sponsorData} />
          </TabsContent>

          <TabsContent value="chronicle">
            <ChronicleRoom world={world} heyaId={viewingHeyaId} />
          </TabsContent>

          <TabsContent value="global">
            <GlobalStrategicHub world={world} heyaId={viewingHeyaId} />
          </TabsContent>

          <TabsContent value="infrastructure">
            <InfrastructureDashboard heya={heya} onUpgrade={handleUpgrade} />
          </TabsContent>

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
                      navigate({ to: "/rikishi/$rikishiId", params: { rikishiId: r.id } })
                    }
                  >
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <div className="font-bold">{r.shikona}</div>
                        <div className="text-xs text-muted-foreground uppercase">
                          {r.rankLabel}
                          {r.rankNumber && r.rankNumber > 0 ? ` #${r.rankNumber}` : ""}
                          {r.side ? ` ${r.side === "east" ? "E" : "W"}` : ""}
                        </div>
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

          <TabsContent value="performance">
            <StableStatsTable rikishiList={rikishiList} />
          </TabsContent>

          <TabsContent value="institution" className="space-y-4">
            {world &&
              heya &&
              (() => {
                const data = projectHeyaData(world, heya.id);
                if (!data) return null;
                return (
                  <InstitutionPanel
                    heya={heya}
                    oyakata={data.oyakata ?? null}
                    oyakataQuirks={data.oyakataQuirks}
                    oyakataTraits={data.oyakataTraits ?? null}
                  />
                );
              })()}
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

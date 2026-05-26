import { useMemo, useEffect } from "react";
import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { STABLE_TABS } from "@/constants/ui/navigation";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { projectRikishi } from "@/presenters/rikishiUI";
import { InfrastructureService } from "@/engine/systems/economy/InfrastructureService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/control-center";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { AlertTriangle } from "lucide-react";
import { InstitutionPanel } from "@/components/game/InstitutionPanel";
import { StableStatsTable } from "@/components/game/StableStatsTable";
import { projectHeyaData } from "@/presenters/projections/heyaProjections";
import { InfrastructureDashboard } from "@/components/stable/InfrastructureDashboard";
import { SponsorshipHub } from "@/components/economy/SponsorshipHub";
import { projectSponsorUIDigest } from "@/presenters/uiProjections";
import { ChronicleRoom } from "@/components/stable/ChronicleRoom";
import { GlobalStrategicHub } from "@/components/stable/GlobalStrategicHub";
import type { FacilityId } from "@/engine/types/infrastructure";
import type { Rikishi } from "@/engine/types/rikishi";
import { KeshoMawashiGallery } from "@/components/stable/KeshoMawashiGallery";
import { MentorAssignmentPanel } from "@/components/game/MentorAssignmentPanel";

export default function StablePage() {
  const navigate = useNavigate();
  const { id: routeId } = useParams({ strict: false });
  const { state, updateWorld, assignMentor, removeMentor } = useGame();
  const { world, playerHeyaId } = state;

  const viewingHeyaId = routeId || playerHeyaId || "";
  const heya = world?.heyas.get(viewingHeyaId) ?? null;

  useEffect(() => {
    if (!world) navigate({ to: "/main-menu", replace: true });
  }, [world, navigate]);

  const rikishiList = useMemo(() => {
    if (!world || !heya) return [];
    return (heya.rikishiIds ?? [])
      .map((id) => world.rikishi.get(id))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .map((r) => projectRikishi(r, world));
  }, [world, heya]);

  if (!heya) {
    return (
      <AppLayout pageTitle="Stable Operations" subNavTabs={STABLE_TABS} activeSubTab="stable">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground">
          <div className="text-4xl animate-pulse font-display">⋯</div>
          <p className="text-sm font-display italic uppercase tracking-widest">Loading stable…</p>
        </div>
      </AppLayout>
    );
  }

  const sponsorData = world ? projectSponsorUIDigest(world) : null;

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
        <PageHeader
          eyebrow="── MY STABLE ──"
          title={heya.name}
          lede={`${rikishiList.length} rikishi · ${heya.ichimon ?? "Independent"} Ichimon`}
        />

        <Tabs defaultValue="roster" className="space-y-6">
          <TabsList className="w-full max-w-[900px] flex flex-wrap gap-1 text-[10px] font-black uppercase h-auto">
            <TabsTrigger value="roster" className="flex-1 min-w-[80px]">
              Members
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex-1 min-w-[80px]">
              Performance
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex-1 min-w-[80px]">
              Gallery
            </TabsTrigger>
            <TabsTrigger value="infrastructure" className="flex-1 min-w-[80px]">
              Infrastructure
            </TabsTrigger>
            <TabsTrigger value="sponsorship" className="flex-1 min-w-[80px]">
              Sponsorship
            </TabsTrigger>
            <TabsTrigger value="institution" className="flex-1 min-w-[80px]">
              Institution
            </TabsTrigger>
            <TabsTrigger value="global" className="flex-1 min-w-[80px]">
              Global
            </TabsTrigger>
            <TabsTrigger value="chronicle" className="flex-1 min-w-[80px]">
              Chronicle
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sponsorship">
            <SponsorshipHub data={sponsorData} />
          </TabsContent>

          <TabsContent value="gallery">
            {world && <KeshoMawashiGallery world={world} heyaId={viewingHeyaId} />}
          </TabsContent>

          <TabsContent value="chronicle">
            {world && <ChronicleRoom world={world} heyaId={viewingHeyaId} />}
          </TabsContent>

          <TabsContent value="global">
            {world && <GlobalStrategicHub world={world} heyaId={viewingHeyaId} />}
          </TabsContent>

          <TabsContent value="infrastructure">
            <InfrastructureDashboard heya={heya} onUpgrade={handleUpgrade} />
          </TabsContent>

          <TabsContent value="roster" className="space-y-4">
            {rikishiList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 border-2 border-dashed rounded-lg text-muted-foreground">
                <div className="text-5xl font-display animate-pulse">∅</div>
                <p className="text-sm font-display italic">Your stable has no rikishi yet.</p>
                <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
                  Visit Dashboard to Recruit
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rikishiList.map((r) => {
                  const isHighRisk = !r.isInjured && (r.condition < 40 || r.fatigue > 70);
                  return (
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
                            <div className="font-bold flex items-center gap-1.5">
                              {r.shikona}
                              {r.isInjured && (
                                <TooltipWrap content={r.injurySummary ?? "Injured"} side="top">
                                  <Badge
                                    variant="destructive"
                                    className="text-[9px] px-1.5 h-4 cursor-help"
                                  >
                                    INJURED
                                  </Badge>
                                </TooltipWrap>
                              )}
                              {isHighRisk && (
                                <TooltipWrap
                                  content="High injury risk — low condition or elevated fatigue"
                                  side="top"
                                >
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 cursor-help shrink-0" />
                                </TooltipWrap>
                              )}
                            </div>
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
                        {world && heya && (
                          <CardContent className="p-4 pt-0">
                            <MentorAssignmentPanel
                              apprenticeId={r.id}
                              mentorId={r.mentorId}
                              heyaId={heya.id}
                              allRikishi={world.rikishi as Map<string, Rikishi>}
                              onAssignMentor={(mentorId) => assignMentor(mentorId, r.id)}
                              onRemoveMentor={() => removeMentor(r.id)}
                            />
                          </CardContent>
                        )}
                      </Card>
                    </TooltipWrap>
                  );
                })}
              </div>
            )}
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
        </Tabs>
      </div>
    </AppLayout>
  );
}

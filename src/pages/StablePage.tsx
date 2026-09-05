import { useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { STABLE_TABS } from "@/constants/ui/navigation";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useGame } from "@/contexts/useGame";
import { useRequireWorld } from "@/hooks/useRequireWorld";
import { projectRikishi } from "@/presenters/rikishi";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/control-center";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { AlertTriangle, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { InstitutionPanel } from "@/components/game/InstitutionPanel";
import { StableStatsTable } from "@/components/game/StableStatsTable";
import { projectHeyaData } from "@/presenters/projections/heyaProjections";
import { InfrastructureDashboard } from "@/components/stable/InfrastructureDashboard";
import { SponsorshipHub } from "@/components/economy/SponsorshipHub";
import { projectSponsorUIDigest } from "@/presenters/projections";
import { ChronicleRoom } from "@/components/stable/ChronicleRoom";
import { GlobalStrategicHub } from "@/components/stable/GlobalStrategicHub";
import type { FacilityId } from "@/engine/types/infrastructure";
import { KeshoMawashiGallery } from "@/components/stable/KeshoMawashiGallery";
import { MentorAssignmentPanel } from "@/components/game/MentorAssignmentPanel";
import { getHeyaRoster } from "@/presenters/engineAccess";
import { TsukebitoPanel } from "@/components/training/TsukebitoPanel";
import { YouthAcademyPanel } from "@/components/recruitment/YouthAcademyPanel";
import { projectTsukebito } from "@/presenters/tsukebitoProjections";
import { projectYouthAcademy } from "@/presenters/youthAcademyProjections";
import { useGameStore } from "@/store/gameStore";

export default function StablePage() {
  const navigate = useNavigate();
  const { id: routeId } = useParams({ strict: false });
  const { state, buildInfrastructure, assignMentor, removeMentor } = useGame();
  const sendCommand = useGameStore((s) => s.sendCommand);
  const { world, playerHeyaId } = state;

  const viewingHeyaId = routeId || playerHeyaId || "";
  const heya = world?.heyas.get(viewingHeyaId) ?? null;

  const hasWorld = useRequireWorld();

  const rawRoster = useMemo(() => {
    if (!world || !heya) return [];
    return getHeyaRoster(world, heya.id);
  }, [world, heya]);

  const rikishiList = useMemo(() => {
    if (!world || !heya) return [];
    return rawRoster.map((r) => projectRikishi(r, world));
  }, [world, heya, rawRoster]);

  if (!hasWorld || !world || !heya) return null;

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
    buildInfrastructure(viewingHeyaId, facilityId);
  };

  return (
    <AppLayout pageTitle="Stable Operations" subNavTabs={STABLE_TABS} activeSubTab="stable">

        <title>{heya.name} — Stable Profile</title>


      <div className="space-y-8">
        <PageHeader
          eyebrow="── MY STABLE ──"
          title={heya.name}
          lede={`${rikishiList.length} rikishi · ${heya.ichimon ?? "Independent"} Ichimon`}
        />

        <Tabs defaultValue="roster" className="space-y-6">
          <TabsList className="w-full max-w-4xl flex flex-wrap gap-1 text-[10px] font-black uppercase h-auto">
            <TabsTrigger value="roster" className="flex-1 min-w-20">
              Members
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex-1 min-w-20">
              Performance
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex-1 min-w-20">
              Gallery
            </TabsTrigger>
            <TabsTrigger value="infrastructure" className="flex-1 min-w-20">
              Infrastructure
            </TabsTrigger>
            <TabsTrigger value="sponsorship" className="flex-1 min-w-20">
              Sponsorship
            </TabsTrigger>
            <TabsTrigger value="institution" className="flex-1 min-w-20">
              Institution
            </TabsTrigger>
            <TabsTrigger value="global" className="flex-1 min-w-20">
              Global
            </TabsTrigger>
            <TabsTrigger value="attendants" className="flex-1 min-w-20">
              Attendants
            </TabsTrigger>
            <TabsTrigger value="academy" className="flex-1 min-w-20">
              Academy
            </TabsTrigger>
            <TabsTrigger value="chronicle" className="flex-1 min-w-20">
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
              <EmptyState
                icon={Users}
                title="Empty Roster"
                description="Your stable has no rikishi yet."
                action={{
                  label: "Visit Dashboard to Recruit",
                  onClick: () => navigate({ to: "/dashboard" }),
                  variant: "outline",
                }}
              />
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
                              roster={rawRoster}
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

          <TabsContent value="attendants" className="space-y-4">
            {world && heya && (
              <TsukebitoPanel
                projection={projectTsukebito(world, heya.id)}
                onSet={(seniorId, juniorId) =>
                  sendCommand({ type: "SET_TSUKEBITO", seniorId, juniorId })
                }
                onClear={(seniorId, juniorId) =>
                  sendCommand({ type: "CLEAR_TSUKEBITO", seniorId, juniorId })
                }
              />
            )}
          </TabsContent>

          <TabsContent value="academy" className="space-y-4">
            {world && heya && (
              <YouthAcademyPanel
                projection={projectYouthAcademy(world, heya.id)}
                cash={heya.economics?.cash ?? 0}
                onBuild={() =>
                  sendCommand({ type: "BUILD_YOUTH_ACADEMY", heyaId: heya.id })
                }
                onUpgrade={() =>
                  sendCommand({ type: "UPGRADE_YOUTH_ACADEMY", heyaId: heya.id })
                }
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

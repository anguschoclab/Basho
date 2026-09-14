import { Globe, Building2, MapPin, ArrowRight } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/control-center";
import { useGame } from "@/contexts/useGame";
import { useGameStore } from "@/store/gameStore";
import { TOURNAMENT_TABS } from "@/constants/ui/navigation";
import { WidgetCard } from "@/components/ui/WidgetCard";
import { WidgetHeader } from "@/components/ui/WidgetHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getPlayerHeya } from "@/presenters/engineAccess";
import { AcademyManagementPanel } from "@/components/stable/AcademyManagementPanel";
import { projectAcademyManagement, type ExhibitionRegion } from "@/presenters/academyManagementProjections";
import { ExhibitionInvitationsPanel } from "@/components/exhibition/ExhibitionInvitationsPanel";
import { projectExhibitions } from "@/presenters/exhibitionProjections";

export default function RegionalHubPage() {
  const { state } = useGame();
  const world = state.world;
  const playerHeya = world ? (getPlayerHeya(world) ?? null) : null;
  const sendCommand = useGameStore((s) => s.sendCommand);
  const academyProjection = world && playerHeya
    ? projectAcademyManagement(world, playerHeya.id)
    : { academies: [], buildableRegions: [], hasAcademies: false };
  const exhibitionProjection = world && playerHeya
    ? projectExhibitions(world, playerHeya.id)
    : { invitations: [], hasInvitations: false };

  const regionalPresence = playerHeya?.regionalPresence || {};
  // Pending exhibitions from world state are projected for ExhibitionInvitationsPanel
  const pendingExhibitions = world?.pendingExhibitions;
  void pendingExhibitions;

  const regions = ["Mongolia", "Georgia", "Europe", "Americas", "East_Asia"];

  if (!world) {
    return (
      <AppLayout
        pageTitle="World Circuit"
        subNavTabs={TOURNAMENT_TABS}
        activeSubTab="world-circuit"
      >
        <div className="flex items-center justify-center h-96 text-muted-foreground">
          No world loaded. Start a game to access the World Circuit.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="World Circuit" subNavTabs={TOURNAMENT_TABS} activeSubTab="world-circuit">
      <div className="space-y-6">
        <PageHeader
          eyebrow="── INTERNATIONAL ──"
          title="World Circuit Hub"
          lede="Manage international exhibitions and overseas academy operations."
        />

        <div className="flex justify-end">
          <WidgetCard className="p-3 bg-card/50 border-border">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold font-mono">
              Global Presence
            </p>
            <p className="text-2xl font-black text-primary font-mono">
              {(() => {
                let sum = 0;
                for (const v of Object.values(regionalPresence) as number[]) sum += v;
                return (sum / 5).toFixed(1);
              })()}
              %
            </p>
          </WidgetCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Regional Presence Column */}
          <div className="lg:col-span-2 space-y-6">
            <WidgetCard className="border-border bg-card/40">
              <WidgetHeader title="Regional Influence" icon={Globe} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {regions.map((region) => {
                  const score = regionalPresence[region] ?? 0;
                  const status = score >= 80 ? "Academy" : score >= 40 ? "Visible" : "Hidden";

                  return (
                    <div
                      key={region}
                      className="p-4 rounded-lg bg-secondary/40 border border-border/50 group hover:border-border transition-colors"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="font-bold text-foreground font-display">{region}</span>
                        </div>
                        <Badge
                          variant={
                            status === "Academy"
                              ? "default"
                              : status === "Visible"
                                ? "secondary"
                                : "outline"
                          }
                          className="text-[10px] uppercase font-mono"
                        >
                          {status}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground font-mono">
                          <span>Presence Score</span>
                          <span>{score}%</span>
                        </div>
                        <Progress value={score} className="h-1.5" />
                      </div>
                      {status === "Academy" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-4 text-[10px] uppercase font-bold text-primary hover:text-primary/80 hover:bg-primary/5 font-mono"
                          onClick={() =>
                            playerHeya &&
                            sendCommand({
                              type: "BUILD_FOREIGN_ACADEMY",
                              heyaId: playerHeya.id,
                              region: region as ExhibitionRegion,
                            })
                          }
                        >
                          Build Academy <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </WidgetCard>

            <WidgetCard className="border-border bg-card/40">
              <WidgetHeader title="Academy Infrastructure" icon={Building2} />
              <div className="mt-4">
                <AcademyManagementPanel
                  projection={academyProjection}
                  onBuild={(region) =>
                    playerHeya &&
                    sendCommand({
                      type: "BUILD_FOREIGN_ACADEMY",
                      heyaId: playerHeya.id,
                      region: region as ExhibitionRegion,
                    })
                  }
                  onManage={(region, budget) =>
                    playerHeya &&
                    sendCommand({
                      type: "MANAGE_ACADEMY",
                      heyaId: playerHeya.id,
                      region: region as ExhibitionRegion,
                      config: { budget },
                    })
                  }
                />
              </div>
            </WidgetCard>
          </div>

          {/* Pending Invitations Column */}
          <div className="space-y-6">
            <ExhibitionInvitationsPanel
              projection={exhibitionProjection}
              onAccept={(invitationId, rikishiId) => {
                if (playerHeya) {
                  sendCommand({
                    type: "ACCEPT_EXHIBITION",
                    heyaId: playerHeya.id,
                    invitationId,
                    rikishiId: rikishiId || undefined,
                  });
                }
              }}
              onDecline={(invitationId) => {
                if (playerHeya) {
                  sendCommand({
                    type: "DECLINE_EXHIBITION",
                    heyaId: playerHeya.id,
                    invitationId,
                  });
                }
              }}
              eligibleRikishiCount={playerHeya?.rikishiIds?.length ?? 0}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

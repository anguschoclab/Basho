import { Building2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/control-center";
import { useGame } from "@/contexts/useGame";
import { useGameStore } from "@/store/gameStore";
import { TOURNAMENT_TABS } from "@/constants/ui/navigation";
import { WidgetCard } from "@/components/ui/WidgetCard";
import { WidgetHeader } from "@/components/ui/WidgetHeader";
import { getPlayerHeya } from "@/presenters/engineAccess";
import { AcademyManagementPanel } from "@/components/stable/AcademyManagementPanel";
import {
  projectAcademyManagement,
  type ExhibitionRegion,
} from "@/presenters/academyManagementProjections";
import { ExhibitionInvitationsPanel } from "@/components/exhibition/ExhibitionInvitationsPanel";
import {
  GlobalPresenceScore,
  RegionalInfluenceGrid,
} from "@/components/exhibition/RegionalHubSections";
import { projectExhibitions } from "@/presenters/exhibitionProjections";

export default function RegionalHubPage() {
  const { state } = useGame();
  const world = state.world;
  const playerHeya = world ? (getPlayerHeya(world) ?? null) : null;
  const sendCommand = useGameStore((s) => s.sendCommand);
  const academyProjection =
    world && playerHeya
      ? projectAcademyManagement(world, playerHeya.id)
      : { academies: [], buildableRegions: [], hasAcademies: false };
  const exhibitionProjection =
    world && playerHeya
      ? projectExhibitions(world, playerHeya.id)
      : { invitations: [], hasInvitations: false };

  const regionalPresence = playerHeya?.regionalPresence || {};
  // Pending exhibitions from world state are projected for ExhibitionInvitationsPanel
  const pendingExhibitions = world?.pendingExhibitions;
  void pendingExhibitions;

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

  const buildAcademy = (region: string) =>
    playerHeya &&
    sendCommand({
      type: "BUILD_FOREIGN_ACADEMY",
      heyaId: playerHeya.id,
      region: region as ExhibitionRegion,
    });

  return (
    <AppLayout pageTitle="World Circuit" subNavTabs={TOURNAMENT_TABS} activeSubTab="world-circuit">
      <div className="space-y-6">
        <PageHeader
          eyebrow="── INTERNATIONAL ──"
          title="World Circuit Hub"
          lede="Manage international exhibitions and overseas academy operations."
        />

        <GlobalPresenceScore regionalPresence={regionalPresence} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Regional Presence Column */}
          <div className="lg:col-span-2 space-y-6">
            <RegionalInfluenceGrid
              regionalPresence={regionalPresence}
              onBuildAcademy={buildAcademy}
            />

            <WidgetCard className="border-border bg-card/40">
              <WidgetHeader title="Academy Infrastructure" icon={Building2} />
              <div className="mt-4">
                <AcademyManagementPanel
                  projection={academyProjection}
                  onBuild={buildAcademy}
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

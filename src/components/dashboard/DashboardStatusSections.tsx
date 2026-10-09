/**
 * DashboardStatusSections.tsx
 *
 * Conditional status sections of the Dashboard control center:
 * exhibition invitations + gomenfuda sanctions, holiday digest,
 * phase-dependent widget grid, and the succession modal.
 */

import { Badge } from "@/components/ui/badge";
import { useGameStore } from "@/store/gameStore";
import type { WorldState } from "@/presenters/uiDigest";
import { getOyakata } from "@/presenters/worldAccess";
import { getPlayerHeya } from "@/presenters/engineAccess";
import { JungyoInvitationCard } from "@/components/basho/JungyoInvitationCard";
import { GomenfudaStatusBadge } from "@/components/game/GomenfudaStatusBadge";
import { SuccessionModal } from "@/components/stable/SuccessionModal";
import { selectHolidayDigest } from "@/presenters/projections/holidayDigestProjections";
import { projectYouthAcademy } from "@/presenters/youthAcademyProjections";
import {
  BanzukeWidget,
  RivalsWidget,
  YushoRaceWidget,
  KenshoManagementWidget,
  ScoutingWidget,
  StableWidget,
  PromotionPipelineWidget,
  SponsorRecruitmentWidget,
  GlobalCupWidget,
  TrainingWidget,
  PreBashoAssessment,
  RosterWidget,
  IntelligencePanel,
  AcademyWidget,
} from "./index";
import type { DashboardDerived } from "@/hooks/useDashboardDerived";

export function DashboardExhibitionSection({
  heyaId,
  exhibitionProjection,
  gomenfudaProjection,
}: {
  heyaId: string;
  exhibitionProjection: DashboardDerived["exhibitionProjection"];
  gomenfudaProjection: DashboardDerived["gomenfudaProjection"];
}) {
  const sendCommand = useGameStore((s) => s.sendCommand);
  const onAcceptInvitation = (id: string) =>
    sendCommand({ type: "ACCEPT_EXHIBITION", heyaId, invitationId: id });
  const onDeclineInvitation = (id: string) =>
    sendCommand({ type: "DECLINE_EXHIBITION", heyaId, invitationId: id });
  if (
    !exhibitionProjection.hasInvitations &&
    gomenfudaProjection.count < gomenfudaProjection.threshold - 1
  )
    return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {exhibitionProjection.invitations.map((inv) => (
        <JungyoInvitationCard
          key={inv.id}
          invitation={inv}
          onAccept={onAcceptInvitation}
          onDecline={onDeclineInvitation}
        />
      ))}
      {gomenfudaProjection.count >= gomenfudaProjection.threshold - 1 && (
        <GomenfudaStatusBadge projection={gomenfudaProjection} />
      )}
    </div>
  );
}

export function DashboardHolidayDigest({ world }: { world: WorldState }) {
  const digest = selectHolidayDigest(world);
  if (!digest) return null;
  return (
    <div
      className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2"
      data-testid="holiday-digest-banner"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Holiday Return Digest</h3>
        <Badge variant="outline" className="text-xs">
          {digest.daysAdvanced} days advanced
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">{digest.summary}</p>
      {digest.incidents.length > 0 && (
        <div className="space-y-1">
          {digest.incidents.slice(0, 5).map((inc, i) => (
            <div
              key={i}
              className="text-xs p-2 rounded border border-border/50"
              data-testid={`holiday-incident-${i}`}
            >
              <span className="font-medium">{inc.type}</span>
              <span className="text-muted-foreground ml-2">{inc.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardPhaseWidgets({
  world,
  playerHeya,
  phase,
  advisorRecs,
}: {
  world: WorldState;
  playerHeya: DashboardDerived["playerHeya"];
  phase: string;
  advisorRecs: DashboardDerived["advisorRecs"];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {phase === "active_basho" && (
        <>
          <BanzukeWidget />
          <RivalsWidget />
          <YushoRaceWidget />
          <KenshoManagementWidget />
        </>
      )}
      {phase === "interim" && (
        <>
          <ScoutingWidget />
          <StableWidget />
          <PromotionPipelineWidget />
          <SponsorRecruitmentWidget />
        </>
      )}
      {phase === "pre_basho" && (
        <>
          <GlobalCupWidget />
          <TrainingWidget />
          <PromotionPipelineWidget />
          <PreBashoAssessment />
        </>
      )}
      {phase === "post_basho" && (
        <>
          <GlobalCupWidget />
          <TrainingWidget />
          <PromotionPipelineWidget />
        </>
      )}
      <RosterWidget />
      <IntelligencePanel recommendations={advisorRecs} />
      {world && playerHeya && (
        <AcademyWidget
          projection={projectYouthAcademy(world, playerHeya.id)}
          currentYear={world.year}
        />
      )}
    </div>
  );
}

export function DashboardSuccessionModal({
  world,
  playerHeyaId,
  successionDismissed,
  onDismiss,
}: {
  world: WorldState;
  playerHeyaId: string;
  successionDismissed: boolean;
  onDismiss: () => void;
}) {
  const sendCommand = useGameStore((s) => s.sendCommand);
  const ph = getPlayerHeya(world);
  const ok = getOyakata(world, ph?.oyakataId ?? "");
  if (ok?.successionReadiness !== "mandatory") return null;
  if (successionDismissed) return null;
  return (
    <SuccessionModal
      isOpen={true}
      onClose={onDismiss}
      world={world}
      heyaId={playerHeyaId}
      onSelect={(successorId) =>
        sendCommand({ type: "TRIGGER_SUCCESSION", heyaId: playerHeyaId, successorId })
      }
    />
  );
}

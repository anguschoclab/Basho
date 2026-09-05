/**
 * ExhibitionInvitationsPanel — shows pending overseas exhibition invitations
 * and lets the player accept (sending a rikishi) or decline.
 *
 * Surfaces the real world.pendingExhibitions that were previously only
 * processed by NPC AI. The player can now choose to participate.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, Check, X } from "lucide-react";
import type { ExhibitionProjection, ExhibitionInvitationDTO } from "@/presenters/exhibitionProjections";

export function ExhibitionInvitationsPanel({
  projection,
  onAccept,
  onDecline,
  eligibleRikishiCount = 0,
}: {
  projection: ExhibitionProjection;
  onAccept: (invitationId: string, rikishiId: string) => void;
  onDecline: (invitationId: string) => void;
  eligibleRikishiCount?: number;
}) {
  if (!projection.hasInvitations) {
    return (
      <Card className="border-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span>No pending exhibition invitations.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20" data-testid="exhibition-invitations-panel">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Overseas Exhibition Invitations</span>
          <Badge variant="outline" className="ml-auto text-xs">
            {projection.invitations.length} pending
          </Badge>
        </div>
        {projection.invitations.map((inv) => (
          <InvitationRow
            key={inv.id}
            invitation={inv}
            eligibleRikishiCount={eligibleRikishiCount}
            onAccept={onAccept}
            onDecline={onDecline}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function InvitationRow({
  invitation,
  eligibleRikishiCount,
  onAccept,
  onDecline,
}: {
  invitation: ExhibitionInvitationDTO;
  eligibleRikishiCount: number;
  onAccept: (invitationId: string, rikishiId: string) => void;
  onDecline: (invitationId: string) => void;
}) {
  const canAccept = eligibleRikishiCount > 0;
  const prestigeColor =
    invitation.prestige >= 80
      ? "text-gold"
      : invitation.prestige >= 60
        ? "text-primary"
        : "text-muted-foreground";

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/10"
      data-testid={`invitation-row-${invitation.id}`}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{invitation.region}</span>
          <Badge variant="outline" className={`text-[9px] uppercase tracking-widest ${prestigeColor}`}>
            {invitation.prestigeLabel}
          </Badge>
          {invitation.requiresRank && (
            <Badge variant="outline" className="text-[9px] uppercase tracking-widest">
              {invitation.requiresRank}+
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          Prestige {invitation.prestige}/100 · Expires week {invitation.expiresAtWeek}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={!canAccept}
          onClick={() => onAccept(invitation.id, "")}
          className="gap-1"
          data-testid={`accept-${invitation.id}`}
        >
          <Check className="h-3 w-3" />
          Accept
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDecline(invitation.id)}
          className="gap-1"
          data-testid={`decline-${invitation.id}`}
        >
          <X className="h-3 w-3" />
          Decline
        </Button>
      </div>
    </div>
  );
}

/**
 * JungyoInvitationCard — exhibition basho invitation with accept/decline.
 *
 * Shows pending exhibition (jungyo) invitations and lets the player
 * accept or decline them. Accepting routes through the worker command bus.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, Check, X } from "lucide-react";
import type { ExhibitionInvitationDTO } from "@/presenters/exhibitionProjections";

export function JungyoInvitationCard({
  invitation,
  onAccept,
  onDecline,
}: {
  invitation: ExhibitionInvitationDTO;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  return (
    <Card className="border-primary/20" data-testid={`jungyo-card-${invitation.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Exhibition Tour</span>
          <Badge variant="outline" className="ml-auto text-[9px]">
            {invitation.prestigeLabel}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded bg-muted/20">
            <div className="text-muted-foreground">Region</div>
            <div className="text-sm font-medium">{invitation.region}</div>
          </div>
          <div className="p-2 rounded bg-muted/20">
            <div className="text-muted-foreground">Prestige</div>
            <div className="text-sm font-medium tabular-nums">{invitation.prestige}</div>
          </div>
        </div>

        {invitation.requiresRank && (
          <div className="text-xs text-muted-foreground">
            Requires rank: <span className="text-foreground">{invitation.requiresRank}</span>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Expires in {invitation.expiresAtWeek} weeks
        </div>

        <div className="flex gap-2 pt-2 border-t border-border/30">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onAccept(invitation.id)}
            data-testid={`accept-jungyo-${invitation.id}`}
          >
            <Check className="h-3 w-3 mr-1" />
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onDecline(invitation.id)}
            data-testid={`decline-jungyo-${invitation.id}`}
          >
            <X className="h-3 w-3 mr-1" />
            Decline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

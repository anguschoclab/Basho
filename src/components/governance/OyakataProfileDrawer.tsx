/**
 * OyakataProfileDrawer — clickable rival oyakata name → profile drawer.
 *
 * Shows detailed information about a rival oyakata including archetype,
 * personality traits, faction, standing, and recent decisions.
 */
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import type { RivalStableDTO } from "@/presenters/rivalStablesProjections";

export function OyakataProfileDrawer({
  open,
  onOpenChange,
  rival,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rival: RivalStableDTO | null;
}) {
  if (!rival) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto" data-testid="oyakata-profile-drawer">
        <SheetHeader>
          <SheetTitle data-testid="drawer-heya-name">{rival.heyaName}</SheetTitle>
          <SheetDescription>Rival Stable Profile</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            {rival.ichimon && (
              <Badge variant="secondary" data-testid="drawer-ichimon">
                {rival.ichimon}
              </Badge>
            )}
            {rival.legacyTier && (
              <Badge variant="outline" data-testid="drawer-legacy-tier">
                Legacy: {rival.legacyTier}
              </Badge>
            )}
            <Badge variant="outline">Decisions: {rival.decisionCount}</Badge>
          </div>

          {/* WS7 — banded rival intel. Public record always shows; managerial
              identity (archetype, mood) only when the stable is scouted. */}
          <div className="space-y-1.5 text-xs" data-testid="drawer-intel">
            {rival.tenureSummary && (
              <div className="text-muted-foreground">{rival.tenureSummary}</div>
            )}
            {rival.factionPosture && (
              <div className="text-muted-foreground">
                Ichimon posture:{" "}
                <span className="text-foreground">{rival.factionPosture}</span>
              </div>
            )}
            {rival.planId && (
              <div className="text-muted-foreground">
                Current direction: <span className="text-foreground">{rival.planId}</span>
              </div>
            )}
            {rival.scouted ? (
              <div className="text-muted-foreground">
                {rival.archetypeLabel && (
                  <>
                    Style:{" "}
                    <span className="text-foreground capitalize">{rival.archetypeLabel}</span>
                  </>
                )}
                {rival.mood && (
                  <>
                    {rival.archetypeLabel ? " · " : ""}Mood:{" "}
                    <span className="text-foreground capitalize">{rival.mood}</span>
                  </>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground italic">
                Limited intel — scout this stable's rikishi to learn more
              </div>
            )}
          </div>

          {rival.recentDecisions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
                Recent Decisions
              </h4>
              {rival.recentDecisions.slice(0, 5).map((d, i) => (
                <div
                  key={i}
                  className="p-2 rounded border border-border/50 text-xs space-y-1"
                  data-testid={`drawer-decision-${i}`}
                >
                  <div className="font-medium">{d.category}</div>
                  <div className="text-muted-foreground">{d.reasoning}</div>
                </div>
              ))}
            </div>
          )}

          {rival.recentDecisions.length === 0 && (
            <p className="text-xs text-muted-foreground">No recent decisions logged.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * RivalOyakataCard — displays a rival oyakata's profile and recent decisions.
 *
 * Shows oyakata name, archetype, faction (ichimon), standing, and recent
 * decision reasoning snippets from NPC_MANAGER_DECISION events.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Brain, Activity } from "lucide-react";
import type { NPCDecisionDTO } from "@/presenters/npcAgentProjections";

export interface RivalOyakataCardProps {
  heyaId: string;
  heyaName: string;
  ichimon?: string;
  legacyTier?: string;
  decisions: NPCDecisionDTO[];
  // WS7 — banded rival intel. Optional; absence means "unknown", never
  // a fabricated placeholder.
  scouted?: boolean;
  archetypeLabel?: string;
  mood?: string;
  tenureSummary?: string;
  factionPosture?: string;
  planId?: string;
}

export function RivalOyakataCard({
  heyaId,
  heyaName,
  ichimon,
  legacyTier,
  decisions,
  scouted,
  archetypeLabel,
  mood,
  tenureSummary,
  factionPosture,
  planId,
}: RivalOyakataCardProps) {
  const recentDecisions = decisions.slice(0, 3);

  return (
    <Card data-testid={`rival-oyakata-card-${heyaId}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{heyaName}</span>
          {legacyTier && (
            <Badge variant="outline" className="ml-auto text-[10px] capitalize">
              {legacyTier}
            </Badge>
          )}
        </div>

        {ichimon && (
          <div className="text-xs text-muted-foreground">
            Ichimon: <span className="text-foreground">{ichimon}</span>
            {factionPosture && (
              <span className="text-muted-foreground">
                {" "}
                · posture <span className="text-foreground">{factionPosture}</span>
              </span>
            )}
          </div>
        )}

        {tenureSummary && <div className="text-xs text-muted-foreground">{tenureSummary}</div>}

        {planId && (
          <div className="text-xs text-muted-foreground">
            Current direction: <span className="text-foreground">{planId}</span>
          </div>
        )}

        {scouted === true ? (
          <div className="text-xs text-muted-foreground">
            {archetypeLabel && (
              <>
                Style: <span className="text-foreground capitalize">{archetypeLabel}</span>
              </>
            )}
            {mood && (
              <>
                {archetypeLabel ? " · " : ""}Mood:{" "}
                <span className="text-foreground capitalize">{mood}</span>
              </>
            )}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic">
            Limited intel — scout this stable's rikishi to learn more
          </div>
        )}

        {recentDecisions.length > 0 ? (
          <div className="space-y-1 pt-2 border-t border-border/30">
            <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-widest">
              <Brain className="h-3 w-3" />
              Recent Decisions
            </div>
            {recentDecisions.map((d, i) => (
              <div
                key={i}
                className="p-2 rounded border border-border/50 text-xs space-y-1"
                data-testid={`rival-decision-${heyaId}-${i}`}
              >
                <div className="flex items-center gap-2">
                  <Activity className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{d.category}</span>
                </div>
                <p className="text-muted-foreground line-clamp-2">{d.decision || d.reasoning}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground pt-2 border-t border-border/30">
            No recent decisions logged.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

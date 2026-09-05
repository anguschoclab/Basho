/**
 * NPCAgentFeed — displays recent NPC manager decisions from rival stables.
 *
 * Surfaces the NPC_MANAGER_DECISION events that were previously only logged
 * internally. Gives the player visibility into rival oyakata strategies.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye } from "lucide-react";
import type { NPCAgentProjection, NPCDecisionDTO } from "@/presenters/npcAgentProjections";

const CATEGORY_LABELS: Record<string, string> = {
  recruitment: "Recruitment",
  training: "Training",
  sponsorship: "Sponsorship",
  media: "Media",
  strategy: "Strategy",
  general: "General",
};

export function NPCAgentFeed({ projection }: { projection: NPCAgentProjection }) {
  if (!projection.hasRecentActivity) {
    return (
      <Card className="border-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" />
            <span>No recent rival activity.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20" data-testid="npc-agent-feed">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Rival Oyakata Activity</span>
          <Badge variant="outline" className="ml-auto text-xs">
            {projection.decisions.length} recent
          </Badge>
        </div>
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {projection.decisions.map((d, i) => (
              <DecisionRow key={`${d.heyaId}-${d.week}-${i}`} decision={d} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function DecisionRow({ decision }: { decision: NPCDecisionDTO }) {
  const categoryLabel = CATEGORY_LABELS[decision.category] ?? decision.category;
  return (
    <div
      className="p-2.5 rounded-lg border border-border/50 bg-muted/10"
      data-testid={`npc-decision-${decision.heyaId}-${decision.week}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium">{decision.heyaName}</span>
        <Badge variant="outline" className="text-[9px] uppercase tracking-widest">
          {categoryLabel}
        </Badge>
        {decision.week > 0 && (
          <span className="text-[10px] text-muted-foreground ml-auto">Wk {decision.week}</span>
        )}
      </div>
      {decision.decision && (
        <div className="text-xs text-foreground">{decision.decision}</div>
      )}
      {decision.reasoning && (
        <div className="text-xs text-muted-foreground mt-0.5">{decision.reasoning}</div>
      )}
    </div>
  );
}

/**
 * RivalStablesPage — shows all NPC rival stables with their oyakata profiles.
 *
 * Surfaces NPC_MANAGER_DECISION events so the player can see what rival
 * oyakata are doing — their archetypes, focus areas, and recent decisions.
 */
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Brain, Activity } from "lucide-react";
import { useGame } from "@/contexts/useGame";
import { projectNPCAgentActivity } from "@/presenters/npcAgentProjections";
import { NPCAgentFeed } from "@/components/npc/NPCAgentFeed";

export default function RivalStablesPage() {
  const { state } = useGame();
  const world = state.world;

  if (!world) {
    return (
      <AppLayout pageTitle="Rival Stables">
        <title>Rival Stables — Sumo Manager Pro</title>
        <p className="text-muted-foreground text-sm p-4">No game loaded.</p>
      </AppLayout>
    );
  }

  const projection = projectNPCAgentActivity(world);
  const rivalHeyas = Array.from(world.heyas.values()).filter(
    (h) => h.id !== world.playerHeyaId && !h.isPlayer
  );

  return (
    <AppLayout pageTitle="Rival Stables">
      <title>Rival Stables — Sumo Manager Pro</title>

      <div className="space-y-4 p-4" data-testid="rival-stables-page">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">
            Rival Oyakata ({rivalHeyas.length})
          </h2>
        </div>

        {rivalHeyas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No rival stables found in this world.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {rivalHeyas.map((heya) => {
              const decisionCount = projection.decisionsByHeya[heya.id] ?? 0;
              const recentDecisions = projection.decisions.filter(
                (d) => d.heyaId === heya.id
              );
              const latestDecision = recentDecisions[0];

              return (
                <Card key={heya.id} data-testid={`rival-card-${heya.id}`}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{heya.name}</span>
                      {decisionCount > 0 && (
                        <Badge variant="outline" className="text-[9px]">
                          <Activity className="h-3 w-3 mr-1" />
                          {decisionCount} decisions
                        </Badge>
                      )}
                    </div>
                    {heya.ichimon && (
                      <div className="text-xs text-muted-foreground">
                        Ichimon: {heya.ichimon}
                      </div>
                    )}
                    {latestDecision && (
                      <div className="space-y-1 pt-2 border-t border-border/30">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Brain className="h-3 w-3" />
                          Latest: {latestDecision.category}
                        </div>
                        <p className="text-xs line-clamp-2">
                          {latestDecision.decision || latestDecision.reasoning}
                        </p>
                      </div>
                    )}
                    {!latestDecision && (
                      <p className="text-xs text-muted-foreground pt-2 border-t border-border/30">
                        No recent decisions logged.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="pt-4">
          <h3 className="text-sm font-medium mb-2">Recent NPC Activity Feed</h3>
          <ScrollArea className="h-[300px] rounded border border-border/30">
            <NPCAgentFeed projection={projection} />
          </ScrollArea>
        </div>
      </div>
    </AppLayout>
  );
}

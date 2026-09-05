/**
 * RivalStablesPage — shows all NPC rival stables with their oyakata profiles.
 *
 * Surfaces NPC_MANAGER_DECISION events so the player can see what rival
 * oyakata are doing — their archetypes, focus areas, and recent decisions.
 */
import { AppLayout } from "@/components/layout/AppLayout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users } from "lucide-react";
import { useGame } from "@/contexts/useGame";
import { projectNPCAgentActivity } from "@/presenters/npcAgentProjections";
import { projectRivalStables } from "@/presenters/rivalStablesProjections";
import { RivalOyakataCard } from "@/components/governance/RivalOyakataCard";
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

  const npcProjection = projectNPCAgentActivity(world);
  const projection = projectRivalStables(
    world,
    npcProjection.decisions,
    npcProjection.decisionsByHeya
  );

  return (
    <AppLayout pageTitle="Rival Stables">
      <title>Rival Stables — Sumo Manager Pro</title>

      <div className="space-y-4 p-4" data-testid="rival-stables-page">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">
            Rival Oyakata ({projection.rivals.length})
          </h2>
        </div>

        {projection.rivals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No rival stables found in this world.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {projection.rivals.map((rival) => (
              <RivalOyakataCard
                key={rival.heyaId}
                heyaId={rival.heyaId}
                heyaName={rival.heyaName}
                ichimon={rival.ichimon}
                legacyTier={rival.legacyTier}
                decisions={rival.recentDecisions}
              />
            ))}
          </div>
        )}

        <div className="pt-4">
          <h3 className="text-sm font-medium mb-2">Recent NPC Activity Feed</h3>
          <ScrollArea className="h-[300px] rounded border border-border/30">
            <NPCAgentFeed projection={npcProjection} />
          </ScrollArea>
        </div>
      </div>
    </AppLayout>
  );
}

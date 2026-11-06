/**
 * ObjectivesWidget.tsx — JSA-issued yearly objectives (T1.1).
 * Career mode shows active objectives with progress and deadline;
 * sandbox mode is exempt and renders nothing.
 */

import { useGame } from "@/state/game/useGame";
import { BaseWidget } from "@/components/dashboard/BaseWidget";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";
import { objectiveProgress } from "@/presenters/engineAccess";

export function ObjectivesWidget() {
  const { state } = useGame();
  const { world, playerHeyaId } = state;

  const objectives = world?.objectivesState?.active ?? [];
  const sandbox = world?.settings?.careerMode === "sandbox";

  if (!world || !playerHeyaId || sandbox || objectives.length === 0) {
    return (
      <BaseWidget title="Objectives" icon={Target} className="h-full">
        <EmptyState
          icon={Target}
          title={sandbox ? "Sandbox mode — no objectives" : "No active objectives"}
          compact
        />
      </BaseWidget>
    );
  }

  return (
    <BaseWidget title="Objectives" icon={Target} className="h-full">
      <div className="space-y-3">
        {objectives.map((o) => {
          const progress = Math.min(objectiveProgress(world, playerHeyaId, o.kind), o.target);
          const yearsLeft = o.deadlineYear - world.year;
          return (
            <div key={o.id} className="rounded-lg border border-border/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium leading-snug">{o.title}</p>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {progress}/{o.target}
                </Badge>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-secondary">
                <div
                  className="h-1.5 rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, (progress / Math.max(1, o.target)) * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Due by {o.deadlineYear} · {yearsLeft}y left · ±{o.stakes} political capital
              </p>
            </div>
          );
        })}
      </div>
    </BaseWidget>
  );
}

/**
 * AchievementsWidget.tsx — the player's milestone cabinet (T1.5).
 * Lists awarded achievements with year; hidden entirely when empty.
 */

import { useGame } from "@/state/game/useGame";
import { BaseWidget } from "@/components/dashboard/BaseWidget";
import { EmptyState } from "@/components/ui/EmptyState";
import { Award } from "lucide-react";

export function AchievementsWidget() {
  const { state } = useGame();
  const achievements = state.world?.achievements ?? [];

  return (
    <BaseWidget title="Achievement Cabinet" icon={Award} className="h-full">
      {achievements.length === 0 ? (
        <EmptyState icon={Award} title="No milestones yet" compact />
      ) : (
        <div className="space-y-2">
          {[...achievements].reverse().map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 rounded-lg border border-gold/20 bg-gold/5 p-2.5"
            >
              <Award className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-[11px] text-muted-foreground">{a.description}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                  Earned {a.yearAwarded}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </BaseWidget>
  );
}

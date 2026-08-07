import React, { useMemo } from "react";
import { BaseWidget } from "./BaseWidget";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/EmptyState";
import { Sparkles, TrendingUp, Swords, Coins, Users, Dumbbell } from "lucide-react";
import type { AIRecommendation } from "@/engine/ai/types";

interface IntelligencePanelProps {
  recommendations: AIRecommendation[];
}

const CATEGORY_ICON: Record<string, React.ElementType> = {
  finance: Coins,
  recruitment: Users,
  training: Dumbbell,
  rivalry: Swords,
  bout: TrendingUp,
  governance: Sparkles,
  generic: Sparkles,
};

const PRIORITY_VARIANT: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "default",
  medium: "secondary",
  low: "outline",
};

export const IntelligencePanel = React.memo(function IntelligencePanel({
  recommendations,
}: IntelligencePanelProps) {
  const sorted = useMemo(
    () =>
      [...recommendations].sort((a, b) => {
        const rank = { critical: 4, high: 3, medium: 2, low: 1 };
        return rank[b.priority] - rank[a.priority];
      }),
    [recommendations]
  );

  if (sorted.length === 0) {
    return (
      <BaseWidget title="Intelligence" icon={Sparkles}>
        <EmptyState title="No active recommendations" compact />
      </BaseWidget>
    );
  }

  return (
    <BaseWidget title="Intelligence" icon={Sparkles}>
      <ScrollArea className="h-[220px]">
        <div className="space-y-2 pr-3">
          {sorted.map((rec) => {
            const Icon = CATEGORY_ICON[rec.category] ?? Sparkles;
            return (
              <div
                key={rec.id}
                className="flex items-start gap-2 rounded-md border border-border/50 bg-muted/20 p-2"
              >
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">{rec.title}</span>
                    <Badge variant={PRIORITY_VARIANT[rec.priority] ?? "outline"} className="text-[10px] capitalize">
                      {rec.priority}
                    </Badge>
                  </div>
                  {rec.detail && (
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{rec.detail}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </BaseWidget>
  );
});

export default IntelligencePanel;

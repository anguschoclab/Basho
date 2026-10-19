import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Swords } from "lucide-react";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import type { CornerAdviceProjection } from "@/presenters/projections/cornerAdviceProjection";

interface CornerAdvicePanelProps {
  advice: CornerAdviceProjection | null;
}

export const CornerAdvicePanel = React.memo(function CornerAdvicePanel({
  advice,
}: CornerAdvicePanelProps) {
  if (!advice || !advice.advice.length) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
            Corner Advice
          </h3>
          <Badge variant="outline" className="text-[10px] ml-auto gap-1 py-0.5">
            <SumoAvatar
              avatar={advice.playerRikishi.avatar}
              size="xs"
              fallback={advice.playerRikishi.shikona}
            />
            <span>{advice.playerRikishi.shikona ?? advice.playerRikishi.name}</span>
            <Swords className="h-3 w-3 mx-0.5" />
            <SumoAvatar
              avatar={advice.opponent.avatar}
              size="xs"
              fallback={advice.opponent.shikona}
            />
            <span>{advice.opponent.shikona ?? advice.opponent.name}</span>
          </Badge>
        </div>
        <div className="space-y-2">
          {advice.advice.map((rec) => (
            <div
              key={rec.id}
              className="flex items-start justify-between gap-3 rounded-md border border-border/50 bg-background/60 p-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">{rec.title}</p>
                <p className="text-[11px] text-muted-foreground leading-snug">{rec.detail}</p>
              </div>
              <Badge
                variant={rec.priority === "critical" ? "destructive" : "secondary"}
                className="text-[10px] capitalize shrink-0"
              >
                {rec.priority}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

export default CornerAdvicePanel;

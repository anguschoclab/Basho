/**
 * WeightJourneyCard.tsx
 *
 * Displays a rikishi's weight bulking journey progress, including target weight,
 * current progress, stall status, and breakthrough stat bonuses.
 */

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dumbbell, AlertTriangle, Zap } from "lucide-react";

interface WeightJourneyData {
  targetKg: number;
  progressKg: number;
  stalled: boolean;
  phases: string[];
}

interface Props {
  journey?: WeightJourneyData;
  shikona: string;
}

export function WeightJourneyCard({ journey, shikona }: Props) {
  if (!journey) return null;

  const progressPercent = Math.min(100, (journey.progressKg / journey.targetKg) * 100);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Weight Journey
          </CardTitle>
          {journey.stalled && (
            <Badge variant="outline" className="border-warning text-warning bg-warning/10">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Stalled
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{shikona}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">
            {journey.progressKg.toFixed(1)} / {journey.targetKg} kg
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Phase</span>
          <span className="font-medium capitalize">{journey.phases.join(", ")}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-success" />
            Power +3
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-success" />
            Balance +2
          </span>
          <span className="text-muted-foreground/60">on breakthrough</span>
        </div>
      </CardContent>
    </Card>
  );
}

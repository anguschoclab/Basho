/**
 * PreBashoAssessment.tsx
 * =====================
 * Dashboard widget showing pre-basho health assessment and withdrawal recommendations.
 */

import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "../../contexts/GameContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { AlertTriangle, Shield, Activity, UserMinus } from "lucide-react";
import { TooltipWrap } from "../ui/tooltip-wrap";
import { RikishiName } from "@/components/ClickableName";

const AssessmentRow = React.memo(
  ({
    rikishiId,
    shikona,
    injuryRisk,
    withdrawalRecommended,
    recommendedFocus,
    healthScore,
  }: {
    rikishiId: string;
    shikona: string;
    injuryRisk: string;
    withdrawalRecommended: boolean;
    recommendedFocus: string;
    healthScore: number;
  }) => {
    return (
      <div className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-muted/50 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="font-medium truncate">
            <RikishiName id={rikishiId} name={shikona} />
          </span>
          <Badge
            variant={
              injuryRisk === "low"
                ? "default"
                : injuryRisk === "medium"
                  ? "secondary"
                  : "destructive"
            }
            className="shrink-0"
          >
            {injuryRisk}
          </Badge>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {withdrawalRecommended && (
            <TooltipWrap content="Withdrawal recommended due to injury" side="left">
              <AlertTriangle className="h-3 w-3 text-destructive" />
            </TooltipWrap>
          )}
          {recommendedFocus !== "normal" && (
            <TooltipWrap content={`Recommended focus: ${recommendedFocus}`} side="left">
              <Shield
                className={`h-3 w-3 ${recommendedFocus === "protect" ? "text-destructive" : "text-warning"}`}
              />
            </TooltipWrap>
          )}
          <span className="text-muted-foreground w-8 text-right">{Math.round(healthScore)}%</span>
        </div>
      </div>
    );
  }
);

const AssessmentList = React.memo(({ assessment, world }: { assessment: any; world: any }) => {
  const nodes = [];
  for (const [rikishiId, rikishiAssessment] of assessment.rikishiAssessments.entries()) {
    const rikishi = world.rikishi.get(rikishiId);
    if (!rikishi) continue;

    nodes.push(
      <AssessmentRow
        key={rikishiId}
        rikishiId={rikishiId}
        shikona={rikishi.shikona}
        injuryRisk={rikishiAssessment.injuryRisk}
        withdrawalRecommended={rikishiAssessment.withdrawalRecommended}
        recommendedFocus={rikishiAssessment.recommendedFocus}
        healthScore={rikishiAssessment.healthScore}
      />
    );
  }

  return <>{nodes}</>;
});

export function PreBashoAssessment() {
  const navigate = useNavigate();
  const { state } = useGame();
  const world = state.world;
  const assessment = world?._preBashoAssessment;

  // Only show during pre_basho phase
  if (world?.cyclePhase !== "pre_basho" || !assessment) {
    return null;
  }

  const daysRemaining = world._interimDaysRemaining ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Pre-Basho Assessment
        </CardTitle>
        <CardDescription className="text-xs">
          Health assessment for upcoming basho • {daysRemaining} days remaining
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Health Score */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Overall Health Score</span>
          <Badge
            variant={
              assessment.overallHealthScore >= 70
                ? "default"
                : assessment.overallHealthScore >= 50
                  ? "secondary"
                  : "destructive"
            }
          >
            {Math.round(assessment.overallHealthScore)}%
          </Badge>
        </div>

        {/* Withdrawals Recommended */}
        {assessment.withdrawalsThisAssessment > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Withdrawals Recommended</span>
            <Badge variant="destructive" className="flex items-center gap-1">
              <UserMinus className="h-3 w-3" />
              {assessment.withdrawalsThisAssessment}
            </Badge>
          </div>
        )}

        {/* Rikishi Assessments */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          <AssessmentList assessment={assessment} world={world} />
        </div>

        {/* Action Button */}
        {assessment.withdrawalsThisAssessment > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => navigate({ to: "/rikishi" })}
          >
            View Roster for Withdrawals
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

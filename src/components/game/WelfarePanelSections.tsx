/**
 * WelfarePanelSections.tsx
 *
 * Welfare & Compliance panel cards — compliance status, welfare/morale
 * bands, diet regimen selection, and rikishi health overview.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Utensils, Shield, Heart, Activity } from "lucide-react";
import type { DietRegimen } from "@/engine/types/economy";
import type { projectMedicalUIDigest } from "@/presenters/uiDigest";
import { MAX_RISK_PERCENTAGE, RISK_PERCENTAGE_MULTIPLIER } from "../../constants/ui/dashboard";
import {
  COMPLIANCE_DISPLAY,
  WELFARE_RISK_DISPLAY,
  MORALE_DISPLAY,
  ROSTER_DISPLAY,
  DIET_DISPLAY,
} from "@/constants/ui/welfare";

type WelfareDigest = NonNullable<ReturnType<typeof projectMedicalUIDigest>>;
type Welfare = WelfareDigest["welfare"];
type Perception = WelfareDigest["perception"];

const RISK_ADVICE: Record<string, string> = {
  safe: "No welfare concerns. Rikishi are well cared for.",
  cautious: "Minor concerns detected. Monitor injured rikishi closely.",
  elevated: "Elevated risk. Consider reducing training intensity for injured wrestlers.",
  critical: "Critical welfare issues. Immediate action needed to prevent sanctions.",
};

const HEALTH_COLORS: Record<string, string> = {
  peak: "text-success",
  good: "text-success",
  fair: "text-gold",
  worn: "text-warning",
  fragile: "text-destructive",
};

/** Compliance status card — JSA medical responsibility assessment. */
export function ComplianceCard({ welfare }: { welfare: Welfare }) {
  const comp = COMPLIANCE_DISPLAY[welfare.complianceState] ?? COMPLIANCE_DISPLAY.compliant;
  const CompIcon = comp.icon;

  return (
    <Card className="paper">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" /> Compliance Status
        </CardTitle>
        <CardDescription>JSA medical responsibility assessment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <CompIcon className={`h-6 w-6 ${comp.color}`} />
          <div>
            <div className={`font-bold ${comp.color}`}>{comp.label}</div>
            <p className="text-xs text-muted-foreground">{comp.description}</p>
          </div>
        </div>
        {welfare.weeksInState > 0 && (
          <p className="text-xs text-muted-foreground">
            In this state for {welfare.weeksInState} week{welfare.weeksInState !== 1 ? "s" : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Welfare risk bar + morale/roster/media/rivalry band grid. */
export function WelfareMoraleCard({
  welfare,
  perception,
}: {
  welfare: Welfare;
  perception: Perception;
}) {
  const riskDisplay = WELFARE_RISK_DISPLAY[perception.welfareRiskBand] ?? WELFARE_RISK_DISPLAY.safe;
  const moraleDisplay = MORALE_DISPLAY[perception.moraleBand] ?? MORALE_DISPLAY.neutral;
  const rosterDisplay = ROSTER_DISPLAY[perception.rosterStrengthBand] ?? ROSTER_DISPLAY.competitive;

  // Visual welfare risk as percentage (0 = safe, 100 = critical)
  const riskPct = Math.min(
    MAX_RISK_PERCENTAGE,
    (welfare.welfareRisk / RISK_PERCENTAGE_MULTIPLIER) * RISK_PERCENTAGE_MULTIPLIER
  );

  return (
    <Card className="paper">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" /> Welfare & Morale
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Welfare Risk</span>
            <span className={`font-medium ${riskDisplay.color}`}>{riskDisplay.label}</span>
          </div>
          <Progress value={riskPct} className="h-2" />
          <p className="text-[11px] text-muted-foreground">
            {RISK_ADVICE[perception.welfareRiskBand]}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Stable Morale</div>
            <div className={`font-medium text-sm ${moraleDisplay.color}`}>
              {moraleDisplay.label}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Roster Strength</div>
            <div className={`font-medium text-sm ${rosterDisplay.color}`}>
              {rosterDisplay.label}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Media Attention</div>
            <div className="font-medium text-sm capitalize">{perception.stableMediaHeatBand}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Rivalry Pressure</div>
            <div className="font-medium text-sm capitalize">{perception.rivalryPressureBand}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Diet regimen selection card — chanko-nabe budget tiers. */
export function DietCard({
  welfare,
  onSetDiet,
}: {
  welfare: Welfare;
  onSetDiet?: (diet: DietRegimen) => void;
}) {
  return (
    <Card className="paper">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Utensils className="h-5 w-5" /> Diet Regimen (Chanko-nabe)
        </CardTitle>
        <CardDescription>Manage daily food budget and nutrition</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(Object.keys(DIET_DISPLAY) as DietRegimen[]).map((diet) => {
            const info = DIET_DISPLAY[diet];
            const isActive = welfare.activeDiet === diet;
            return (
              <Button
                key={diet}
                variant={isActive ? "default" : "outline"}
                className="h-auto flex-col items-start p-3 text-left w-full whitespace-normal"
                onClick={() => onSetDiet?.(diet)}
              >
                <div className="flex justify-between w-full mb-1">
                  <span className="font-bold">{info.label}</span>
                  <span className="text-xs opacity-80">{info.cost}</span>
                </div>
                <span className="text-xs font-normal opacity-90">{info.desc}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/** Rikishi health overview — banded perceptions (no raw stats). */
export function HealthOverviewCard({ perception }: { perception: Perception }) {
  if (perception.rikishiHealthPerceptions.length === 0) return null;

  return (
    <Card className="paper">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" /> Rikishi Health Overview
        </CardTitle>
        <CardDescription>Banded health perceptions (no raw stats revealed)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {perception.rikishiHealthPerceptions.slice(0, 12).map((rp) => (
            <div key={rp.rikishiId} className="flex items-center gap-3 text-sm">
              <div className="flex-1 min-w-0 truncate">
                <span className="font-medium">{rp.shikona}</span>
                <span className="text-xs text-muted-foreground ml-1">({rp.rank})</span>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] ${HEALTH_COLORS[rp.healthBand] ?? ""}`}
              >
                {rp.healthBand}
              </Badge>
              <span
                className={`text-[10px] capitalize ${
                  rp.momentum === "rising"
                    ? "text-success"
                    : rp.momentum === "declining"
                      ? "text-destructive"
                      : "text-muted-foreground"
                }`}
              >
                {rp.momentum}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

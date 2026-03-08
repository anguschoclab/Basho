// WelfarePanel.tsx — Welfare & Compliance panel for StablePage
// Surfaces welfare.ts compliance state machine + perception.ts banded data

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, AlertTriangle, Heart, Activity, CheckCircle } from "lucide-react";
import type { WorldState, Heya, ComplianceState } from "@/engine/types";
import { ensureHeyaWelfareState } from "@/engine/welfare";
import { buildPerceptionSnapshot } from "@/engine/perception";
import type { WelfareRiskBand, MoraleBand, RosterStrengthBand } from "@/engine/perception";

const COMPLIANCE_DISPLAY: Record<ComplianceState, { label: string; color: string; description: string; icon: React.ElementType }> = {
  compliant: { label: "Compliant", color: "text-emerald-400", description: "No concerns from the JSA. Your stable operates within regulations.", icon: CheckCircle },
  watch: { label: "Under Watch", color: "text-yellow-400", description: "The JSA has flagged minor concerns. Improve conditions to avoid escalation.", icon: AlertTriangle },
  investigation: { label: "Investigation", color: "text-orange-400", description: "An active investigation is underway. Serious consequences may follow.", icon: Shield },
  sanctioned: { label: "Sanctioned", color: "text-destructive", description: "The JSA has imposed sanctions. Financial penalties and reputation damage are in effect.", icon: AlertTriangle },
};

const WELFARE_RISK_DISPLAY: Record<WelfareRiskBand, { label: string; color: string }> = {
  safe: { label: "Safe", color: "text-emerald-400" },
  cautious: { label: "Cautious", color: "text-yellow-400" },
  elevated: { label: "Elevated", color: "text-orange-400" },
  critical: { label: "Critical", color: "text-destructive" },
};

const MORALE_DISPLAY: Record<MoraleBand, { label: string; color: string }> = {
  inspired: { label: "Inspired", color: "text-emerald-400" },
  content: { label: "Content", color: "text-green-400" },
  neutral: { label: "Neutral", color: "text-muted-foreground" },
  disgruntled: { label: "Disgruntled", color: "text-orange-400" },
  mutinous: { label: "Mutinous", color: "text-destructive" },
};

const ROSTER_DISPLAY: Record<RosterStrengthBand, { label: string; color: string }> = {
  dominant: { label: "Dominant", color: "text-amber-400" },
  strong: { label: "Strong", color: "text-emerald-400" },
  competitive: { label: "Competitive", color: "text-primary" },
  developing: { label: "Developing", color: "text-yellow-400" },
  weak: { label: "Weak", color: "text-muted-foreground" },
};

interface WelfarePanelProps {
  world: WorldState;
  heya: Heya;
}

export function WelfarePanel({ world, heya }: WelfarePanelProps) {
  const welfare = useMemo(() => ensureHeyaWelfareState(heya), [heya]);
  const perception = useMemo(() => buildPerceptionSnapshot(world, heya.id), [world, heya.id]);

  const comp = COMPLIANCE_DISPLAY[welfare.complianceState] ?? COMPLIANCE_DISPLAY.compliant;
  const CompIcon = comp.icon;
  const riskDisplay = WELFARE_RISK_DISPLAY[perception.welfareRiskBand];
  const moraleDisplay = MORALE_DISPLAY[perception.moraleBand];
  const rosterDisplay = ROSTER_DISPLAY[perception.rosterStrengthBand];

  // Visual welfare risk as percentage (0 = safe, 100 = critical)
  const riskPct = Math.min(100, (welfare.welfareRisk / 100) * 100);

  return (
    <div className="space-y-4">
      {/* Compliance Status */}
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

      {/* Welfare Risk & Morale */}
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
              {perception.welfareRiskBand === "safe" && "No welfare concerns. Rikishi are well cared for."}
              {perception.welfareRiskBand === "cautious" && "Minor concerns detected. Monitor injured rikishi closely."}
              {perception.welfareRiskBand === "elevated" && "Elevated risk. Consider reducing training intensity for injured wrestlers."}
              {perception.welfareRiskBand === "critical" && "Critical welfare issues. Immediate action needed to prevent sanctions."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Stable Morale</div>
              <div className={`font-medium text-sm ${moraleDisplay.color}`}>{moraleDisplay.label}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Roster Strength</div>
              <div className={`font-medium text-sm ${rosterDisplay.color}`}>{rosterDisplay.label}</div>
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

      {/* Rikishi Health Overview */}
      {perception.rikishiPerceptions.length > 0 && (
        <Card className="paper">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" /> Rikishi Health Overview
            </CardTitle>
            <CardDescription>Banded health perceptions (no raw stats revealed)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {perception.rikishiPerceptions.slice(0, 12).map(rp => {
                const healthColors: Record<string, string> = {
                  peak: "text-emerald-400",
                  good: "text-green-400",
                  fair: "text-yellow-400",
                  worn: "text-orange-400",
                  fragile: "text-destructive",
                };
                return (
                  <div key={rp.rikishiId} className="flex items-center gap-3 text-sm">
                    <div className="flex-1 min-w-0 truncate">
                      <span className="font-medium">{rp.shikona}</span>
                      <span className="text-xs text-muted-foreground ml-1">({rp.rank})</span>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${healthColors[rp.healthBand] ?? ""}`}>
                      {rp.healthBand}
                    </Badge>
                    <span className={`text-[10px] capitalize ${
                      rp.momentum === "rising" ? "text-emerald-400" :
                      rp.momentum === "declining" ? "text-destructive" : "text-muted-foreground"
                    }`}>
                      {rp.momentum}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

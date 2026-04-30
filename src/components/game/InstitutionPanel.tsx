// InstitutionPanel.tsx
// Displays Welfare Risk, Compliance State, Governance, and Oyakata Persona for a Heya.
// Canon: Beya as an institution.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Shield, HeartPulse, AlertTriangle, Gavel, UserCog } from "lucide-react";
import { formatYen } from "@/utils/engineUtils";
import type { Heya } from "@/engine/types/heya";
import type { Oyakata, OyakataArchetype, OyakataTraits } from "@/engine/types/oyakata";
import {
  SCANDAL_LABELS,
  TRAIT_LABELS,
  clamp,
  getArchetypeDescription,
  toScandalBand,
  toTraitBand,
} from "@/presenters/uiDigest";

/**
 * Simple governance status label mapping (without RNG).
 */
function getGovernanceStatusLabel(status: string): string {
  const labelMap: Record<string, string> = {
    good_standing: "Good Standing",
    warning: "Warning",
    probation: "Probation",
    sanctioned: "Sanctioned",
  };
  return labelMap[status] || status;
}

/**
 * Compliance badge.
 *  * @param state - The State.
 */
function complianceBadge(state: string) {
  switch (state) {
    case "compliant":
      return <Badge variant="secondary">Compliant</Badge>;
    case "watch":
      return <Badge variant="outline">Watch</Badge>;
    case "investigation":
      return <Badge variant="destructive">Investigation</Badge>;
    case "sanctioned":
      return <Badge variant="destructive">Sanctioned</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

/**
 * Risk tone.
 *  * @param risk - The Risk.
 *  * @returns The result.
 */
function riskTone(risk: number): { label: string; icon: React.ElementType } {
  if (risk >= 80) return { label: "Severe", icon: AlertTriangle };
  if (risk >= 60) return { label: "High", icon: AlertTriangle };
  if (risk >= 40) return { label: "Elevated", icon: HeartPulse };
  return { label: "Managed", icon: HeartPulse };
}

/**
 * institution panel.
 *  * @param { heya, oyakata, oyakataQuirks, oyakataTraits } - The component props.
 */
export function InstitutionPanel({
  heya,
  oyakata,
  oyakataQuirks,
  oyakataTraits,
}: {
  heya: Heya;
  oyakata: Oyakata | null | undefined;
  oyakataQuirks: string[];
  oyakataTraits: OyakataTraits | null | undefined;
}) {
  const welfare = (
    heya as Heya & {
      welfareState?: {
        welfareRisk?: number;
        complianceState?: string;
        investigation?: { progress?: number; severity?: string };
        sanctions?: {
          recruitmentFreezeWeeks?: number;
          trainingIntensityCap?: string;
          fineYen?: number;
        };
      };
    }
  ).welfareState;
  const risk = clamp(Number(welfare?.welfareRisk ?? 10), 0, 100);
  const compliance = String(welfare?.complianceState ?? "compliant");
  const inv = welfare?.investigation;
  const sanc = welfare?.sanctions;

  const quirks = oyakataQuirks;
  const traits = oyakataTraits;

  const tone = riskTone(risk);
  const ToneIcon = tone.icon;

  return (
    <Card className="paper">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Institutional Health
        </CardTitle>
        <CardDescription>
          Welfare responsibility, compliance posture, and manager persona.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Welfare */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ToneIcon className="h-4 w-4" />
              <div className="text-sm font-medium">Welfare Risk</div>
              <Badge variant="outline">{tone.label}</Badge>
            </div>
            <div className="flex items-center gap-2">
              {complianceBadge(compliance)}
              {(sanc?.recruitmentFreezeWeeks ?? 0) > 0 && (
                <Badge variant="destructive">Recruitment Freeze</Badge>
              )}
            </div>
          </div>
          <Progress value={risk} />
          <div className="text-xs text-muted-foreground">
            {inv
              ? `Investigation progress: ${Math.round(inv.progress ?? 0)}% — severity ${inv.severity}.`
              : compliance === "watch"
                ? "Regulators are watching closely. Reduce injuries and improve recovery."
                : compliance === "sanctioned"
                  ? "Sanctions active. Remediation required."
                  : "Normal monitoring."}
          </div>
          {sanc?.trainingIntensityCap && (
            <div className="text-xs text-muted-foreground">
              Training cap:{" "}
              <span className="font-medium">{String(sanc.trainingIntensityCap).toUpperCase()}</span>
              {sanc.recruitmentFreezeWeeks ? ` · Freeze: ${sanc.recruitmentFreezeWeeks}w` : ""}
              {sanc.fineYen ? ` · Fine: ${formatYen(Number(sanc.fineYen))}` : ""}
            </div>
          )}
        </div>

        <Separator />

        {/* Governance */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Gavel className="h-4 w-4" />
            <div className="text-sm font-medium">Governance</div>
            <Badge variant="outline">{getGovernanceStatusLabel(heya.governanceStatus)}</Badge>
            {heya.scandalScore >= 20 && (
              <Badge variant="outline">{SCANDAL_LABELS[toScandalBand(heya.scandalScore)]}</Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Scandal score decays slowly over time. Welfare issues can escalate scrutiny even faster.
          </div>
        </div>

        <Separator />

        {/* Oyakata Persona */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            <div className="text-sm font-medium">Oyakata Persona</div>
            {oyakata?.archetype && <Badge variant="secondary">{oyakata.archetype}</Badge>}
          </div>
          {oyakata?.archetype && (
            <div className="text-xs text-muted-foreground">
              {getArchetypeDescription(oyakata.archetype as OyakataArchetype)}
            </div>
          )}

          {traits && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              {(
                [
                  ["Ambition", traits.ambition],
                  ["Patience", traits.patience],
                  ["Risk", traits.risk],
                  ["Tradition", traits.tradition],
                  ["Compassion", traits.compassion],
                ] as Array<[string, number]>
              ).map(([label, v]) => {
                const band = toTraitBand(v);
                return (
                  <div key={label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium">{TRAIT_LABELS[band]}</span>
                    </div>
                    <Progress value={clamp(v, 0, 100)} />
                  </div>
                );
              })}
            </div>
          )}

          {quirks.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {quirks.slice(0, 6).map((q) => (
                <Badge key={q} variant="outline">
                  {q}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

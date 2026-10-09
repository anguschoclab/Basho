/**
 * InstitutionPanelSections.tsx
 *
 * Institution panel sections — welfare risk, governance, and the
 * oyakata persona block — plus the shared tone/badge helpers.
 */

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { HeartPulse, AlertTriangle, Gavel, UserCog } from "lucide-react";
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

export type WelfareState = {
  welfareRisk?: number;
  complianceState?: string;
  investigation?: { progress?: number; severity?: string };
  sanctions?: {
    recruitmentFreezeWeeks?: number;
    trainingIntensityCap?: string;
    fineYen?: number;
  };
};

function getGovernanceStatusLabel(status: string): string {
  const labelMap: Record<string, string> = {
    good_standing: "Good Standing",
    warning: "Warning",
    probation: "Probation",
    sanctioned: "Sanctioned",
  };
  return labelMap[status] || status;
}

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

function riskTone(risk: number): { label: string; icon: React.ElementType } {
  if (risk >= 80) return { label: "Severe", icon: AlertTriangle };
  if (risk >= 60) return { label: "High", icon: AlertTriangle };
  if (risk >= 40) return { label: "Elevated", icon: HeartPulse };
  return { label: "Managed", icon: HeartPulse };
}

/** Welfare risk row — progress bar, compliance badge, sanctions detail. */
export function WelfareSection({
  risk,
  compliance,
  welfare,
}: {
  risk: number;
  compliance: string;
  welfare: WelfareState | undefined;
}) {
  const inv = welfare?.investigation;
  const sanc = welfare?.sanctions;
  const tone = riskTone(risk);
  const ToneIcon = tone.icon;

  return (
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
  );
}

/** Governance row — standing badge + optional scandal band. */
export function GovernanceSection({ heya }: { heya: Heya }) {
  return (
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
  );
}

/** Oyakata persona — archetype description, trait bars, quirks. */
export function PersonaSection({
  oyakata,
  quirks,
  traits,
}: {
  oyakata: Oyakata | null | undefined;
  quirks: string[];
  traits: OyakataTraits | null | undefined;
}) {
  return (
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
  );
}

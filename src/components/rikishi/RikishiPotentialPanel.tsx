/**
 * RikishiPotentialPanel.tsx
 *
 * Displays Current Ability (CA) vs Potential Ability (PA) for each stat,
 * plus size maturity (current vs projected mature size).
 *
 * Only shown for owned rikishi (player's heya). For opposing rikishi, consult
 * the scouting views instead.
 */

import type { Rikishi } from "@/engine/types";
import { TrendingUp } from "lucide-react";
import { NarrativeService } from "@/engine/systems/narrative/NarrativeService";
import { SeededRNG } from "@/engine/rng";
import { toStatBand } from "@/engine/descriptorBands";
import { STAT_LABELS as STAT_BAND_LABELS } from "@/presenters/uiConstants";

interface Props {
  rikishi: Rikishi;
  isOwned: boolean;
}

const STAT_LABELS: Array<[keyof NonNullable<Rikishi["potential"]>["stats"], string]> = [
  ["strength", "Strength"],
  ["speed", "Speed"],
  ["stamina", "Stamina"],
  ["technique", "Technique"],
  ["balance", "Balance"],
  ["mental", "Mental"],
  ["adaptability", "Adaptability"],
];

const CURRENT_KEY: Record<string, keyof Rikishi> = {
  strength: "power",
  speed: "speed",
  stamina: "stamina",
  technique: "technique",
  balance: "balance",
  mental: "mental",
  adaptability: "adaptability",
};

export function RikishiPotentialPanel({ rikishi, isOwned }: Props) {
  if (!rikishi.potential) return null;
  if (!isOwned) return null; // Opposing rikishi: use scouting views

  const pa = rikishi.potential;
  const ceiling = pa.ceilingFraction;

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-display font-black flex items-center gap-2 uppercase tracking-tight">
        <TrendingUp className="h-5 w-5 text-primary" /> Potential
      </h3>

      <div className="bg-muted/30 border-2 border-border/50 rounded-lg p-6 space-y-3">
        {STAT_LABELS.map(([paKey, label]) => {
          const paValue = Math.round(
            (pa.stats as unknown as Record<string, number>)[paKey] * ceiling
          );
          const currentValue = Math.round(
            (rikishi as unknown as Record<string, number>)[CURRENT_KEY[paKey]] ?? 0
          );
          const paPct = Math.min(100, paValue);
          const caPct = Math.min(100, currentValue);
          const gap = Math.max(0, paPct - caPct);
          return (
            <div key={paKey} className="space-y-1">
              <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                <span className="text-muted-foreground">{label}</span>
                <span>
                  <span className="text-foreground">{STAT_BAND_LABELS[toStatBand(currentValue)]}</span>
                  <span className="text-muted-foreground"> / {STAT_BAND_LABELS[toStatBand(paValue)]}</span>
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                {/* Potential band (lighter, full width to PA) */}
                <div
                  className="absolute inset-y-0 left-0 bg-primary/25"
                  style={{ width: `${paPct}%` }}
                />
                {/* Current ability bar */}
                <div
                  className="absolute inset-y-0 left-0 bg-primary"
                  style={{ width: `${caPct}%` }}
                />
                {/* Growth headroom pulse */}
                {gap > 2 && (
                  <div
                    className="absolute inset-y-0 bg-primary/40"
                    style={{ left: `${caPct}%`, width: `${gap}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* Size maturity */}
        <div className="pt-3 border-t border-border/40 grid grid-cols-2 gap-4">
          <SizeRow label="Height" current={rikishi.height} potential={pa.heightCm} unit="cm" />
          <SizeRow label="Weight" current={rikishi.weight} potential={pa.weightKg} unit="kg" />
        </div>

        <div className="pt-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Development profile: <span className="text-foreground">{formatProfile(pa.profile)}</span>
        </div>
      </div>
    </div>
  );
}

function SizeRow({
  label,
  current,
  potential,
  unit,
}: {
  label: string;
  current: number;
  potential: number;
  unit: string;
}) {
  const pct = potential > 0 ? Math.min(100, (current / potential) * 100) : 0;
  const rng = new SeededRNG("potential-panel");
  const heightBand = label === "Height" ? NarrativeService.getHeightBand(current) : null;
  const weightBand = label === "Weight" ? NarrativeService.getWeightBand(current) : null;
  const heightLabel = heightBand ? NarrativeService.getHeightLabel(rng, heightBand) : null;
  const weightLabel = weightBand ? NarrativeService.getWeightLabel(rng, weightBand) : null;
  const descriptor = heightLabel || weightLabel;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
        <span className="text-muted-foreground">{label}</span>
        <span>
          {Math.round(current)}
          <span className="text-muted-foreground">
            {" "}
            / {Math.round(potential)} {unit}
          </span>
        </span>
      </div>
      {descriptor && (
        <div className="text-[9px] text-muted-foreground/60">{descriptor}</div>
      )}
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-primary/25 w-full" />
        <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function formatProfile(profile: string): string {
  switch (profile) {
    case "prodigy":
      return "Prodigy";
    case "late_bloomer":
      return "Late Bloomer";
    case "journeyman":
      return "Journeyman";
    case "early_peaker":
      return "Early Peaker";
    default:
      return "Standard";
  }
}

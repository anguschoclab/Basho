/**
 * TrainingHeader.tsx
 *
 * Training page header section.
 */

import { Dumbbell } from "lucide-react";
import { StableName } from "@/components/ClickableName";
import { getIntensityLabel } from "@/presenters/uiDigest";
import type { TrainingIntensity } from "@/engine/types/training";
import type { Heya } from "@/engine/types/heya";
import type { Rikishi } from "@/engine/types";

interface TrainingHeaderProps {
  heya: Heya;
  rikishiList: Rikishi[];
  currentIntensity: TrainingIntensity;
}

export function TrainingHeader({ heya, rikishiList, currentIntensity }: TrainingHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b-2 border-border/20">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-2 bg-primary rounded-full" />
          <h1 className="text-5xl font-display font-black tracking-tight uppercase sumi-e-ink">
            Training Ground
          </h1>
        </div>
        <p className="text-sm font-medium text-muted-foreground opacity-70 flex items-center gap-2">
          <Dumbbell className="h-4 w-4" /> Professional development and physical conditioning for{" "}
          <StableName id={heya.id} name={heya.name} /> Stable.
        </p>
      </div>

      <div className="flex gap-4">
        <div className="dossier-paper p-3 px-6 rounded-lg flex items-center gap-6 shadow-xs">
          <div className="text-center border-r pr-6">
            <p className="pro-header">Current Regime</p>
            <p className="font-display font-black text-sm uppercase tracking-tighter text-primary">
              {getIntensityLabel(currentIntensity)} Intensity
            </p>
          </div>
          <div className="text-center">
            <p className="pro-header">Roster Load</p>
            <p className="font-display font-black text-sm uppercase tracking-tighter">
              {rikishiList.length} Active Slots
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

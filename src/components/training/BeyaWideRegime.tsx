/**
 * BeyaWideRegime.tsx
 *
 * Beya-wide training regime controls.
 */

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { LayoutDashboard, Target, Heart } from "lucide-react";
import {
  INTENSITY_MULTIPLIERS,
  FOCUS_BIAS_MATRIX,
  RECOVERY_MULTIPLIERS,
  describeTrainingEffect,
  getFocusLabel,
  getRecoveryLabel,
} from "@/presenters/uiDigest";
import type {
  TrainingIntensity,
  TrainingFocus,
  RecoveryEmphasis,
  HeyaTrainingState,
} from "@/engine/types/training";

interface BeyaWideRegimeProps {
  trainingState: HeyaTrainingState;
  onIntensityChange: (intensity: TrainingIntensity) => void;
  onFocusChange: (focus: TrainingFocus) => void;
  onRecoveryChange: (recovery: RecoveryEmphasis) => void;
}

export function BeyaWideRegime({
  trainingState,
  onIntensityChange,
  onFocusChange,
  onRecoveryChange,
}: BeyaWideRegimeProps) {
  return (
    <section className="grid gap-8 md:grid-cols-3">
      {/* Intensity Module */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-4 w-4 text-primary" />
          <h3 className="pro-header">Intensity Level</h3>
        </div>
        <div className="grid gap-2">
          {(Object.keys(INTENSITY_MULTIPLIERS) as TrainingIntensity[]).map((intensity) => {
            const isActive = trainingState.activeProfile.intensity === intensity;
            const eff = INTENSITY_MULTIPLIERS[intensity];
            return (
              <TooltipWrap
                key={intensity}
                content={`${describeTrainingEffect(eff.growth)} growth rate with ${eff.fatigue}x fatigue impact`}
                side="right"
              >
                <button
                  onClick={() => onIntensityChange(intensity)}
                  aria-label={`Set intensity to ${intensity}`}
                  className={cn(
                    "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
                    "dossier-paper p-4 text-left rounded-lg transition-all relative overflow-hidden group w-full",
                    isActive
                      ? "border-primary bg-primary/[0.03] ring-4 ring-primary/5 shadow-xl border-2"
                      : "opacity-60 hover:opacity-100"
                  )}
                >
                  <div className="flex justify-between items-center relative z-10">
                    <div className="font-display font-black text-sm uppercase truncate">
                      {intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[8px] font-black tracking-[0.2em]",
                        isActive ? "bg-primary text-white border-0" : "opacity-50"
                      )}
                    >
                      {describeTrainingEffect(eff.growth)}
                    </Badge>
                  </div>
                  {isActive && <div className="absolute top-0 right-0 h-1 w-full bg-primary" />}
                </button>
              </TooltipWrap>
            );
          })}
        </div>
      </div>

      {/* Focus Area Module */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="pro-header">Tactical Focus</h3>
        </div>
        <div className="grid gap-2">
          {(Object.keys(FOCUS_BIAS_MATRIX) as TrainingFocus[]).map((focus) => {
            const isActive = trainingState.activeProfile.focus === focus;
            return (
              <TooltipWrap
                key={focus}
                content={`Prioritize ${getFocusLabel(focus)} development for the entire stable`}
                side="right"
              >
                <button
                  onClick={() => onFocusChange(focus)}
                  aria-label={`Set tactical focus to ${getFocusLabel(focus)}`}
                  className={cn(
                    "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
                    "dossier-paper p-4 text-left rounded-lg transition-all relative overflow-hidden w-full",
                    isActive
                      ? "border-primary bg-primary/[0.03] ring-4 ring-primary/5 shadow-xl border-2"
                      : "opacity-60 hover:opacity-100"
                  )}
                >
                  <div className="font-display font-black text-sm uppercase mb-0.5">
                    {getFocusLabel(focus)}
                  </div>
                  <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest opacity-60">
                    Balanced Development
                  </p>
                  {isActive && <div className="absolute top-0 right-0 h-1 w-full bg-primary" />}
                </button>
              </TooltipWrap>
            );
          })}
        </div>
      </div>

      {/* Recovery Module */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Heart className="h-4 w-4 text-primary" />
          <h3 className="pro-header">Recovery Discipline</h3>
        </div>
        <div className="grid gap-2">
          {(Object.keys(RECOVERY_MULTIPLIERS) as RecoveryEmphasis[]).map((recovery) => {
            const isActive = trainingState.activeProfile.recovery === recovery;
            return (
              <TooltipWrap
                key={recovery}
                content={`Shift emphasis to ${getRecoveryLabel(recovery)} within the rest cycle`}
                side="right"
              >
                <button
                  onClick={() => onRecoveryChange(recovery)}
                  aria-label={`Set recovery discipline to ${getRecoveryLabel(recovery)}`}
                  className={cn(
                    "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
                    "dossier-paper p-4 text-left rounded-lg transition-all relative overflow-hidden w-full",
                    isActive
                      ? "border-primary bg-primary/[0.03] ring-4 ring-primary/5 shadow-xl border-2"
                      : "opacity-60 hover:opacity-100"
                  )}
                >
                  <div className="font-display font-black text-sm uppercase mb-0.5">
                    {getRecoveryLabel(recovery)}
                  </div>
                  <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest opacity-60">
                    Rest Cycle Emphasis
                  </p>
                  {isActive && <div className="absolute top-0 right-0 h-1 w-full bg-primary" />}
                </button>
              </TooltipWrap>
            );
          })}
        </div>
      </div>
    </section>
  );
}

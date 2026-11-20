/**
 * WizardNav.tsx
 * =============
 * Shared Back/Next navigation row for the new-game wizard steps — the
 * ghost Back button and the emphasis Next button were duplicated across
 * steps with only the label/icon/disabled-reason varying.
 */

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WizardNavProps {
  /** Omit to hide the Back button (first step). */
  onPrev?: () => void;
  onNext: () => void;
  /** Forward CTA label (e.g. "Verify Allegiance"). */
  nextLabel: React.ReactNode;
  /** Forward CTA icon — defaults to ArrowRight. */
  nextIcon?: React.ReactNode;
  nextDisabled?: boolean;
  /** Tooltip shown on the disabled Next button. */
  nextDisabledTooltip?: string;
  /** Extra classes on the Next button (step-specific sizing). */
  nextClassName?: string;
}

/**
 * Wizard Back/Next navigation row — ghost Back button (omitted when `onPrev` is undefined) plus emphasis Next button with optional icon and disabled-tooltip.
 */
export function WizardNav({
  onPrev,
  onNext,
  nextLabel,
  nextIcon,
  nextDisabled = false,
  nextDisabledTooltip,
  nextClassName,
}: WizardNavProps) {
  const nextTooltipProps =
    nextDisabled && nextDisabledTooltip
      ? { tooltip: nextDisabledTooltip, tooltipSide: "top" as const }
      : {};
  return (
    <div className={cn("flex flex-wrap gap-3 pt-4", onPrev ? "justify-between" : "justify-end")}>
      {onPrev && (
        <Button
          variant="ghost"
          onClick={onPrev}
          className="h-16 px-4 sm:px-8 gap-3 font-display font-black uppercase tracking-widest text-muted-foreground"
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </Button>
      )}
      <Button
        onClick={onNext}
        disabled={nextDisabled}
        className={cn(
          "h-16 px-6 sm:px-10 gap-3 font-display font-black uppercase tracking-widest text-base sm:text-lg shadow-2xl rounded-lg hover:scale-105 transition-transform",
          nextClassName
        )}
        {...nextTooltipProps}
      >
        {nextLabel} {nextIcon ?? <ArrowRight className="w-6 h-6" />}
      </Button>
    </div>
  );
}

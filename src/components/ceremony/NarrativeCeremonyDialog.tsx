import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Scroll } from "lucide-react";

export interface NarrativeCeremonyDialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  cardContent: React.ReactNode;
  cardClassName?: string;
  middleContent?: React.ReactNode;
  steps: string[];
  finalVerdictContent?: React.ReactNode;
  finalVerdictClassName?: string;
}

export function NarrativeCeremonyDialog({
  open,
  onClose,
  title,
  subtitle,
  cardContent,
  cardClassName = "flex items-center gap-4 p-4 rounded-lg bg-muted/50",
  middleContent,
  steps,
  finalVerdictContent,
  finalVerdictClassName = "p-4 rounded-lg border text-center border-muted bg-muted/30",
}: NarrativeCeremonyDialogProps) {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">{title}</DialogTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </DialogHeader>

        <div className="space-y-4">
          {/* Card */}
          <div className={cardClassName}>{cardContent}</div>

          <Separator />

          {middleContent}

          {/* Narrative */}
          <div className="min-h-[80px] p-4 rounded-lg border bg-card">
            <div className="flex items-start gap-3">
              <Scroll className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed italic">{steps[step]}</p>
            </div>
          </div>

          {/* Final step */}
          {step === steps.length - 1 && finalVerdictContent && (
            <div className={finalVerdictClassName}>{finalVerdictContent}</div>
          )}

          <Button onClick={handleNext} className="w-full">
            {step < steps.length - 1 ? "Continue" : "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

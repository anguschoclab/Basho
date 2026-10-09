/**
 * IdentityStep.tsx
 *
 * Step 1: Establish identity for new game wizard.
 * Features a 7-card backstory grid with difficulty badges and bonus chips.
 */

import { CircleUser, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NameInputRow, BackstoryGrid } from "./IdentityStepSections";

interface IdentityStepProps {
  oyakataName: string;
  background: string;
  onNameChange: (name: string) => void;
  onBackgroundChange: (background: string) => void;
  onRandomName: () => void;
  onNext: () => void;
}

export function IdentityStep({
  oyakataName,
  background,
  onNameChange,
  onBackgroundChange,
  onRandomName,
  onNext,
}: IdentityStepProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div className="glass rounded-lg p-8 shadow-2xl border-2 border-primary/10">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-primary/10 rounded-lg">
            <CircleUser className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-black uppercase tracking-tight">
              Establish Your Identity
            </h2>
            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground opacity-60">
              Association Registry Phase 1
            </p>
          </div>
        </div>

        <div className="space-y-10">
          <NameInputRow
            oyakataName={oyakataName}
            onNameChange={onNameChange}
            onRandomName={onRandomName}
          />

          <BackstoryGrid background={background} onBackgroundChange={onBackgroundChange} />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={onNext}
          disabled={!oyakataName.trim()}
          className="h-16 px-10 gap-3 font-display font-black uppercase tracking-widest text-lg shadow-2xl rounded-lg hover:scale-105 transition-transform"
          {...(!oyakataName.trim()
            ? { tooltip: "Enter a name to continue", tooltipSide: "top" }
            : {})}
        >
          Next Submission <ArrowRight className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}

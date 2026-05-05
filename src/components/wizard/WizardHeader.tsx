/**
 * WizardHeader.tsx
 *
 * Hero header for new game wizard with step indicators.
 */

import { History } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardHeaderProps {
  currentStep: number;
  totalSteps?: number;
}

export function WizardHeader({ currentStep, totalSteps = 4 }: WizardHeaderProps) {
  return (
    <section className="w-full bg-primary pt-16 pb-12 px-6 overflow-hidden flex flex-col items-center text-center shadow-2xl relative">
      <div className="absolute top-0 opacity-5 font-display text-[15vw] font-black pointer-events-none uppercase tracking-tighter leading-none -mt-10">
        INAUGURATION
      </div>

      <div className="relative z-10 space-y-4">
        <div className="h-14 w-14 bg-white/10 rounded-full mx-auto flex items-center justify-center border border-white/20 animate-in zoom-in duration-500">
          <History className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-4xl font-display font-black tracking-tight text-white uppercase sumi-e-ink">
          Begin Your Legacy
        </h1>
        <div className="flex items-center gap-1 justify-center">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                s === currentStep ? "w-12 bg-white" : "w-6 bg-white/20"
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

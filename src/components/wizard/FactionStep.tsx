/**
 * FactionStep.tsx
 *
 * Step 2: Choose ichimon for new game wizard.
 */

import { Building2, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ICHIMON_FACTIONS } from "../../constants/ui/wizard";
import { FactionCard } from "./FactionStepSections";
import type { IchimonName } from "@/engine/types/economy";

interface FactionStepProps {
  ichimon: IchimonName | "";
  onIchimonChange: (ichimon: IchimonName) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function FactionStep({ ichimon, onIchimonChange, onNext, onPrev }: FactionStepProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-10 duration-700">
      <div className="glass rounded-lg p-8 shadow-2xl border-2 border-primary/10">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-black uppercase tracking-tight">
              Choose Your Ichimon
            </h2>
            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground opacity-60">
              Faction Alignment Phase 2
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {ICHIMON_FACTIONS.map((faction) => (
            <FactionCard
              key={faction.id}
              faction={faction}
              isSelected={ichimon === faction.id}
              onSelect={onIchimonChange}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button
          variant="ghost"
          onClick={onPrev}
          className="h-16 px-8 gap-3 font-display font-black uppercase tracking-widest text-muted-foreground"
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </Button>
        <Button
          onClick={onNext}
          className="h-16 px-10 gap-3 font-display font-black uppercase tracking-widest text-lg shadow-2xl rounded-lg hover:scale-105 transition-transform"
        >
          Verify Allegiance <ArrowRight className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}

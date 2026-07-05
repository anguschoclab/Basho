/**
 * FactionStep.tsx
 *
 * Step 2: Choose ichimon for new game wizard.
 */

import { Building2, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ICHIMON_FACTIONS } from "../../constants/ui/wizard";

const ICHIMON_MECHANICS: Record<string, { bonus: string; politics: string }> = {
  dewanoumi: { bonus: "+5% Power training", politics: "High (300)" },
  nishonoseki: { bonus: "+5% Speed training", politics: "Medium (250)" },
  takasago: { bonus: "+10% Mental training", politics: "Standard (100)" },
  tokitsukaze: { bonus: "+10% Stamina training", politics: "Standard (100)" },
  isegahama: { bonus: "+5% Technique & Balance training", politics: "Standard (100)" },
};

interface FactionStepProps {
  ichimon: string;
  onIchimonChange: (ichimon: string) => void;
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
          {ICHIMON_FACTIONS.map((faction) => {
            const isSelected = ichimon === faction.id;
            return (
              <div
                key={faction.id}
                className={cn(
                  "dossier-paper p-6 rounded-lg cursor-pointer transition-all group relative overflow-hidden",
                  isSelected
                    ? "border-primary border-2 bg-primary/[0.03] ring-4 ring-primary/5 shadow-xl"
                    : "opacity-70 hover:opacity-100"
                )}
                onClick={() => onIchimonChange(faction.id)}
              >
                <div className="absolute top-2 right-4 opacity-5 font-display text-4xl font-black">
                  {faction.ja}
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle2
                    className={cn("h-5 w-5", isSelected ? "text-primary scale-125" : "opacity-20")}
                  />
                  <h3 className="font-display font-black text-xl tracking-tight">{faction.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-8 italic">
                  "{faction.description}"
                </p>
                {(() => {
                  const mech = ICHIMON_MECHANICS[faction.id];
                  if (!mech) return null;
                  return (
                    <div className="mt-3 pl-8 space-y-1">
                      <p className="text-xs font-semibold text-primary">
                        {mech.bonus}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Political Weight: {mech.politics}
                      </p>
                    </div>
                  );
                })()}
              </div>
            );
          })}
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

/**
 * StableStep.tsx
 *
 * Step 3: Acquire stable for new game wizard.
 */

import { Building, Sparkles } from "lucide-react";
import { WizardNav } from "@/components/wizard/WizardNav";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StableCard } from "@/components/wizard/StableStepSections";
import type { Heya } from "@/engine/types/heya";
import type { WorldState } from "@/presenters/uiDigest";

interface StableStepProps {
  stables: Heya[];
  /** Optional world — used to render each stable's oyakata portrait. */
  world?: WorldState | null;
  selectedHeyaId: string | null;
  onHeyaSelect: (heyaId: string) => void;
  onPrev: () => void;
  onFinish: () => void;
}

export function StableStep({
  stables,
  world,
  selectedHeyaId,
  onHeyaSelect,
  onPrev,
  onFinish,
}: StableStepProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-10 duration-700">
      <div className="glass rounded-lg p-8 shadow-2xl border-2 border-primary/10">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Building className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-black uppercase tracking-tight">
              Acquire a Professional Stable
            </h2>
            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground opacity-60">
              Property Acquisition Phase 3
            </p>
          </div>
        </div>

        <ScrollArea className="h-[500px] pr-4">
          <div className="grid gap-4 md:grid-cols-2">
            {stables.map((heya) => (
              <StableCard
                key={heya.id}
                heya={heya}
                oyakata={heya.oyakataId ? (world?.oyakata.get(heya.oyakataId) ?? null) : null}
                isSelected={selectedHeyaId === heya.id}
                onSelect={onHeyaSelect}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      <WizardNav
        onPrev={onPrev}
        onNext={onFinish}
        nextLabel="Begin Journey"
        nextIcon={<Sparkles className="w-6 h-6" />}
        nextDisabled={!selectedHeyaId}
        nextDisabledTooltip="Select a stable to continue"
        nextClassName="sm:px-12 sm:text-xl shadow-[var(--shadow-lg)] bg-primary text-primary-foreground"
      />
    </div>
  );
}

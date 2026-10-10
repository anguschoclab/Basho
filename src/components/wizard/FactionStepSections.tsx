/**
 * FactionStepSections.tsx
 *
 * Ichimon faction cards for the new game wizard — selectable dossier
 * cards with training bonuses and political weight summaries.
 */

import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { activationKeyHandler } from "@/lib/a11y";
import { ICHIMON_FACTIONS } from "../../constants/ui/wizard";

const ICHIMON_MECHANICS: Record<string, { bonus: string; politics: string }> = {
  Dewanoumi: { bonus: "+5% Power training", politics: "High (300)" },
  Nishonoseki: { bonus: "+5% Speed training", politics: "Medium (250)" },
  Takasago: { bonus: "+10% Mental training", politics: "Standard (100)" },
  Tokitsukaze: { bonus: "+10% Stamina training", politics: "Standard (100)" },
  Isegahama: { bonus: "+5% Technique & Balance training", politics: "Standard (100)" },
};

type IchimonFaction = (typeof ICHIMON_FACTIONS)[number];

/** Training bonus + political weight for a faction, if defined. */
function FactionMechanics({ factionId }: { factionId: string }) {
  const mech = ICHIMON_MECHANICS[factionId];
  if (!mech) return null;
  return (
    <div className="mt-3 pl-8 space-y-1">
      <p className="text-xs font-semibold text-primary">{mech.bonus}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
        Political Weight: {mech.politics}
      </p>
    </div>
  );
}

/** Single ichimon dossier card — selectable via click, Enter, or Space. */
export function FactionCard({
  faction,
  isSelected,
  onSelect,
}: {
  faction: IchimonFaction;
  isSelected: boolean;
  onSelect: (id: IchimonFaction["id"]) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Select ${faction.name} faction`}
      className={cn(
        "dossier-paper p-6 rounded-lg cursor-pointer transition-all group relative overflow-hidden",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
        isSelected
          ? "border-primary border-2 bg-primary/[0.03] ring-4 ring-primary/5 shadow-xl"
          : "opacity-70 hover:opacity-100"
      )}
      onClick={() => onSelect(faction.id)}
      onKeyDown={activationKeyHandler(() => onSelect(faction.id))}
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
      <FactionMechanics factionId={faction.id} />
    </div>
  );
}

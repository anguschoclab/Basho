/**
 * StableStepSections.tsx
 *
 * Stable acquisition cards for the new game wizard — selectable heya
 * cards with stature/facilities badges and flavor descriptors.
 */

import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { activationKeyHandler } from "@/lib/a11y";
import type { Heya } from "@/engine/types/heya";

/** Single stable card — selectable via click, Enter, or Space. */
export function StableCard({
  heya,
  isSelected,
  onSelect,
}: {
  heya: Heya;
  isSelected: boolean;
  onSelect: (heyaId: string) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Select ${heya.name}`}
      aria-pressed={isSelected}
      className={cn(
        "dossier-paper p-5 rounded-lg cursor-pointer transition-all relative overflow-hidden group",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
        isSelected
          ? "border-primary border-2 bg-primary/[0.03] ring-4 ring-primary/5 shadow-xl"
          : "opacity-80 hover:opacity-100"
      )}
      onClick={() => onSelect(heya.id)}
      onKeyDown={activationKeyHandler(() => onSelect(heya.id))}
    >
      {isSelected && (
        <div className="absolute top-0 right-0 bg-primary text-white p-2 rounded-bl-xl shadow-lg z-10">
          <CheckCircle2 className="h-4 w-4" />
        </div>
      )}
      <div className="space-y-3">
        <div>
          <div className="font-display font-black text-xl tracking-tight group-hover:text-primary transition-colors">
            {heya.name}
          </div>
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em]">
            {heya.location || "Tokyo"} • {new Set(heya.rikishiIds ?? []).size} Professional
            Wrestlers
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="secondary"
            className="text-[10px] font-black uppercase tracking-widest h-5 bg-primary/10 border-primary/20 text-primary"
          >
            {heya.statureBand}
          </Badge>
          <Badge
            variant="outline"
            className="text-[10px] font-black uppercase tracking-widest h-5 border-2"
          >
            {heya.facilitiesBand}
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground line-clamp-2 italic italic">
          "{heya.descriptor || "A stable with a long-standing history of training excellence."}"
        </p>
      </div>
    </div>
  );
}

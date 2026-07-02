/**
 * StableStep.tsx
 *
 * Step 3: Acquire stable for new game wizard.
 */

import { Building, ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Heya } from "@/engine/types/heya";

interface StableStepProps {
  stables: Heya[];
  selectedHeyaId: string | null;
  onHeyaSelect: (heyaId: string) => void;
  onPrev: () => void;
  onFinish: () => void;
}

export function StableStep({
  stables,
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
            {stables.map((heya: Heya) => (
              <div
                key={heya.id}
                className={cn(
                  "dossier-paper p-5 rounded-lg cursor-pointer transition-all relative overflow-hidden group",
                  selectedHeyaId === heya.id
                    ? "border-primary border-2 bg-primary/[0.03] ring-4 ring-primary/5 shadow-xl"
                    : "opacity-80 hover:opacity-100"
                )}
                onClick={() => onHeyaSelect(heya.id)}
              >
                {selectedHeyaId === heya.id && (
                  <div className="absolute top-0 right-0 bg-primary text-white p-2 rounded-bl-xl shadow-lg z-10">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <div className="font-display font-black text-xl tracking-tight group-hover:text-primary transition-colors">
                      {heya.name}
                    </div>
                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                      {heya.location || "Tokyo"} • {heya.rikishiIds?.length || 0} Professional
                      Wrestlers
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="secondary"
                      className="text-[8px] font-black uppercase tracking-widest h-5 bg-primary/10 border-primary/20 text-primary"
                    >
                      {heya.statureBand}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-[8px] font-black uppercase tracking-widest h-5 border-2"
                    >
                      {heya.facilitiesBand}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 italic italic">
                    "
                    {heya.descriptor ||
                      "A stable with a long-standing history of training excellence."}
                    "
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
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
          onClick={onFinish}
          disabled={!selectedHeyaId}
          className="h-16 px-12 gap-3 font-display font-black uppercase tracking-widest text-xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] rounded-lg bg-primary text-white hover:scale-105 transition-transform"
          {...(!selectedHeyaId
            ? { tooltip: "Select a stable to continue", tooltipSide: "top" }
            : {})}
        >
          Begin Journey <Sparkles className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}

import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { User, Award, History, ArrowRight } from "lucide-react";
import { DynastyService } from "@/engine/systems/legacy/DynastyService";
import type { WorldState } from "@/presenters/uiDigest";
import type { Id } from "@/engine/types/common";
import { cn } from "@/lib/utils";

interface SuccessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  world: WorldState;
  heyaId: Id;
  onSelect: (successorId: string) => void;
}

export function SuccessionModal({
  isOpen,
  onClose,
  world,
  heyaId,
  onSelect,
}: SuccessionModalProps) {
  const heya = world.heyas.get(heyaId);
  const oyakata = world.oyakata?.get(heya?.oyakataId ?? "");

  const candidates = useMemo(() => {
    const ids = DynastyService.findEligibleSuccessors(world, heyaId);
    return ids
      .map((id) => world.rikishi.get(id))
      .filter((c): c is NonNullable<typeof c> => c != null);
  }, [world, heyaId]);

  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  if (!heya || !oyakata) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] paper border-amber-600/30">
        <DialogHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-gold/10 text-gold">
              <History className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold font-display uppercase tracking-tight">
                The Rite of Succession
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Oyakata {oyakata.name} has reached the venerable age of 60. It is time to appoint a
                successor to lead {heya.name} into the next era.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-6">
          <h4 className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-4">
            Eligible Candidates (Roster & Alumni)
          </h4>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {candidates.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group",
                    selectedId === c.id
                      ? "bg-gold/10 border-gold shadow-lg"
                      : "bg-muted/40 border-border hover:border-border/60"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:text-gold transition-colors">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold font-display text-lg">{c.shikona}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <Badge variant="secondary" className="text-[9px] uppercase font-black">
                          {c.rank}
                        </Badge>
                        <span>{c.makuuchiWins} Career Wins</span>
                        {c.heyaId !== heyaId && (
                          <Badge
                            variant="outline"
                            className="text-[9px] uppercase border-primary/30 text-primary"
                          >
                            Alumni
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {selectedId === c.id && (
                    <div className="p-1 rounded-full bg-gold text-background">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}

              {candidates.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 text-center bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
                  <Award className="h-8 w-8 text-slate-700 mb-2" />
                  <p className="text-xs text-slate-500 px-8">
                    There are currently no Sekitori-ranked pupils or alumni eligible for succession.
                    You must wait for an elite student to rise.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="bg-slate-900/50 -mx-6 -mb-6 p-6 rounded-b-lg border-t border-slate-800">
          <div className="flex flex-col sm:flex-row gap-4 w-full items-center justify-between">
            <p className="text-[10px] text-slate-500 max-w-[200px] leading-tight">
              A successor inherits the stable's Training Philosophy, but their archetype will
              gradually influence the stable's style.
            </p>
            <Button
              disabled={!selectedId}
              className="w-full sm:w-auto font-black uppercase tracking-widest bg-gold hover:bg-gold/90 text-background transition-all shadow-lg"
              onClick={() => selectedId && onSelect(selectedId)}
              {...(!selectedId
                ? { tooltip: "Select a successor to finalize", tooltipSide: "top" }
                : {})}
            >
              Finalize Succession
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

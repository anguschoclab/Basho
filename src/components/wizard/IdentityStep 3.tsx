/**
 * IdentityStep.tsx
 *
 * Step 1: Establish identity for new game wizard.
 */

import { CircleUser, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatYenToMan } from "@/utils/engineUtils";
import { OYAKATA_BACKGROUNDS } from "./wizardConstants";

interface IdentityStepProps {
  oyakataName: string;
  background: string;
  onNameChange: (name: string) => void;
  onBackgroundChange: (background: string) => void;
  onNext: () => void;
}

export function IdentityStep({
  oyakataName,
  background,
  onNameChange,
  onBackgroundChange,
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
          <div className="space-y-3">
            <Label htmlFor="oyakataName" className="pro-header">
              Official Elder Name (Toshiyori-mei)
            </Label>
            <Input
              id="oyakataName"
              placeholder="e.g. Takanohana"
              value={oyakataName}
              onChange={(e) => onNameChange(e.target.value)}
              className="h-16 text-2xl font-display font-black border-2 focus:border-primary px-6 rounded-lg shadow-inner bg-muted/30"
            />
            <p className="text-xs text-muted-foreground italic font-medium opacity-60">
              This name will be inscribed in the Association's professional directory.
            </p>
          </div>

          <div className="space-y-4">
            <Label className="pro-header">Professional History & Background</Label>
            <div className="grid gap-4 md:grid-cols-3">
              {OYAKATA_BACKGROUNDS.map((bg) => {
                const Icon = bg.icon;
                const isSelected = background === bg.id;
                return (
                  <div
                    key={bg.id}
                    className={cn(
                      "relative dossier-paper p-5 rounded-lg cursor-pointer transition-all hover:scale-[1.02] overflow-hidden",
                      isSelected
                        ? "border-primary border-2 bg-primary/[0.03] ring-4 ring-primary/5 shadow-xl"
                        : "opacity-70 hover:opacity-100"
                    )}
                    onClick={() => onBackgroundChange(bg.id)}
                  >
                    <div className="absolute -top-2 -right-2 opacity-5 font-display text-4xl font-black">
                      {bg.labelJa}
                    </div>
                    <div className="h-10 w-10 bg-muted/50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                      <Icon
                        className={cn(
                          "w-5 h-5",
                          isSelected ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                    </div>
                    <div className="font-display font-black text-lg mb-1">{bg.label}</div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3 mb-4">
                      {bg.description}
                    </p>
                    <div className="pt-2 border-t border-dashed mt-auto">
                      <div className="text-[8px] font-black uppercase tracking-widest text-primary">
                        Initial Endowment
                      </div>
                      <div className="text-xs font-black">{formatYenToMan(bg.bonuses.funds)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={onNext}
          disabled={!oyakataName.trim()}
          className="h-16 px-10 gap-3 font-display font-black uppercase tracking-widest text-lg shadow-2xl rounded-lg hover:scale-105 transition-transform"
        >
          Next Submission <ArrowRight className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}

/**
 * IdentityStep.tsx
 *
 * Step 1: Establish identity for new game wizard.
 * Features a 7-card backstory grid with difficulty badges and bonus chips.
 */

import {
  CircleUser,
  ArrowRight,
  RefreshCw,
  Trophy,
  Star,
  Users,
  Heart,
  Flame,
  Globe,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatYenToMan } from "@/utils/engineUtils";
import { OYAKATA_BACKSTORIES } from "../../constants/ui/wizard";

/** Maps the pure-data `iconName` identifiers from the constants layer to lucide icon components. */
const BACKSTORY_ICONS: Record<string, LucideIcon> = {
  Trophy,
  Star,
  Users,
  Heart,
  Flame,
  Globe,
  Landmark,
};

interface IdentityStepProps {
  oyakataName: string;
  background: string;
  onNameChange: (name: string) => void;
  onBackgroundChange: (background: string) => void;
  onRandomName: () => void;
  onNext: () => void;
}

const DIFFICULTY_CLASS: Record<string, string> = {
  Easy: "bg-success/20 text-success border-success/30",
  Normal: "bg-primary/20 text-primary border-primary/30",
  Hard: "bg-warning/20 text-warning border-warning/30",
  "Very Hard": "bg-destructive/20 text-destructive border-destructive/30",
};

function BonusChip({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  const positive = value > 0;
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[9px] font-black px-1.5 py-0 h-4 border",
        positive
          ? "bg-success/10 text-success border-success/30"
          : "bg-destructive/10 text-destructive border-destructive/30"
      )}
    >
      {positive ? "+" : ""}
      {value} {label}
    </Badge>
  );
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
          {/* Name input */}
          <div className="space-y-3">
            <Label htmlFor="oyakataName" className="pro-header">
              Official Elder Name (Toshiyori-mei)
            </Label>
            <div className="flex gap-2">
              <Input
                id="oyakataName"
                placeholder="e.g. Takanohana"
                value={oyakataName}
                onChange={(e) => onNameChange(e.target.value)}
                className="h-16 text-2xl font-display font-black border-2 focus:border-primary px-6 rounded-lg shadow-inner bg-muted/30"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onRandomName}
                className="h-16 w-16 shrink-0 border-2 rounded-lg hover:border-primary hover:text-primary transition-colors"
                aria-label="Generate random name"
                tooltip="Generate random name"
                tooltipSide="top"
              >
                <RefreshCw className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground italic font-medium opacity-60">
              This name will be inscribed in the Association's professional directory.
            </p>
          </div>

          {/* Backstory grid */}
          <div className="space-y-4">
            <Label className="pro-header">Professional History &amp; Background</Label>
            <div className="grid gap-4 md:grid-cols-2 max-h-[520px] overflow-y-auto pr-1">
              {OYAKATA_BACKSTORIES.map((bs) => {
                const Icon = BACKSTORY_ICONS[bs.iconName] ?? CircleUser;
                const isSelected = background === bs.id;
                return (
                  <div
                    key={bs.id}
                    className={cn(
                      "relative dossier-paper p-5 rounded-lg cursor-pointer transition-all hover:scale-[1.01] overflow-hidden",
                      isSelected
                        ? "border-primary border-2 bg-primary/[0.03] ring-4 ring-primary/5 shadow-xl"
                        : "opacity-70 hover:opacity-100"
                    )}
                    onClick={() => onBackgroundChange(bs.id)}
                  >
                    {/* Watermark */}
                    <div className="absolute -top-2 -right-2 opacity-5 font-display text-3xl font-black pointer-events-none select-none">
                      {bs.labelJa}
                    </div>

                    {/* Header row */}
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                          isSelected ? "bg-primary/20" : "bg-muted/50"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-5 h-5",
                            isSelected ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display font-black text-base leading-tight">
                            {bs.label}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] font-black px-1.5 py-0 h-4 border shrink-0",
                              DIFFICULTY_CLASS[bs.difficulty]
                            )}
                          >
                            {bs.difficulty}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                          {bs.labelJa} &middot; Peak: {bs.highestRank}
                        </p>
                      </div>
                    </div>

                    {/* Flavor text */}
                    <p className="text-[11px] text-muted-foreground leading-relaxed italic line-clamp-2 mb-3">
                      {bs.flavor}
                    </p>

                    {/* Bonus chips */}
                    <div className="flex flex-wrap gap-1 pt-2 border-t border-dashed">
                      <Badge
                        variant="outline"
                        className="text-[9px] font-black px-1.5 py-0 h-4 border bg-success/10 text-success border-success/30"
                      >
                        ¥{formatYenToMan(bs.bonuses.funds)}
                      </Badge>
                      <BonusChip label="Prestige" value={bs.bonuses.prestige} />
                      <BonusChip label="Training" value={bs.bonuses.training} />
                      <BonusChip label="Scouting" value={bs.bonuses.scouting} />
                      <BonusChip label="Politics" value={bs.bonuses.politics} />
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

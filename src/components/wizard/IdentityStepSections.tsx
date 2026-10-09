/**
 * IdentityStepSections.tsx
 *
 * Identity wizard step sections — the name input row, the backstory card
 * grid (icon, difficulty badge, bonus chips), and supporting constants.
 */

import {
  CircleUser,
  Trophy,
  Star,
  Users,
  Heart,
  Flame,
  Globe,
  Landmark,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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

/** Elder-name input + random-name button. */
export function NameInputRow({
  oyakataName,
  onNameChange,
  onRandomName,
}: {
  oyakataName: string;
  onNameChange: (name: string) => void;
  onRandomName: () => void;
}) {
  return (
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
  );
}

type Backstory = (typeof OYAKATA_BACKSTORIES)[number];

/** Single backstory dossier card — icon, difficulty, flavor, bonuses. */
function BackstoryCard({
  bs,
  isSelected,
  onSelect,
}: {
  bs: Backstory;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = BACKSTORY_ICONS[bs.iconName] ?? CircleUser;

  return (
    <div
      className={cn(
        "relative dossier-paper p-5 rounded-lg cursor-pointer transition-all hover:scale-[1.01] overflow-hidden",
        isSelected
          ? "border-primary border-2 bg-primary/[0.03] ring-4 ring-primary/5 shadow-xl"
          : "opacity-70 hover:opacity-100"
      )}
      onClick={() => onSelect(bs.id)}
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
            className={cn("w-5 h-5", isSelected ? "text-primary" : "text-muted-foreground")}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-black text-base leading-tight">{bs.label}</span>
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
}

/** Scrollable backstory grid — "Professional History & Background". */
export function BackstoryGrid({
  background,
  onBackgroundChange,
}: {
  background: string;
  onBackgroundChange: (background: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Label className="pro-header">Professional History &amp; Background</Label>
      <ScrollArea className="max-h-[520px]">
        <div className="grid gap-4 md:grid-cols-2 pr-4 pb-1">
          {OYAKATA_BACKSTORIES.map((bs) => (
            <BackstoryCard
              key={bs.id}
              bs={bs}
              isSelected={background === bs.id}
              onSelect={onBackgroundChange}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

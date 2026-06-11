/**
 * src/components/menu/HeyaCard.tsx
 *
 * Individual Heya selection card for the Main Menu.
 * Handles selection, preview triggers, and stature-based styling.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StableName } from "@/components/ClickableName";
import { HeyaBrandBadge } from "@/components/stable/HeyaBrandBadge";
import type { Heya } from "@/engine/types/heya";
import type { HeyaBrandIdentity } from "@/engine/types/keshoMawashi";
import { STATURE_CONFIG } from "./statureConfig";

interface HeyaCardProps {
  heya: Heya;
  isSelected: boolean;
  onSelect: () => void;
  onPreview?: () => void;
  isRecommended?: boolean;
  sekitoriCount: number;
  brandIdentity?: HeyaBrandIdentity;
}

export function HeyaCard({
  heya,
  isSelected,
  onSelect,
  onPreview,
  isRecommended,
  sekitoriCount,
  brandIdentity,
}: HeyaCardProps) {
  const config = STATURE_CONFIG[heya.statureBand];
  const Icon = config.icon;

  const riskIndicators = (
    heya as Heya & {
      riskIndicators?: { financial?: boolean; governance?: boolean; rivalry?: boolean };
    }
  ).riskIndicators;
  const financial = !!riskIndicators?.financial;
  const governance = !!riskIndicators?.governance;
  const rivalry = !!riskIndicators?.rivalry;

  return (
    <Card
      className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300 ${
        isSelected ? "border-primary ring-2 ring-primary/30 bg-primary/5" : ""
      }`}
      onClick={onSelect}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onPreview?.();
      }}
      title="Click to select • Double-click to preview roster"
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {brandIdentity && <HeyaBrandBadge brand={brandIdentity} size="sm" />}
            <div className="min-w-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="truncate">
                  <StableName id={heya.id} name={heya.name} />
                </span>
                {isRecommended && (
                  <Badge
                    variant="secondary"
                    className="text-xs font-bold uppercase tracking-tighter h-5"
                  >
                    REC
                  </Badge>
                )}
              </CardTitle>
              {heya.nameJa && (
                <p className="text-sm text-muted-foreground font-display truncate opacity-70">
                  {heya.nameJa}
                </p>
              )}
            </div>
          </div>
          <Badge className={`${config.color} border shrink-0 font-bold`}>
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {heya.descriptor && (
          <p className="text-xs text-muted-foreground italic line-clamp-2">{heya.descriptor}</p>
        )}

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] uppercase font-bold tracking-widest">
          <span className="text-muted-foreground">
            Difficulty: <span className="text-foreground">{config.difficulty}</span>
          </span>
          <span className="text-muted-foreground">
            Sekitori: <span className="text-foreground">{sekitoriCount}</span>
          </span>
        </div>

        {(financial || governance || rivalry) && (
          <div className="flex gap-1 pt-1 flex-wrap">
            {financial && (
              <Badge
                variant="outline"
                className="text-[9px] bg-destructive/10 text-destructive border-destructive/20 font-bold"
              >
                💴 FINANCIAL RISK
              </Badge>
            )}
            {governance && (
              <Badge
                variant="outline"
                className="text-[9px] bg-gold/10 text-gold border-gold/20 font-bold"
              >
                ⚖️ GOVERNANCE
              </Badge>
            )}
            {rivalry && (
              <Badge
                variant="outline"
                className="text-[9px] bg-primary/10 text-primary border-primary/20 font-bold"
              >
                🔥 RIVALRY
              </Badge>
            )}
          </div>
        )}

        <div className="pt-2 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              onPreview?.();
            }}
          >
            Review Roster
          </Button>
          {isSelected && (
            <div className="bg-primary h-5 w-5 rounded-sm flex items-center justify-center text-primary-foreground text-[10px]">
              ✓
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

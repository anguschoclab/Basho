/**
 * RikishiDetailDialog.tsx
 *
 * Rikishi detail dialog component for HeyaPreview.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MapPin,
  Calendar,
  Ruler,
  Scale,
  Trophy,
  Activity,
  Target,
  Zap,
  TrendingUp,
  Shield,
} from "lucide-react";
import { RANK_HIERARCHY } from "@/presenters/uiDigest";
import type { UIRikishi } from "@/presenters/uiModels";
import { getCombatArchetypeDescription } from "@/engine/archetype";
import {
  RIKISHI_QUICK_STATS,
  RIKISHI_BASIC_INFO,
  RIKISHI_ATTRIBUTES,
} from "./heyaPreviewConstants";

interface RikishiDetailDialogProps {
  selectedRikishi: UIRikishi | null;
  onClose: () => void;
  rosterWithAge: Array<{ rikishi: UIRikishi; age: number }>;
}

export function RikishiDetailDialog({
  selectedRikishi,
  onClose,
  rosterWithAge,
}: RikishiDetailDialogProps) {
  if (!selectedRikishi) return null;

  const rankInfo = RANK_HIERARCHY[selectedRikishi.rank as keyof typeof RANK_HIERARCHY];
  const isSekitori = !!rankInfo?.isSekitori;

  return (
    <Dialog open={!!selectedRikishi} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0 [&>button]:hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{selectedRikishi?.shikona || "Rikishi Details"}</DialogTitle>
        </DialogHeader>
        <div className="bg-primary pt-6 pb-4 px-6 text-primary-foreground relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 p-6 opacity-10 font-display text-6xl font-black pointer-events-none uppercase italic -rotate-12 translate-x-6 -translate-y-3">
            {selectedRikishi.rank}
          </div>
          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="text-[10px] uppercase font-black bg-white text-primary tracking-widest px-2"
              >
                Rikishi Dossier
              </Badge>
              <Badge className="bg-gold/20 text-gold-foreground border-gold/30 text-[9px] h-5 font-black">
                {isSekitori ? "SEKITORI" : "JUNIOR"}
              </Badge>
            </div>
            <h2 className="text-3xl font-display font-black tracking-tight sumi-e-ink">
              {selectedRikishi.shikona}
            </h2>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="flex gap-2 bg-black/5 p-3 rounded-lg border border-border/30">
              {RIKISHI_QUICK_STATS.map((stat) => (
                <div key={stat.label} className="flex-1 text-center">
                  <div className="text-2xl font-display font-black leading-none">
                    {stat.value(selectedRikishi)}
                  </div>
                  <div className="text-[8px] uppercase font-bold text-muted-foreground mt-1">
                    {stat.label}
                  </div>
                  <div className="text-[7px] uppercase text-muted-foreground/60">{stat.sub}</div>
                </div>
              ))}
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-2">
              {RIKISHI_BASIC_INFO.map((info) => (
                <div key={info.label} className="bg-muted/30 p-2.5 rounded-lg">
                  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">
                    {info.label === "Origin" && <MapPin className="h-3 w-3" />}
                    {info.label === "Age" && <Calendar className="h-3 w-3" />}
                    {info.label === "Height" && <Ruler className="h-3 w-3" />}
                    {info.label === "Weight" && <Scale className="h-3 w-3" />}
                    {info.label}
                  </div>
                  <div className="font-display font-bold text-sm">
                    {info.key === "age"
                      ? (() => {
                          const entry = rosterWithAge.find(
                            (r) => r.rikishi.id === selectedRikishi.id
                          );
                          return entry ? `${entry.age} Cycles` : "-- Cycles";
                        })()
                      : `${(selectedRikishi as UIRikishi & Record<string, unknown>)[info.key] || "--"}${info.suffix}`}
                  </div>
                  {info.key === "height" && selectedRikishi.heightDescriptor && (
                    <div className="text-[8px] text-muted-foreground/60">
                      {selectedRikishi.heightDescriptor}
                    </div>
                  )}
                  {info.key === "weight" && selectedRikishi.weightDescriptor && (
                    <div className="text-[8px] text-muted-foreground/60">
                      {selectedRikishi.weightDescriptor}
                    </div>
                  )}
                  {info.key === "age" &&
                    (() => {
                      const entry = rosterWithAge.find((r) => r.rikishi.id === selectedRikishi.id);
                      return entry?.rikishi.ageDescriptor ? (
                        <div className="text-[8px] text-muted-foreground/60">
                          {entry.rikishi.ageDescriptor}
                        </div>
                      ) : null;
                    })()}
                </div>
              ))}
            </div>

            {/* Rank Info */}
            <div className="bg-primary/5 border-2 border-primary/10 rounded-lg p-3">
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                <Trophy className="h-3.5 w-3.5 text-primary" /> Current Rank
              </div>
              <div className="text-2xl font-display font-black uppercase">
                {selectedRikishi.rank}{" "}
                {selectedRikishi.rankNumber > 0 ? selectedRikishi.rankNumber : ""}
              </div>
              <div className="text-[8px] font-bold text-muted-foreground uppercase">
                {selectedRikishi.side || "East"} Division
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-2">
              <h3 className="text-xs font-display font-black flex items-center gap-2 uppercase tracking-tight">
                <Activity className="h-3.5 w-3.5 text-primary" /> Attributes
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {RIKISHI_ATTRIBUTES.map((stat) => (
                  <div key={stat.key} className="bg-muted/30 p-2.5 rounded-lg">
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">
                      {stat.label === "Power" && <Zap className="h-3 w-3" />}
                      {stat.label === "Speed" && <TrendingUp className="h-3 w-3" />}
                      {stat.label === "Balance" && <Shield className="h-3 w-3" />}
                      {stat.label === "Technique" && <Target className="h-3 w-3" />}
                      {stat.label}
                    </div>
                    <div className="text-xl font-display font-black text-foreground">
                      {((selectedRikishi as UIRikishi & Record<string, unknown>)[
                        stat.key
                      ] as number) ?? "--"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Combat Style */}
            <div className="space-y-2">
              <h3 className="text-xs font-display font-black flex items-center gap-2 uppercase tracking-tight">
                <Target className="h-3.5 w-3.5 text-primary" /> Combat Style
              </h3>
              <div className="bg-muted/20 border-2 border-dashed rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge className="text-[10px] font-black uppercase tracking-widest px-2 h-6 bg-primary/80 cursor-help">
                          {selectedRikishi.archetypeName || "Unknown"}
                        </Badge>
                      </TooltipTrigger>
                      {selectedRikishi.combatArchetype && (
                        <TooltipContent>
                          <p className="max-w-xs">
                            {getCombatArchetypeDescription(selectedRikishi.combatArchetype as any)}
                          </p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                  {selectedRikishi.styleName !== selectedRikishi.archetypeName && (
                    <Badge
                      variant="outline"
                      className="text-[9px] font-black uppercase tracking-widest h-6"
                    >
                      {selectedRikishi.styleName || "Balanced"}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-muted/40 rounded-lg p-2 space-y-0.5">
                    <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                      Grip
                    </p>
                    <p className="text-xs font-display font-black capitalize">
                      {selectedRikishi.preferredGrip === "none"
                        ? "No Preference"
                        : selectedRikishi.preferredGrip || "--"}
                    </p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-2 space-y-0.5">
                    <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                      Depth
                    </p>
                    <p className="text-xs font-display font-black capitalize">
                      {selectedRikishi.preferredGripDepth || "--"}
                    </p>
                  </div>
                </div>
                {selectedRikishi.favoredKimariteDetailed &&
                  selectedRikishi.favoredKimariteDetailed.length > 0 && (
                    <div className="pt-1">
                      <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                        Signature Techniques
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedRikishi.favoredKimariteDetailed.slice(0, 5).map((k, i: number) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-[8px] font-bold uppercase tracking-widest h-5"
                          >
                            {k.kimarite}{" "}
                            <span className="text-muted-foreground ml-1">{k.percentage}%</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-3 border-t shrink-0">
          <Button
            variant="outline"
            className="font-bold uppercase tracking-widest h-10"
            onClick={onClose}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

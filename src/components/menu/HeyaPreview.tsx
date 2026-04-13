/**
 * src/components/menu/HeyaPreview.tsx
 *
 * Detailed preview dialog for a stable's roster and stats.
 * Uses a "Dossier" style aesthetic for a premium feel.
 */

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, ArrowRight, User, Info, Trophy, MapPin, Building } from "lucide-react";
import type { Heya } from "@/engine/types/heya";
import { RikishiName } from "@/components/ClickableName";
import { STATURE_CONFIG } from "./HeyaCard";
import { RANK_HIERARCHY } from "@/presenters/uiDigest";
import { sortRikishiByRank } from "@/utils/engineUtils";
// eslint-disable-next-line no-restricted-imports -- TODO: Refactor to use UIDigest instead of WorldState
import type { WorldState } from "../../engine/types/world";

interface HeyaPreviewProps {
  heya: Heya | null;
  onClose: () => void;
  onConfirm: (heyaId: string) => void;
  sekitoriCount: number;
  world: WorldState;
}

export function HeyaPreview({ heya, onClose, onConfirm, sekitoriCount, world }: HeyaPreviewProps) {
  if (!heya || !world) return null;

  const config = STATURE_CONFIG[heya.statureBand];
  const Icon = config.icon;

  const roster = (heya.rikishiIds ?? [])
    .map((id: string) => world.rikishi.get(id))
    .filter(Boolean)
    .sort(sortRikishiByRank);

  return (
    <Dialog open={!!heya} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-0 bg-transparent shadow-none">
        <div className="bg-background rounded-lg border-2 border-primary/20 shadow-2xl overflow-hidden flex flex-col h-full animate-in zoom-in-95 duration-300">
          {/* Hero Header */}
          <div className="bg-primary pt-8 pb-6 px-6 relative overflow-hidden text-primary-foreground">
            <div className="absolute top-0 right-0 p-8 opacity-10 font-display text-8xl font-black pointer-events-none uppercase">
              {heya.name}
            </div>

            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="text-[10px] uppercase font-black bg-white text-primary tracking-widest px-2"
                  >
                    Official Dossier
                  </Badge>
                  <Badge className={`${config.color} border-0 text-white font-bold h-5`}>
                    {config.label}
                  </Badge>
                </div>
                <h2 className="text-4xl font-display font-black tracking-tight">
                  {heya.name} Stable
                </h2>
                {heya.nameJa && <p className="text-xl font-display opacity-80">{heya.nameJa}</p>}
              </div>
              <div className="flex flex-col items-end text-right">
                <div className="h-16 w-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                  <Building className="h-8 w-8" />
                </div>
                <div className="mt-2 text-[10px] uppercase font-bold tracking-widest opacity-60">
                  Established {heya.id.slice(0, 4)}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col overflow-hidden space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  label: "Association Stature",
                  value: config.label,
                  sub: config.difficulty,
                  icon: <Trophy className="h-4 w-4" />,
                },
                {
                  label: "Professional Roster",
                  value: roster.length,
                  sub: "Active Rikishi",
                  icon: <User className="h-4 w-4" />,
                },
                {
                  label: "Sekitori Elite",
                  value: sekitoriCount,
                  sub: "Salaried Ranks",
                  icon: <Star className="h-4 w-4 text-gold" />,
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="p-4 bg-muted/40 rounded-lg border border-border/50 group hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 group-hover:text-primary">
                    {stat.icon} {stat.label}
                  </div>
                  <div className="text-2xl font-display font-black">{stat.value}</div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground/60">
                    {stat.sub}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-lg uppercase tracking-tight flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" /> Active Roster Information
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold uppercase tracking-widest px-2"
                >
                  Total Records: {roster.length}
                </Badge>
              </div>

              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-2">
                  {roster.map((r: any, idx: number) => {
                    const rankInfo = (RANK_HIERARCHY as any)?.[r.rank];
                    const isSekitori = !!rankInfo?.isSekitori;
                    const rankLabel = rankInfo?.nameEn ?? String(r.rank ?? "");

                    return (
                      <div
                        key={r.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all animate-in slide-in-from-left-2 duration-300 fill-mode-both`}
                        style={{ animationDelay: `${idx * 30}ms` }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center font-display font-bold text-xs ${isSekitori ? "bg-primary text-white shadow-lg" : "bg-muted text-muted-foreground"}`}
                          >
                            {r.shikona.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <RikishiName
                                id={r.id}
                                name={r.shikona}
                                className={`font-display font-black truncate ${isSekitori ? "text-primary" : "text-foreground"}`}
                              />
                              {isSekitori && (
                                <Badge className="bg-gold/20 text-gold-foreground border-gold/30 text-[9px] h-4 font-black">
                                  SEKITORI
                                </Badge>
                              )}
                            </div>
                            <div className="text-[9px] uppercase font-bold text-muted-foreground/70 tracking-widest flex items-center gap-1">
                              <MapPin className="h-2 w-2" /> {r.origin || "Japan"} • {r.age} Cycles
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-display font-black uppercase">
                            {rankLabel}{" "}
                            <span className="opacity-40">
                              {r.rankNumber > 0 ? r.rankNumber : ""}
                            </span>
                          </div>
                          <div className="text-[9px] font-bold text-muted-foreground uppercase">
                            {r.side || "East"} Division
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {roster.length === 0 && (
                    <div className="py-20 text-center space-y-2 opacity-50">
                      <div className="text-4xl text-muted-foreground animate-pulse">?</div>
                      <p className="text-sm font-display italic">
                        No active rikishi found in the stable records.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            <DialogFooter className="pt-4 border-t gap-3">
              <Button
                variant="ghost"
                className="font-bold uppercase tracking-widest text-muted-foreground h-11"
                onClick={onClose}
              >
                Return to Directory
              </Button>
              <Button
                className="gap-2 h-11 px-8 font-display font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-transform"
                onClick={() => {
                  onConfirm(heya.id);
                  onClose();
                }}
              >
                Inaugurate Stable
                <ArrowRight className="w-5 h-5" />
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * src/components/menu/HeyaPreview.tsx
 *
 * Detailed preview dialog for a stable's roster and stats.
 * Uses a "Dossier" style aesthetic for a premium feel.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, ArrowRight, User, Info, Trophy, MapPin, Building } from "lucide-react";
import type { Heya } from "@/engine/types/heya";
import { STATURE_CONFIG } from "./statureConfig";
import { RANK_HIERARCHY } from "@/presenters/uiDigest";
import { sortRikishiByRank } from "@/utils/engineUtils";
import { StableName } from "@/components/ClickableName";
import type { UIRikishi } from "@/presenters/uiModels";
import { HEYA_STATS } from "./heyaPreviewConstants";
import { RikishiDetailDialog } from "./RikishiDetailDialog";

interface HeyaPreviewProps {
  heya: Heya | null;
  onClose: () => void;
  onConfirm: (heyaId: string) => void;
  sekitoriCount: number;
  rosterWithAge: Array<{ rikishi: UIRikishi; age: number }>;
}

export function HeyaPreview({
  heya,
  onClose,
  onConfirm,
  sekitoriCount,
  rosterWithAge,
}: HeyaPreviewProps) {
  const [selectedRikishi, setSelectedRikishi] = useState<UIRikishi | null>(null);

  if (!heya) return null;

  const config = STATURE_CONFIG[heya.statureBand];

  const roster = rosterWithAge.sort((a, b) => sortRikishiByRank(a.rikishi, b.rikishi));

  return (
    <Dialog open={!!heya} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Stable Preview</DialogTitle>
        </DialogHeader>
        <div className="bg-background rounded-lg border-2 border-primary/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Hero Header */}
          <div className="bg-primary pt-6 pb-4 px-6 relative overflow-hidden text-primary-foreground shrink-0">
            <div className="absolute top-0 right-0 p-6 opacity-10 font-display text-7xl font-black pointer-events-none uppercase">
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
                <h2 className="text-3xl font-display font-black tracking-tight">
                  <StableName id={heya.id} name={heya.name} /> Stable
                </h2>
                {heya.nameJa && <p className="text-lg font-display opacity-80">{heya.nameJa}</p>}
              </div>
              <div className="flex flex-col items-end text-right">
                <div className="h-12 w-12 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                  <Building className="h-6 w-6" />
                </div>
                <div className="mt-2 text-[10px] uppercase font-bold tracking-widest opacity-60">
                  Established {heya.id.slice(0, 4)}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 flex-1 flex flex-col overflow-hidden gap-4 min-h-0">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
              {HEYA_STATS.map((stat, i) => {
                const value = stat.value(config, roster, sekitoriCount);
                const sub = stat.sub(config, roster);
                return (
                  <div
                    key={i}
                    className="p-3 bg-muted/40 rounded-lg border border-border/50 group hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 group-hover:text-primary">
                      {i === 0 && <Trophy className="h-4 w-4" />}
                      {i === 1 && <User className="h-4 w-4" />}
                      {i === 2 && <Star className="h-4 w-4 text-gold" />}
                      {stat.label}
                    </div>
                    <div className="text-xl font-display font-black">{value}</div>
                    <div className="text-[9px] uppercase font-bold text-muted-foreground/60">
                      {sub}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h3 className="font-display font-bold text-base uppercase tracking-tight flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" /> Active Roster
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold uppercase tracking-widest px-2"
                >
                  {roster.length} Records
                </Badge>
              </div>

              <ScrollArea className="flex-1 pr-2">
                <div className="space-y-2">
                  {roster.map((r, idx: number) => {
                    const rankInfo = RANK_HIERARCHY[r.rikishi.rank as keyof typeof RANK_HIERARCHY];
                    const isSekitori = !!rankInfo?.isSekitori;
                    const rankLabel = rankInfo?.nameJa ?? String(r.rikishi.rank ?? "");

                    return (
                      <div
                        key={r.rikishi.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all animate-in slide-in-from-left-2 duration-300 fill-mode-both`}
                        style={{ animationDelay: `${idx * 30}ms` }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center font-display font-bold text-xs ${isSekitori ? "bg-primary text-white shadow-lg" : "bg-muted text-muted-foreground"}`}
                          >
                            {r.rikishi.shikona.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-display font-black truncate cursor-pointer hover:underline underline-offset-2 transition-colors ${isSekitori ? "text-primary" : "text-foreground"}`}
                                onClick={() => setSelectedRikishi(r.rikishi)}
                              >
                                {r.rikishi.shikona}
                              </span>
                              {isSekitori && (
                                <Badge className="bg-gold/20 text-gold-foreground border-gold/30 text-[9px] h-4 font-black">
                                  SEKITORI
                                </Badge>
                              )}
                            </div>
                            <div className="text-[9px] uppercase font-bold text-muted-foreground/70 tracking-widest flex items-center gap-1">
                              <MapPin className="h-2 w-2" /> {r.rikishi.origin || "Japan"} • {r.age}{" "}
                              Cycles <span className="opacity-40">({r.rikishi.ageDescriptor})</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-display font-black uppercase">
                            {rankLabel}{" "}
                            <span className="opacity-40">
                              {r.rikishi.rankNumber > 0 ? r.rikishi.rankNumber : ""}
                            </span>
                          </div>
                          <div className="text-[9px] font-bold text-muted-foreground uppercase">
                            {r.rikishi.side || "East"} Division
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

            <DialogFooter className="pt-3 border-t gap-3 shrink-0">
              <Button
                variant="ghost"
                className="font-bold uppercase tracking-widest text-muted-foreground h-10"
                onClick={onClose}
              >
                Return
              </Button>
              <Button
                className="gap-2 h-10 px-6 font-display font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-transform"
                onClick={() => {
                  onConfirm(heya.id);
                  onClose();
                }}
              >
                Inaugurate
                <ArrowRight className="w-4 h-4" />
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>

      <RikishiDetailDialog
        selectedRikishi={selectedRikishi}
        onClose={() => setSelectedRikishi(null)}
        rosterWithAge={rosterWithAge}
      />
    </Dialog>
  );
}

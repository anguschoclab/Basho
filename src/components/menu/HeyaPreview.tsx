/**
 * src/components/menu/HeyaPreview.tsx
 *
 * Detailed preview dialog for a stable's roster and stats.
 * Uses a "Dossier" style aesthetic for a premium feel.
 */

import React, { useState } from "react";
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
import {
  Star,
  ArrowRight,
  User,
  Info,
  Trophy,
  MapPin,
  Building,
  Zap,
  TrendingUp,
  Shield,
  Target,
  Calendar,
  Ruler,
  Scale,
  Activity,
} from "lucide-react";
import type { Heya } from "@/engine/types/heya";
import { STATURE_CONFIG } from "./HeyaCard";
import { RANK_HIERARCHY } from "@/presenters/uiDigest";
import { sortRikishiByRank } from "@/utils/engineUtils";
import { cn } from "@/lib/utils";
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
  const [selectedRikishi, setSelectedRikishi] = useState<any>(null);

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
                              <span
                                className={`font-display font-black truncate cursor-pointer hover:underline underline-offset-2 transition-colors ${isSekitori ? "text-primary" : "text-foreground"}`}
                                onClick={() => setSelectedRikishi(r)}
                              >
                                {r.shikona}
                              </span>
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

      {/* Nested Rikishi Detail Dialog */}
      <Dialog open={!!selectedRikishi} onOpenChange={(open) => !open && setSelectedRikishi(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0">
          {selectedRikishi && (
            <>
              <div className="bg-primary pt-8 pb-6 px-6 text-primary-foreground relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 font-display text-7xl font-black pointer-events-none uppercase italic -rotate-12 translate-x-8 -translate-y-4">
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
                      {(RANK_HIERARCHY as any)?.[selectedRikishi.rank]?.isSekitori
                        ? "SEKITORI"
                        : "JUNIOR"}
                    </Badge>
                  </div>
                  <h2 className="text-4xl font-display font-black tracking-tight sumi-e-ink">
                    {selectedRikishi.shikona}
                  </h2>
                </div>
              </div>

              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  {/* Quick Stats */}
                  <div className="flex gap-3 bg-black/5 p-4 rounded-lg border border-border/30">
                    {[
                      {
                        label: "Current",
                        value: `${selectedRikishi.currentBashoWins ?? 0}-${selectedRikishi.currentBashoLosses ?? 0}`,
                        sub: "This Basho",
                      },
                      {
                        label: "Career",
                        value: `${selectedRikishi.careerWins ?? 0}-${selectedRikishi.careerLosses ?? 0}`,
                        sub: "Lifetime",
                      },
                      {
                        label: "Titles",
                        value: selectedRikishi.careerYusho ?? 0,
                        sub: "Yūshō",
                      },
                    ].map((stat) => (
                      <div key={stat.label} className="flex-1 text-center">
                        <div className="text-2xl font-display font-black leading-none">
                          {stat.value}
                        </div>
                        <div className="text-[8px] uppercase font-bold text-muted-foreground mt-1">
                          {stat.label}
                        </div>
                        <div className="text-[7px] uppercase text-muted-foreground/60">
                          {stat.sub}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                        <MapPin className="h-3 w-3" /> Origin
                      </div>
                      <div className="font-display font-bold">
                        {selectedRikishi.origin || "Japan"}
                      </div>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                        <Calendar className="h-3 w-3" /> Age
                      </div>
                      <div className="font-display font-bold">{selectedRikishi.age} Cycles</div>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                        <Ruler className="h-3 w-3" /> Height
                      </div>
                      <div className="font-display font-bold">
                        {selectedRikishi.height || "--"}cm
                      </div>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                        <Scale className="h-3 w-3" /> Weight
                      </div>
                      <div className="font-display font-bold">
                        {selectedRikishi.weight || "--"}kg
                      </div>
                    </div>
                  </div>

                  {/* Rank Info */}
                  <div className="bg-primary/5 border-2 border-primary/10 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                      <Trophy className="h-4 w-4 text-primary" /> Current Rank
                    </div>
                    <div className="text-3xl font-display font-black uppercase">
                      {selectedRikishi.rank}{" "}
                      {selectedRikishi.rankNumber > 0 ? selectedRikishi.rankNumber : ""}
                    </div>
                    <div className="text-[9px] font-bold text-muted-foreground uppercase">
                      {selectedRikishi.side || "East"} Division
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-display font-black flex items-center gap-2 uppercase tracking-tight">
                      <Activity className="h-4 w-4 text-primary" /> Physical Attributes
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {
                          label: "Forcefulness",
                          key: "strength",
                          icon: <Zap className="h-3 w-3" />,
                        },
                        {
                          label: "Agility",
                          key: "speed",
                          icon: <TrendingUp className="h-3 w-3" />,
                        },
                        {
                          label: "Resilience",
                          key: "stamina",
                          icon: <Shield className="h-3 w-3" />,
                        },
                        {
                          label: "Precision",
                          key: "technique",
                          icon: <Target className="h-3 w-3" />,
                        },
                      ].map((stat) => (
                        <div key={stat.key} className="bg-muted/30 p-3 rounded-lg">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                            {stat.icon} {stat.label}
                          </div>
                          <div className="text-2xl font-display font-black">
                            {selectedRikishi.stats?.[stat.key] ?? "--"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Combat Style */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-display font-black flex items-center gap-2 uppercase tracking-tight">
                      <Target className="h-4 w-4 text-primary" /> Combat Style
                    </h3>
                    <div className="bg-muted/20 border-2 border-dashed rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Badge className="text-[11px] font-black uppercase tracking-widest px-3 h-7 bg-primary/80">
                          {selectedRikishi.archetypeName || "Unknown"}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-black uppercase tracking-widest h-7"
                        >
                          {selectedRikishi.styleName || "Balanced"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            Preferred Grip
                          </p>
                          <p className="text-sm font-display font-black capitalize">
                            {selectedRikishi.preferredGrip === "none"
                              ? "No Preference"
                              : selectedRikishi.preferredGrip || "--"}
                          </p>
                        </div>
                        <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            Grip Depth
                          </p>
                          <p className="text-sm font-display font-black capitalize">
                            {selectedRikishi.preferredGripDepth || "--"}
                          </p>
                        </div>
                      </div>
                      {selectedRikishi.favoredKimariteDetailed &&
                        selectedRikishi.favoredKimariteDetailed.length > 0 && (
                          <div className="pt-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                              Signature Techniques
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {selectedRikishi.favoredKimariteDetailed
                                .slice(0, 5)
                                .map((k: any, i: number) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className="text-[9px] font-bold uppercase tracking-widest"
                                  >
                                    {k.kimarite}{" "}
                                    <span className="text-muted-foreground ml-1">
                                      {k.percentage}%
                                    </span>
                                  </Badge>
                                ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="pt-4 border-t">
                <Button
                  variant="outline"
                  className="font-bold uppercase tracking-widest h-11"
                  onClick={() => setSelectedRikishi(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

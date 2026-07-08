/**
 * RikishiProfileHeader.tsx
 *
 * Header section for rikishi profile page.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { ArrowLeft, Globe, MapPin, Calendar, Ruler, Scale } from "lucide-react";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import type { UIRikishi } from "@/presenters/uiModels";
import { getCombatArchetypeDescription } from "@/engine/archetype";

interface RikishiProfileHeaderProps {
  rikishi: UIRikishi;
  isOwned: boolean;
  healthBadge: string;
  isKadoban?: boolean;
  onBack: () => void;
}

/**
 * Renders the header section of a rikishi's profile, including their name, rank, avatar, and key stats.
 * Displays various badges for health, ownership, nationality, and special statuses like Kadoban.
 *
 * @param {RikishiProfileHeaderProps} props - The component props.
 * @param {UIRikishi} props.rikishi - The rikishi data to display.
 * @param {boolean} props.isOwned - Whether the rikishi is owned by the player's heya.
 * @param {string} props.healthBadge - The label for the current health status badge.
 * @param {boolean} [props.isKadoban] - Optional flag indicating if the rikishi is in Kadoban status (for Ozeki).
 * @param {() => void} props.onBack - Callback function for the back button.
 * @returns {JSX.Element} The rendered profile header.
 */
export function RikishiProfileHeader({
  rikishi,
  isOwned,
  healthBadge,
  isKadoban,
  onBack,
}: RikishiProfileHeaderProps) {
  return (
    <div className="space-y-8">
      <Button
        variant="ghost"
        onClick={onBack}
        className="gap-2 h-10 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to stable roster
      </Button>

      {/* ═══ DOSSIER HEADER ═══ */}
      <div className="dossier-paper rounded-lg overflow-hidden shadow-2xl border-2 border-primary/10">
        <div className="bg-primary pt-12 pb-10 px-8 relative overflow-hidden text-primary-foreground hero-gradient border-b-4 border-primary">
          <div className="absolute top-0 right-0 p-8 opacity-10 font-display text-9xl font-black pointer-events-none uppercase italic -rotate-12 translate-x-12 -translate-y-8">
            {rikishi.rankLabel}
          </div>

          <div className="flex flex-col lg:flex-row items-start justify-between gap-6 relative z-10">
            <div className="flex items-center gap-6">
              <SumoAvatar
                config={rikishi.avatarConfig}
                size="lg"
                showHairstyle={true}
                expression={rikishi.isInjured ? "intense" : "determined"}
                fallback={rikishi.shikona}
                className="border-4 border-white/20 shadow-2xl"
              />
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-bold h-6 uppercase text-[9px] tracking-widest",
                      healthBadge === "Fresh" && "border-success text-success bg-success/10",
                      healthBadge === "Worn" && "border-warning text-warning bg-warning/10",
                      healthBadge === "Struggling" &&
                        "border-warning/70 text-warning/70 bg-warning/5",
                      healthBadge === "Critical" &&
                        "border-destructive text-destructive bg-destructive/10",
                      healthBadge === "Recovering" && "border-primary text-primary bg-primary/10"
                    )}
                  >
                    {healthBadge}
                  </Badge>
                  {isOwned && (
                    <Badge
                      variant="outline"
                      className="bg-white/10 text-white border-white/20 font-bold h-6 uppercase text-[9px] tracking-widest"
                    >
                      Active Roster
                    </Badge>
                  )}
                  {rikishi.nationality !== "Japan" && (
                    <Badge
                      variant="outline"
                      className="border-gold text-gold bg-gold/10 flex items-center gap-1.5 h-6 font-bold text-[9px] tracking-widest"
                    >
                      <Globe className="h-3 w-3" /> Foreign Slot
                    </Badge>
                  )}
                  {isKadoban && (
                    <TooltipWrap content="Kadoban: Must secure a winning record to avoid losing Ozeki status">
                      <Badge
                        variant="destructive"
                        className="h-6 font-bold text-[9px] tracking-widest uppercase cursor-help"
                      >
                        Kadoban
                      </Badge>
                    </TooltipWrap>
                  )}
                </div>

                <div>
                  <h1 className="font-display text-5xl font-black tracking-tight uppercase leading-none mb-1">
                    {rikishi.shikona}
                  </h1>
                  <p className="text-white/60 font-display text-sm tracking-widest uppercase">
                    {rikishi.heyaName} • {rikishi.styleName}
                    {rikishi.archetypeName.toLowerCase() !== rikishi.styleName.toLowerCase() && (
                      <>
                        {" - "}
                        {rikishi.combatArchetype ? (
                          <TooltipWrap
                            content={getCombatArchetypeDescription(rikishi.combatArchetype as any)}
                          >
                            <span className="cursor-help border-b border-dotted border-white/30 hover:border-white/60">
                              {rikishi.archetypeName}
                            </span>
                          </TooltipWrap>
                        ) : (
                          <span>{rikishi.archetypeName}</span>
                        )}
                      </>
                    )}
                  </p>

                  {/* Phase M: Lineage Indicators */}
                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    {rikishi.mentorName && (
                      <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full border border-white/10">
                        <span className="text-[10px] text-white/40 uppercase font-black">
                          Mentor
                        </span>
                        <span className="text-xs font-bold">{rikishi.mentorName}</span>
                      </div>
                    )}
                    {(rikishi.menteeNames?.length ?? 0) > 0 && (
                      <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full border border-white/10">
                        <span className="text-[10px] text-white/40 uppercase font-black">
                          Students
                        </span>
                        <span className="text-xs font-bold">{rikishi.menteeNames?.join(", ")}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] uppercase font-black tracking-[0.2em] opacity-80 pt-2">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-secondary" /> {rikishi.origin}
                  </span>
                  <span className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-secondary" /> {rikishi.age} Years{" "}
                    <span className="opacity-60">({rikishi.ageDescriptor})</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Ruler className="h-3.5 w-3.5 text-secondary" /> {rikishi.height}cm{" "}
                    <span className="opacity-60">({rikishi.heightDescriptor})</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Scale className="h-3.5 w-3.5 text-secondary" /> {rikishi.weight}kg{" "}
                    <span className="opacity-60">({rikishi.weightDescriptor})</span>
                  </span>
                </div>
                {rikishi.rank === "ozeki" && rikishi.consecutiveStrongOzeki > 0 && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-widest mb-1.5">
                      <span className="text-gold flex items-center gap-1">
                        <span role="img" aria-label="Yokozuna Run">
                          🏆
                        </span>{" "}
                        Yokozuna Promotion Watch
                      </span>
                      <span className="opacity-70">
                        {rikishi.consecutiveStrongOzeki} / 2 Strong Basho
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold transition-all duration-1000 ease-out"
                        style={{
                          width: `${Math.min(100, Math.max(0, (rikishi.consecutiveStrongOzeki / 2) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 lg:gap-8 shrink-0 self-stretch lg:self-auto bg-black/20 p-4 lg:p-6 rounded-lg border border-white/10 shadow-inner w-full lg:w-auto justify-around lg:justify-start">
              {[
                {
                  label: "Current Record",
                  value: `${rikishi.currentBashoWins}-${rikishi.currentBashoLosses}`,
                  sub: "This Tournament",
                  color:
                    rikishi.currentBashoWins >= rikishi.currentBashoLosses
                      ? "text-success"
                      : "text-gold",
                  tooltip: "Current tournament win-loss record",
                },
                {
                  label: "Career History",
                  value: `${rikishi.careerWins}-${rikishi.careerLosses}`,
                  sub: "Professional Record",
                  color: "text-white",
                  tooltip: "Lifetime professional record across all tournaments",
                },
                {
                  label: "Elite Titles",
                  value: rikishi.careerYusho,
                  sub: "Yūshō Count",
                  color: "text-gold",
                  condition: rikishi.careerYusho > 0,
                  tooltip: "Total top-division championship victories",
                },
                {
                  label: "Kinboshi",
                  value: rikishi.achievements?.kinboshiEarned ?? 0,
                  sub: "Gold Stars",
                  color: "text-gold",
                  condition: (rikishi.achievements?.kinboshiEarned ?? 0) > 0,
                  tooltip: "Gold stars earned by defeating a Yokozuna as a Maegashira",
                },
              ].map((stat, i) => (
                <React.Fragment key={i}>
                  {(!stat.condition || stat.condition === true) && (
                    <TooltipWrap content={stat.tooltip} side="bottom">
                      <div className="text-center group cursor-help">
                        <div
                          className={cn(
                            "text-4xl font-display font-black leading-none mb-1 transition-transform group-hover:scale-110",
                            stat.color
                          )}
                        >
                          {stat.value}
                        </div>
                        <div className="text-[10px] uppercase font-black opacity-60 tracking-widest mb-0.5">
                          {stat.label}
                        </div>
                        <div className="text-[8px] uppercase font-bold opacity-40">{stat.sub}</div>
                      </div>
                    </TooltipWrap>
                  )}
                  {i < 2 && <div className="w-px h-12 bg-white/10 hidden lg:block" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

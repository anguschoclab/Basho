/**
 * RikishiDetailDialogSections.tsx
 *
 * Sections of RikishiDetailDialog — dossier header band, quick stats,
 * basic info grid, rank card, attribute grid, and combat style.
 */

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { getCombatArchetypeDescription } from "@/presenters/engineAccess";
import {
  RIKISHI_QUICK_STATS,
  RIKISHI_BASIC_INFO,
  RIKISHI_ATTRIBUTES,
} from "../../constants/ui/heyaPreview";

/** Primary-colored header band with rank watermark + sekitori badge. */
export function DossierHeader({ rikishi }: { rikishi: UIRikishi }) {
  const rankInfo = RANK_HIERARCHY[rikishi.rank as keyof typeof RANK_HIERARCHY];
  const isSekitori = !!rankInfo?.isSekitori;

  return (
    <div className="bg-primary pt-6 pb-4 px-6 text-primary-foreground relative overflow-hidden shrink-0">
      <div className="absolute top-0 right-0 p-6 opacity-10 font-display text-6xl font-black pointer-events-none uppercase -rotate-12 translate-x-6 -translate-y-3">
        {rikishi.rank}
      </div>
      <div className="space-y-2 relative z-10">
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="text-[10px] uppercase font-black bg-white text-primary tracking-widest px-2"
          >
            Rikishi Dossier
          </Badge>
          <Badge className="bg-gold/20 text-gold-foreground border-gold/30 text-[10px] h-5 font-black">
            {isSekitori ? "Sekitori" : "Junior"}
          </Badge>
        </div>
        <h2 className="text-3xl font-display font-black tracking-tight sumi-e-ink">
          {rikishi.shikona}
        </h2>
      </div>
    </div>
  );
}

/** Quick-stats strip across the top of the body. */
export function QuickStatsRow({ rikishi }: { rikishi: UIRikishi }) {
  return (
    <div className="flex gap-2 bg-black/5 p-3 rounded-lg border border-border/30">
      {RIKISHI_QUICK_STATS.map((stat) => (
        <div key={stat.label} className="flex-1 text-center">
          <div className="text-2xl font-display font-black leading-none">{stat.value(rikishi)}</div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground mt-1">
            {stat.label}
          </div>
          <div className="text-[10px] uppercase text-muted-foreground/60">{stat.sub}</div>
        </div>
      ))}
    </div>
  );
}

/** Origin/age/height/weight info grid. */
export function BasicInfoGrid({
  rikishi,
  selectedEntry,
}: {
  rikishi: UIRikishi;
  selectedEntry: { rikishi: UIRikishi; age: number } | undefined;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {RIKISHI_BASIC_INFO.map((info) => (
        <div key={info.label} className="bg-muted/30 p-2.5 rounded-lg">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">
            {info.label === "Origin" && <MapPin className="h-3 w-3" />}
            {info.label === "Age" && <Calendar className="h-3 w-3" />}
            {info.label === "Height" && <Ruler className="h-3 w-3" />}
            {info.label === "Weight" && <Scale className="h-3 w-3" />}
            {info.label}
          </div>
          <div className="font-display font-bold text-sm">
            {info.key === "age"
              ? selectedEntry
                ? `${selectedEntry.age} Cycles`
                : "-- Cycles"
              : `${(rikishi as UIRikishi & Record<string, unknown>)[info.key] || "--"}${info.suffix}`}
          </div>
          {info.key === "height" && rikishi.heightDescriptor && (
            <div className="text-[10px] text-muted-foreground/60">{rikishi.heightDescriptor}</div>
          )}
          {info.key === "weight" && rikishi.weightDescriptor && (
            <div className="text-[10px] text-muted-foreground/60">{rikishi.weightDescriptor}</div>
          )}
          {info.key === "age" && selectedEntry?.rikishi.ageDescriptor ? (
            <div className="text-[10px] text-muted-foreground/60">
              {selectedEntry.rikishi.ageDescriptor}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** Current rank card. */
export function RankInfoCard({ rikishi }: { rikishi: UIRikishi }) {
  return (
    <div className="bg-primary/5 border-2 border-primary/10 rounded-lg p-3">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
        <Trophy className="h-3.5 w-3.5 text-primary" /> Current Rank
      </div>
      <div className="text-2xl font-display font-black uppercase">
        {rikishi.rank} {rikishi.rankNumber > 0 ? rikishi.rankNumber : ""}
      </div>
      <div className="text-[10px] font-bold text-muted-foreground uppercase">
        {rikishi.side || "East"} Division
      </div>
    </div>
  );
}

/** Power/speed/balance/technique attribute grid. */
export function AttributesGrid({ rikishi }: { rikishi: UIRikishi }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-display font-black flex items-center gap-2 uppercase tracking-tight">
        <Activity className="h-3.5 w-3.5 text-primary" /> Attributes
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {RIKISHI_ATTRIBUTES.map((stat) => (
          <div key={stat.key} className="bg-muted/30 p-2.5 rounded-lg">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">
              {stat.label === "Power" && <Zap className="h-3 w-3" />}
              {stat.label === "Speed" && <TrendingUp className="h-3 w-3" />}
              {stat.label === "Balance" && <Shield className="h-3 w-3" />}
              {stat.label === "Technique" && <Target className="h-3 w-3" />}
              {stat.label}
            </div>
            <div className="text-xl font-display font-black text-foreground">
              {((rikishi as UIRikishi & Record<string, unknown>)[stat.key] as number) ?? "--"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Combat style — archetype badge, grip/depth, signature kimarite. */
export function CombatStyleSection({ rikishi }: { rikishi: UIRikishi }) {
  return (
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
                  {rikishi.archetypeName || "Unknown"}
                </Badge>
              </TooltipTrigger>
              {rikishi.combatArchetype && (
                <TooltipContent>
                  <p className="max-w-xs">
                    {getCombatArchetypeDescription(rikishi.combatArchetype)}
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          {rikishi.styleName !== rikishi.archetypeName && (
            <Badge
              variant="outline"
              className="text-[10px] font-black uppercase tracking-widest h-6"
            >
              {rikishi.styleName || "Balanced"}
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="bg-muted/40 rounded-lg p-2 space-y-0.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Grip
            </p>
            <p className="text-xs font-display font-black capitalize">
              {rikishi.preferredGrip === "none" ? "No Preference" : rikishi.preferredGrip || "--"}
            </p>
          </div>
          <div className="bg-muted/40 rounded-lg p-2 space-y-0.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Depth
            </p>
            <p className="text-xs font-display font-black capitalize">
              {rikishi.preferredGripDepth || "--"}
            </p>
          </div>
        </div>
        {rikishi.favoredKimariteDetailed && rikishi.favoredKimariteDetailed.length > 0 && (
          <div className="pt-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
              Signature Techniques
            </p>
            <div className="flex flex-wrap gap-1.5">
              {rikishi.favoredKimariteDetailed.slice(0, 5).map((k, i: number) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-[10px] font-bold uppercase tracking-widest h-5"
                >
                  {k.kimarite} <span className="text-muted-foreground ml-1">{k.percentage}%</span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

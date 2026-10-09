/**
 * ChronicleRoomSections.tsx
 *
 * Sections of ChronicleRoom — empty-scroll state, legacy header, era
 * timeline, and training-philosophy/alumni column.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scroll, Trophy, Users, History, Globe } from "lucide-react";
import type { Heya } from "@/engine/types/heya";
import type { DynastyRecord } from "@/engine/types/dynasty";
import { LEGACY_TIERS, type DynastyReport } from "./chronicleTiers";
import { cn } from "@/lib/utils";

/** Empty state when the stable has no dynasty history yet. */
export function EmptyChronicle() {
  return (
    <Card className="paper border-dashed opacity-70">
      <CardContent className="h-64 flex flex-col items-center justify-center text-center p-8">
        <History className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-bold font-display">The Scrolls are Empty</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Your stable has only just begun its journey. Win your first Yusho or undergo your first
          succession to begin your Chronicle.
        </p>
      </CardContent>
    </Card>
  );
}

/** Legacy header — tier sigil, stable name, era badge, yusho/training stats. */
export function ChronicleHeader({
  report,
  heya,
}: {
  report: DynastyReport;
  heya: Heya;
}) {
  const currentTier = LEGACY_TIERS[report.legacyTier];
  const TierIcon = currentTier.icon;

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      <div
        className={cn(
          "w-32 h-32 rounded-2xl flex items-center justify-center bg-card shadow-xl border-2",
          report.legacyTier === "legend"
            ? "border-gold/50 shadow-amber-900/20"
            : "border-border"
        )}
      >
        <TierIcon
          className={cn(
            "h-16 w-16",
            report.legacyTier === "legend" ? "text-gold" : "text-muted-foreground"
          )}
        />
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold font-display tracking-tight uppercase">
            {heya.name}
          </h2>
          <Badge variant="outline" className="font-black border-primary/20 text-primary">
            ERA {report.currentEra}
          </Badge>
        </div>
        <p className="text-muted-foreground max-w-2xl leading-relaxed">
          The Chronicle records the deeds of the {heya.name} since its founding. Currently
          recognized as an <span className="text-primary font-bold">{currentTier.label}</span>.
        </p>

        <div className="flex gap-4 pt-2">
          <div className="bg-card/50 border border-border rounded-lg px-4 py-2">
            <span className="text-[10px] uppercase font-black text-muted-foreground block">
              Total Yusho
            </span>
            <span className="text-xl font-bold font-display tabular-nums">
              {report.totalYusho}
            </span>
          </div>
          <div className="bg-card/50 border border-border rounded-lg px-4 py-2">
            <span className="text-[10px] uppercase font-black text-muted-foreground block">
              Training Bonus
            </span>
            <span className="text-xl font-bold font-display tabular-nums text-success">
              +{Math.round((report.trainingBonus - 1) * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Era timeline — one entry per oyakata reign, newest first. */
export function EraTimeline({ eras }: { eras: DynastyRecord[] }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <History className="h-4 w-4 text-primary" />
        <h3 className="text-lg font-bold font-display uppercase tracking-widest">
          Chronicle of Eras
        </h3>
      </div>

      <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-card">
        {eras
          .slice()
          .reverse()
          .map((era, idx) => (
            <div key={idx} className="relative pl-10 group">
              <div className="absolute left-[13px] top-1.5 w-2 h-2 rounded-full bg-card group-hover:bg-primary transition-colors border-2 border-background" />
              <div className="bg-card/40 border border-border rounded-xl p-4 transition-all hover:bg-card/60 hover:border-border">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-muted-foreground">The Reign of {era.oyakataName}</h4>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {era.reignFrom} – {era.reignTo || "Present"}
                  </span>
                </div>

                <div className="flex gap-4 text-[10px] text-muted-foreground uppercase font-black mb-3">
                  <div className="flex items-center gap-1">
                    <Trophy className="h-3 w-3 text-gold/70" />{" "}
                    {era.achievementsInReign.yushoCount} Yusho
                  </div>
                  <div className="flex items-center gap-1">
                    <Globe className="h-3 w-3 text-primary/70" />{" "}
                    {era.achievementsInReign.globalCupWins} Global Wins
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-success/70" />{" "}
                    {era.achievementsInReign.boardSeatsWon} Board Seats
                  </div>
                </div>

                <p className="text-sm italic text-muted-foreground bg-card/30 p-2 rounded-md border border-border">
                  "{era.legacyBlurb || "A period of steady growth and institutional expansion."}
                  "
                </p>
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}

/** Right column — training DNA card plus alumni teaser. */
export function ChronicleSideColumn({ report }: { report: DynastyReport }) {
  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Scroll className="h-4 w-4 text-primary" />
          <h3 className="text-lg font-bold font-display uppercase tracking-widest">
            Training DNA
          </h3>
        </div>
        <Card className="glass shadow-xl overflow-hidden border-border/50">
          <CardContent className="p-0">
            <div className="p-6 bg-card">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-black text-muted-foreground">
                    Emphasis
                  </span>
                  <p className="text-xl font-bold font-display capitalize">
                    {report.trainingPhilosophy.focusBias}
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[10px] uppercase font-black text-muted-foreground">
                    Intensity
                  </span>
                  <p className="text-xl font-bold font-display capitalize text-primary">
                    {report.trainingPhilosophy.intensityBias}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="text-[10px] uppercase font-black bg-card"
                >
                  Inherited
                </Badge>
                <span>Recruiting {report.trainingPhilosophy.recruitmentBias} talent</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Alumni Teaser */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-lg font-bold font-display uppercase tracking-widest">
            Notable Students
          </h3>
        </div>
        <div className="bg-card/20 border border-border/40 rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <Users className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-xs text-muted-foreground max-w-[200px]">
            Detailed alumni tracking for former students will be available in the next season
            update.
          </p>
        </div>
      </section>
    </div>
  );
}

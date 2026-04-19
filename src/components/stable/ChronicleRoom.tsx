import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scroll, Trophy, Users, History, Award, Globe, Star } from "lucide-react";
import { DynastyService } from "@/engine/systems/legacy/DynastyService";
// eslint-disable-next-line no-restricted-imports
import type { WorldState } from "@/engine/types/world";
import type { Id } from "@/engine/types/common";
import { cn } from "@/lib/utils";

interface ChronicleRoomProps {
  world: WorldState;
  heyaId: Id;
}

export function ChronicleRoom({ world, heyaId }: ChronicleRoomProps) {
  const report = DynastyService.generateDynastyReport(world, heyaId);
  const heya = world.heyas.get(heyaId);

  if (!report || !heya) {
    return (
      <Card className="paper border-dashed opacity-70">
        <CardContent className="h-64 flex flex-col items-center justify-center text-center p-8">
          <History className="h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-xl font-bold font-display">The Scrolls are Empty</h3>
          <p className="text-sm text-slate-500 max-w-xs">
            Your stable has only just begun its journey. Win your first Yusho or undergo your first
            succession to begin your Chronicle.
          </p>
        </CardContent>
      </Card>
    );
  }

  const legacyTiers = {
    emerging: { label: "Emerging Stable", color: "slate", icon: Scroll },
    established: { label: "Established Power", color: "blue", icon: Award },
    dynasty: { label: "Elite Dynasty", color: "purple", icon: Trophy },
    legend: { label: "Eternal Legend", color: "amber", icon: Star },
  };

  const currentTier = legacyTiers[report.legacyTier];
  const TierIcon = currentTier.icon;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Legacy Header */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div
          className={cn(
            "w-32 h-32 rounded-2xl flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 shadow-xl border-2",
            report.legacyTier === "legend"
              ? "border-amber-400/50 shadow-amber-900/20"
              : "border-slate-700"
          )}
        >
          <TierIcon
            className={cn(
              "h-16 w-16",
              report.legacyTier === "legend" ? "text-amber-400" : "text-slate-300"
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
          <p className="text-slate-400 max-w-2xl leading-relaxed">
            The Chronicle records the deeds of the {heya.name} since its founding. Currently
            recognized as an <span className="text-primary font-bold">{currentTier.label}</span>.
          </p>

          <div className="flex gap-4 pt-2">
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg px-4 py-2">
              <span className="text-[10px] uppercase font-black text-slate-500 block">
                Total Yusho
              </span>
              <span className="text-xl font-bold font-display tabular-nums">
                {report.totalYusho}
              </span>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg px-4 py-2">
              <span className="text-[10px] uppercase font-black text-slate-500 block">
                Training Bonus
              </span>
              <span className="text-xl font-bold font-display tabular-nums text-emerald-400">
                +{Math.round((report.trainingBonus - 1) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Era Timeline */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-4 w-4 text-primary" />
            <h3 className="text-lg font-bold font-display uppercase tracking-widest">
              Chronicle of Eras
            </h3>
          </div>

          <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {report.eras
              .slice()
              .reverse()
              .map((era, idx) => (
                <div key={idx} className="relative pl-10 group">
                  <div className="absolute left-[13px] top-1.5 w-2 h-2 rounded-full bg-slate-700 group-hover:bg-primary transition-colors border-2 border-background" />
                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 transition-all hover:bg-slate-900/60 hover:border-slate-700">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-slate-200">The Reign of {era.oyakataName}</h4>
                      <span className="text-[10px] font-mono text-slate-500">
                        {era.reignFrom} – {era.reignTo || "Present"}
                      </span>
                    </div>

                    <div className="flex gap-4 text-[10px] text-slate-400 uppercase font-black mb-3">
                      <div className="flex items-center gap-1">
                        <Trophy className="h-3 w-3 text-amber-500/70" />{" "}
                        {era.achievementsInReign.yushoCount} Yusho
                      </div>
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3 text-primary/70" />{" "}
                        {era.achievementsInReign.globalCupWins} Global Wins
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-emerald-500/70" />{" "}
                        {era.achievementsInReign.boardSeatsWon} Board Seats
                      </div>
                    </div>

                    <p className="text-sm italic text-slate-500 bg-slate-950/30 p-2 rounded-md border border-slate-900">
                      "{era.legacyBlurb || "A period of steady growth and institutional expansion."}
                      "
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </section>

        {/* Philosophy & Bloodlines */}
        <div className="space-y-6">
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Scroll className="h-4 w-4 text-primary" />
              <h3 className="text-lg font-bold font-display uppercase tracking-widest">
                Training DNA
              </h3>
            </div>
            <Card className="glass shadow-xl overflow-hidden border-slate-800/50">
              <CardContent className="p-0">
                <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-950">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-black text-slate-500">
                        Emphasis
                      </span>
                      <p className="text-xl font-bold font-display capitalize">
                        {report.trainingPhilosophy.focusBias}
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <span className="text-[10px] uppercase font-black text-slate-500">
                        Intensity
                      </span>
                      <p className="text-xl font-bold font-display capitalize text-primary">
                        {report.trainingPhilosophy.intensityBias}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="text-[9px] uppercase font-black bg-slate-800"
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
            <div className="bg-slate-900/20 border border-slate-800/40 rounded-xl p-6 flex flex-col items-center justify-center text-center">
              <Users className="h-8 w-8 text-slate-600 mb-3" />
              <p className="text-xs text-slate-500 max-w-[200px]">
                Detailed alumni tracking for former students will be available in the next season
                update.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

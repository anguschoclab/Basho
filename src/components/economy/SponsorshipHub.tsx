/**
 * SponsorshipHub.tsx
 * ==================
 * Financial management interface for stable benefactors and Koenkai.
 * (Phase N: Institutional Polish)
 */

import { cn } from "@/lib/utils";
import { formatYen } from "@/utils/engineUtils";
import {
  Heart,
  Users,
  TrendingUp,
  Award,
  Crown,
  Landmark,
  PieChart,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface SponsorData {
  sponsorId: string;
  sponsorName: string;
  tier: string;
  strength: number;
  monthlyIncome: number;
  weeksRemaining: number;
  isExpiringSoon: boolean;
  loyalty: number;
  since: number;
}

interface SponsorshipHubProps {
  data: {
    koenkaiName: string;
    strength: string;
    activeSponsors: SponsorData[];
    totalMonthlyIncome: number;
    expiringCount: number;
    koenkaiIncome: number;
  } | null;
}

export function SponsorshipHub({ data }: SponsorshipHubProps) {
  if (!data) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      {/* ═══ FINANCIAL SUMMARY ═══ */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="dossier-paper border-2 border-primary/10 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Landmark className="h-3 w-3 text-primary" /> Total Monthly Funding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-black text-primary">
              {formatYen(data.totalMonthlyIncome)}
            </div>
            <p className="text-[9px] uppercase font-bold text-muted-foreground/60 mt-1">
              Combined Koenkai + Sponsor Dues
            </p>
          </CardContent>
        </Card>

        <Card className="dossier-paper border-2 border-emerald-500/10 bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Users className="h-3 w-3 text-emerald-500" /> Supporter Association
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-black text-emerald-700 uppercase">
              {data.strength} <span className="text-[10px] font-normal">{data.koenkaiName}</span>
            </div>
            <p className="text-[9px] uppercase font-bold text-muted-foreground/60 mt-1">
              Provides constant {formatYen(data.koenkaiIncome)} monthly
            </p>
          </CardContent>
        </Card>

        <Card className="dossier-paper border-2 border-warning/10 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Award className="h-3 w-3 text-warning" /> Contract Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-black text-warning">
              {data.expiringCount}{" "}
              <span className="text-sm font-normal text-muted-foreground">Expiring Soon</span>
            </div>
            <p className="text-[9px] uppercase font-bold text-muted-foreground/60 mt-1">
              Renewal window opens at 4 weeks remaining
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ═══ SPONSOR DIRECTORY ═══ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-display font-black uppercase tracking-tight">
            Active Benefactor Registry
          </h3>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[9px] font-black uppercase tracking-widest gap-2"
          >
            <PieChart className="h-3 w-3" /> Industry Breakdown
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {data.activeSponsors.map((sponsor) => (
            <Card
              key={sponsor.sponsorId}
              className="paper hover:border-primary/40 transition-all group"
            >
              <CardContent className="p-0">
                <div className="p-6 flex items-start justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-display font-bold text-lg uppercase truncate">
                        {sponsor.sponsorName}
                      </span>
                      <Badge variant="secondary" className="text-[9px] font-black uppercase">
                        {sponsor.tier}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" /> Since Week {sponsor.since}
                      </span>
                      <span className="flex items-center gap-1.5 text-primary">
                        <Landmark className="h-3 w-3" /> {formatYen(sponsor.monthlyIncome)} / mo
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={cn(
                        "text-xl font-display font-black",
                        sponsor.isExpiringSoon ? "text-warning" : "text-muted-foreground"
                      )}
                    >
                      {sponsor.weeksRemaining} <span className="text-[9px] uppercase">Weeks</span>
                    </div>
                    <div className="text-[8px] uppercase font-bold opacity-40">Remaining</div>
                  </div>
                </div>

                {/* Sentiment Bar */}
                <div className="px-6 pb-6 pt-0 space-y-2">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                    <span>Satisfaction & Loyalty</span>
                    <span>{sponsor.loyalty}%</span>
                  </div>
                  <Progress value={sponsor.loyalty} className="h-1.5 bg-muted" />
                </div>

                <div className="border-t border-dashed p-3 bg-muted/20 flex justify-between items-center group-hover:bg-primary/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-2">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <div
                          key={v}
                          className={cn(
                            "h-3 w-3 rounded-full border border-background",
                            v <= sponsor.strength ? "bg-primary" : "bg-muted"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-[8px] font-black uppercase opacity-40">
                      Strength: {sponsor.strength}/5
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[8px] font-black uppercase tracking-widest"
                  >
                    Details <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {data.activeSponsors.length === 0 && (
            <div className="md:col-span-2 py-20 text-center dossier-paper rounded-xl border-dashed opacity-40">
              <Crown className="h-12 w-12 mx-auto mb-4 opacity-10" />
              <p className="font-display italic text-sm">
                Target high-performing rikishi to attract prestigious benefactors.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ SPONSOR APPEAL CTA ═══ */}
      <div className="dossier-paper p-8 rounded-2xl flex flex-col md:flex-row items-center gap-10 border-2 border-emerald-500/20 shadow-2xl bg-emerald-500/[0.03] relative overflow-hidden">
        <div className="absolute -bottom-10 -right-10 opacity-[0.03] rotate-12 pointer-events-none">
          <TrendingUp className="h-64 w-64 text-emerald-900" />
        </div>

        <div className="h-20 w-20 bg-emerald-500 text-white rounded-3xl flex items-center justify-center shrink-0 shadow-lg transform rotate-3">
          <Heart className="h-10 w-10 fill-current" />
        </div>

        <div className="space-y-2 flex-1 relative z-10">
          <h3 className="text-2xl font-display font-black uppercase tracking-tight">
            Expand the Supporter Circle
          </h3>
          <p className="text-xs text-muted-foreground italic leading-relaxed max-w-2xl font-medium">
            Your stable's **Reputation** creates gravity for regional and national brands.
            High-prestige rikishi acts as "Flagship Assets", attracting T4 and T5 sponsors who
            demand absolute loyalty and consistent yūshō contention.
          </p>
          <div className="pt-4 flex flex-wrap gap-4">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[11px] px-10 h-12 shadow-xl shadow-emerald-500/20 transition-all">
              ATTRACT NEW PATRONS
            </Button>
            <div className="flex items-center gap-4 border-l border-emerald-500/20 pl-4">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-muted-foreground uppercase opacity-50">
                  Market Status
                </span>
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 text-emerald-600 text-[10px] font-black"
                >
                  PRIME VISIBILITY
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

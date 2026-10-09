/**
 * InducteeCards.tsx
 *
 * Hall of Fame inductee card pieces — portrait avatar, stat box, and the
 * full inductee card with career stats, yūshō list, and greatest fights.
 */

import { Card, CardContent } from "@/components/ui/card";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { Badge } from "@/components/ui/badge";
import { RikishiName } from "@/components/ClickableName";
import { Trophy, Shield, Target, Crown, TrendingUp, Calendar, Swords } from "lucide-react";
import type { HoFCategory } from "@/presenters/engineAccess";
import { HOF_CATEGORY_LABELS } from "@/presenters/uiDigest";
import type { UIHofInductee } from "@/presenters/projections/hofProjection";
import type { UIRikishi } from "@/presenters/uiModels";
import { CATEGORY_ICONS, CATEGORY_GRADIENT, CATEGORY_ACCENT, RANK_JA } from "./hofMeta";

// === Portrait Avatar ===

export function RikishiPortrait({
  rikishi,
  category,
}: {
  rikishi: UIRikishi | null;
  category: HoFCategory;
}) {
  const accent = CATEGORY_ACCENT[category];

  return (
    <SumoAvatar
      config={rikishi?.avatarConfig}
      size="lg"
      showHairstyle={true}
      fallback={rikishi?.shikona}
      expression={
        category === "champion" ? "confident" : category === "technician" ? "determined" : "neutral"
      }
      className={`border-2 ${accent}`}
    />
  );
}

// === Inductee Full Card ===

export function InducteeFullCard({ inductee }: { inductee: UIHofInductee }) {
  const Icon = CATEGORY_ICONS[inductee.category as HoFCategory];
  const label = HOF_CATEGORY_LABELS[inductee.category as HoFCategory];
  const accent = CATEGORY_ACCENT[inductee.category as HoFCategory];
  const gradient = CATEGORY_GRADIENT[inductee.category as HoFCategory];
  const rikishi = inductee.rikishi;

  return (
    <Card className={`border bg-gradient-to-br ${gradient} overflow-hidden`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <RikishiPortrait rikishi={rikishi} category={inductee.category} />

          <div className="flex-1 min-w-0">
            {/* Name & Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <RikishiName
                id={inductee.rikishiId}
                name={inductee.shikona}
                className="font-display font-bold text-lg"
              />
              <Badge className={`gap-1 ${accent} border-current/30`}>
                <Icon className="h-3 w-3" />
                {label.icon} {label.name}
              </Badge>
            </div>

            {/* Metadata row */}
            <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
              {inductee.stats.highestRank && (
                <span className="flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  Peak:{" "}
                  <strong className="text-foreground">
                    {RANK_JA[inductee.stats.highestRank] ?? inductee.stats.highestRank}
                  </strong>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Inducted: <strong className="text-foreground">{inductee.inductionYear}</strong>
              </span>
              {inductee.heyaName && (
                <span>
                  Stable: <span className="text-xs font-medium">{inductee.heyaName}</span>
                </span>
              )}
            </div>

            {/* Career Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              {inductee.stats.yushoCount != null && (
                <StatBox
                  icon={Trophy}
                  label="Yūshō"
                  value={inductee.stats.yushoCount}
                  accent="text-gold"
                />
              )}
              {inductee.stats.consecutiveBasho != null && (
                <StatBox
                  icon={Shield}
                  label="Basho Streak"
                  value={inductee.stats.consecutiveBasho}
                  accent="text-west"
                />
              )}
              {inductee.stats.ginoShoCount != null && (
                <StatBox
                  icon={Target}
                  label="Ginō-shō"
                  value={inductee.stats.ginoShoCount}
                  accent="text-success"
                />
              )}
              {inductee.stats.careerWins != null && (
                <StatBox
                  icon={TrendingUp}
                  label="Career Record"
                  value={`${inductee.stats.careerWins}-${inductee.stats.careerLosses ?? 0}`}
                  accent="text-foreground"
                />
              )}
            </div>

            {/* Yūshō list for champions */}
            {inductee.category === "champion" && inductee.yushoList?.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wider">
                  Tournament Victories
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {inductee.yushoList.map((y, i) => (
                    <Badge key={i} className="text-[10px] capitalize">
                      {y.bashoName} {y.year}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Greatest Fights */}
            {inductee.greatestFights?.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wider flex items-center gap-1">
                  <Swords className="h-3 w-3" /> Notable Bouts
                </div>
                <div className="space-y-1">
                  {inductee.greatestFights.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-success">W</span>
                      <span className="text-muted-foreground">vs</span>
                      <span className="font-medium">{f.opponentName}</span>
                      <Badge className="text-[9px]">{f.kimarite}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatBox({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="bg-background/50 rounded-md p-2 text-center">
      <Icon className={`h-3.5 w-3.5 mx-auto mb-0.5 ${accent}`} />
      <div className={`text-sm font-bold font-mono ${accent}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

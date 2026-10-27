/**
 * SponsorDrawCard.tsx
 *
 * Sponsor draw card for economy page.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";
import { RikishiName } from "@/components/shared/ClickableName";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { resolveAvatar, rikishiStageInput } from "@/presenters/projections/avatarProjections";
import { DEFAULT_START_YEAR } from "@/constants/engine/calendar";
import { kenshoTierLabel } from "@/components/economy/economyUtils";
import type { Rikishi } from "@/engine/types/index";

interface SponsorDrawCardProps {
  topEarners: Rikishi[];
  /** Current world year — drives avatar stage derivation. */
  currentYear?: number;
}

export function SponsorDrawCard({ topEarners, currentYear = DEFAULT_START_YEAR }: SponsorDrawCardProps) {
  if (topEarners.length === 0) return null;

  return (
    <Card className="paper">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-gold" />
          Sponsor Draw
        </CardTitle>
        <CardDescription>Who in your heya attracts the most banner attention</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topEarners.map((r, i) => {
            const total = Number(r?.economics?.careerKenshoWon ?? 0) || 0;
            const tier = kenshoTierLabel(total);

            return (
              <div key={r?.id ?? `${i}`} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl font-display font-bold text-muted-foreground shrink-0">
                    {i + 1}
                  </span>
                  <SumoAvatar
                    avatar={
                      r
                        ? resolveAvatar({
                            id: r.id,
                            stored: r.avatarConfig,
                            nationality: r.nationality,
                            ...rikishiStageInput(r, currentYear),
                          })
                        : undefined
                    }
                    size="sm"
                    fallback={r?.shikona}
                  />
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      <RikishiName id={r?.id} name={r?.shikona ?? "Unknown"} />
                    </p>
                    <p className="text-xs text-muted-foreground">{tier.detail}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <Badge variant="outline">{tier.label}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

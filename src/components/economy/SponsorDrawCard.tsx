/**
 * SponsorDrawCard.tsx
 *
 * Sponsor draw card for economy page.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";
import { RikishiName } from "@/components/ClickableName";
import { kenshoTierLabel } from "./economyUtils";
import type { Rikishi } from "@/engine/types";

interface SponsorDrawCardProps {
  topEarners: Rikishi[];
}

export function SponsorDrawCard({ topEarners }: SponsorDrawCardProps) {
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

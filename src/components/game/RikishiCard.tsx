/**
 * RikishiCard.tsx
 *
 * Rikishi detail card — avatar/identity header, tactical stance, favored
 * kimarite, physique, citizenship, prestige, and salary breakdown.
 * Sections live in ./RikishiCardSections.tsx.
 */

import React, { useMemo } from "react";
import { UIRikishi } from "../../presenters/uiModels";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  RikishiCardHeader,
  CitizenshipSection,
  PrestigeSection,
  SalarySection,
} from "./RikishiCardSections";

interface RikishiCardProps {
  rikishi: UIRikishi;
}

export const RikishiCard = React.memo(function RikishiCard({ rikishi }: RikishiCardProps) {
  const stanceLabel = useMemo(() => {
    if (rikishi.preferredGrip === "none") return "Oshi-Specialist";

    const grip = rikishi.preferredGrip === "migi" ? "Migi-Yotsu" : "Hidari-Yotsu";
    const depth =
      rikishi.preferredGripDepth === "maemitsu"
        ? "(Maemitsu)"
        : rikishi.preferredGripDepth === "deep"
          ? "(Deep)"
          : "";

    return `${grip} ${depth}`.trim();
  }, [rikishi.preferredGrip, rikishi.preferredGripDepth]);

  return (
    <Card
      data-testid="rikishi-card"
      className="w-full max-w-md bg-card/50 border-primary/20 hover:border-primary/40 transition-all"
    >
      <RikishiCardHeader rikishi={rikishi} />
      <CardContent>
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/30 border border-primary/10">
            <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              Tactical Stance
            </h4>
            <p className="text-lg font-display text-primary-foreground">{stanceLabel}</p>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Favored Kimarite
            </h4>
            <div className="flex flex-wrap gap-2">
              {rikishi.favoredKimarite.map((k, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="bg-primary/5 hover:bg-primary/10 text-primary-foreground border-primary/20"
                >
                  {k}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-primary/5">
            <div>
              <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Height
              </h4>
              <p className="font-medium">
                {rikishi.height} cm{" "}
                <span className="text-muted-foreground text-xs">({rikishi.heightDescriptor})</span>
              </p>
            </div>
            <div>
              <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Weight
              </h4>
              <p className="font-medium">
                {rikishi.weight} kg{" "}
                <span className="text-muted-foreground text-xs">({rikishi.weightDescriptor})</span>
              </p>
            </div>
          </div>

          <CitizenshipSection rikishi={rikishi} />
          <PrestigeSection rikishi={rikishi} />
          <SalarySection rikishi={rikishi} />
        </div>
      </CardContent>
    </Card>
  );
});

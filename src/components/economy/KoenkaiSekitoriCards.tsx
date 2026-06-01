/**
 * KoenkaiSekitoriCards.tsx
 *
 * Koenkai and Sekitori cards for economy page.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Users, Award } from "lucide-react";
import type { KoenkaiBandType } from "@/engine/types/narrative";
import { KOENKAI_CONFIG } from "../../constants/ui/economy";

interface KoenkaiSekitoriCardsProps {
  koenkaiBand: KoenkaiBandType;
  sekitoriCount: number;
}

export function KoenkaiSekitoriCards({ koenkaiBand, sekitoriCount }: KoenkaiSekitoriCardsProps) {
  const koenkaiConfig = KOENKAI_CONFIG[koenkaiBand] || KOENKAI_CONFIG.none;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Koenkai Card */}
      <Card className="paper">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Kōenkai (Supporters)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge className={koenkaiConfig.color}>{koenkaiConfig.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{koenkaiConfig.description}</p>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Monthly Support</span>
            <span className="font-medium">{koenkaiConfig.monthlySupport}</span>
          </div>
        </CardContent>
      </Card>

      {/* Sekitori Card */}
      <Card className="paper">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Sekitori Presence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Salaried Wrestlers</span>
            <span className="font-display text-2xl font-bold">{sekitoriCount}</span>
          </div>

          <p className="text-sm text-muted-foreground">
            {sekitoriCount > 0
              ? "Sekitori increase stability through rank-linked league structures and visibility that attracts sponsors."
              : "Without sekitori, finances depend on supporter growth, careful budgeting, and long-term development."}
          </p>

          <Separator />

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Higher ranks generally improve stability and sponsor interest.</p>
            <p>• Injuries and absences can quietly disrupt earnings momentum.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

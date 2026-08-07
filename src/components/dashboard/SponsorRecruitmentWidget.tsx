import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useGame } from "@/contexts/useGame";
import { Coins, TrendingUp, Building2 } from "lucide-react";
import { formatYen } from "@/utils/engineUtils";
import { EmptyState } from "@/components/ui/EmptyState";
import { recruitSponsor } from "@/presenters/uiDigest";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { getPlayerHeya } from "@/engine/queries";

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  T0: { label: "Local", color: "text-muted-foreground" },
  T1: { label: "Regional", color: "text-west" },
  T2: { label: "National", color: "text-success" },
  T3: { label: "Major", color: "text-primary" },
  T4: { label: "Premier", color: "text-warning" },
  T5: { label: "Elite", color: "text-destructive" },
};

const RECRUITMENT_COSTS: Record<string, number> = {
  T0: 50_000,
  T1: 150_000,
  T2: 400_000,
  T3: 800_000,
  T4: 1_500_000,
  T5: 4_000_000,
};

const SponsorRow = React.memo(
  ({
    sponsorId,
    displayName,
    tier,
    cost,
    canAfford,
    prestigeAffinity,
    category,
    onRecruit,
  }: {
    sponsorId: string;
    displayName: string;
    tier: string;
    cost: number;
    canAfford: boolean;
    prestigeAffinity: number;
    category: string;
    onRecruit: (id: string) => void;
  }) => {
    const tierInfo = TIER_LABELS[tier] || {
      label: tier,
      color: "text-muted-foreground",
    };

    return (
      <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">{displayName}</span>
            <Badge variant="outline" className={tierInfo.color}>
              {tierInfo.label}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Coins className="h-3 w-3" />
              {formatYen(cost)}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Prestige: {prestigeAffinity}
            </span>
            <span>{category}</span>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => onRecruit(sponsorId)}
          disabled={!canAfford}
          variant={canAfford ? "default" : "secondary"}
          {...(!canAfford ? { tooltip: "Insufficient funds", tooltipSide: "top" } : {})}
        >
          {canAfford ? "Recruit" : "Insufficient Funds"}
        </Button>
      </div>
    );
  }
);

export function SponsorRecruitmentWidget() {
  const { state, updateWorld } = useGame();
  const { toast } = useToast();
  const world = state.world;

  if (!world?.sponsorPool || !world.playerHeyaId) {
    return null;
  }

  const heya = getPlayerHeya(world);
  if (!heya) return null;

  const koenkai = world.sponsorPool.koenkais.get(world.playerHeyaId);
  const existingSponsorIds = new Set(koenkai?.members.map((m) => m.sponsorId) || []);

  // Filter available sponsors (active, not already recruited)
  const rawSponsors = [];
  for (const s of world.sponsorPool.sponsors.values()) {
    if (s.active && !existingSponsorIds.has(s.sponsorId)) {
      rawSponsors.push(s);
    }
  }

  const availableSponsors = rawSponsors
    .sort((a, b) => {
      // Sort by tier (higher tiers first)
      const tierOrder = { T5: 0, T4: 1, T3: 2, T2: 3, T1: 4, T0: 5 };
      const tierDiff = (tierOrder[a.tier] || 99) - (tierOrder[b.tier] || 99);
      if (tierDiff !== 0) return tierDiff;
      // Then by prestige affinity
      return b.prestigeAffinity - a.prestigeAffinity;
    })
    .slice(0, 10); // Show top 10 available sponsors

  function handleRecruit(sponsorId: string) {
    if (!world?.sponsorPool || !world.playerHeyaId) return;
    const heya = getPlayerHeya(world);
    if (!heya) return;

    const sponsor = world.sponsorPool.sponsors.get(sponsorId);
    if (!sponsor) return;

    const cost = RECRUITMENT_COSTS[sponsor.tier] || 0;

    if (heya.funds < cost) {
      toast({
        title: "Insufficient funds",
        description: `You need ${formatYen(cost)} to recruit ${sponsor.displayName}.`,
        variant: "destructive",
      });
      return;
    }

    if (!world.rng) return;
    const impact = recruitSponsor(world, world.playerHeyaId, sponsor.sponsorId, world.rng);
    const nextWorld = resolveImpacts(world, [impact]);
    updateWorld(nextWorld);
    toast({
      title: "Sponsor recruited",
      description: `${sponsor.displayName} has joined your Kōenkai.`,
    });
  }

  return (
    <Card className="paper">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Sponsor Recruitment
        </CardTitle>
        <CardDescription>
          Recruit new sponsors to expand your Kōenkai and increase monthly income.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {availableSponsors.length === 0 ? (
            <EmptyState icon={Building2} title="No sponsors available for recruitment" compact />
          ) : (
            <div className="space-y-3">
              {availableSponsors.map((sponsor) => {
                const cost = RECRUITMENT_COSTS[sponsor.tier] || 0;
                const canAfford = heya.funds >= cost;

                return (
                  <SponsorRow
                    key={sponsor.sponsorId}
                    sponsorId={sponsor.sponsorId}
                    displayName={sponsor.displayName}
                    tier={sponsor.tier}
                    cost={cost}
                    canAfford={canAfford}
                    prestigeAffinity={sponsor.prestigeAffinity}
                    category={sponsor.category}
                    onRecruit={handleRecruit}
                  />
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

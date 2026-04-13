import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useGame } from "@/contexts/GameContext";
import { Coins, TrendingUp, Building2 } from "lucide-react";
import type { Sponsor } from "@/engine/types/sponsors";
import { recruitSponsor } from "@/presenters/uiDigest";

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  T0: { label: "Local", color: "text-muted-foreground" },
  T1: { label: "Regional", color: "text-blue-500" },
  T2: { label: "National", color: "text-green-500" },
  T3: { label: "Major", color: "text-purple-500" },
  T4: { label: "Premier", color: "text-orange-500" },
  T5: { label: "Elite", color: "text-red-500" },
};

const RECRUITMENT_COSTS: Record<string, number> = {
  T0: 50_000,
  T1: 150_000,
  T2: 400_000,
  T3: 800_000,
  T4: 1_500_000,
  T5: 4_000_000,
};

export function SponsorRecruitmentWidget() {
  const { state, updateWorld } = useGame();
  const { toast } = useToast();
  const world = state.world;

  if (!world?.sponsorPool || !world.playerHeyaId) {
    return null;
  }

  const heya = world.heyas.get(world.playerHeyaId);
  if (!heya) return null;

  const koenkai = world.sponsorPool.koenkais.get(world.playerHeyaId);
  const existingSponsorIds = new Set(koenkai?.members.map((m) => m.sponsorId) || []);

  // Filter available sponsors (active, not already recruited)
  const availableSponsors = Array.from(world.sponsorPool.sponsors.values())
    .filter((s) => s.active && !existingSponsorIds.has(s.sponsorId))
    .sort((a, b) => {
      // Sort by tier (higher tiers first)
      const tierOrder = { T5: 0, T4: 1, T3: 2, T2: 3, T1: 4, T0: 5 };
      const tierDiff = (tierOrder[a.tier] || 99) - (tierOrder[b.tier] || 99);
      if (tierDiff !== 0) return tierDiff;
      // Then by prestige affinity
      return b.prestigeAffinity - a.prestigeAffinity;
    })
    .slice(0, 10); // Show top 10 available sponsors

  const handleRecruit = (sponsor: Sponsor) => {
    const cost = RECRUITMENT_COSTS[sponsor.tier] || 0;

    if (heya.funds < cost) {
      toast({
        title: "Insufficient funds",
        description: `You need ¥${cost.toLocaleString()} to recruit ${sponsor.displayName}.`,
        variant: "destructive",
      });
      return;
    }

    if (!world.rng) return;
    recruitSponsor(world, world.playerHeyaId, sponsor.sponsorId, world.rng);
    updateWorld({ ...world });
    toast({
      title: "Sponsor recruited",
      description: `${sponsor.displayName} has joined your Kōenkai.`,
    });
  };

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
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No sponsors available for recruitment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableSponsors.map((sponsor) => {
                const tierInfo = TIER_LABELS[sponsor.tier] || {
                  label: sponsor.tier,
                  color: "text-muted-foreground",
                };
                const cost = RECRUITMENT_COSTS[sponsor.tier] || 0;
                const canAfford = heya.funds >= cost;

                return (
                  <div
                    key={sponsor.sponsorId}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{sponsor.displayName}</span>
                        <Badge variant="outline" className={tierInfo.color}>
                          {tierInfo.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Coins className="h-3 w-3" />¥{cost.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Prestige: {sponsor.prestigeAffinity}
                        </span>
                        <span>{sponsor.category}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleRecruit(sponsor)}
                      disabled={!canAfford}
                      variant={canAfford ? "default" : "secondary"}
                    >
                      {canAfford ? "Recruit" : "Insufficient Funds"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// SponsorContractsPanel.tsx — Sponsor negotiation, contracts & expiry management
import { useMemo, useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Coins, HandshakeIcon, AlertTriangle, Clock, Star, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { StableName } from "@/components/ClickableName";
import type { WorldState } from "@/engine/types";
import type { Sponsor, SponsorRelationship, Koenkai, SponsorTier } from "@/engine/sponsors";

const TIER_LABELS: Record<SponsorTier, { label: string; color: string }> = {
  T0: { label: "Local", color: "text-muted-foreground" },
  T1: { label: "Regional", color: "text-foreground" },
  T2: { label: "Established", color: "text-blue-500" },
  T3: { label: "Major", color: "text-purple-500" },
  T4: { label: "National", color: "text-amber-500" },
  T5: { label: "Prestige", color: "text-amber-400" },
};

const TIER_INCOME: Record<SponsorTier, number> = {
  T0: 100_000, T1: 300_000, T2: 750_000, T3: 1_500_000, T4: 3_000_000, T5: 8_000_000,
};

/** Defines the structure for contract info. */
interface ContractInfo {
  sponsor: Sponsor;
  relationship: SponsorRelationship;
  monthlyIncome: number;
  satisfactionEstimate: number;
  expiryWeek: number | null;
  isExpiringSoon: boolean;
}

/**
 * sponsor contracts panel.
 *  * @param { world } - The { world }.
 */
export function SponsorContractsPanel({ world }: { world: WorldState }) {
  const { updateWorld } = useGame();
  const { toast } = useToast();
  const playerHeyaId = world.playerHeyaId;
  const playerHeya = playerHeyaId ? world.heyas.get(playerHeyaId) : null;

  const contracts = useMemo((): ContractInfo[] => {
    if (!world.sponsorPool || !playerHeyaId) return [];
    const result: ContractInfo[] = [];

    for (const sponsor of world.sponsorPool.sponsors.values()) {
      if (!sponsor.active) continue;
      for (const rel of sponsor.relationships) {
        if (rel.targetId !== playerHeyaId) continue;
        
        const monthlyIncome = TIER_INCOME[sponsor.tier] * (rel.strength / 3);
        const satisfactionEstimate = Math.min(100, sponsor.loyalty * 0.6 + (playerHeya?.reputation ?? 50) * 0.4);
        const expiryWeek = rel.endsAtTick ?? null;
        const isExpiringSoon = expiryWeek !== null && expiryWeek - (world.week ?? 0) < 8;

        result.push({ sponsor, relationship: rel, monthlyIncome, satisfactionEstimate, expiryWeek, isExpiringSoon });
      }
    }

    result.sort((a, b) => {
      const tierOrder: Record<string, number> = { T5: 0, T4: 1, T3: 2, T2: 3, T1: 4, T0: 5 };
      return (tierOrder[a.sponsor.tier] ?? 6) - (tierOrder[b.sponsor.tier] ?? 6);
    });
    return result;
  }, [world, playerHeyaId, playerHeya]);

  const totalMonthlyIncome = contracts.reduce((sum, c) => sum + c.monthlyIncome, 0);
  const expiringCount = contracts.reduce((count, c) => count + (c.isExpiringSoon ? 1 : 0), 0);

  // Koenkai info
  const koenkai = playerHeyaId ? world.sponsorPool?.koenkais?.get(`koenkai_${playerHeyaId}`) : null;
  const koenkaiStrength = playerHeya?.koenkaiBand ?? "none";

  const handleRenegotiate = (contract: ContractInfo) => {
    // Simple renegotiation: extend contract by 24 weeks, small loyalty boost
    const sponsor = world.sponsorPool?.sponsors.get(contract.sponsor.sponsorId);
    if (!sponsor) return;

    const relIdx = sponsor.relationships.findIndex(r => r.relId === contract.relationship.relId);
    if (relIdx >= 0) {
      sponsor.relationships[relIdx] = {
        ...sponsor.relationships[relIdx],
        endsAtTick: (world.week ?? 0) + 52,
        strength: Math.min(5, sponsor.relationships[relIdx].strength + 1) as 1 | 2 | 3 | 4 | 5,
      };
      sponsor.loyalty = Math.min(100, sponsor.loyalty + 3);
      updateWorld({ ...world });
      toast({ title: "Contract renewed", description: `${sponsor.displayName} has extended their partnership.` });
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Active Sponsors</p>
            <p className="text-2xl font-bold">{contracts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Monthly Income</p>
            <p className="text-2xl font-bold">¥{(totalMonthlyIncome / 1_000_000).toFixed(1)}M</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Kōenkai</p>
            <p className="text-2xl font-bold capitalize">{koenkaiStrength}</p>
          </CardContent>
        </Card>
        <Card className={expiringCount > 0 ? "border-amber-500/30" : ""}>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Expiring Soon</p>
            <p className={`text-2xl font-bold ${expiringCount > 0 ? "text-amber-500" : ""}`}>{expiringCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Contract List */}
      {contracts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Coins className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No Active Sponsors</p>
            <p className="text-sm text-muted-foreground mt-1">
              Build your stable's prestige and reputation to attract sponsors.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-3 pr-2">
            {contracts.map((c) => {
              const tierInfo = TIER_LABELS[c.sponsor.tier];
              return (
                <Card key={c.relationship.relId} className={`paper ${c.isExpiringSoon ? "border-amber-500/30" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-display font-semibold">{c.sponsor.displayName}</h4>
                          <Badge variant="outline" className={`text-xs ${tierInfo.color}`}>
                            {tierInfo.label}
                          </Badge>
                          {c.isExpiringSoon && (
                            <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-xs gap-1">
                              <Clock className="h-3 w-3" /> Expiring
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{c.sponsor.category.replace("_", " ")}</span>
                          <span>•</span>
                          <span>¥{(c.monthlyIncome / 1000).toFixed(0)}K/mo</span>
                          <span>•</span>
                          <span className="capitalize">{c.relationship.role.replace("_", " ")}</span>
                        </div>

                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Satisfaction</span>
                            <span>{Math.round(c.satisfactionEstimate)}%</span>
                          </div>
                          <Progress value={c.satisfactionEstimate} className="h-1.5" />
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: c.relationship.strength }, (_, i) => (
                            <Star key={i} className="h-3 w-3 text-amber-400" fill="currentColor" />
                          ))}
                        </div>
                        {c.isExpiringSoon && (
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleRenegotiate(c)}>
                            <HandshakeIcon className="h-3 w-3 mr-1" /> Renew
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

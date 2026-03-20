// SponsorContractsPanel.tsx — Sponsor negotiation, contracts & expiry management
import { useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Coins, HandshakeIcon, Clock, Star } from "lucide-react";
import type { WorldState } from "@/engine/types/world";
import { renegotiateSponsorContract } from "@/engine/sponsors";
import { getSponsorContracts, type SponsorContractInfoUI } from "@/engine/uiDigest";
import { SATISFACTION_LABELS, type SatisfactionBand } from "@/engine/descriptorBands";

const SATISFACTION_COLORS: Record<SatisfactionBand, string> = {
  thrilled: "text-green-500",
  happy: "text-green-400",
  content: "text-foreground",
  concerned: "text-amber-500",
  unhappy: "text-red-500",
};

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  T0: { label: "Local", color: "text-muted-foreground" },
  T1: { label: "Regional", color: "text-foreground" },
  T2: { label: "Established", color: "text-blue-500" },
  T3: { label: "Major", color: "text-purple-500" },
  T4: { label: "National", color: "text-amber-500" },
  T5: { label: "Prestige", color: "text-amber-400" },
};

/**
 * sponsor contracts panel.
 *  * @param { world } - The { world }.
 */
export function SponsorContractsPanel({ world }: { world: WorldState }) {
  const { updateWorld } = useGame();
  const { toast } = useToast();

  const sponsorshipInfo = useMemo(() => getSponsorContracts(world), [world]);
  const { contracts, koenkaiStrength } = sponsorshipInfo;

  const totalMonthlyIncome = contracts.reduce((sum, c) => sum + c.monthlyIncome, 0);
  const expiringCount = contracts.reduce((count, c) => count + (c.isExpiringSoon ? 1 : 0), 0);

  const handleRenegotiate = (contract: SponsorContractInfoUI) => {
    const success = renegotiateSponsorContract(world, contract.sponsorId, contract.relId);
    if (success) {
      updateWorld({ ...world });
      toast({ title: "Contract renewed", description: `${contract.displayName} has extended their partnership.` });
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
              const tierInfo = TIER_LABELS[c.tier] || { label: "Unknown", color: "text-muted-foreground" };
              return (
                <Card key={c.relId} className={`paper ${c.isExpiringSoon ? "border-amber-500/30" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-display font-semibold">{c.displayName}</h4>
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
                          <span>{c.category.replace("_", " ")}</span>
                          <span>•</span>
                          <span>¥{(c.monthlyIncome / 1000).toFixed(0)}K/mo</span>
                          <span>•</span>
                          <span className="capitalize">{c.role.replace("_", " ")}</span>
                        </div>

                        <div className="mt-2 text-sm font-medium">
                          <span className="text-muted-foreground mr-2">Satisfaction:</span>
                          <span className={SATISFACTION_COLORS[c.satisfactionBand]}>{SATISFACTION_LABELS[c.satisfactionBand]}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: c.strength }, (_, i) => (
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

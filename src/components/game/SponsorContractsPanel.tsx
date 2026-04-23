// SponsorContractsPanel.tsx — Sponsor negotiation, contracts & expiry management
import { useGameStore } from "@/store/gameStore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Coins, HandshakeIcon, Clock, Star } from "lucide-react";
import type { projectSponsorUIDigest } from "@/presenters/uiDigest";

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  T0: { label: "Local", color: "text-muted-foreground" },
  T1: { label: "Regional", color: "text-foreground" },
  T2: { label: "Established", color: "text-west" },
  T3: { label: "Major", color: "text-primary" },
  T4: { label: "National", color: "text-gold" },
  T5: { label: "Prestige", color: "text-gold" },
};

/**
 * sponsor contracts panel.
 *  * @param { digest } - The projected sponsorship data.
 */
export function SponsorContractsPanel({
  digest,
}: {
  digest: NonNullable<ReturnType<typeof projectSponsorUIDigest>>;
}) {
  const sendCommand = useGameStore((s) => s.sendCommand);
  const { toast } = useToast();

  const handleRenegotiate = (relId: string, name: string, sponsorId: string) => {
    sendCommand({ type: "RENEW_SPONSOR", relationshipId: relId, sponsorId });
    toast({
      title: "Renewal request submitted",
      description: `Negotiations with ${name} have begun.`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Active Sponsors</p>
            <p className="text-2xl font-bold">{digest.activeSponsors.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Monthly Income</p>
            <p className="text-2xl font-bold">
              ¥{(digest.totalMonthlyIncome / 1_000_000).toFixed(1)}M
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Kōenkai</p>
            <p className="text-2xl font-bold capitalize">{digest.strength}</p>
          </CardContent>
        </Card>
        <Card className={digest.expiringCount > 0 ? "border-gold/30" : ""}>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Expiring Soon</p>
            <p className={`text-2xl font-bold ${digest.expiringCount > 0 ? "text-gold" : ""}`}>
              {digest.expiringCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contract List */}
      {digest.activeSponsors.length === 0 ? (
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
            {digest.activeSponsors.map((s) => {
              const tierInfo = TIER_LABELS[s.tier] || {
                label: s.tier,
                color: "",
              };
              return (
                <Card key={s.relId} className={`paper ${s.isExpiringSoon ? "border-gold/30" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-display font-semibold">{s.name}</h4>
                          <Badge variant="outline" className={`text-xs ${tierInfo.color}`}>
                            {tierInfo.label}
                          </Badge>
                          {s.isExpiringSoon && (
                            <Badge className="bg-gold/20 text-gold border-gold/30 text-xs gap-1">
                              <Clock className="h-3 w-3" /> Expiring
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{s.category}</span>
                          <span>•</span>
                          <span>¥{(s.monthlyIncome / 1000).toFixed(0)}K/mo</span>
                          <span>•</span>
                          <span className="capitalize">{s.role}</span>
                        </div>

                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Satisfaction</span>
                            <span>{Math.round(s.satisfaction)}%</span>
                          </div>
                          <Progress value={s.satisfaction} className="h-1.5" />
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: s.strength }, (_, i) => (
                            <Star key={i} className="h-3 w-3 text-gold" fill="currentColor" />
                          ))}
                        </div>
                        {s.isExpiringSoon && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => handleRenegotiate(s.relId, s.name, s.sponsorId)}
                          >
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

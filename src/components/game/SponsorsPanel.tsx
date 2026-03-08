// SponsorsPanel.tsx — Sponsor overview for the player's stable
// Shows kōenkai members, sponsor tiers, and churn history (narrative language)

import { useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  HandCoins, Crown, Building2, Users, TrendingDown, Star
} from "lucide-react";
import type { Sponsor, SponsorRelationship, SponsorTier, Koenkai } from "@/engine/sponsors";

const TIER_LABELS: Record<SponsorTier, { label: string; color: string }> = {
  T0: { label: "Local", color: "text-muted-foreground" },
  T1: { label: "Regional", color: "text-muted-foreground" },
  T2: { label: "Notable", color: "text-primary/70" },
  T3: { label: "Prominent", color: "text-primary" },
  T4: { label: "Major", color: "text-accent-foreground" },
  T5: { label: "Elite", color: "text-primary" },
};

const ROLE_LABELS: Record<string, string> = {
  koenkai_member: "Member",
  koenkai_pillar: "Pillar",
  kensho: "Kenshō Sponsor",
  benefactor: "Benefactor",
  creditor: "Creditor",
};

function tierIcon(tier: SponsorTier) {
  if (tier === "T5") return <Crown className="h-3.5 w-3.5" />;
  if (tier === "T4" || tier === "T3") return <Star className="h-3.5 w-3.5" />;
  return <Building2 className="h-3.5 w-3.5" />;
}

interface SponsorView {
  sponsor: Sponsor;
  role: string;
  strength: number;
}

export function SponsorsPanel() {
  const { state } = useGame();
  const world = state.world;
  const playerHeyaId = state.playerHeyaId;

  const { activeSponsors, koenkai, churned, tierSummary } = useMemo(() => {
    if (!world?.sponsorPool || !playerHeyaId) {
      return { activeSponsors: [] as SponsorView[], koenkai: null as Koenkai | null, churned: [] as Sponsor[], tierSummary: {} as Record<SponsorTier, number> };
    }

    const pool = world.sponsorPool;
    const active: SponsorView[] = [];
    const lost: Sponsor[] = [];
    const tiers: Record<SponsorTier, number> = { T0: 0, T1: 0, T2: 0, T3: 0, T4: 0, T5: 0 };

    for (const sponsor of pool.sponsors.values()) {
      const heyaRels = sponsor.relationships.filter(
        (r: SponsorRelationship) => r.targetId === playerHeyaId && r.targetType === "beya"
      );

      if (heyaRels.length === 0) continue;

      const activeRels = heyaRels.filter((r: SponsorRelationship) => !r.endsAtTick);
      const endedRels = heyaRels.filter((r: SponsorRelationship) => !!r.endsAtTick);

      if (activeRels.length > 0) {
        const best = activeRels.sort((a, b) => b.strength - a.strength)[0];
        active.push({ sponsor, role: best.role, strength: best.strength });
        tiers[sponsor.tier] = (tiers[sponsor.tier] || 0) + 1;
      }

      if (endedRels.length > 0 && activeRels.length === 0) {
        lost.push(sponsor);
      }
    }

    // Sort: highest tier first, then by strength
    active.sort((a, b) => {
      const tierOrder = ["T5", "T4", "T3", "T2", "T1", "T0"];
      const ta = tierOrder.indexOf(a.sponsor.tier);
      const tb = tierOrder.indexOf(b.sponsor.tier);
      if (ta !== tb) return ta - tb;
      return b.strength - a.strength;
    });

    const koe = pool.koenkais?.get(playerHeyaId) ?? null;

    return { activeSponsors: active, koenkai: koe, churned: lost.slice(0, 5), tierSummary: tiers };
  }, [world, playerHeyaId]);

  if (!world?.sponsorPool) {
    return (
      <Card className="paper">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">Sponsor data not yet available.</p>
        </CardContent>
      </Card>
    );
  }

  const totalActive = activeSponsors.length;

  return (
    <div className="space-y-6">
      {/* Kōenkai Summary */}
      {koenkai && (
        <Card className="paper">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Kōenkai Association
            </CardTitle>
            <CardDescription>Your organized supporter group</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Strength</span>
              <Badge variant="secondary" className="capitalize">{koenkai.strengthBand}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Members</span>
              <span className="text-sm font-medium">{koenkai.members.length} active</span>
            </div>
            {koenkai.members.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  {koenkai.members.slice(0, 6).map((m) => {
                    const sponsor = world.sponsorPool?.sponsors.get(m.sponsorId);
                    if (!sponsor) return null;
                    return (
                      <div key={m.relId} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          {tierIcon(sponsor.tier)}
                          <span className="truncate">{sponsor.displayName}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {ROLE_LABELS[m.role] ?? m.role}
                        </Badge>
                      </div>
                    );
                  })}
                  {koenkai.members.length > 6 && (
                    <p className="text-xs text-muted-foreground">
                      +{koenkai.members.length - 6} more members
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active Sponsors by Tier */}
      <Card className="paper">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HandCoins className="h-5 w-5 text-primary" />
            Active Sponsors
          </CardTitle>
          <CardDescription>
            {totalActive > 0
              ? `${totalActive} sponsor${totalActive !== 1 ? "s" : ""} currently supporting your stable`
              : "No active sponsor relationships yet"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tier distribution summary */}
          {totalActive > 0 && (
            <>
              <div className="flex flex-wrap gap-2">
                {(["T5", "T4", "T3", "T2", "T1", "T0"] as SponsorTier[]).map((t) => {
                  const count = tierSummary[t] || 0;
                  if (count === 0) return null;
                  const cfg = TIER_LABELS[t];
                  return (
                    <Badge key={t} variant="outline" className={`text-[10px] ${cfg.color}`}>
                      {cfg.label}: {count}
                    </Badge>
                  );
                })}
              </div>
              <Separator />
            </>
          )}

          {/* Sponsor list */}
          <div className="space-y-2">
            {activeSponsors.slice(0, 10).map(({ sponsor, role, strength }) => {
              const cfg = TIER_LABELS[sponsor.tier];
              return (
                <div key={sponsor.sponsorId} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cfg.color}>{tierIcon(sponsor.tier)}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{sponsor.displayName}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {sponsor.category.replace(/_/g, " ")} · {cfg.label}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            i < strength ? "bg-primary" : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {ROLE_LABELS[role] ?? role}
                    </Badge>
                  </div>
                </div>
              );
            })}
            {totalActive > 10 && (
              <p className="text-xs text-muted-foreground pt-1">
                +{totalActive - 10} more sponsors
              </p>
            )}
            {totalActive === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Build prestige and visibility to attract sponsors.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Churn History */}
      {churned.length > 0 && (
        <Card className="paper">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="h-5 w-5 text-destructive" />
              Recently Departed
            </CardTitle>
            <CardDescription>Sponsors who ended their relationship with your stable</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {churned.map((s) => {
                const cfg = TIER_LABELS[s.tier];
                return (
                  <div key={s.sponsorId} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-destructive/60">{tierIcon(s.tier)}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate text-muted-foreground">{s.displayName}</p>
                        <p className="text-xs text-muted-foreground/60 capitalize">
                          {s.category.replace(/_/g, " ")} · {cfg.label}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-destructive/60">
                      Departed
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

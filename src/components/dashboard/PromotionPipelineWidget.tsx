import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/useGame";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import { BaseWidget } from "./BaseWidget";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  getOzekiRunCandidates,
  getYokozunaCandidates,
  getKadobanDrama,
} from "@/presenters/projections/promotionProjections";
import { RANK_TIERS } from "@/constants/ui/promotion";
import {
  RankDistributionChart,
  KadobanSection,
  PromotionWatch,
} from "./PromotionPipelineSections";

export function PromotionPipelineWidget() {
  const { state } = useGame();
  const navigate = useNavigate();
  const world = state.world;

  const headerAction = useMemo(
    () => ({
      label: "Banzuke",
      onClick: () => navigate({ to: "/basho/banzuke" }),
      tooltip: "View the full banzuke and promotion standings",
    }),
    [navigate]
  );

  const ozekiRuns = useMemo(() => (world ? getOzekiRunCandidates(world) : []), [world]);
  const yokozunaCandidates = useMemo(() => (world ? getYokozunaCandidates(world) : []), [world]);
  const kadobanEntries = useMemo(() => (world ? getKadobanDrama(world) : []), [world]);

  const rankDistribution = useMemo(() => {
    if (!world) return [];
    const counts: Record<string, number> = {};
    for (const tier of RANK_TIERS) counts[tier.key] = 0;
    for (const rikishi of world.rikishi.values()) {
      if (rikishi.isRetired) continue;
      const r = rikishi.rank as string;
      if (r in counts) counts[r]++;
    }
    return RANK_TIERS.map((tier) => ({
      rank: tier.label,
      count: counts[tier.key],
      color: tier.color,
    }));
  }, [world]);

  if (!world) return null;

  const hasPromotion = ozekiRuns.length > 0 || yokozunaCandidates.length > 0;
  const hasKadoban = kadobanEntries.length > 0;

  return (
    <BaseWidget title="Promotion Pipeline" icon={TrendingUp} headerAction={headerAction}>
      <div className="space-y-3">
        {world.rikishi.size > 0 && <RankDistributionChart data={rankDistribution} />}

        {!hasPromotion && !hasKadoban && (
          <EmptyState icon={TrendingUp} title="No promotion activity this cycle" compact />
        )}

        {hasKadoban && <KadobanSection entries={kadobanEntries} />}

        {hasKadoban && hasPromotion && <div className="border-t border-border/40" />}

        {hasPromotion && (
          <PromotionWatch yokozunaCandidates={yokozunaCandidates} ozekiRuns={ozekiRuns} />
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-[10px] h-6 text-muted-foreground hover:text-foreground mt-1"
          onClick={() => navigate({ to: "/basho/banzuke" })}
        >
          Full Banzuke →
        </Button>
      </div>
    </BaseWidget>
  );
}

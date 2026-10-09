// SponsorsPanel.tsx — Sponsor overview for the player's stable
// Shows kōenkai members, sponsor tiers, and churn history (narrative language)
// Sections live in ./SponsorsPanelSections.tsx; derivation in useSponsorsDerived.

import { useGame } from "@/contexts/useGame";
import { Card, CardContent } from "@/components/ui/card";
import { useSponsorsDerived } from "@/hooks/useSponsorsDerived";
import {
  KoenkaiCard,
  ActiveSponsorsCard,
  ChurnedSponsorsCard,
} from "./SponsorsPanelSections";

/** sponsors panel. */
export function SponsorsPanel() {
  const { state } = useGame();
  const world = state.world;
  const playerHeyaId = state.playerHeyaId;

  const { activeSponsors, koenkai, churned, tierSummary } = useSponsorsDerived(
    world,
    playerHeyaId
  );

  if (!world?.sponsorPool) {
    return (
      <Card className="paper">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Sponsor data not yet available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Kōenkai Summary */}
      {koenkai && <KoenkaiCard world={world} koenkai={koenkai} />}

      {/* Active Sponsors by Tier */}
      <ActiveSponsorsCard activeSponsors={activeSponsors} tierSummary={tierSummary} />

      {/* Churn History */}
      {churned.length > 0 && <ChurnedSponsorsCard churned={churned} />}
    </div>
  );
}

/**
 * WeightJourneysSection.tsx
 *
 * Weight-journey card grid for TrainingPage — only rendered when at least
 * one roster member has an active journey.
 */

import type { Rikishi } from "@/engine/types/rikishi";
import { WeightJourneyCard } from "./WeightJourneyCard";

export function WeightJourneysSection({ rikishiList }: { rikishiList: Rikishi[] }) {
  if (!rikishiList.some((r) => r.weightJourney)) return null;
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold tracking-tight uppercase">
        Weight Journeys
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rikishiList
          .filter((r) => r.weightJourney)
          .map((r) => (
            <WeightJourneyCard key={r.id} journey={r.weightJourney} shikona={r.shikona} />
          ))}
      </div>
    </div>
  );
}

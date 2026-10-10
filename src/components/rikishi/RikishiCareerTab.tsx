/**
 * RikishiCareerTab.tsx
 *
 * Career history tab content for rikishi profile page.
 * Sections live under ./career/ — this component only composes them.
 */

import type { CareerSnapshot, Milestone } from "@/engine/types/history";
import type {
  NotableBoutEntry,
  NarrativeHighlight,
  PromotionHistoryEntry,
} from "@/presenters/engineAccess";
import { CareerProgressionChart } from "./career/CareerProgressionChart";
import { CareerEarningsCard, type CareerEconomics } from "./career/CareerEarningsCard";
import { BashoHistoryTable } from "./career/BashoHistoryTable";
import { NotableBouts } from "./career/NotableBouts";
import {
  NarrativeHighlights,
  PromotionHistory,
  MilestoneTimeline,
} from "./career/CareerHistorySections";

interface RikishiCareerTabProps {
  history: CareerSnapshot[];
  milestones: Milestone[];
  careerProgressionData: Array<{
    basho: string;
    rankValue: number;
    wins: number;
    losses: number;
    winRate: number;
  }>;
  notableBouts?: NotableBoutEntry[];
  narrativeHighlights?: NarrativeHighlight[];
  promotionHistory?: PromotionHistoryEntry[];
  earningsProgressionData?: Array<{
    basho: string;
    cumulativeEarnings: number;
    bashoEarnings: number;
  }>;
  economics?: CareerEconomics;
}

export function RikishiCareerTab({
  history,
  milestones,
  careerProgressionData,
  notableBouts,
  narrativeHighlights,
  promotionHistory,
  earningsProgressionData,
  economics,
}: RikishiCareerTabProps) {
  return (
    <div className="space-y-8">
      {/* Career Progression Chart */}
      <CareerProgressionChart data={careerProgressionData} />

      {/* Career Earnings */}
      <CareerEarningsCard earningsProgressionData={earningsProgressionData} economics={economics} />

      <BashoHistoryTable history={history} />

      {/* Narrative Highlights */}
      <NarrativeHighlights narrativeHighlights={narrativeHighlights} />

      {/* Notable Bouts */}
      <NotableBouts notableBouts={notableBouts} />

      {/* Promotion History */}
      <PromotionHistory promotionHistory={promotionHistory} />

      {/* Milestone Timeline */}
      <MilestoneTimeline milestones={milestones} />
    </div>
  );
}

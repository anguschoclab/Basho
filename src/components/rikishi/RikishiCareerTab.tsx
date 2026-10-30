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
import type { Rikishi } from "@/engine/types/rikishi";
import { CareerProgressionChart } from "@/components/rikishi/career/CareerProgressionChart";
import { CareerEarningsCard, type CareerEconomics } from "@/components/rikishi/career/CareerEarningsCard";
import { DivisionRecordsCard } from "@/components/rikishi/career/DivisionRecordsCard";
import { BashoHistoryTable } from "@/components/rikishi/career/BashoHistoryTable";
import { NotableBouts } from "@/components/rikishi/career/NotableBouts";
import {
  NarrativeHighlights,
  PromotionHistory,
  MilestoneTimeline,
} from "@/components/rikishi/career/CareerHistorySections";

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
  divisionRecords?: Rikishi["divisionRecords"];
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
  divisionRecords,
  economics,
}: RikishiCareerTabProps) {
  return (
    <div className="space-y-8">
      {/* Career Progression Chart */}
      <CareerProgressionChart data={careerProgressionData} />

      {/* Career Earnings */}
      <CareerEarningsCard earningsProgressionData={earningsProgressionData} economics={economics} />

      {/* Per-division career record */}
      <DivisionRecordsCard records={divisionRecords} />

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

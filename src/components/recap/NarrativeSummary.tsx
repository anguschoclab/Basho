/**
 * src/components/recap/NarrativeSummary.tsx
 *
 * Grouped event display for post-basho prestige, promotions, and retirements.
 * Uses a "Timeline Dossier" style for a cinematic summary of the world's drift.
 * Sections live in ./NarrativeSummarySections.tsx.
 */

import type { GovernanceRuling } from "@/engine/types/economy";
import {
  GroupedNarrativeEvents,
  PrestigeChange,
  PrestigeShiftsSection,
  MovementsSection,
  NarrativeGovernanceSection,
  YdcSection,
  PressConferenceSection,
  WrapUpFooter,
} from "./NarrativeSummarySections";

interface NarrativeSummaryProps {
  groupedEvents: GroupedNarrativeEvents;
  prestigeChanges: PrestigeChange[];
  narrativeSummaryData: {
    governanceLog: GovernanceRuling[];
    year: number;
    activeHeyasCount: number;
  };
}

export function NarrativeSummary({
  groupedEvents,
  prestigeChanges,
  narrativeSummaryData,
}: NarrativeSummaryProps) {
  const hasPrestige = prestigeChanges.length > 0;
  const hasGovernance =
    groupedEvents.governance?.length > 0 || (narrativeSummaryData.governanceLog?.length ?? 0) > 0;
  const hasYdcAccountability = (groupedEvents.ydcAccountability?.length ?? 0) > 0;
  const hasPressConference = (groupedEvents.pressConference?.length ?? 0) > 0;

  return (
    <div className="space-y-12 animate-in fade-in duration-1000 delay-300 fill-mode-both">
      {hasPrestige && <PrestigeShiftsSection prestigeChanges={prestigeChanges} />}

      <MovementsSection groupedEvents={groupedEvents} />

      {hasGovernance && (
        <NarrativeGovernanceSection
          groupedEvents={groupedEvents}
          governanceLog={narrativeSummaryData.governanceLog}
        />
      )}

      {hasYdcAccountability && <YdcSection groupedEvents={groupedEvents} />}

      {hasPressConference && <PressConferenceSection groupedEvents={groupedEvents} />}

      <WrapUpFooter
        year={narrativeSummaryData.year}
        activeHeyasCount={narrativeSummaryData.activeHeyasCount}
      />
    </div>
  );
}

// RecruitingTab.tsx — talent scouting and signing
// Sections live in ./RecruitingTabSections.tsx; state in useRecruitingState.

import { Binoculars } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CandidateDigestEntry } from "@/presenters/projections/boutProjections";
import { useRecruitingState } from "@/hooks/useRecruitingState";
import {
  PoolSelector,
  QuotaFilterRow,
  CandidateCard,
  RecruitingDialogs,
} from "./RecruitingTabSections";

export function RecruitingTab({ playerHeyaId }: { playerHeyaId: string | null }) {
  const state = useRecruitingState(playerHeyaId);

  return (
    <div className="space-y-4">
      <PoolSelector state={state} />
      <QuotaFilterRow state={state} />

      <ScrollArea className="h-[550px]">
        <div className="space-y-3 pr-2">
          {state.digest.candidates.map((c: CandidateDigestEntry) => (
            <CandidateCard key={c.candidateId} c={c} state={state} />
          ))}

          {state.digest.candidates.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Binoculars className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No visible prospects in this pool yet.</p>
              <p className="text-xs mt-1">Use "Scout Pool" to reveal hidden prospects.</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <RecruitingDialogs state={state} />
    </div>
  );
}

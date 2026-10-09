/**
 * SponsorshipHub.tsx
 * ==================
 * Financial management interface for stable benefactors and Koenkai.
 * (Phase N: Institutional Polish)
 * Sections live in ./SponsorshipHubSections.tsx.
 */

import { PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type SponsorshipData,
  SponsorSummaryCards,
  SponsorCard,
  EmptySponsorState,
  SponsorAppealCta,
} from "./SponsorshipHubSections";

interface SponsorshipHubProps {
  data: SponsorshipData | null;
}

export function SponsorshipHub({ data }: SponsorshipHubProps) {
  if (!data) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      {/* ═══ FINANCIAL SUMMARY ═══ */}
      <SponsorSummaryCards data={data} />

      {/* ═══ SPONSOR DIRECTORY ═══ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-display font-black uppercase tracking-tight">
            Active Benefactor Registry
          </h3>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[10px] font-black uppercase tracking-widest gap-2"
          >
            <PieChart className="h-3 w-3" /> Industry Breakdown
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {data.activeSponsors.map((sponsor) => (
            <SponsorCard key={sponsor.sponsorId} sponsor={sponsor} />
          ))}

          {data.activeSponsors.length === 0 && <EmptySponsorState />}
        </div>
      </div>

      {/* ═══ SPONSOR APPEAL CTA ═══ */}
      <SponsorAppealCta />
    </div>
  );
}

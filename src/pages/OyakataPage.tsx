/**
 * OyakataPage.tsx
 *
 * Oyakata profile & directory — composition shell. Sections live in
 * ../components/oyakata/OyakataPageSections.tsx and state in
 * ../hooks/useOyakataSelection.ts.
 */

import { EmptyState } from "@/components/ui/EmptyState";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/control-center";
import { STABLE_TABS } from "@/constants/ui/navigation";
import {
  TraitsCard,
  CareerAsRikishiCard,
  MentorshipCard,
  OyakataDirectory,
} from "@/components/oyakata/OyakataPageSections";
import { useOyakataSelection } from "@/hooks/useOyakataSelection";

/** oyakata page. */
export default function OyakataPage() {
  const sel = useOyakataSelection();

  if (!sel.world || !sel.selectedOyakata) {
    return (
      <AppLayout subNavTabs={STABLE_TABS} activeSubTab="oyakata">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <EmptyState
            icon={Loader2}
            title="Loading Oyakata"
            description="Fetching elder profile..."
            className="animate-pulse"
          />
        </div>
      </AppLayout>
    );
  }

  const selectedOyakata = sel.selectedOyakata;

  return (
    <AppLayout subNavTabs={STABLE_TABS} activeSubTab="oyakata" pageTitle="Oyakata Profile">
      <title>Oyakata Profile | Basho</title>

      <div className="space-y-6">
        <PageHeader
          eyebrow="── MY STABLE ──"
          title={selectedOyakata.name}
          lede={`${selectedOyakata.archetype?.replace("_", " ")} · Age ${selectedOyakata.age} · ${selectedOyakata.yearsInCharge} years in charge`}
        />

        <TraitsCard oyakata={selectedOyakata} />
        <CareerAsRikishiCard oyakata={selectedOyakata} />
        <MentorshipCard sel={sel} />
        <OyakataDirectory sel={sel} />
      </div>
    </AppLayout>
  );
}

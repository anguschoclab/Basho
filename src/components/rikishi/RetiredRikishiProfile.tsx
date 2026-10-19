/**
 * RetiredRikishiProfile.tsx
 *
 * Compact read-only profile for retired rikishi whose full record has been
 * pruned to a RetiredRikishiSummary (year-end summarization). Renders career
 * totals, peak rank, and retirement details from the summary alone.
 */

import { useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/page-shell";
import { STABLE_TABS } from "@/constants/ui/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StableName } from "@/components/ClickableName";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { getRankDisplayEntry, DIVISION_NAMES } from "@/constants/engine/rankDisplay";
import type { WorldState } from "@/presenters/uiDigest";
import type { RetiredRikishiSummary } from "@/engine/types/history";
import { getHeya } from "@/presenters/worldAccess";

export function RetiredRikishiProfile({
  summary,
  world,
}: {
  summary: RetiredRikishiSummary;
  world: WorldState;
}) {
  const navigate = useNavigate();
  const heya = getHeya(world, summary.heyaId);
  const peak = getRankDisplayEntry(summary.peakRank);
  const careerRecord = `${summary.careerWins}–${summary.careerLosses}`;

  const stats: Array<{ label: string; value: string | number }> = [
    { label: "Career Record", value: careerRecord },
    { label: "Yusho", value: summary.yushoCount },
    { label: "Jun-Yusho", value: summary.junYushoCount },
    { label: "Sansho", value: summary.sanshoCount },
    { label: "Kinboshi", value: summary.kinboshiCount },
  ];

  return (
    <AppLayout pageTitle="Rikishi Profile" subNavTabs={STABLE_TABS} activeSubTab="roster">
      <title>{summary.shikona} — Retired | Basho</title>
      <div className="max-w-3xl mx-auto space-y-6" data-testid="retired-profile">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/stable/roster" })}
          className="text-muted-foreground"
        >
          ← Back to Roster
        </Button>

        <div className="flex items-center gap-4">
          <SumoAvatar size="lg" fallback={summary.shikona} />
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-display font-black tracking-tight">
                {summary.shikona}
              </h1>
              <Badge variant="secondary" className="uppercase tracking-widest text-[10px]">
                Retired {summary.retirementYear}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {peak ? `Peak: ${peak.en}` : `Peak: ${summary.peakRank}`}
              {summary.peakRankYear ? ` (${summary.peakRankYear})` : ""} ·{" "}
              {DIVISION_NAMES[summary.peakDivision] ?? summary.peakDivision}
            </div>
            <div className="text-sm text-muted-foreground">
              {heya ? <StableName id={heya.id} name={heya.name} /> : "—"}
              {summary.retirementReason ? ` · ${summary.retirementReason}` : ""}
            </div>
          </div>
        </div>

        <PageHeader
          eyebrow="CAREER ARCHIVES"
          title="Career Summary"
          lede="Final Association record for this retired rikishi."
        />

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {stats.map((s) => (
            <Card key={s.label} className="paper">
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-xl font-display font-black tabular-nums">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

export default RetiredRikishiProfile;

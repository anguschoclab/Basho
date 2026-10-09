// HistoryPage.tsx
// History Page - Past basho results and records
//
// Per-basho record card and sorting live in
// components/history/BashoHistoryCard.tsx.

import { useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useGame } from "@/contexts/useGame";
import { useRequireWorld } from "@/hooks/useRequireWorld";
import { AppLayout } from "@/components/layout/AppLayout";
import { RECORDS_TABS } from "@/constants/ui/navigation";
import { PageHeader } from "@/components/layout/control-center";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar } from "lucide-react";
import { getHistory } from "@/presenters/worldAccess";
import { SortMenu } from "@/components/ui/SortMenu";
import type { SortDirection } from "@/lib/sortUtils";
import { BashoHistoryCard } from "@/components/history/BashoHistoryCard";
import { sortHistory, type HistoryRecord } from "@/components/history/historySort";

const HISTORY_SORT_OPTIONS = [
  { key: "year", label: "Year" },
  { key: "basho", label: "Basho" },
];

/** history page. */
export default function HistoryPage() {
  const navigate = useNavigate();
  const { state, getRikishi } = useGame();
  const hasWorld = useRequireWorld("/dashboard");
  const { world } = state;
  const [sortKey, setSortKey] = useState<string>("year");
  const [sortOrder, setSortOrder] = useState<SortDirection>("asc");

  const rawHistory = useMemo(() => (world ? (getHistory(world) as HistoryRecord[]) : []), [world]);

  const history = useMemo(
    () => sortHistory(rawHistory, sortKey, sortOrder),
    [rawHistory, sortKey, sortOrder]
  );

  if (!hasWorld || !world) return null;

  return (
    <AppLayout pageTitle="Stable History" subNavTabs={RECORDS_TABS} activeSubTab="history">
      <title>History - Basho</title>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate({ to: "/dashboard" })}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <PageHeader
            eyebrow="── RECORDS ──"
            title="Basho History"
            lede={`${history.length} tournaments completed`}
          />
          <SortMenu
            options={HISTORY_SORT_OPTIONS}
            storageKey="basho_sort_history"
            defaultSortKey="year"
            defaultSortOrder="asc"
            onSortChange={(key, order) => {
              setSortKey(key);
              setSortOrder(order);
            }}
          />
        </div>

        {history.length === 0 ? (
          <Card className="paper">
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-display text-xl font-semibold mb-2">No History Yet</h3>
              <p className="text-muted-foreground mb-4">
                Complete your first basho to see results here.
              </p>
              <Button onClick={() => navigate({ to: "/dashboard" })}>Return to Dashboard</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {history.map((basho) => (
              <BashoHistoryCard
                key={`${basho.year}-${basho.bashoNumber}-${basho.bashoName}`}
                basho={basho}
                world={world}
                getRikishi={getRikishi}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

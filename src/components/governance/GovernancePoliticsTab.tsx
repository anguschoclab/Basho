/**
 * GovernancePoliticsTab.tsx
 * =========================
 * Politics tab for GovernancePage: political capital standing, JSA
 * political favors, and ichimon influence rankings with sorting.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard, ListCard, SectionHeader } from "@/components/layout/control-center";
import { TabsContent } from "@/components/ui/tabs";
import { Trophy, ShieldAlert, Coins, Scale } from "lucide-react";
import { useGame } from "@/contexts/useGame";
import { useGameStore } from "@/store/gameStore";
import { SortMenu, type SortOption } from "@/components/ui/SortMenu";
import { compareBy, type SortDirection } from "@/lib/sortUtils";
import type { StatItem } from "@/components/layout/control-center";
import { POLITICAL_FAVORS } from "@/presenters/projections/governanceProjections";
import { getOyakata } from "@/presenters/worldAccess";
import type { WorldState } from "@/presenters/uiDigest";
import type { Heya } from "@/engine/types/heya";
import type { Faction } from "@/engine/types/economy";
import type { GovernanceDerivedData } from "@/hooks/useGovernanceDerived.tsx";

const FACTION_SORT_OPTIONS: SortOption[] = [
  { key: "influence", label: "Influence" },
  { key: "name", label: "Name" },
  { key: "rikishiCount", label: "Rikishi Count" },
];

interface Props {
  world: WorldState;
  heya: Heya;
  derived: GovernanceDerivedData;
}

export function GovernancePoliticsTab({ world, heya, derived }: Props) {
  return (
    <TabsContent value="politics" className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PoliticalStanding heya={heya} />
        <PoliticalFavorsList heya={heya} />
        <IchimonRankings world={world} heya={heya} derived={derived} />
      </div>
    </TabsContent>
  );
}

function PoliticalStanding({ heya }: { heya: Heya }) {
  const { spendPoliticalCapital } = useGame();
  const handleSpend = () => {
    if ((heya.politicalCapital ?? 0) >= 100) {
      spendPoliticalCapital(heya.id, 100);
      return;
    }
    toast.error("Not enough Political Capital (need 100).");
  };
  return (
    <div className="space-y-4">
      <SectionHeader eyebrow="── CAPITAL ──" title="Your Political Standing" />
      <StatCard
        eyebrow=""
        title={`${heya.ichimon ?? "Independent"} Ichimon`}
        stats={[
          {
            label: "Political Capital",
            value: heya.politicalCapital ?? 0,
            tone: (heya.politicalCapital ?? 0) >= 100 ? "gold" : "default",
            sub: "Spend capital to fuel political favors",
          },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleSpend}
            disabled={(heya.politicalCapital ?? 0) < 100}
            tooltip={
              (heya.politicalCapital ?? 0) < 100
                ? "Not enough Political Capital (need 100)"
                : undefined
            }
          >
            Spend 100
          </Button>
        }
      />
    </div>
  );
}

function PoliticalFavorsList({ heya }: { heya: Heya }) {
  const sendCommand = useGameStore((s) => s.sendCommand);
  return (
    <div className="space-y-4">
      <SectionHeader eyebrow="── FAVORS ──" title="JSA Political Favors" />
      <div className="grid gap-3">
        {POLITICAL_FAVORS.map((favor) => {
          const icon =
            favor.id === "matchmaking_avoid"
              ? ShieldAlert
              : favor.id === "advance_payout"
                ? Coins
                : Scale;
          return (
            <Card
              key={favor.id}
              className="relative overflow-hidden group border-border/40 bg-card"
            >
              <CardContent className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted/40 rounded shadow-inner">
                    {(() => {
                      const Icon = icon;
                      return <Icon className="h-4.5 w-4.5 text-primary/80" />;
                    })()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground/90">
                      {favor.label}
                    </div>
                    <div className="text-[10px] text-muted-foreground/80 leading-tight">
                      {favor.description}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-[11px] font-mono font-bold text-primary">
                    {favor.cost} CAP
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 text-[10px] uppercase font-black tracking-tighter border-primary/20 hover:border-primary/50 transition-all"
                    disabled={(heya.politicalCapital ?? 0) < favor.cost}
                    tooltip={
                      (heya.politicalCapital ?? 0) < favor.cost
                        ? `Not enough Political Capital (need ${favor.cost})`
                        : undefined
                    }
                    onClick={() => {
                      sendCommand({
                        type: "REQUEST_POLITICAL_FAVOR",
                        heyaId: heya.id,
                        favorId: favor.id,
                      });
                    }}
                  >
                    Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function IchimonRankings({
  world,
  heya,
  derived,
}: {
  world: WorldState;
  heya: Heya;
  derived: GovernanceDerivedData;
}) {
  const [factionSortKey, setFactionSortKey] = useState<string>("influence");
  const [factionSortOrder, setFactionSortOrder] = useState<SortDirection>("desc");

  const sortedFactionRows = useMemo(() => {
    if (derived.factionList.length === 0) return [];
    const accessor: Record<string, (fac: Faction) => string | number | undefined> = {
      influence: (f) => f.influence,
      name: (f) => f.name,
      rikishiCount: () => 0,
    };
    const fn = accessor[factionSortKey];
    if (!fn) return derived.factionRows;
    const sorted = [...derived.factionList].sort((a, b) => compareBy(a, b, fn, factionSortOrder));
    const maxInfluence = sorted.length > 0 ? sorted[0].influence : 0;
    return sorted.map((fac) => ({
      id: fac.id,
      label: (
        <span className="flex items-center gap-1.5 flex-wrap">
          {fac.name}
          {fac.influence === maxInfluence && (
            <Badge variant="default" className="text-[10px] px-1.5 py-0 h-3.5">
              Chairman
            </Badge>
          )}
          {heya?.ichimon === fac.id && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-3.5 border-primary text-primary"
            >
              Yours
            </Badge>
          )}
        </span>
      ),
      sub: `Leader: ${getOyakata(world, fac.oyakataLeaderId ?? "")?.name ?? "Unknown"}`,
      value: fac.influence,
      tone: (heya?.ichimon === fac.id ? "gold" : "default") as StatItem["tone"],
    }));
  }, [derived, world, factionSortKey, factionSortOrder, heya]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <SectionHeader eyebrow="── RANKINGS ──" title="Ichimon Influence Rankings" />
        {derived.factionList.length > 0 && (
          <SortMenu
            options={FACTION_SORT_OPTIONS}
            storageKey="basho_sort_governance_faction"
            defaultSortKey="influence"
            defaultSortOrder="desc"
            onSortChange={(key, order) => {
              setFactionSortKey(key);
              setFactionSortOrder(order);
            }}
          />
        )}
      </div>
      {derived.factionList.length > 0 ? (
        <ListCard
          eyebrow=""
          title="Current Standing"
          rows={sortedFactionRows}
          icon={Trophy}
        />
      ) : (
        <p className="text-sm text-muted-foreground">No faction data available.</p>
      )}
    </div>
  );
}

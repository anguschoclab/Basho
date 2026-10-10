/**
 * HofPageSections.tsx
 *
 * Hall of Fame page sections — the hero header with category counts, the
 * dynasty registry card, and the tab strip + sort menu row.
 */

import { PageHeader } from "@/components/layout/control-center";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Shield, Target, Award, Crown } from "lucide-react";
import { SortMenu } from "@/components/ui/SortMenu";
import type { SortDirection } from "@/lib/sortUtils";
import type { HoFCategory } from "@/presenters/engineAccess";
import type { UIHofInductee } from "@/presenters/projections/hofProjection";
import type { BloodlineTrait } from "@/engine/types/dynasty";
import { HOF_SORT_OPTIONS } from "./hofMeta";
import { CategoryTab, AllInducteesTab } from "./HofTabs";

/** Hero header — title, lede, and per-category inductee counts. */
export function HallHero({
  totalInductees,
  totalAwards,
  byCategory,
}: {
  totalInductees: number;
  totalAwards: number;
  byCategory: Record<HoFCategory, UIHofInductee[]>;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border bg-gold/5 p-6">
      <div className="absolute top-2 right-4 text-6xl opacity-10">🏛️</div>
      <PageHeader
        eyebrow="── RECORDS ──"
        title="Hall of Fame"
        lede={
          totalInductees > 0
            ? `${totalInductees} legend${totalInductees !== 1 ? "s" : ""} enshrined in sumo immortality.`
            : "The sacred shrine awaits its first legends — compete through the years."
        }
      />

      {totalInductees > 0 && (
        <div className="flex gap-6 mt-4">
          <div className="text-center">
            <div className="text-xl font-display font-bold text-gold">
              {byCategory.champion.length}
            </div>
            <div className="text-[10px] text-muted-foreground">Champions</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-display font-bold text-west">
              {byCategory.iron_man.length}
            </div>
            <div className="text-[10px] text-muted-foreground">Iron Men</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-display font-bold text-success">
              {byCategory.technician.length}
            </div>
            <div className="text-[10px] text-muted-foreground">Technicians</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-display font-bold text-primary">{totalAwards}</div>
            <div className="text-[10px] text-muted-foreground">Awards</div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Dynasty registry card — bloodline traits with ancestor shikona. */
export function DynastyRegistry({ traits }: { traits: Record<string, BloodlineTrait> }) {
  const entries = Object.values(traits);
  if (entries.length === 0) return null;

  return (
    <Card className="border overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="h-4 w-4" style={{ color: "hsl(var(--gold))" }} />
          <h3 className="text-sm font-display font-semibold">Dynasty Registry</h3>
          <Badge variant="secondary" className="text-[10px] font-mono tabular-nums">
            {entries.length}
          </Badge>
        </div>
        <div className="space-y-2">
          {entries.map((trait) => (
            <div
              key={trait.traitId}
              className="flex items-center justify-between p-2 rounded bg-background/50"
            >
              <div>
                <div className="font-display font-medium text-sm">{trait.label}</div>
                <div className="text-xs text-muted-foreground font-body">{trait.description}</div>
              </div>
              <div className="text-xs text-muted-foreground font-mono tabular-nums">
                {trait.ancestorShikona} · {trait.registeredYear}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Tab strip + sort menu row — all, champion, iron man, technician. */
export function HofTabsRow({
  totalInductees,
  inductees,
  byCategory,
  sortKey,
  sortOrder,
  onSortChange,
}: {
  totalInductees: number;
  inductees: UIHofInductee[];
  byCategory: Record<HoFCategory, UIHofInductee[]>;
  sortKey: string;
  sortOrder: SortDirection;
  onSortChange: (key: string, order: SortDirection) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Tabs defaultValue="all" className="flex-1">
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="all" className="gap-1">
            <Award className="h-3.5 w-3.5" /> All ({totalInductees})
          </TabsTrigger>
          <TabsTrigger value="champion" className="gap-1">
            <Trophy className="h-3.5 w-3.5" /> Champions
          </TabsTrigger>
          <TabsTrigger value="iron_man" className="gap-1">
            <Shield className="h-3.5 w-3.5" /> Iron Men
          </TabsTrigger>
          <TabsTrigger value="technician" className="gap-1">
            <Target className="h-3.5 w-3.5" /> Technicians
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <AllInducteesTab inductees={inductees} sortKey={sortKey} sortOrder={sortOrder} />
        </TabsContent>
        <TabsContent value="champion" className="mt-4">
          <CategoryTab
            category="champion"
            inductees={byCategory.champion}
            sortKey={sortKey}
            sortOrder={sortOrder}
          />
        </TabsContent>
        <TabsContent value="iron_man" className="mt-4">
          <CategoryTab
            category="iron_man"
            inductees={byCategory.iron_man}
            sortKey={sortKey}
            sortOrder={sortOrder}
          />
        </TabsContent>
        <TabsContent value="technician" className="mt-4">
          <CategoryTab
            category="technician"
            inductees={byCategory.technician}
            sortKey={sortKey}
            sortOrder={sortOrder}
          />
        </TabsContent>
      </Tabs>
      <SortMenu
        options={HOF_SORT_OPTIONS}
        storageKey="basho_sort_hof"
        defaultSortKey="year"
        defaultSortOrder="asc"
        onSortChange={onSortChange}
      />
    </div>
  );
}

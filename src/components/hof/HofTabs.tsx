/**
 * HofTabs.tsx
 *
 * Hall of Fame tab bodies — per-category tab and the all-inductees tab.
 * Both share the year-grouped / flat sorted list rendering.
 */

import { useMemo } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Star, Award } from "lucide-react";
import type { HoFCategory } from "@/presenters/engineAccess";
import { HOF_CATEGORY_LABELS } from "@/presenters/uiDigest";
import type { SortDirection } from "@/lib/sortUtils";
import type { UIHofInductee } from "@/presenters/projections/hofProjection";
import { CATEGORY_ICONS, sortInductees } from "./hofMeta";
import { InducteeFullCard } from "./InducteeCards";

/** Group sorted inductees by induction year (desc/asc per sort order). */
function useInducteeGroups(inductees: UIHofInductee[], sortKey: string, sortOrder: SortDirection) {
  const sorted = useMemo(
    () => sortInductees(inductees, sortKey, sortOrder),
    [inductees, sortKey, sortOrder]
  );

  const byYear = useMemo(() => {
    if (sortKey !== "year") return null;
    const map = new Map<number, UIHofInductee[]>();
    for (const ind of sorted) {
      const arr = map.get(ind.inductionYear) ?? [];
      arr.push(ind);
      map.set(ind.inductionYear, arr);
    }
    return Array.from(map.entries()).sort((a, b) =>
      sortOrder === "asc" ? a[0] - b[0] : b[0] - a[0]
    );
  }, [sorted, sortKey, sortOrder]);

  return { sorted, byYear };
}

/** Sorted inductee list — flat, or grouped into "Class of YEAR" sections. */
function InducteeList({
  sorted,
  byYear,
  showCountBadge,
}: {
  sorted: UIHofInductee[];
  byYear: [number, UIHofInductee[]][] | null;
  showCountBadge: boolean;
}) {
  if (byYear) {
    return (
      <ScrollArea className="max-h-[600px]">
        <div className="space-y-6 pr-2">
          {byYear.map(([year, inds]) => (
            <div key={year}>
              <div className="flex items-center gap-2 mb-3">
                <Star className="h-4 w-4 text-gold" />
                <h3 className="text-sm font-display font-semibold">Class of {year}</h3>
                {showCountBadge ? (
                  <Badge variant="secondary" className="text-[10px]">
                    {inds.length}
                  </Badge>
                ) : (
                  <Separator className="flex-1" />
                )}
              </div>
              <div className="space-y-3">
                {inds.map((ind, i) => (
                  <InducteeFullCard key={`${ind.rikishiId}-${i}`} inductee={ind} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="max-h-[600px]">
      <div className="space-y-3 pr-2">
        {sorted.map((ind, i) => (
          <InducteeFullCard key={`${ind.rikishiId}-${i}`} inductee={ind} />
        ))}
      </div>
    </ScrollArea>
  );
}

// === Category Tab ===

export function CategoryTab({
  category,
  inductees,
  sortKey,
  sortOrder,
}: {
  category: HoFCategory;
  inductees: UIHofInductee[];
  sortKey: string;
  sortOrder: SortDirection;
}) {
  const label = HOF_CATEGORY_LABELS[category];
  const Icon = CATEGORY_ICONS[category];

  const sortedFlat = useMemo(() => {
    if (sortKey === "year") return null;
    return sortInductees(inductees, sortKey, sortOrder);
  }, [inductees, sortKey, sortOrder]);

  const { byYear } = useInducteeGroups(inductees, sortKey, sortOrder);

  if (inductees.length === 0) {
    return (
      <EmptyState
        icon={Icon}
        title={`No ${label.name.toLowerCase()} inductees yet.`}
        description="Legends are forged through years of competition."
        className="py-16"
      />
    );
  }

  return <InducteeList sorted={sortedFlat ?? []} byYear={byYear} showCountBadge={true} />;
}

// === All-time view ===

export function AllInducteesTab({
  inductees,
  sortKey,
  sortOrder,
}: {
  inductees: UIHofInductee[];
  sortKey: string;
  sortOrder: SortDirection;
}) {
  const { sorted, byYear } = useInducteeGroups(inductees, sortKey, sortOrder);

  if (inductees.length === 0) {
    return (
      <EmptyState
        icon={Award}
        title="The Hall stands empty, awaiting its first legends."
        description="Compete through multiple years to see inductees appear."
        className="py-16"
      />
    );
  }

  return <InducteeList sorted={sorted} byYear={byYear} showCountBadge={false} />;
}

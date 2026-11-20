/**
 * hofMeta.ts
 *
 * Hall of Fame display constants — category icons/surface tints/accents, rank
 * kanji, sort options + accessor, and the inductee sort helper.
 */

import { Trophy, Shield, Target } from "lucide-react";
import { RANK_NAMES } from "@/constants/engine/rankDisplay";
import type { HoFCategory } from "@/presenters/engineAccess";
import { compareBy, type SortDirection } from "@/lib/sortUtils";
import type { UIHofInductee } from "@/presenters/projections/hofProjection";

export const CATEGORY_ICONS: Record<HoFCategory, React.ElementType> = {
  champion: Trophy,
  iron_man: Shield,
  technician: Target,
};

export const CATEGORY_SURFACE: Record<HoFCategory, string> = {
  champion: "bg-gold/10 border-gold/30",
  iron_man: "bg-west/10 border-west/30",
  technician: "bg-success/10 border-success/30",
};

export const CATEGORY_ACCENT: Record<HoFCategory, string> = {
  champion: "text-gold",
  iron_man: "text-west",
  technician: "text-success",
};

export const RANK_JA: Record<string, string> = Object.fromEntries(
  Object.entries(RANK_NAMES).map(([rank, { ja }]) => [rank, ja])
);

export const HOF_SORT_OPTIONS = [
  { key: "name", label: "Name" },
  { key: "year", label: "Year" },
  { key: "yusho", label: "Yusho" },
];

const hofAccessor: Record<string, (ind: UIHofInductee) => string | number | undefined> = {
  name: (ind) => ind.shikona,
  year: (ind) => ind.inductionYear,
  yusho: (ind) => ind.stats?.yushoCount ?? 0,
};

/**
 * Sorts Hall-of-Fame inductees by the requested career dimension.
 */
export function sortInductees(
  inductees: UIHofInductee[],
  sortKey: string,
  sortOrder: SortDirection
): UIHofInductee[] {
  const fn = hofAccessor[sortKey];
  if (!fn) return inductees;
  return [...inductees].sort((a, b) => compareBy(a, b, fn, sortOrder));
}

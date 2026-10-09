/**
 * historySort.ts
 *
 * HistoryRecord shape + sorting helpers for BashoHistoryCard/HistoryPage.
 */

import type { SortDirection } from "@/lib/sortUtils";
import { compareBy } from "@/lib/sortUtils";

/** Type representing history record. */
export type HistoryRecord = {
  year: number;
  bashoNumber: number;
  bashoName: string;
  yusho?: string | null;
  junYusho?: string[] | null;
  ginoSho?: string | null;
  kantosho?: string | null;
  shukunsho?: string | null;
  prizes?: {
    yushoAmount?: number;
    junYushoAmount?: number;
    specialPrizes?: number;
  } | null;
};

const historyAccessor: Record<string, (r: HistoryRecord) => string | number | undefined> = {
  year: (r) => r.year,
  basho: (r) => r.bashoNumber,
};

/** Sorts history records by the selected key/order (default: latest first). */
export function sortHistory(
  rawHistory: HistoryRecord[],
  sortKey: string,
  sortOrder: SortDirection
): HistoryRecord[] {
  const fn = historyAccessor[sortKey];
  if (!fn) return [...rawHistory].reverse();
  return [...rawHistory].sort((a, b) => compareBy(a, b, fn, sortOrder));
}


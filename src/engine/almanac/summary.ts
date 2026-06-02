import type { RikishiCareerRecord } from "./types";

export function getRikishiCareerSummary(record: RikishiCareerRecord): string {
  const parts: string[] = [];

  if (record.yushoCount > 0) parts.push(`${record.yushoCount} Yusho`);
  if (record.junYushoCount > 0) parts.push(`${record.junYushoCount} Jun-Yusho`);

  const sanshoTotal =
    record.sanshoCounts.ginoSho + record.sanshoCounts.kantosho + record.sanshoCounts.shukunsho;
  if (sanshoTotal > 0) parts.push(`${sanshoTotal} Sansho`);

  if (record.kinboshiCount > 0) parts.push(`${record.kinboshiCount} Kinboshi`);

  parts.push(`${record.totalWins}-${record.totalLosses}`);

  return parts.join(" • ");
}

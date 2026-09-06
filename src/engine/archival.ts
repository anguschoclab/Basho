/**
 * archival.ts
 * ============
 * Retired-Rikishi Summarization Engine.
 *
 * Replaces the old broken tiered-pruning system. At year-end, full Rikishi
 * objects in world.historicalRikishi are converted to compact RetiredRikishiSummary
 * entries. Full data is preserved in cold storage (OPFS/Electron) at retirement
 * time, so the summary is a hot-state optimization, not data loss.
 *
 * Key fixes vs. the old system:
 *  - Writes to world.historicalRikishi (via updateHistoricalRikishi), NOT world.rikishi.
 *  - Uses peak rank from careerHistory, not retirement rank.
 *  - Produces a compact RetiredRikishiSummary with per-year aggregates.
 *  - Idempotent: entries already marked isSummary are skipped.
 */

import type { WorldState } from "./types/world";
import type { Rikishi } from "./types/rikishi";
import type { RetiredRikishiSummary } from "./types/history";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";
import { buildRetiredRikishiSummary } from "./lifecycle/buildRetiredRikishiSummary";
import { opfsArchiveService } from "./storage/opfsArchive";
import { electronArchiveService } from "./storage/electronArchive";
import { warn } from "./utils/Logger";

/**
 * Returns the active archive service (OPFS or Electron) based on environment.
 */
function getArchiveService() {
  return typeof window !== "undefined" && window.__ELECTRON__ === true
    ? electronArchiveService
    : opfsArchiveService;
}

/**
 * Year-end summarization: convert full Rikishi in historicalRikishi to
 * compact RetiredRikishiSummary entries. Returns a StateImpact that, when
 * resolved, replaces the full objects with summaries in world.historicalRikishi.
 *
 * Pre-conditions:
 *  - Full retired Rikishi remain in historicalRikishi until this runs (so the
 *    retirement ceremony UI in RecapPage still has access to a full Rikishi).
 *  - Cold-storage archival of the full record happens at retirement time
 *    (see CareerService / governanceReview), not here.
 *
 * Safety net (Risk #3 mitigation):
 *  - Before converting each full Rikishi to a summary, this function attempts
 *    to archive the full record to cold storage again (fire-and-forget). This
 *    catches cases where the retirement-time archival failed (OPFS unavailable,
 *    transient error, etc.). If this also fails, the summary is still produced
 *    — the full record is lost, but the simulation continues.
 *
 * Post-conditions:
 *  - Each full Rikishi in historicalRikishi is replaced by a RetiredRikishiSummary.
 *  - Entries already marked isSummary are left untouched (idempotent).
 *  - world.rikishi is NOT touched (no ghost entries).
 */
export function runRetiredRikishiSummarization(world: WorldState): StateImpact {
  const builder = createImpactBuilder("runRetiredRikishiSummarization");

  if (!world.historicalRikishi) return builder.build();

  const archiveService = getArchiveService();

  for (const [id, entry] of world.historicalRikishi) {
    // Skip entries that are already summaries (idempotent)
    if (isRetiredRikishiSummary(entry)) continue;

    // Only convert full Rikishi objects
    if (!isFullRikishi(entry)) continue;

    // Safety net: attempt to archive the full record before conversion.
    // Fire-and-forget — failures are logged but do not block conversion.
    archiveService.archiveFullRikishiRecord(id, entry).catch((err) => {
      warn(
        `Cold-storage archival failed during year-end summarization for rikishi ${id} ` +
          `(${entry.shikona}). Full career detail will not be retrievable from cold storage. ` +
          `Summary conversion will still proceed.`,
        "runRetiredRikishiSummarization",
        err
      );
    });

    const summary = buildRetiredRikishiSummary(entry);
    builder.updateHistoricalRikishi(id, summary);
  }

  return builder.build();
}

/**
 * Type guard: returns true if the entry is a RetiredRikishiSummary.
 */
export function isRetiredRikishiSummary(
  entry: unknown
): entry is RetiredRikishiSummary {
  return (
    !!entry &&
    typeof entry === "object" &&
    (entry as { isSummary?: unknown }).isSummary === true
  );
}

/**
 * Type guard: returns true if the entry is a full Rikishi (not a summary).
 * A full Rikishi has `stats` and does not have `isSummary: true`.
 */
function isFullRikishi(entry: unknown): entry is Rikishi {
  return (
    !!entry &&
    typeof entry === "object" &&
    "stats" in (entry as Record<string, unknown>) &&
    (entry as { isSummary?: unknown }).isSummary !== true
  );
}

// Re-export for consumers that imported the old symbol name.
export { buildRetiredRikishiSummary } from "./lifecycle/buildRetiredRikishiSummary";
